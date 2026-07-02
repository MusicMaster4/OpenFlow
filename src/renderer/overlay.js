const overlayEls = {
  shell: document.getElementById('overlay-shell'),
  pill: document.getElementById('overlay-pill'),
  badge: document.getElementById('overlay-badge'),
  wave: document.getElementById('overlay-wave'),
  loader: document.getElementById('overlay-loader'),
  readySequence: document.getElementById('overlay-ready-sequence'),
  readyLabel: document.getElementById('overlay-ready-label'),
  tooShort: document.getElementById('overlay-too-short'),
  tooShortLabel: document.getElementById('overlay-too-short-label'),
  glyph: document.getElementById('overlay-glyph'),
};

let dragState = null;
let queuedPoint = null;
let dragFrame = 0;
let levelFrame = 0;
let currentAudioLevel = 0;
let targetAudioLevel = 0;
let lastOverlayMode = 'idle';
let currentOverlayState = {
  phase: 'idle',
  captureMode: null,
  audioLevel: 0,
  overlayOpacity: 100,
  overlayScale: 100,
  overlayDynamicSize: false,
};
let soundEffectsEnabled = true;
let overlayBgOpacity = 1;
let overlayScale = 1;
let overlayDynamicSize = false;
let feedbackTimer = null;
let activeFeedback = null;
let activeSoundKey = null;
let soundDrainScheduled = false;
let soundWatchdog = null;

const SOUND_WATCHDOG_MS = 4000;

const overlayReadyLabels = {
  en: 'READY',
  'pt-BR': 'PRONTO',
  es: 'LISTO',
  fr: 'PRET',
  de: 'BEREIT',
  it: 'PRONTO',
  nl: 'KLAAR',
  el: 'ETOIMO',
  ru: 'GOTOVO',
  'zh-CN': '就绪',
  ja: '準備完了',
  ko: '준비됨',
  ar: 'جاهز',
  hi: 'तैयार',
  tr: 'HAZIR',
};

const overlayTooShortLabels = {
  en: 'TOO SHORT',
  'pt-BR': 'MUITO CURTO',
  es: 'MUY CORTO',
  fr: 'TROP COURT',
  de: 'ZU KURZ',
  it: 'TROPPO BREVE',
  nl: 'TE KORT',
  el: 'POLY MIKRO',
  ru: 'KOROTKO',
  'zh-CN': '太短',
  ja: '短すぎ',
  ko: '너무 짧음',
  ar: 'قصير جدا',
  hi: 'बहुत छोटा',
  tr: 'COK KISA',
};

const TOO_SHORT_FEEDBACK_MS = 1600;

const feedbackSounds = {
  loaded: new Audio('../assets/audio/loaded.mp3'),
  start: new Audio('../assets/audio/start.mp3'),
  close: new Audio('../assets/audio/close.mp3'),
  cancel: new Audio('../assets/audio/cancel.mp3'),
  handsfree: new Audio('../assets/audio/handsfree.mp3'),
};
const soundQueue = [];

const waveBars = Array.from(overlayEls.wave.querySelectorAll('span'));
const BAR_COUNT = waveBars.length;
// Spectral shape per bar (~1 means an average band). Defaults to a gentle bell so the
// idle/scalar fallback still looks like a wave when no spectrum data is available.
const defaultShape = waveBars.map((_bar, index) => {
  const center = (BAR_COUNT - 1) / 2;
  const distance = Math.abs(index - center) / center;
  return 0.55 + (1 - distance) * 0.6;
});
let targetShape = defaultShape.slice();
let currentShape = defaultShape.slice();

for (const audio of Object.values(feedbackSounds)) {
  audio.preload = 'auto';
  audio.volume = 0.25;
  audio.load();
}

function getOverlayMode(state) {
  switch (state.phase) {
    case 'listening':
      return 'recording';
    case 'transcribing':
    case 'booting':
      return 'loading';
    case 'offline':
    case 'error':
      return 'error';
    default:
      return 'idle';
  }
}

function isHandsFreeActive(state) {
  return state.phase === 'listening' && state.captureMode === 'hands-free';
}

function flushDrag() {
  dragFrame = 0;
  if (!queuedPoint) {
    return;
  }

  window.flowOverlay.dragTo(queuedPoint);
  queuedPoint = null;
}

function queueDrag(point) {
  queuedPoint = point;
  if (!dragFrame) {
    dragFrame = window.requestAnimationFrame(flushDrag);
  }
}

function getDragPoint(event) {
  if (!dragState) {
    return null;
  }

  return {
    x: Math.round(event.screenX - dragState.offsetX),
    y: Math.round(event.screenY - dragState.offsetY),
  };
}

function stopDrag(event) {
  if (!dragState) {
    return;
  }

  const point = event ? getDragPoint(event) : queuedPoint;
  dragState = null;
  overlayEls.shell.classList.remove('overlay-shell--dragging');

  if (dragFrame) {
    window.cancelAnimationFrame(dragFrame);
    dragFrame = 0;
  }

  if (point) {
    window.flowOverlay.endDrag(point);
  }
  queuedPoint = null;
}

function startDrag(event) {
  if (event.button !== 0) {
    return;
  }

  dragState = {
    offsetX: event.clientX,
    offsetY: event.clientY,
    pointerId: event.pointerId,
  };
  overlayEls.shell.classList.add('overlay-shell--dragging');
  overlayEls.pill.setPointerCapture(event.pointerId);
  event.preventDefault();
}

function handlePointerMove(event) {
  if (!dragState || event.pointerId !== dragState.pointerId) {
    return;
  }

  const point = getDragPoint(event);
  if (!point) {
    return;
  }

  queueDrag(point);
}

// Apply the user's floating-pill customization. Opacity only fades the dark pill
// backdrop (drawn on the ::before layer); the wave/loader/idle effects stay fully
// opaque. Scale shrinks the whole pill. With dynamic size, the pill stays at full size
// while the app is busy or showing ready feedback, shrinking back to half once it is idle.
function applyOverlayStyle(mode, phase) {
  const root = document.documentElement;
  root.style.setProperty('--overlay-bg-opacity', overlayBgOpacity.toFixed(3));

  const expanded =
    mode === 'recording' ||
    mode === 'loading' ||
    phase === 'transcribing' ||
    activeFeedback === 'ready' ||
    activeFeedback === 'too-short';
  const effectiveScale = overlayDynamicSize && !expanded ? overlayScale * 0.5 : overlayScale;
  root.style.setProperty('--overlay-scale', effectiveScale.toFixed(3));
}

function renderOverlay(state) {
  const nextOverlayOpacity = state.overlayOpacity ?? overlayBgOpacity * 100;
  const nextOverlayScale = state.overlayScale ?? overlayScale * 100;
  const nextOverlayDynamicSize = state.overlayDynamicSize ?? overlayDynamicSize;

  currentOverlayState = {
    phase: state.phase,
    captureMode: state.captureMode ?? null,
    audioLevel: state.audioLevel ?? targetAudioLevel,
    overlayOpacity: nextOverlayOpacity,
    overlayScale: nextOverlayScale,
    overlayDynamicSize: nextOverlayDynamicSize,
  };

  overlayBgOpacity = Math.max(0, Math.min(1, Number(nextOverlayOpacity) / 100));
  overlayScale = Math.max(0.1, Math.min(1, Number(nextOverlayScale) / 100));
  overlayDynamicSize = Boolean(nextOverlayDynamicSize);

  const mode = getOverlayMode(state);
  const handsFree = isHandsFreeActive(state);
  applyOverlayStyle(mode, state.phase);
  if (mode !== 'idle' && activeFeedback) {
    clearActiveFeedback();
  }

  overlayEls.shell.dataset.mode = mode;
  overlayEls.shell.dataset.handsFree = handsFree ? 'true' : 'false';
  overlayEls.shell.dataset.feedback = activeFeedback || 'none';
  overlayEls.wave.classList.toggle('hidden', mode !== 'recording');
  overlayEls.loader.classList.toggle('hidden', mode !== 'loading');
  overlayEls.readySequence.classList.toggle('hidden', activeFeedback !== 'ready');
  overlayEls.tooShort.classList.toggle('hidden', activeFeedback !== 'too-short');
  overlayEls.glyph.classList.toggle('hidden', mode === 'recording' || mode === 'loading');
  overlayEls.badge.classList.toggle('hidden', !handsFree);
  overlayEls.badge.setAttribute('aria-hidden', handsFree ? 'false' : 'true');

  if (mode !== 'recording') {
    setAudioLevel(0);
  } else if (lastOverlayMode !== 'recording') {
    setAudioLevel(state.audioLevel || 0);
  }

  lastOverlayMode = mode;
}

function clearSoundWatchdog() {
  if (soundWatchdog) {
    window.clearTimeout(soundWatchdog);
    soundWatchdog = null;
  }
}

function stopAllSounds() {
  soundQueue.length = 0;
  activeSoundKey = null;
  clearSoundWatchdog();
  for (const audio of Object.values(feedbackSounds)) {
    audio.pause();
    audio.currentTime = 0;
  }
}

function stopActiveSound() {
  clearSoundWatchdog();
  if (!activeSoundKey) {
    return;
  }

  const audio = feedbackSounds[activeSoundKey];
  activeSoundKey = null;
  if (!audio) {
    return;
  }

  audio.pause();
  audio.currentTime = 0;
}

function releaseActiveSound(soundKey) {
  if (soundKey && activeSoundKey !== soundKey) {
    return;
  }
  clearSoundWatchdog();
  activeSoundKey = null;
  scheduleSoundDrain();
}

function drainSoundQueue() {
  soundDrainScheduled = false;
  if (!soundEffectsEnabled || activeSoundKey || soundQueue.length === 0) {
    return;
  }

  const soundKey = soundQueue.shift();
  const audio = feedbackSounds[soundKey];
  if (!audio) {
    drainSoundQueue();
    return;
  }

  activeSoundKey = soundKey;
  audio.currentTime = 0;
  // Safety net: if the audio element never fires ended/error (which permanently
  // froze the whole sound queue before), force-release it after a hard timeout.
  clearSoundWatchdog();
  soundWatchdog = window.setTimeout(() => releaseActiveSound(soundKey), SOUND_WATCHDOG_MS);

  const playResult = audio.play();
  if (playResult && typeof playResult.catch === 'function') {
    playResult.catch(() => {
      releaseActiveSound(soundKey);
    });
  }
}

function scheduleSoundDrain() {
  if (soundDrainScheduled) {
    return;
  }

  soundDrainScheduled = true;
  // setTimeout (not requestAnimationFrame) so the queue keeps draining even if the
  // overlay window is hidden/occluded and its animation frames are paused.
  window.setTimeout(drainSoundQueue, 0);
}

function queueSound(soundKey, options = {}) {
  if (!soundEffectsEnabled || !feedbackSounds[soundKey]) {
    return;
  }

  if (options.interrupt) {
    soundQueue.length = 0;
    stopActiveSound();
    soundQueue.unshift(soundKey);
  } else {
    soundQueue.push(soundKey);
  }

  scheduleSoundDrain();
}

function clearActiveFeedback() {
  if (feedbackTimer) {
    window.clearTimeout(feedbackTimer);
    feedbackTimer = null;
  }

  activeFeedback = null;
  overlayEls.shell.dataset.feedback = 'none';
}

function showReadyFeedback(soundKey) {
  clearActiveFeedback();
  activeFeedback = 'ready';
  renderOverlay(currentOverlayState);
  queueSound(soundKey);
  feedbackTimer = window.setTimeout(() => {
    clearActiveFeedback();
    renderOverlay(currentOverlayState);
  }, 1100);
}

function showTooShortFeedback() {
  clearActiveFeedback();
  activeFeedback = 'too-short';
  renderOverlay(currentOverlayState);
  feedbackTimer = window.setTimeout(() => {
    clearActiveFeedback();
    renderOverlay(currentOverlayState);
  }, TOO_SHORT_FEEDBACK_MS);
}

function applyWaveLevel(level) {
  const clampedLevel = Math.max(0, Math.min(1, Number(level) || 0));
  const visualLevel = Math.min(1, clampedLevel * 2);

  waveBars.forEach((bar, index) => {
    const intensity = Math.min(1, visualLevel * currentShape[index]);
    // Base height 4px, maximum height scaled up for a taller wave
    const height = 4 + intensity * 16;
    const opacity = 0.4 + intensity * 0.6;

    // We use Math.round to avoid sub-pixel height rendering (which causes distortion)
    bar.style.height = `${Math.round(height)}px`;
    bar.style.opacity = opacity.toFixed(2);
  });
}

function isWaveSettled() {
  if (Math.abs(targetAudioLevel - currentAudioLevel) >= 0.004) {
    return false;
  }

  for (let index = 0; index < BAR_COUNT; index += 1) {
    if (Math.abs(targetShape[index] - currentShape[index]) >= 0.01) {
      return false;
    }
  }

  return true;
}

function animateWave() {
  levelFrame = 0;

  if (isWaveSettled()) {
    currentAudioLevel = targetAudioLevel;
    for (let index = 0; index < BAR_COUNT; index += 1) {
      currentShape[index] = targetShape[index];
    }
    applyWaveLevel(currentAudioLevel);
    return;
  }

  currentAudioLevel += (targetAudioLevel - currentAudioLevel) * 0.34;
  for (let index = 0; index < BAR_COUNT; index += 1) {
    currentShape[index] += (targetShape[index] - currentShape[index]) * 0.4;
  }
  applyWaveLevel(currentAudioLevel);
  levelFrame = window.requestAnimationFrame(animateWave);
}

function ensureWaveAnimating() {
  if (isWaveSettled()) {
    currentAudioLevel = targetAudioLevel;
    for (let index = 0; index < BAR_COUNT; index += 1) {
      currentShape[index] = targetShape[index];
    }
    applyWaveLevel(currentAudioLevel);
    return;
  }

  if (!levelFrame) {
    levelFrame = window.requestAnimationFrame(animateWave);
  }
}

function setAudioLevel(level) {
  targetAudioLevel = Math.max(0, Math.min(1, Number(level) || 0));
  if (targetAudioLevel === 0) {
    // Relax the spectrum back to its neutral shape while silent.
    targetShape = defaultShape.slice();
  }
  ensureWaveAnimating();
}

function setAudioBands(bands) {
  if (!Array.isArray(bands) || bands.length === 0) {
    return;
  }

  for (let index = 0; index < BAR_COUNT; index += 1) {
    const value = Number(bands[index]);
    targetShape[index] = Number.isFinite(value) ? Math.max(0, Math.min(3, value)) : targetShape[index];
  }
  ensureWaveAnimating();
}

function bindDrag() {
  overlayEls.pill.addEventListener('pointerdown', startDrag);
  overlayEls.pill.addEventListener('pointermove', handlePointerMove);
  overlayEls.pill.addEventListener('pointerup', stopDrag);
  overlayEls.pill.addEventListener('pointercancel', stopDrag);
  overlayEls.pill.addEventListener('lostpointercapture', () => {
    stopDrag();
  });
}

function bindSoundLifecycle() {
  for (const [soundKey, audio] of Object.entries(feedbackSounds)) {
    const release = () => releaseActiveSound(soundKey);

    audio.addEventListener('ended', release);
    audio.addEventListener('error', release);
  }
}

function handleFeedback(feedback) {
  if (!feedback || typeof feedback !== 'object') {
    return;
  }

  switch (feedback.type) {
    case 'loaded-ready':
      showReadyFeedback(feedback.payload?.sound || 'loaded');
      break;
    case 'too-short':
      showTooShortFeedback();
      break;
    case 'play-sound':
      queueSound(feedback.payload?.sound, {
        interrupt: Boolean(feedback.payload?.interrupt),
      });
      break;
    default:
      break;
  }
}

function initTheme() {
  const syncTheme = () => {
    const savedTheme = localStorage.getItem('openflow-theme') || 'dark';
    if (document.documentElement.getAttribute('data-theme') !== savedTheme) {
      document.documentElement.setAttribute('data-theme', savedTheme);
    }

    const savedLanguage = localStorage.getItem('openflow-interface-language') || 'en';
    document.documentElement.lang = savedLanguage;
    document.documentElement.dir = savedLanguage === 'ar' ? 'rtl' : 'ltr';
    overlayEls.readyLabel.textContent = overlayReadyLabels[savedLanguage] || overlayReadyLabels.en;
    overlayEls.tooShortLabel.textContent =
      overlayTooShortLabels[savedLanguage] || overlayTooShortLabels.en;
  };
  syncTheme();
  window.addEventListener('storage', syncTheme);
  setInterval(syncTheme, 500); // Polling as fallback across electron windows
}

async function bootstrap() {
  initTheme();
  const initialState = await window.flowOverlay.getState();
  soundEffectsEnabled = Boolean(initialState.soundEffectsEnabled);
  applyWaveLevel(initialState.audioLevel || 0);
  renderOverlay(initialState);
  bindDrag();
  bindSoundLifecycle();

  window.flowOverlay.onStateUpdate((state) => {
    soundEffectsEnabled = Boolean(state.soundEffectsEnabled);
    if (!soundEffectsEnabled) {
      stopAllSounds();
    }
    renderOverlay(state);
  });
  window.flowOverlay.onAudioLevelUpdate((level) => {
    if (lastOverlayMode !== 'recording') {
      return;
    }

    setAudioLevel(level);
  });
  window.flowOverlay.onAudioBandsUpdate((bands) => {
    if (lastOverlayMode !== 'recording') {
      return;
    }

    setAudioBands(bands);
  });
  window.flowOverlay.onFeedback((feedback) => {
    handleFeedback(feedback);
  });
}

bootstrap();
