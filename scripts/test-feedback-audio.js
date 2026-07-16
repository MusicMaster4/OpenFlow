const assert = require('assert');
const { createFeedbackAudioController } = require('../src/renderer/feedback-audio');

function delay(ms = 0) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function settle() {
  await delay(0);
  await Promise.resolve();
  await delay(0);
}

class FakeAudio {
  static instances = [];

  static rejectedPlaysRemaining = 0;

  constructor(source) {
    this.source = source;
    this.currentTime = 0;
    this.preload = '';
    this.volume = 1;
    this.listeners = new Map();
    this.playCalls = 0;
    this.pauseCalls = 0;
    this.sinkIds = [];
    FakeAudio.instances.push(this);
  }

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) || [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }

  emit(type) {
    for (const listener of this.listeners.get(type) || []) {
      listener();
    }
  }

  load() {}

  pause() {
    this.pauseCalls += 1;
  }

  play() {
    this.playCalls += 1;
    if (FakeAudio.rejectedPlaysRemaining > 0) {
      FakeAudio.rejectedPlaysRemaining -= 1;
      return Promise.reject(new Error('stale output route'));
    }
    return Promise.resolve();
  }

  setSinkId(sinkId) {
    this.sinkIds.push(sinkId);
    return Promise.resolve();
  }
}

function resetFakeAudio() {
  FakeAudio.instances = [];
  FakeAudio.rejectedPlaysRemaining = 0;
}

async function testRoutesEveryPlaybackToDefaultOutput() {
  resetFakeAudio();
  const controller = createFeedbackAudioController({
    sources: { start: 'start.mp3' },
    AudioConstructor: FakeAudio,
    watchdogMs: 1000,
  });

  controller.queueSound('start');
  await settle();

  const audio = FakeAudio.instances[0];
  assert.deepStrictEqual(audio.sinkIds, ['default']);
  assert.strictEqual(audio.playCalls, 1);
  audio.emit('ended');
  controller.destroy();
}

async function testRejectedPlaybackRebuildsAndRetries() {
  resetFakeAudio();
  FakeAudio.rejectedPlaysRemaining = 1;
  const failures = [];
  const controller = createFeedbackAudioController({
    sources: { start: 'start.mp3' },
    AudioConstructor: FakeAudio,
    watchdogMs: 1000,
    onPlaybackFailure: (failure) => failures.push(failure),
  });

  controller.queueSound('start');
  await settle();
  await settle();

  assert.strictEqual(FakeAudio.instances.length, 2, 'failed media element should be replaced');
  assert.strictEqual(FakeAudio.instances[0].playCalls, 1);
  assert.strictEqual(FakeAudio.instances[1].playCalls, 1, 'replacement should retry the sound');
  assert.strictEqual(failures.length, 1);
  assert.strictEqual(failures[0].reason, 'play-rejected');
  assert.strictEqual(failures[0].willRetry, true);
  FakeAudio.instances[1].emit('ended');
  controller.destroy();
}

async function testDeviceResetRebuildsActiveOutput() {
  resetFakeAudio();
  const controller = createFeedbackAudioController({
    sources: { start: 'start.mp3' },
    AudioConstructor: FakeAudio,
    watchdogMs: 1000,
  });

  controller.queueSound('start');
  await settle();
  controller.resetOutput();
  await settle();

  assert.strictEqual(FakeAudio.instances.length, 2);
  assert.strictEqual(FakeAudio.instances[0].pauseCalls > 0, true);
  assert.strictEqual(FakeAudio.instances[1].playCalls, 1, 'active feedback should resume on the new output');
  FakeAudio.instances[1].emit('ended');
  controller.destroy();
}

async function testWatchdogCannotPermanentlyFreezeQueue() {
  resetFakeAudio();
  const failures = [];
  const controller = createFeedbackAudioController({
    sources: { start: 'start.mp3', close: 'close.mp3' },
    AudioConstructor: FakeAudio,
    watchdogMs: 15,
    onPlaybackFailure: (failure) => failures.push(failure),
  });

  controller.queueSound('start');
  controller.queueSound('close');
  await delay(45);

  const startPlayers = FakeAudio.instances.filter((audio) => audio.source === 'start.mp3');
  assert.strictEqual(startPlayers.length >= 2, true, 'watchdog should rebuild a stalled sound');
  assert.strictEqual(
    failures.some((failure) => failure.reason === 'watchdog-timeout'),
    true,
  );

  const currentStart = startPlayers[startPlayers.length - 1];
  currentStart.emit('ended');
  await settle();
  const closePlayers = FakeAudio.instances.filter((audio) => audio.source === 'close.mp3');
  assert.strictEqual(
    closePlayers.some((audio) => audio.playCalls > 0),
    true,
    'the queued close feedback should still play after the stalled sound is released',
  );
  controller.destroy();
}

async function run() {
  await testRoutesEveryPlaybackToDefaultOutput();
  await testRejectedPlaybackRebuildsAndRetries();
  await testDeviceResetRebuildsActiveOutput();
  await testWatchdogCannotPermanentlyFreezeQueue();
  console.log('feedback-audio-ok: default routing, rebuild retry, device reset, and watchdog recovery passed');
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
