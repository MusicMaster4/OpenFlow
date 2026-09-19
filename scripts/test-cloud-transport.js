'use strict';
const assert = require('node:assert/strict');
const http = require('node:http');
const { buildAudioRequest, requestTranscription, retryAfterMs, compatibilityFallback } =
  require('../src/main/cloud-transcription');

(async () => {
  const audio = Buffer.from([0, 1, 2, 255, 13, 10, 0, 37]);
  const payload = { format: 'flac', data: audio.toString('base64') };
  let reply;
  let received;
  const server = http.createServer(async (req, res) => {
    const parts = [];
    for await (const part of req) parts.push(part);
    received = { body: Buffer.concat(parts), headers: req.headers };
    reply(res);
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const options = { audioPayload: payload, model: 'test-model', language: 'pt', apiKey: 'test-key',
    endpoint: `http://127.0.0.1:${server.address().port}/audio/transcriptions` };
  try {
    reply = (res) => { res.setHeader('x-generation-id', 'test-generation'); res.end(JSON.stringify({ text: 'Olá', usage: { seconds: 1, cost: .01 } })); };
    const result = await requestTranscription(options);
    assert.equal(result.text, 'Olá');
    assert.equal(result.timing.format, 'flac');
    assert.equal(result.timing.generationId, 'test-generation');
    const boundary = received.headers['content-type'].split('boundary=')[1];
    const fileHeader = Buffer.from('Content-Type: audio/flac\r\n\r\n');
    const start = received.body.indexOf(fileHeader) + fileHeader.length;
    assert.deepEqual(received.body.subarray(start, start + audio.length), audio);
    assert.equal(received.body.subarray(start + audio.length).toString(), `\r\n--${boundary}--\r\n`);
    assert.match(received.body.toString(), /name="temperature"\r\n\r\n0/);
    assert.match(received.body.toString(), /name="language"\r\n\r\npt/);
    assert.equal(Number(received.headers['content-length']), received.body.length);
    assert.equal(result.timing.requestBytes, received.body.length);

    await requestTranscription({ ...options, forceJson: true });
    assert.deepEqual(JSON.parse(received.body), { model: 'test-model', input_audio: {
      data: payload.data, format: 'flac' }, temperature: 0, language: 'pt' });
    const large = buildAudioRequest({ format: 'wav', data: Buffer.alloc(25 * 1024 * 1024 + 1).toString('base64') }, 'm');
    assert.equal(large.transport, 'json');

    reply = (res) => { res.writeHead(429, { 'Retry-After': '12' }); res.end('{"error":{"message":"Busy"}}'); };
    await assert.rejects(requestTranscription(options), (error) => error.status === 429 && error.retryAfterMs === 12000 && error.timing.status === 429);
    reply = (res) => { res.writeHead(401); res.end('{}'); };
    await assert.rejects(requestTranscription(options), (error) => error.status === 401);
    reply = (res) => res.end('{"text":""}');
    await assert.rejects(requestTranscription(options), /empty transcription/);
    // The timeout must remain active AFTER response headers, through the response body.
    reply = (res) => { res.writeHead(200); res.flushHeaders(); res.write('{"text":"'); };
    await assert.rejects(requestTranscription({ ...options, timeoutMs: 50 }), /timed out/);
    assert.equal(retryAfterMs('Thu, 01 Jan 1970 00:00:12 GMT', 1000), 11000);
    assert.equal(retryAfterMs('bad'), 0);
    assert.equal(compatibilityFallback({ status: 415, message: 'Unsupported FLAC', transport: 'multipart' }, payload, false), 'wav');
    assert.equal(compatibilityFallback({ status: 400, message: 'input_audio required', transport: 'multipart' }, payload, false), 'json');
    assert.equal(compatibilityFallback({ status: 401, message: 'Invalid key' }, payload, false), null);
    console.log('cloud-transport-ok: exact binary payload, fields, legacy JSON, size limit, 429, authentication, empty result, response-body timeout');
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
