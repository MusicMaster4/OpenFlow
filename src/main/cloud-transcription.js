'use strict';

const http = require('node:http');
const https = require('node:https');
const { randomUUID } = require('node:crypto');
const { performance } = require('node:perf_hooks');

const agent = new https.Agent({ keepAlive: true });
const MIME = { wav: 'audio/wav', flac: 'audio/flac', mp3: 'audio/mpeg', ogg: 'audio/ogg',
  webm: 'audio/webm', m4a: 'audio/mp4', aac: 'audio/aac' };

function buildAudioRequest(audioPayload, model, language, forceJson = false) {
  const format = String(audioPayload.format || 'wav').toLowerCase();
  if (!MIME[format]) {
    throw Object.assign(new Error('Unsupported saved audio format.'), { retryable: false });
  }
  const audio = Buffer.from(audioPayload.data || '', 'base64');
  if (!audio.length) throw Object.assign(new Error('Empty audio recording.'), { retryable: false });
  if (forceJson || audio.length > 25 * 1024 * 1024) {
    const body = { model, input_audio: { data: audioPayload.data, format }, temperature: 0 };
    if (language) body.language = language;
    const buffer = Buffer.from(JSON.stringify(body));
    return { chunks: [buffer], bytes: buffer.length, audioBytes: audio.length,
      contentType: 'application/json', transport: 'json', format };
  }
  const boundary = `openflow-${randomUUID()}`;
  const fields = { model, temperature: '0' };
  if (language) fields.language = language;
  const prefix = Object.entries(fields).map(([name, value]) =>
    `--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`).join('') +
    `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="recording.${format}"\r\n` +
    `Content-Type: ${MIME[format]}\r\n\r\n`;
  const chunks = [Buffer.from(prefix), audio, Buffer.from(`\r\n--${boundary}--\r\n`)];
  return { chunks, bytes: chunks.reduce((sum, part) => sum + part.length, 0), audioBytes: audio.length,
    contentType: `multipart/form-data; boundary=${boundary}`, transport: 'multipart', format };
}

function retryAfterMs(value, now = Date.now()) {
  if (value == null || String(value).trim() === '') return 0;
  const seconds = Number(value);
  const delay = Number.isFinite(seconds) ? seconds * 1000 : Date.parse(value) - now;
  return Number.isFinite(delay) ? Math.max(0, Math.min(delay, 2147483647)) : 0;
}

function isRetryableCloudError(error) {
  if (error.retryable === false) return false;
  const status = Number(error.status) || 0;
  // Retain recovery for network errors, empty responses and transient provider failures.
  return !status || [408, 409, 425, 429].includes(status) || status >= 500;
}

function compatibilityFallback(error, payload, forceJson) {
  if (![400, 415, 422].includes(error.status)) return null;
  const message = String(error.message || '').toLowerCase();
  if (payload.format === 'flac' && /flac|codec|decode|audio format|invalid audio/.test(message)) return 'wav';
  if (!forceJson && error.transport === 'multipart' &&
      (error.status === 415 || /multipart|content.type|input_audio/.test(message))) return 'json';
  return null;
}

async function requestTranscription({ audioPayload, model, language, apiKey, endpoint,
  userAgent = 'OpenFlow', timeoutMs = 120000, forceJson = false, signal }) {
  const started = performance.now();
  const body = buildAudioRequest(audioPayload, model, language, forceJson);
  const timing = { format: body.format, transport: body.transport, audioBytes: body.audioBytes,
    requestBytes: body.bytes, serializationMs: performance.now() - started };
  const networkStarted = performance.now();
  const elapsed = () => performance.now() - networkStarted;
  const url = new URL(endpoint);
  const client = url.protocol === 'http:' ? http : https;
  return new Promise((resolve, reject) => {
    let timer;
    let settled = false;
    const finish = (error, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      timing.totalMs = performance.now() - started;
      if (error) {
        Object.assign(error, { timing, transport: body.transport });
        reject(error);
      } else resolve(value);
    };
    const request = client.request(url, {
      method: 'POST', agent: url.protocol === 'https:' ? agent : undefined, signal,
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': body.contentType,
        'Content-Length': body.bytes, Accept: 'application/json', 'User-Agent': userAgent },
    }, (response) => {
      timing.responseHeadersMs = elapsed();
      // Includes remote upload delivery, routing, queueing and inference. It is NOT pure server time.
      timing.responseWaitMs = Math.max(0, timing.responseHeadersMs - (timing.uploadFinishedMs || 0));
      timing.status = response.statusCode;
      timing.generationId = response.headers['x-generation-id'] || null;
      const chunks = [];
      let bytes = 0;
      response.on('data', (chunk) => {
        bytes += chunk.length;
        if (bytes > 8 * 1024 * 1024) {
          request.destroy(new Error('Transcription response exceeded 8 MB.'));
          return;
        }
        chunks.push(chunk);
      });
      response.on('error', (error) => finish(error));
      response.on('end', () => {
        timing.responseBodyMs = elapsed() - timing.responseHeadersMs;
        let result;
        try { result = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch (_) { result = {}; }
        if (response.statusCode < 200 || response.statusCode >= 300) {
          const error = new Error(String(result?.error?.message || result?.message ||
            `OpenRouter transcription failed with HTTP ${response.statusCode}.`));
          error.status = response.statusCode;
          error.retryAfterMs = retryAfterMs(response.headers['retry-after']);
          finish(error);
          return;
        }
        const text = String(result?.text || '').trim();
        if (!text) { finish(new Error('OpenRouter returned an empty transcription.')); return; }
        finish(null, { engine: 'cloud', model, text, language: language || 'unknown',
          audio_duration_ms: Number(audioPayload.audio_duration_ms || audioPayload.audioDurationMs) ||
            Number(result?.usage?.seconds || 0) * 1000,
          cost_usd: Number(result?.usage?.cost) || 0, timing });
      });
    });
    request.on('socket', (socket) => {
      if (!socket.connecting) { timing.connectionMs = elapsed(); return; }
      socket.once(url.protocol === 'https:' ? 'secureConnect' : 'connect', () => {
        timing.connectionMs = elapsed();
      });
    });
    // Node has handed the body to the OS; acknowledgement by the remote server is not observable here.
    request.on('finish', () => {
      timing.uploadFinishedMs = elapsed();
      timing.uploadMs = Math.max(0, timing.uploadFinishedMs - (timing.connectionMs || 0));
    });
    request.on('error', (error) => finish(error));
    timer = setTimeout(() => request.destroy(new Error('OpenRouter transcription timed out.')), timeoutMs);
    for (const chunk of body.chunks) request.write(chunk);
    request.end();
  });
}

module.exports = { buildAudioRequest, requestTranscription, retryAfterMs,
  isRetryableCloudError, compatibilityFallback };
