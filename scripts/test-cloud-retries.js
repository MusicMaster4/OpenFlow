'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../src/main/main.js'), 'utf8');
function functionSource(name) {
  const start = source.search(new RegExp(`^(?:async )?function ${name}\\(`, 'm'));
  assert(start >= 0);
  const end = source.indexOf('\n}', start) + 2;
  return source.slice(start, end);
}

async function scenario(failures, manual = false, cancel = false) {
  let attempts = 0;
  let commits = 0;
  let current = true;
  const delays = [];
  const records = new Map();
  const pending = new Set();
  const state = { phase: 'idle', error: '', cloudTranscriptionModel: 'test-model' };
  const record = { id: 'audio-1', model: 'test-model', data: 'audio' };
  const context = vm.createContext({
    CLOUD_TRANSCRIPTION_MAX_ATTEMPTS: Number(source.match(/CLOUD_TRANSCRIPTION_MAX_ATTEMPTS = (\d+)/)[1]),
    pendingCloudRetryIds: pending,
    activeCloudTranscriptionSessions: new Set(),
    state,
    setTimeout(resolve, delay) {
      assert.equal(state.phase, 'transcribing');
      assert.equal(state.error, '');
      assert.equal(context.getCloudRetrySnapshot().length, 0);
      delays.push(delay);
      if (cancel) current = false;
      resolve();
    },
    async transcribeWithOpenRouter(payload) {
      assert.equal(payload.data, 'audio');
      attempts += 1;
      assert.equal(state.phase, 'transcribing');
      assert.equal(state.error, '');
      assert.equal(context.getCloudRetrySnapshot().length, 0);
      if (attempts <= failures) throw new Error('Provider returned 429');
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
    async commitTranscription() { commits += 1; state.phase = 'idle'; },
    deleteCloudRetry: (id) => records.delete(id),
    updateCloudRetryError(id, error) {
      assert.equal(attempts, 7);
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
  assert.equal(attempts, cancel ? 1 : Math.min(failures + 1, 7));
  assert.equal(commits, !cancel && failures < 7 ? 1 : 0);
  assert.equal(records.size, !cancel && failures >= 7 ? 1 : 0);
  assert.equal(pending.size, 0);
  assert.equal(state.error, !cancel && failures >= 7 ? 'Provider returned 429' : '');
  assert.equal(delays.length, cancel ? 1 : attempts - 1);
  assert(delays.every((delay) => delay >= 1000 && delay <= 8000));
}

(async () => {
  for (const manual of [false, true]) {
    for (const failures of [0, 2, 6, 7, 10]) await scenario(failures, manual);
  }
  await scenario(7, false, true);
  console.log('cloud-retries-ok: seven-attempt limit, recovery, loading, failure visibility, manual retry and cancellation');
})().catch((error) => { console.error(error); process.exitCode = 1; });
