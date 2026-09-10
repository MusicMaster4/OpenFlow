'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const mainSource = fs.readFileSync(path.join(root, 'src', 'main', 'main.js'), 'utf8');
const overlaySource = fs.readFileSync(path.join(root, 'src', 'renderer', 'overlay.js'), 'utf8');
const hotkeySource = fs.readFileSync(path.join(root, 'python', 'hotkey_listener.py'), 'utf8');
const dictationSource = fs.readFileSync(path.join(root, 'python', 'dictation_service.py'), 'utf8');

function contains(source, pattern, label) {
  assert(pattern.test(source), `missing wiring: ${label}`);
}

contains(mainSource, /function normalizeCaptureSource\(/, 'normalizeCaptureSource helper');
contains(mainSource, /function getSystemAudioShortcut\(/, 'getSystemAudioShortcut helper');
contains(mainSource, /source: captureSource/, 'start command forwards capture source');
contains(mainSource, /source: 'system'/, 'source upgrades restart capture as system audio');
contains(
  mainSource,
  /if \(captureSource !== 'system'\) \{\s*engageCaptureMute\(\);/,
  'system-audio capture does not duck other apps',
);
contains(mainSource, /sendOverlayFeedback\('stop-sound'\)/, 'system-audio capture stops cue sounds');
contains(
  mainSource,
  /hadLiveCapture && !wasSystemAudio/,
  'system-audio stop does not play the close cue into the recording',
);
contains(overlaySource, /case 'stop-sound':/, 'overlay handles stop-sound feedback');
contains(hotkeySource, /active_source = "system"/, 'hotkey listener tracks system source');
contains(hotkeySource, /system_audio_shortcut/, 'hotkey listener reports the derived shortcut');
contains(dictationSource, /from system_audio import SystemAudioCapture/, 'dictation worker imports WASAPI capture');
contains(dictationSource, /self\.capture_source == "system"/, 'dictation worker branches on system source');

console.log('PASS: computer-audio transcription wiring is present.');

// Exercise the acknowledgement handler without launching Electron or audio hardware.
const vm = require('vm');
const feedbackHandler = mainSource.slice(
  mainSource.indexOf('function playPendingSystemAudioFeedback('),
  mainSource.indexOf('function resetDictationFeedbackState('),
);
const cues = [];
const context = {
  pendingSystemAudioFeedback: { sessionId: 10, sound: 'close' },
  state: { captureMode: null, pendingStartMode: null },
  sendOverlayFeedback: (type, payload) => cues.push({ type, ...payload }),
};
vm.createContext(context);
vm.runInContext(feedbackHandler, context);
context.playPendingSystemAudioFeedback(9);
assert.strictEqual(cues.length, 0, 'stale acknowledgement must not play a cue');
context.playPendingSystemAudioFeedback(10);
assert.strictEqual(cues[0].sound, 'close');
context.playPendingSystemAudioFeedback(10);
assert.strictEqual(cues.length, 1, 'duplicate acknowledgement must not repeat the cue');
context.pendingSystemAudioFeedback = { sessionId: 11, sound: 'cancel' };
context.playPendingSystemAudioFeedback(11);
assert.strictEqual(cues[1].sound, 'cancel');
context.pendingSystemAudioFeedback = { sessionId: 12, sound: 'close' };
context.state.captureMode = 'hold';
context.playPendingSystemAudioFeedback(12);
assert.strictEqual(cues.length, 2, 'a new capture must not record an old cue');
context.state.captureMode = null;
context.state.pendingStartMode = 'hold';
context.pendingSystemAudioFeedback = { sessionId: 13, sound: 'cancel' };
context.playPendingSystemAudioFeedback(13);
assert.strictEqual(cues.length, 2, 'a pending capture must not record an old cue');
for (const method of ['stop', 'cancel']) {
  const body = dictationSource.split(`    def ${method}(`)[1].split('\n    def ')[0];
  assert(body.indexOf('self._close_stream()') < body.indexOf('self.emit("capture-closed"'),
    `${method} must close the stream before acknowledging`);
  assert(body.includes('self.emit("capture-closed", {"session_id": session_id})'));
}
console.log('PASS: deferred close/cancel cues, stale acknowledgements, and capture overlap.');

// Run the actual start/mode-change logic against an isolated application state.
const startLogic = mainSource.slice(mainSource.indexOf('function startListening('),
  mainSource.indexOf('function stopListening('));
const handsFreeLogic = mainSource.slice(mainSource.indexOf('function playHandsFreeSoundIfEligible('),
  mainSource.indexOf('function flushPendingOverlayFeedbacks('));
function captureScenario(initial = {}) {
  const events = [];
  const sandbox = {
    state: { engineReady: true, serviceOnline: true, listening: false, captureMode: null,
      captureSource: null, dictationSessionId: null, ...initial },
    process: { platform: 'win32' }, Date: { now: () => 1000 },
    currentDictationStartedAt: 999, HANDS_FREE_SOUND_DELAY_MS: 250,
    suppressStartRequestsUntil: 0, suppressStartSoundUntil: 0,
    pendingSystemAudioFeedback: null,
    normalizeCaptureMode: x => x, normalizeCaptureSource: x => x,
    hasOngoingTranscription: () => false, getCaptureNotice: () => '',
    getNextDictationSessionId: () => 20,
    setOverlayAudioLevel: () => {}, releaseCaptureMute: () => {},
    engageCaptureMute: () => events.push({ type: 'mute' }),
    sendOverlayFeedback: (type, payload = {}) => events.push({ type, ...payload }),
    sendServiceCommand: (type, payload) => events.push({ type: `service-${type}`, ...payload }),
  };
  sandbox.setState = patch => Object.assign(sandbox.state, patch);
  sandbox.snapshotState = () => sandbox.state;
  vm.createContext(sandbox);
  vm.runInContext(handsFreeLogic + startLogic, sandbox);
  return { sandbox, events };
}
for (const initial of [
  {},
  { listening: true, captureMode: 'hold', captureSource: 'system', dictationSessionId: 20 },
  { listening: true, captureMode: 'hold', captureSource: 'microphone', dictationSessionId: 20 },
  { listening: true, captureMode: 'hands-free', captureSource: 'microphone', dictationSessionId: 20 },
]) {
  const { sandbox, events } = captureScenario(initial);
  sandbox.startListening('hands-free', 'system');
  assert.strictEqual(events.filter(e => e.sound === 'handsfree').length, 1,
    'direct, rapid, and source-upgrade activation must play hands-free feedback');
  const soundIndex = events.findIndex(e => e.sound === 'handsfree');
  assert(events.findIndex(e => e.type === 'stop-sound') < soundIndex,
    'source upgrade must not clear the hands-free sound');
  assert(!events.some(e => e.type === 'mute'), 'system audio must remain audible');
  sandbox.startListening('hands-free', 'system');
  assert.strictEqual(events.filter(e => e.sound === 'handsfree').length, 1,
    'repeated mode events must not duplicate feedback');
}
const held = captureScenario();
held.sandbox.startListening('hold', 'system');
assert(!held.events.some(e => e.sound === 'handsfree'), 'hold capture is not hands-free');
const microphone = captureScenario({ listening: true, captureMode: 'hold', captureSource: 'microphone' });
microphone.sandbox.startListening('hands-free', 'microphone');
assert(!microphone.events.some(e => e.sound === 'handsfree'), 'retain microphone start-cue suppression');
console.log('PASS: system hands-free activation, rapid transitions, source upgrades, and duplicate events.');
