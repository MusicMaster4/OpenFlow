(function exposeFeedbackAudioController(root, factory) {
  const createFeedbackAudioController = factory();

  if (typeof module === 'object' && module.exports) {
    module.exports = { createFeedbackAudioController };
  }

  if (root) {
    root.createFeedbackAudioController = createFeedbackAudioController;
  }
})(typeof globalThis === 'undefined' ? null : globalThis, () => {
  function createFeedbackAudioController(options = {}) {
    const sources = { ...(options.sources || {}) };
    const AudioConstructor = options.AudioConstructor || (typeof Audio === 'undefined' ? null : Audio);
    const scheduleTimeout = options.setTimeout || setTimeout;
    const cancelTimeout = options.clearTimeout || clearTimeout;
    const watchdogMs = Number(options.watchdogMs) > 0 ? Number(options.watchdogMs) : 4000;
    const volume = Number.isFinite(Number(options.volume)) ? Number(options.volume) : 0.25;
    const onPlaybackFailure =
      typeof options.onPlaybackFailure === 'function' ? options.onPlaybackFailure : () => {};

    if (!AudioConstructor) {
      throw new Error('Feedback audio requires an Audio constructor.');
    }

    const audioByKey = new Map();
    const soundQueue = [];
    let enabled = true;
    let activePlayback = null;
    let drainTimer = null;
    let watchdogTimer = null;
    let destroyed = false;

    function clearWatchdog() {
      if (watchdogTimer !== null) {
        cancelTimeout(watchdogTimer);
        watchdogTimer = null;
      }
    }

    function safelyStopAudio(audio) {
      if (!audio) {
        return;
      }

      try {
        audio.pause();
      } catch (_error) {
        // The media element may already have lost its output device.
      }

      try {
        audio.currentTime = 0;
      } catch (_error) {
        // Some failed media elements reject seeking; replacement still recovers them.
      }
    }

    function releaseActivePlayback(audio) {
      if (!activePlayback || (audio && activePlayback.audio !== audio)) {
        return;
      }

      clearWatchdog();
      activePlayback = null;
      scheduleDrain();
    }

    function createAudio(soundKey) {
      const audio = new AudioConstructor(sources[soundKey]);
      audio.preload = 'auto';
      audio.volume = volume;
      audio.addEventListener('ended', () => releaseActivePlayback(audio));
      audio.addEventListener('error', () => recoverActivePlayback(audio, 'media-error'));

      try {
        audio.load();
      } catch (_error) {
        // Playback will retry with a fresh element if eager loading is unavailable.
      }

      return audio;
    }

    function replaceAudio(soundKey) {
      const previousAudio = audioByKey.get(soundKey);
      safelyStopAudio(previousAudio);
      const audio = createAudio(soundKey);
      audioByKey.set(soundKey, audio);
      return audio;
    }

    function recoverActivePlayback(audio, reason) {
      if (!activePlayback || activePlayback.audio !== audio) {
        return;
      }

      const failedPlayback = activePlayback;
      clearWatchdog();
      activePlayback = null;
      replaceAudio(failedPlayback.soundKey);

      const willRetry = failedPlayback.attempt < 1 && enabled && !destroyed;
      try {
        onPlaybackFailure({
          soundKey: failedPlayback.soundKey,
          reason,
          willRetry,
        });
      } catch (_error) {
        // Diagnostics must never prevent the recovery path itself.
      }

      if (willRetry) {
        soundQueue.unshift({
          soundKey: failedPlayback.soundKey,
          attempt: failedPlayback.attempt + 1,
        });
      }
      scheduleDrain();
    }

    function routeToDefaultOutput(audio) {
      if (typeof audio.setSinkId !== 'function') {
        return Promise.resolve();
      }

      // Chromium can retain a removed Windows output route. Reasserting "default"
      // makes each feedback follow the machine's current default output device.
      return Promise.resolve(audio.setSinkId('default')).catch(() => undefined);
    }

    function beginPlayback(item) {
      const audio = audioByKey.get(item.soundKey) || replaceAudio(item.soundKey);
      activePlayback = {
        soundKey: item.soundKey,
        attempt: item.attempt,
        audio,
      };

      try {
        audio.currentTime = 0;
      } catch (_error) {
        recoverActivePlayback(audio, 'seek-failed');
        return;
      }

      clearWatchdog();
      watchdogTimer = scheduleTimeout(() => {
        recoverActivePlayback(audio, 'watchdog-timeout');
      }, watchdogMs);

      routeToDefaultOutput(audio)
        .then(() => {
          if (!activePlayback || activePlayback.audio !== audio) {
            return undefined;
          }
          return audio.play();
        })
        .catch(() => {
          recoverActivePlayback(audio, 'play-rejected');
        });
    }

    function drainSoundQueue() {
      drainTimer = null;
      if (destroyed || !enabled || activePlayback || soundQueue.length === 0) {
        return;
      }

      const item = soundQueue.shift();
      if (!Object.prototype.hasOwnProperty.call(sources, item.soundKey)) {
        scheduleDrain();
        return;
      }

      beginPlayback(item);
    }

    function scheduleDrain() {
      if (destroyed || drainTimer !== null) {
        return;
      }

      drainTimer = scheduleTimeout(drainSoundQueue, 0);
    }

    function cancelActivePlayback() {
      clearWatchdog();
      if (!activePlayback) {
        return null;
      }

      const cancelled = activePlayback;
      activePlayback = null;
      safelyStopAudio(cancelled.audio);
      return cancelled;
    }

    function stopAll() {
      soundQueue.length = 0;
      cancelActivePlayback();
      if (drainTimer !== null) {
        cancelTimeout(drainTimer);
        drainTimer = null;
      }
    }

    function queueSound(soundKey, queueOptions = {}) {
      if (destroyed || !enabled || !Object.prototype.hasOwnProperty.call(sources, soundKey)) {
        return;
      }

      if (queueOptions.interrupt) {
        soundQueue.length = 0;
        cancelActivePlayback();
        soundQueue.unshift({ soundKey, attempt: 0 });
      } else {
        soundQueue.push({ soundKey, attempt: 0 });
      }

      scheduleDrain();
    }

    function resetOutput() {
      if (destroyed) {
        return;
      }

      const interruptedPlayback = cancelActivePlayback();
      for (const soundKey of Object.keys(sources)) {
        replaceAudio(soundKey);
      }
      if (interruptedPlayback && enabled) {
        soundQueue.unshift({ soundKey: interruptedPlayback.soundKey, attempt: 0 });
      }
      scheduleDrain();
    }

    function setEnabled(nextEnabled) {
      enabled = Boolean(nextEnabled);
      if (!enabled) {
        stopAll();
      } else {
        scheduleDrain();
      }
    }

    function destroy() {
      stopAll();
      destroyed = true;
      for (const audio of audioByKey.values()) {
        safelyStopAudio(audio);
      }
      audioByKey.clear();
    }

    for (const soundKey of Object.keys(sources)) {
      replaceAudio(soundKey);
    }

    return {
      destroy,
      queueSound,
      resetOutput,
      setEnabled,
      stopAll,
    };
  }

  return createFeedbackAudioController;
});
