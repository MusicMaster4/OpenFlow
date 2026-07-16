const assert = require('assert');
const path = require('path');
const { app, BrowserWindow, ipcMain } = require('electron');

const PLAYBACK_TIMEOUT_MS = 6000;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function readProbe(windowRef) {
  return windowRef.webContents.executeJavaScript('window.__feedbackAudioProbe');
}

async function waitForEnded(windowRef, expectedCount) {
  const deadline = Date.now() + PLAYBACK_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const probe = await readProbe(windowRef);
    if (probe.ended >= expectedCount) {
      return probe;
    }
    await delay(50);
  }
  return readProbe(windowRef);
}

async function run() {
  ipcMain.handle('get-state', () => ({
    phase: 'idle',
    captureMode: null,
    audioLevel: 0,
    overlayOpacity: 100,
    overlayScale: 100,
    overlayDynamicSize: false,
    soundEffectsEnabled: true,
  }));

  const windowRef = new BrowserWindow({
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '..', 'src', 'main', 'overlay-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      autoplayPolicy: 'no-user-gesture-required',
      backgroundThrottling: false,
    },
  });

  await windowRef.loadFile(path.join(__dirname, '..', 'src', 'renderer', 'overlay.html'));
  await windowRef.webContents.executeJavaScript(`
    (() => {
      const probe = { plays: 0, ended: 0, errors: [] };
      const originalPlay = HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play = function instrumentedFeedbackPlay(...args) {
        probe.plays += 1;
        this.addEventListener('ended', () => { probe.ended += 1; }, { once: true });
        this.addEventListener('error', () => {
          probe.errors.push(this.error?.message || 'media-error');
        }, { once: true });
        return originalPlay.apply(this, args).catch((error) => {
          probe.errors.push(String(error?.message || error));
          throw error;
        });
      };
      window.__feedbackAudioProbe = probe;
    })();
  `);

  windowRef.webContents.send('overlay-feedback', {
    type: 'play-sound',
    payload: { sound: 'start', interrupt: true },
  });
  const firstPlayback = await waitForEnded(windowRef, 1);
  assert.strictEqual(firstPlayback.ended >= 1, true, JSON.stringify(firstPlayback));

  windowRef.webContents.send('overlay-feedback', { type: 'reset-sound-output', payload: {} });
  windowRef.webContents.send('overlay-feedback', {
    type: 'play-sound',
    payload: { sound: 'close', interrupt: true },
  });
  const finalProbe = await waitForEnded(windowRef, 2);

  assert.strictEqual(finalProbe.plays >= 2, true, JSON.stringify(finalProbe));
  assert.strictEqual(finalProbe.ended >= 2, true, JSON.stringify(finalProbe));
  assert.deepStrictEqual(finalProbe.errors, []);
  console.log(
    `feedback-audio-runtime-ok: ${finalProbe.plays} plays reached ${finalProbe.ended} ended events on the default output`,
  );

  windowRef.destroy();
}

app.whenReady()
  .then(run)
  .then(() => app.quit())
  .catch((error) => {
    console.error(error);
    app.exit(1);
  });
