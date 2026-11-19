'use strict';

const { spawn } = require('node:child_process');
const readline = require('node:readline');

// One warm STA process owns clipboard operations. Text travels over stdin rather
// than Windows' 32K command line; each reply follows clipboard restoration.
function createWindowsTextInserter({ scriptPath, spawnProcess = spawn, timeoutMs = 8000,
  startupTimeoutMs = 15000 } = {}) {
  let worker = null;
  let sequence = 0;
  let chain = Promise.resolve();
  let disposed = false;

  function start() {
    if (disposed) return Promise.reject(new Error('Text insertion has shut down.'));
    if (worker) return worker.ready;

    const child = spawnProcess('powershell.exe', [
      '-NoLogo', '-NoProfile', '-NonInteractive', '-STA', '-ExecutionPolicy', 'Bypass',
      '-File', scriptPath, '-Server',
    ], { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    const session = { child, pending: null, stderr: '', stopped: false };
    worker = session;
    session.ready = new Promise((resolve, reject) => {
      session.readyResolve = resolve;
      session.readyReject = reject;
    });
    // A warm-up failure must not create an unhandled rejection.
    session.ready.catch(() => {});

    session.fail = (error) => {
      if (session.stopped) return;
      session.stopped = true;
      clearTimeout(session.startupTimer);
      if (worker === session) worker = null;
      session.readyReject(error);
      if (session.pending) {
        clearTimeout(session.pending.timer);
        session.pending.reject(error);
        session.pending = null;
      }
      session.reader.close();
      child.kill();
    };
    session.reader = readline.createInterface({ input: child.stdout });
    session.reader.on('line', (line) => {
      if (session.stopped) return;
      let message;
      try { message = JSON.parse(line); } catch { return; }
      if (message.event === 'ready') {
        clearTimeout(session.startupTimer);
        session.readyResolve(session);
      } else if (session.pending && message.id === session.pending.id) {
        const pending = session.pending;
        session.pending = null;
        clearTimeout(pending.timer);
        if (message.error) pending.reject(new Error(message.error));
        else pending.resolve();
      }
    });
    child.stderr.on('data', (chunk) => {
      session.stderr = (session.stderr + chunk.toString()).slice(-4000);
    });
    child.on('error', (error) => session.fail(error));
    child.stdin.on('error', (error) => session.fail(error));
    child.on('close', (code) => session.fail(new Error(
      session.stderr || `Text insertion process exited (${code}).`,
    )));
    session.startupTimer = setTimeout(() => session.fail(
      new Error('Timed out starting the text insertion process.'),
    ), startupTimeoutMs);
    return session.ready;
  }

  async function run(text, method) {
    const session = await start();
    if (session.stopped) throw new Error('Text insertion process stopped. Please try again.');
    return new Promise((resolve, reject) => {
      const id = ++sequence;
      const timer = setTimeout(() => session.fail(
        new Error('Timed out while pasting text into the active app.'),
      ), timeoutMs);
      session.pending = { id, resolve, reject, timer };
      // Never replay a failed request automatically: its keystroke may already
      // have reached the target. The next explicit request starts a fresh worker.
      try {
        session.child.stdin.write(`${JSON.stringify({ id, text, method })}\n`, 'utf8', (error) => {
          if (error) session.fail(error);
        });
      } catch (error) {
        session.fail(error);
      }
    });
  }

  return {
    warmup: start,
    insert(text, method = 'auto') {
      const result = chain.then(() => run(text, method));
      chain = result.catch(() => {});
      return result;
    },
    dispose() {
      disposed = true;
      if (worker) worker.fail(new Error('Text insertion has shut down.'));
    },
  };
}

module.exports = { createWindowsTextInserter };
