import test from 'node:test';
import assert from 'node:assert/strict';
import { AUDIO_TRACKS, GameAudio } from '../dist/audio.js';

class Param {
  constructor() { this.value = 0; this.events = []; }
  setValueAtTime(value, at) { this.events.push({ value, at }); }
  linearRampToValueAtTime(value, at) { this.events.push({ value, at }); }
  exponentialRampToValueAtTime(value, at) { assert.ok(value > 0); this.events.push({ value, at }); }
  setTargetAtTime(value, at) { this.events.push({ value, at }); }
}
class Node {
  constructor() { this.gain = new Param(); this.frequency = new Param(); this.connections = []; }
  connect(node) { this.connections.push(node); return node; }
  disconnect() { this.connections = []; }
}
class Source extends Node {
  constructor(context) { super(); this.context = context; this.startedAt = null; this.stoppedAt = null; this.finished = false; }
  start(at) { assert.equal(this.startedAt, null); this.startedAt = at; }
  stop(at = this.context.currentTime) { this.stoppedAt = at; if (at <= this.context.currentTime) this.finish(); }
  finish() { if (!this.finished) { this.finished = true; this.onended?.(); } }
}
class Context {
  constructor() { this.currentTime = 0; this.state = 'suspended'; this.sampleRate = 8000; this.destination = new Node(); this.sources = []; }
  async resume() { this.state = 'running'; }
  async close() { this.state = 'closed'; }
  createGain() { return new Node(); }
  createDynamicsCompressor() { const node = new Node(); for (const key of ['threshold','knee','ratio','attack','release']) node[key] = new Param(); return node; }
  createBiquadFilter() { return new Node(); }
  createBuffer(channels, length) { assert.equal(channels, 1); const data = new Float32Array(length); return { getChannelData: () => data }; }
  createOscillator() { const source = new Source(this); this.sources.push(source); return source; }
  createBufferSource() { const source = new Source(this); this.sources.push(source); return source; }
  advance(seconds) { this.currentTime += seconds; for (const source of this.sources) if (source.stoppedAt <= this.currentTime) source.finish(); }
}
function fixture(ContextType = Context) {
  const timers = new Map(); let nextId = 0;
  const player = new GameAudio({ AudioContext: ContextType,
    setInterval(callback) { const id = ++nextId; timers.set(id, callback); return id; },
    clearInterval(id) { timers.delete(id); },
  });
  const advance = seconds => { player.context.advance(seconds); for (const callback of [...timers.values()]) callback(); };
  return { player, timers, advance };
}

test('audio: five original eight-bar scores are distinct and stay inside a playable musical range', () => {
  assert.deepEqual(Object.keys(AUDIO_TRACKS).sort(), ['sms','ieei','ied','pspo','preop'].sort());
  const signatures = new Set();
  for (const score of Object.values(AUDIO_TRACKS)) {
    assert.equal(score.steps, 128); assert.equal(score.chords.length, 8);
    assert.ok(score.bpm >= 100 && score.bpm <= 160);
    assert.ok(score.melody.length >= 35);
    for (const note of score.melody) {
      assert.ok(note.step >= 0 && note.step + note.length <= score.steps);
      assert.ok(note.note >= 60 && note.note <= 90);
      assert.ok(note.length > 0);
    }
    signatures.add(JSON.stringify(score.melody));
  }
  assert.equal(signatures.size, 5);
});

test('audio: construction and selecting a stage remain silent until explicit enable', async () => {
  const { player, timers } = fixture();
  assert.equal(player.enabled, false); assert.equal(player.context, null);
  player.start('sms');
  assert.equal(player.context, null); assert.equal(timers.size, 0);
  assert.equal(await player.enable(), true);
  assert.equal(timers.size, 1); assert.ok(player.context.sources.length > 0);
  assert.ok(player.context.sources.every(source => source.startedAt >= player.context.currentTime));
  player.destroy(); assert.equal(timers.size, 0);
});

test('audio: retries and stage changes leave only one scheduler and retire previous voices', async () => {
  const { player, timers } = fixture();
  await player.enable(); player.start('sms');
  const previous = [...player.voices];
  player.start('pspo'); player.start('pspo');
  assert.equal(player.stageId, 'pspo'); assert.equal(timers.size, 1);
  assert.ok(previous.every(({ source }) => source.finished && source.connections.length === 0));
  player.start('not-a-stage');
  assert.equal(player.stageId, null); assert.equal(timers.size, 0); assert.equal(player.voices.size, 0);
  player.destroy();
});

test('audio: pause and mute immediately silence all scheduled sound; resume does not double the loop', async () => {
  const { player, timers } = fixture();
  await player.enable(); player.start('ied'); player.sfx('jump');
  player.pause();
  assert.equal(player.voices.size, 0); assert.equal(timers.size, 0); assert.equal(player.paused, true);
  const count = player.context.sources.length;
  player.sfx('radio'); assert.equal(player.context.sources.length, count);
  player.resume(); player.resume();
  assert.equal(timers.size, 1);
  await player.setEnabled(false);
  assert.equal(player.enabled, false); assert.equal(player.voices.size, 0); assert.equal(timers.size, 0);
  player.resume(); assert.equal(timers.size, 0);
  await player.enable(); assert.equal(timers.size, 1);
  player.stop(); assert.equal(player.stageId, null); assert.equal(player.voices.size, 0); assert.equal(timers.size, 0);
  player.destroy();
});

test('audio: a long frame never emits a backlog and completed sources are released', async () => {
  const { player, timers, advance } = fixture();
  await player.enable(); player.start('preop');
  const initial = player.context.sources.length;
  advance(60);
  const fresh = player.context.sources.slice(initial);
  assert.ok(fresh.length > 0 && fresh.length < 15);
  assert.ok(fresh.every(source => source.startedAt >= player.context.currentTime));
  for (let i = 0; i < 800; i++) advance(0.025);
  assert.ok(player.voices.size < 24, 'finished envelopes are removed, rather than retained for the entire song');
  assert.equal(timers.size, 1);
  player.destroy(); assert.equal(player.voices.size, 0);
});

test('audio: effects are short and rate-limited; ending fanfares stop background music', async () => {
  const { player, timers, advance } = fixture();
  await player.enable(); player.start('ieei');
  for (const effect of ['jump','pickup','record','success','deliver','complete','align','error','hit','radio','warning','water','brush','neutral','paint','coffee']) {
    const before = player.context.sources.length;
    player.sfx(effect);
    assert.ok(player.context.sources.length > before, `${effect} has sound`);
    const after = player.context.sources.length;
    player.sfx(effect);
    assert.equal(player.context.sources.length, after, `${effect} is not repeated by duplicate frame updates`);
    advance(0.4);
  }
  player.sfx('victory');
  assert.equal(timers.size, 0); assert.ok(player.voices.size > 0);
  const fanfare = [...player.voices];
  player.sfx('victory'); assert.deepEqual([...player.voices], fanfare, 'duplicate ending callbacks preserve the fanfare');
  advance(2); assert.equal(player.voices.size, 0);
  player.resume(); assert.equal(timers.size, 0, 'a result screen cannot restart the stage loop');
  await player.setEnabled(false); await player.enable(); assert.equal(timers.size, 0);
  player.start('sms'); assert.equal(timers.size, 1);
  player.sfx('defeat'); assert.equal(timers.size, 0);
  player.destroy();
});

test('audio: mute wins a pending resume, invalid volume is ignored and unavailable audio is harmless', async () => {
  let unblock;
  class SlowContext extends Context { async resume() { await new Promise(resolve => { unblock = resolve; }); this.state = 'running'; } }
  const { player, timers } = fixture(SlowContext);
  player.start('sms');
  const enabling = player.enable(); await player.setEnabled(false); unblock();
  assert.equal(await enabling, false); assert.equal(player.enabled, false); assert.equal(timers.size, 0);
  player.setVolume(0.23); player.setVolume(NaN); assert.equal(player.volume, 0.23);
  player.setVolume(2); assert.equal(player.volume, 1);
  player.setVolume(-2); assert.equal(player.volume, 0);
  player.destroy();
  const unavailable = new GameAudio({ AudioContext: false });
  assert.equal(unavailable.supported, false); assert.equal(await unavailable.enable(), false);
  unavailable.start('preop'); unavailable.pause(); unavailable.resume(); unavailable.sfx('victory'); unavailable.destroy();
  class BrokenContext extends Context { async resume() { throw new Error('blocked'); } }
  const broken = fixture(BrokenContext).player;
  assert.equal(await broken.enable(), false); assert.equal(broken.enabled, false); broken.destroy();
});
