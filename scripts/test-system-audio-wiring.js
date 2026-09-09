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
