'use strict';
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { PassThrough, Writable } = require('node:stream');
const fs = require('node:fs');
const vm = require('node:vm');
const { createWindowsTextInserter } = require('../src/main/windows-text-inserter');

const tick = () => new Promise((resolve) => setImmediate(resolve));
class FakeChild extends EventEmitter {
  constructor(args) {
    super();
    this.args = args;
    this.stdout = new PassThrough();
    this.stderr = new PassThrough();
    this.requests = [];
    this.stdin = new Writable({ write: (chunk, _encoding, done) => {
      this.requests.push(JSON.parse(chunk.toString()));
      done();
    } });
    this.killed = false;
  }
  reply(value) { this.stdout.write(`${JSON.stringify(value)}\n`); }
  kill() { this.killed = true; }
}

(async () => {
  const children = [];
  const service = createWindowsTextInserter({ scriptPath: 'send_text.ps1', timeoutMs: 500,
    startupTimeoutMs: 500, spawnProcess: (_exe, args, options) => {
      assert.equal(options.windowsHide, true);
      const child = new FakeChild(args);
      children.push(child);
      return child;
    } });
  try {
    const warmed = service.warmup();
    children[0].reply({ event: 'ready' });
    await warmed;
    const text = 'Transcrição longa, com ação e emoji 🗣️.\n'.repeat(4000);
    const first = service.insert(text);
    const second = service.insert('second');
    await tick();
    const child = children[0];
    assert.equal(children.length, 1, 'reuse the warmed process');
    assert.equal(child.requests.length, 1, 'queue until clipboard restoration is acknowledged');
    assert.equal(child.requests[0].text, text, 'long UTF-8 payload must arrive intact over stdin');
    assert(child.args.join(' ').length < 1000, 'text must never be part of the command line');
    child.reply({ id: -1 });
    await tick();
    assert.equal(child.requests.length, 1, 'ignore stale responses');
    child.reply({ id: child.requests[0].id });
    await first;
    await tick();
    assert.equal(child.requests[1].text, 'second');
    const rejected = assert.rejects(second, /access denied/);
    child.reply({ id: child.requests[1].id, error: 'access denied' });
    await rejected;
    const third = service.insert('third');
    await tick();
    child.reply({ id: child.requests[2].id });
    await third;
    assert.equal(children.length, 1, 'a per-request failure does not poison the worker');

    await assert.rejects(service.insert('timeout'), /Timed out while pasting/);
    assert(child.killed, 'terminate a hung worker');
    const recovered = service.insert('recovered');
    await tick();
    children[1].reply({ event: 'ready' });
    await tick();
    children[1].reply({ id: children[1].requests[0].id });
    await recovered;
    assert.equal(children[1].requests.length, 1, 'never replay an uncertain paste');

    const crashed = service.insert('crash');
    const crashRejected = assert.rejects(crashed, /exited/);
    await tick();
    children[1].emit('close', 1);
    await crashRejected;
    const notReady = service.insert('startup timeout');
    await assert.rejects(notReady, /Timed out starting/);
    assert(children[2].killed);
    const brokenPipe = service.insert('broken pipe');
    const pipeRejected = assert.rejects(brokenPipe, /broken pipe/);
    await tick();
    children[3].reply({ event: 'ready' });
    await tick();
    children[3].stdin.emit('error', new Error('broken pipe'));
    await pipeRejected;

    const stopped = service.insert('stop');
    const stopRejected = assert.rejects(stopped, /shut down/);
    const queued = service.insert('queued at shutdown');
    const queuedRejected = assert.rejects(queued, /shut down/);
    await tick();
    service.dispose();
    await Promise.all([stopRejected, queuedRejected]);
  } finally { service.dispose(); }

  // Paste-last must read the cached text and preserve recording/transcription
  // changes that happen while an insertion is awaiting clipboard cleanup.
  const source = fs.readFileSync(require.resolve('../src/main/main'), 'utf8');
  const start = source.indexOf('let pasteLastInFlight = false;');
  const end = source.indexOf('\nfunction ', start);
  let finish;
  let inserts = 0;
  const state = { phase: 'transcribing', listening: false, pendingPaste: true, dictationSessionId: 42 };
  const context = { state, PASTE_SHORTCUT_SETTLE_DELAY_MS: 0,
    setState: (patch) => Object.assign(state, patch),
    getLatestSavedTranscriptionText: () => 'cached transcription',
    getLatestPersistedTranscriptionText: () => { throw new Error('unexpected disk read'); },
    normalizeTextForPaste: (text) => text,
    insertTextIntoFocusedApp: (text) => {
      assert.equal(text, 'cached transcription');
      inserts++;
      return new Promise((resolve) => { finish = resolve; });
    },
  };
  vm.createContext(context);
  vm.runInContext(source.slice(start, end), context);
  const replay = context.pasteLatestTranscription();
  await context.pasteLatestTranscription();
  assert.equal(inserts, 1, 'ignore repeated shortcut events while a paste is pending');
  assert.equal(state.phase, 'transcribing');
  state.phase = 'listening';
  state.listening = true;
  state.dictationSessionId = 43;
  finish();
  await replay;
  assert.deepEqual(state, { phase: 'listening', listening: true, pendingPaste: true,
    dictationSessionId: 43, error: '' });
  context.insertTextIntoFocusedApp = async () => { throw new Error('blocked input'); };
  await context.pasteLatestTranscription();
  assert.match(state.error, /blocked input/);
  assert.equal(state.phase, 'listening');
  context.getLatestSavedTranscriptionText = () => '';
  context.getLatestPersistedTranscriptionText = () => '';
  await context.pasteLatestTranscription();
  assert.match(state.error, /Nenhuma transcricao/);
  console.log('PASS: long UTF-8 transport, warm reuse, serialization, errors, timeout/crash recovery, shutdown and paste-last state isolation.');
})().catch((error) => { console.error(error); process.exitCode = 1; });
