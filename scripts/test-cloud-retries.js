'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { isRetryableCloudError, compatibilityFallback } = require('../src/main/cloud-transcription');

const source = fs.readFileSync(path.join(__dirname, '../src/main/main.js'), 'utf8');
function functionSource(name) {
  const start = source.search(new RegExp(`^(?:async )?function ${name}\\(`, 'm'));
  assert(start >= 0);
  const end = source.indexOf('\n}', start) + 2;
  return source.slice(start, end);
}

async function scenario(failures, manual = false, cancel = false, status = 429, retryAfter = 0) {
  let attempts = 0;
  let commits = 0;
  let current = true;
  const delays = [];
  const records = new Map();
  const pending = new Set();
  const state = { phase: 'idle', error: '', cloudTranscriptionModel: 'test-model' };
  const record = { id: 'audio-1', model: 'test-model', data: 'audio' };
  const retryable = isRetryableCloudError({ status });
  const errorMessage = `Provider returned ${status}`;
  let now = 1000;
  const context = vm.createContext({
    CLOUD_TRANSCRIPTION_MAX_ATTEMPTS: Number(source.match(/CLOUD_TRANSCRIPTION_MAX_ATTEMPTS = (\d+)/)[1]),
    pendingCloudRetryIds: pending,
    activeCloudTranscriptionSessions: new Set(),
    state,
    Date: class extends Date { static now() { return now; } },
    isRetryableCloudError,
    compatibilityFallback,
    recordCloudPerformance() {},
    setTimeout(resolve, delay) {
      assert.equal(state.phase, 'transcribing');
      assert.equal(state.error, '');
      assert.equal(context.getCloudRetrySnapshot().length, 0);
      delays.push(delay);
      now += delay;
      if (cancel) current = false;
      resolve();
    },
    async transcribeWithOpenRouter(payload) {
      assert.equal(payload.data, 'audio');
      attempts += 1;
      assert.equal(state.phase, 'transcribing');
      assert.equal(state.error, '');
      assert.equal(context.getCloudRetrySnapshot().length, 0);
      now += 100;
      if (attempts <= failures) throw Object.assign(new Error(errorMessage), { status, retryAfterMs: retryAfter });
      return { text: 'Success' };
    },
    isBackgroundTranscriptionSession: () => false,
    isCurrentDictationSession: () => current,
    saveCloudRetry: () => { records.set(record.id, record); return record; },
    readCloudRetryRecord: (id) => records.get(id),
    getCloudRetryRecords: () => [...records.values()],
    isCloudRetryExpired: () => false,
    setState: (patch) => Object.assign(state, patch),
    snapshotState: () => state,
    async commitTranscription(result) {
      commits += 1;
      assert.equal(result.transcription_ms, attempts * 100 + delays.reduce((a, b) => a + b, 0));
      assert.equal(result.cloud_timing.attempts.length, attempts);
      state.phase = 'idle';
    },
    deleteCloudRetry: (id) => records.delete(id),
    updateCloudRetryError(id, error) {
      assert.equal(attempts, retryable ? 7 : 1);
      records.get(id).error = error.message;
      assert.equal(context.getCloudRetrySnapshot().length, 1);
    },
    getCloudRetryPath: (id) => id,
    protectCloudRetryRecord: (value) => value,
    writeJsonFile: (id, value) => records.set(id, value),
    resetDictationFeedbackState() {},
    releaseCaptureMute() {},
    translateMain: (key) => key,
  });
  vm.runInContext([
    'getCloudRetrySnapshot', 'transcribeWithOpenRouterRetries',
    'handleCloudAudioPayload', 'retryCloudTranscription',
  ].map(functionSource).join('\n'), context);
  if (manual) records.set(record.id, record);
  await (manual ? context.retryCloudTranscription(record.id) : context.handleCloudAudioPayload(record, 1));
  const failed = failures > 0 && (!retryable || failures >= 7);
  assert.equal(attempts, cancel || !retryable ? 1 : Math.min(failures + 1, 7));
  assert.equal(commits, !cancel && !failed ? 1 : 0);
  assert.equal(records.size, !cancel && failed ? 1 : 0);
  assert.equal(pending.size, 0);
  assert.equal(state.error, !cancel && failed ? errorMessage : '');
  assert.equal(delays.length, cancel ? 1 : attempts - 1);
  assert(delays.every((delay) => delay >= Math.max(1000, retryAfter) && delay <= Math.max(8000, retryAfter)));
}

async function compatibilityScenario() {
  const original = { id: 'saved-flac', model: 'test', format: 'flac', data: 'lossless' };
  let attempts = 0;
  let conversions = 0;
  const delays = [];
  const context = vm.createContext({
    CLOUD_TRANSCRIPTION_MAX_ATTEMPTS: 7, isRetryableCloudError, compatibilityFallback,
    recordCloudPerformance() {},
    setTimeout(resolve, delay) { delays.push(delay); resolve(); },
    async convertCloudAudioToWav(payload) {
      assert.equal(payload.data, original.data);
      conversions += 1;
      return { format: 'wav', data: 'same-pcm' };
    },
    async transcribeWithOpenRouter(payload, options) {
      attempts += 1;
      if (attempts === 1) throw Object.assign(new Error('Unsupported FLAC codec'), { status: 415, transport: 'multipart' });
      assert.equal(payload.format, 'wav');
      assert.equal(payload.data, 'same-pcm');
      if (attempts === 2) throw Object.assign(new Error('Expected input_audio JSON'), { status: 400, transport: 'multipart' });
      assert.equal(options.forceJson, true);
      if (attempts === 3) throw Object.assign(new Error('Busy'), { status: 429, retryAfterMs: 15000 });
      return { text: 'Recovered' };
    },
  });
  vm.runInContext(functionSource('transcribeWithOpenRouterRetries'), context);
  const result = await context.transcribeWithOpenRouterRetries(original);
  assert.equal(result.text, 'Recovered');
  assert.equal(result.cloud_timing.attempts.length, 4);
  assert.equal(conversions, 1);
  assert.deepEqual(delays, [15000]);
  assert.equal(original.format, 'flac', 'compatibility conversion must not corrupt the saved recording');
}

(async () => {
  for (const manual of [false, true]) {
    for (const failures of [0, 2, 6, 7, 10]) await scenario(failures, manual);
  }
  await scenario(7, false, true);
  for (const status of [408, 409, 425, 500, 502, 503, 504, 529, 0]) await scenario(2, false, false, status);
  for (const status of [400, 401, 403, 404, 413, 422]) await scenario(7, false, false, status);
  await scenario(2, false, false, 429, 15000);
  await compatibilityScenario();
  console.log('cloud-retries-ok: seven-attempt limit, recovery, loading, failure visibility, manual retry and cancellation');
})().catch((error) => { console.error(error); process.exitCode = 1; });
