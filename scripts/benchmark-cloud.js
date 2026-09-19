// Explicit live benchmark: synthetic audio only; uses the existing encrypted app key.
// Run with Electron after test-cloud-audio.py has prepared build/cloud-benchmark.
'use strict';
const { app, safeStorage } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { performance } = require('node:perf_hooks');
const { requestTranscription } = require('../src/main/cloud-transcription');
app.setPath('userData', path.join(app.getPath('appData'), 'OpenFlow'));

app.whenReady().then(async () => {
  const store = path.join(app.getPath('appData'), 'OpenFlow', 'store');
  const secret = JSON.parse(fs.readFileSync(path.join(store, 'secrets.json'))).openRouterApiKey;
  const raw = Buffer.from(secret.data, 'base64');
  const apiKey = (secret.encrypted ? safeStorage.decryptString(raw) : raw.toString('utf8')).trim();
  const settings = JSON.parse(fs.readFileSync(path.join(store, 'settings.json')));
  const model = settings.preferences.cloudTranscriptionModel;
  const languages = settings.preferences.allowedLanguages;
  const language = languages.length === 1 ? languages[0] : undefined;
  const directory = path.resolve(__dirname, '../build/cloud-benchmark');
  const encoding = JSON.parse(fs.readFileSync(path.join(directory, 'encoding.json')));
  const wav = fs.readFileSync(path.join(directory, 'baseline.wav')).toString('base64');
  const flac = fs.readFileSync(path.join(directory, `optimized.${encoding.format}`)).toString('base64');
  const endpoint = 'https://openrouter.ai/api/v1/audio/transcriptions';
  const runs = [];
  for (const mode of ['old', 'new', 'new', 'old', 'old', 'new']) {
    const started = performance.now();
    try {
      let result;
      if (mode === 'old') {
        const body = { model, input_audio: { data: wav, format: 'wav' }, temperature: 0 };
        if (language) body.language = language;
        const serialized = JSON.stringify(body);
        const response = await fetch(endpoint, { method: 'POST', headers: {
          Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', Accept: 'application/json',
          'User-Agent': `OpenFlow/${require('../package.json').version}`,
        }, body: serialized, signal: AbortSignal.timeout(120000) });
        const value = await response.json();
        if (!response.ok) throw Object.assign(new Error('API request failed'), { status: response.status });
        result = { text: value.text, cost_usd: value.usage?.cost,
          timing: { requestBytes: Buffer.byteLength(serialized), status: response.status,
            generationId: response.headers.get('x-generation-id') } };
      } else {
        result = await requestTranscription({ audioPayload: { data: flac, format: encoding.format },
          model, language, apiKey, endpoint, userAgent: `OpenFlow/${require('../package.json').version}` });
      }
      const run = { mode, ms: Math.round(performance.now() - started), costUsd: result.cost_usd,
        text: result.text, timing: result.timing };
      runs.push(run);
      console.log(JSON.stringify({ ...run, text: undefined }));
    } catch (error) {
      runs.push({ mode, ms: Math.round(performance.now() - started), status: error.status || 0, failed: true });
      console.log(JSON.stringify(runs.at(-1)));
    }
    fs.writeFileSync(path.join(directory, 'live-results.json'), JSON.stringify({ model, encoding, runs }, null, 2));
  }
  app.exit(0);
}).catch((error) => { console.error('Benchmark setup failed:', error.message); app.exit(1); });
