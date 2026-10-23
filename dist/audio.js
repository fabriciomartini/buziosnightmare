/* Original miniatures for Búzios Nightmare. These are newly composed melodies,
 * using the playful pulse/triangle/noise palette of 8- and 16-bit platform games.
 * No recordings, melodies, or samples from commercial games are used. */

const bars = (...phrases) => Object.freeze(phrases.flatMap((phrase, bar) =>
  phrase.map(([step, length, note]) => Object.freeze({ step: bar * 16 + step, length, note }))));
const track = (title, bpm, chords, melody, lead = 'square') => Object.freeze({
  title, bpm, steps: 128, lead, melody,
  chords: Object.freeze(chords.map(chord => Object.freeze(chord))),
});

export const AUDIO_TRACKS = Object.freeze({
  sms: track('Ronda no convés', 124,
    [[60,64,67],[60,64,67],[65,69,72],[67,71,74],[60,64,67],[69,72,76],[65,69,72],[67,71,74]],
    bars(
      [[0,2,72],[3,1,76],[4,3,79],[8,2,76],[11,1,74],[12,2,72]],
      [[0,2,67],[3,1,72],[4,2,74],[7,1,76],[10,2,74],[13,2,67]],
      [[0,3,77],[4,2,81],[7,1,79],[8,2,77],[12,2,76],[14,1,72]],
      [[0,2,74],[3,1,79],[6,2,83],[10,2,81],[13,2,79]],
      [[0,2,76],[3,1,79],[4,3,84],[8,2,79],[11,1,76],[12,2,72]],
      [[0,3,81],[4,2,76],[8,2,72],[11,1,74],[12,3,76]],
      [[0,2,77],[3,1,76],[4,2,72],[8,2,69],[11,1,72],[12,2,77]],
      [[0,2,74],[3,1,71],[4,2,67],[8,2,74],[11,1,76],[12,2,71]])),
  ieei: track('Pincel e maresia', 112,
    [[62,65,69],[67,70,74],[60,64,67],[65,69,72],[62,65,69],[67,70,74],[69,73,76],[69,73,76]],
    bars(
      [[0,3,74],[4,2,77],[7,1,76],[8,3,74],[12,2,69]],
      [[0,2,70],[3,1,74],[4,3,79],[8,2,77],[12,3,74]],
      [[0,3,76],[4,2,72],[8,2,67],[11,1,72],[12,2,74]],
      [[0,2,77],[4,2,81],[7,1,79],[8,3,77],[12,2,72]],
      [[0,2,74],[3,1,77],[4,2,81],[8,2,77],[11,1,76],[12,2,74]],
      [[0,3,79],[4,2,77],[8,3,74],[12,2,70]],
      [[0,2,73],[3,1,76],[4,3,81],[8,2,79],[12,2,76]],
      [[0,3,73],[4,2,76],[8,3,69],[12,2,73]]), 'triangle'),
  ied: track('Máquinas no compasso', 132,
    [[64,67,71],[64,67,71],[60,64,67],[62,66,69],[64,67,71],[67,71,74],[60,64,67],[59,63,66]],
    bars(
      [[0,1,76],[2,1,71],[4,2,79],[7,1,76],[10,2,83],[14,1,79]],
      [[0,2,76],[4,1,79],[6,1,83],[8,2,81],[12,2,79]],
      [[0,2,72],[4,2,76],[7,1,79],[10,2,76],[14,1,72]],
      [[0,1,74],[2,1,78],[4,2,81],[8,2,78],[12,2,74]],
      [[0,2,83],[4,1,79],[6,1,76],[8,2,71],[12,2,76]],
      [[0,2,79],[4,1,83],[6,1,86],[8,2,83],[12,2,79]],
      [[0,2,84],[4,1,79],[6,1,76],[8,2,72],[12,2,76]],
      [[0,2,75],[4,1,78],[6,1,83],[8,2,78],[12,2,75]])),
  pspo: track('Expresso para a copa', 150,
    [[65,69,72],[70,74,77],[65,69,72],[60,64,67],[62,65,69],[70,74,77],[65,69,72],[60,64,67]],
    bars(
      [[0,1,77],[2,1,81],[4,2,84],[7,1,81],[8,2,79],[12,1,77],[14,1,72]],
      [[0,2,74],[3,1,77],[4,2,82],[8,1,81],[10,1,77],[12,2,74]],
      [[0,1,72],[2,1,77],[4,2,81],[8,2,84],[11,1,81],[12,2,77]],
      [[0,2,79],[4,1,76],[6,1,74],[8,2,72],[12,1,74],[14,1,76]],
      [[0,2,81],[3,1,77],[4,2,74],[8,1,77],[10,1,81],[12,2,86]],
      [[0,2,82],[4,1,81],[6,1,77],[8,2,74],[12,1,77],[14,1,81]],
      [[0,1,84],[2,1,81],[4,2,77],[8,2,72],[11,1,77],[12,2,81]],
      [[0,2,79],[3,1,76],[4,2,72],[8,1,67],[10,1,72],[12,2,76]])),
  preop: track('A última pendência', 138,
    [[67,71,74],[64,67,71],[60,64,67],[62,66,69],[67,71,74],[69,72,76],[60,64,67],[62,66,69]],
    bars(
      [[0,3,74],[4,1,71],[6,2,79],[10,2,78],[13,2,74]],
      [[0,2,76],[3,1,79],[4,3,83],[8,2,79],[12,2,76]],
      [[0,2,72],[4,2,76],[7,1,79],[8,3,84],[12,2,79]],
      [[0,3,81],[4,2,78],[8,2,74],[11,1,76],[12,2,78]],
      [[0,2,79],[3,1,83],[4,3,86],[8,2,83],[12,2,79]],
      [[0,2,81],[3,1,84],[4,3,88],[8,2,84],[12,2,81]],
      [[0,2,84],[4,2,79],[7,1,76],[8,3,79],[12,2,84]],
      [[0,2,81],[3,1,78],[4,3,74],[8,2,78],[12,2,74]])),
});

const frequency = note => 440 * 2 ** ((note - 69) / 12);
const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));
const EFFECT_GAPS = { jump: 0.12, water: 0.18, brush: 0.18, neutral: 0.18, paint: 0.18, warning: 0.3, radio: 0.4, error: 0.18, hit: 0.3 };

/** Browser-local synthesizer. Constructing it is silent and creates no context.
 * enable() must be called from a trusted click/touch to satisfy browser autoplay.
 * A single short look-ahead scheduler handles each current track. */
export class GameAudio {
  constructor(options = {}) {
    this.Context = options.AudioContext ?? globalThis.AudioContext ?? globalThis.webkitAudioContext;
    this.setInterval = options.setInterval ?? globalThis.setInterval.bind(globalThis);
    this.clearInterval = options.clearInterval ?? globalThis.clearInterval.bind(globalThis);
    this._supported = typeof this.Context === 'function';
    this._enabled = false; this._volume = 0.45; this._stageId = null; this._paused = false;
    this._finished = false; this._destroyed = false; this._generation = 0;
    this.context = null; this.timer = null; this.voices = new Set(); this.lastEffect = new Map();
    this.step = 0; this.nextTime = 0;
  }

  get enabled() { return this._enabled; }
  get supported() { return this._supported; }
  get volume() { return this._volume; }
  get stageId() { return this._stageId; }
  get paused() { return this._paused; }

  async enable() { return this.setEnabled(true); }

  async setEnabled(value) {
    const generation = ++this._generation;
    if (!value || this._destroyed || !this._supported) {
      this._enabled = false;
      this.halt();
      return false;
    }
    try {
      if (!this.context) this.createContext();
      if (this.context.state !== 'running') await this.context.resume();
      if (generation !== this._generation || this._destroyed) return this._enabled;
      this._enabled = this.context.state === 'running';
      if (this._enabled) this.run();
      return this._enabled;
    } catch {
      if (generation === this._generation) { this._enabled = false; this.halt(); }
      return false;
    }
  }

  createContext() {
    this.context = new this.Context();
    const c = this.context;
    this.music = c.createGain(); this.music.gain.value = 0.8;
    this.effects = c.createGain(); this.effects.gain.value = 0.9;
    this.master = c.createGain(); this.master.gain.value = this._volume;
    this.compressor = c.createDynamicsCompressor();
    this.compressor.threshold.value = -12; this.compressor.knee.value = 10;
    this.compressor.ratio.value = 8; this.compressor.attack.value = 0.003; this.compressor.release.value = 0.15;
    this.music.connect(this.master); this.effects.connect(this.master);
    this.master.connect(this.compressor); this.compressor.connect(c.destination);
    this.noiseBuffer = c.createBuffer(1, Math.ceil(c.sampleRate * 0.3), c.sampleRate);
    const data = this.noiseBuffer.getChannelData(0);
    // Deterministic filtered noise: no downloads and no changing audio assets.
    let seed = 0x83d1, previous = 0;
    for (let i = 0; i < data.length; i++) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      const white = seed / 0x80000000 - 1;
      data[i] = white * 0.7 + previous * 0.3; previous = white;
    }
  }

  setVolume(value) {
    if (!Number.isFinite(Number(value))) return;
    this._volume = clamp(Number(value), 0, 1);
    if (this.master) this.master.gain.setTargetAtTime(this._volume, this.context.currentTime, 0.025);
  }

  start(stageId) {
    this.halt();
    this._stageId = Object.hasOwn(AUDIO_TRACKS, stageId) ? stageId : null;
    this._paused = false; this._finished = false; this.step = 0; this.lastEffect.clear();
    this.run();
  }

  pause() { this._paused = true; this.halt(); }
  resume() { if (this._destroyed) return; this._paused = false; this.run(); }
  stop() { this.halt(); this._stageId = null; this._paused = false; this._finished = false; this.step = 0; this.lastEffect.clear(); }

  run() {
    if (this.timer !== null || !this._enabled || this._paused || this._finished || !this._stageId || this._destroyed || this.context?.state !== 'running') return;
    this.nextTime = this.context.currentTime + 0.035;
    this.schedule();
    this.timer = this.setInterval(() => this.schedule(), 25);
  }

  schedule() {
    if (!this._enabled || this._paused || this._finished || !this._stageId || this.context?.state !== 'running') return;
    const now = this.context.currentTime, score = AUDIO_TRACKS[this._stageId], tick = 60 / score.bpm / 4;
    // A sleeping/background tab must never catch up by firing old notes in a burst.
    if (this.nextTime < now - 0.08) this.nextTime = now + 0.035;
    while (this.nextTime < now + 0.16) {
      this.playStep(score, this.step, this.nextTime, tick);
      this.nextTime += tick; this.step = (this.step + 1) % score.steps;
    }
  }

  playStep(score, step, at, tick) {
    const beat = step % 16, bar = Math.floor(step / 16), chord = score.chords[bar];
    for (const event of score.melody) if (event.step === step) {
      this.tone(event.note, at, event.length * tick * 0.82, score.lead, 0.17, this.music);
    }
    if ([0,6,8,14].includes(beat)) {
      const note = (beat === 6 || beat === 14 ? chord[2] : chord[0]) - 24;
      this.tone(note, at, tick * (beat === 0 || beat === 8 ? 2.4 : 1.4), 'triangle', 0.24, this.music);
    }
    if ([2,5,10,13].includes(beat)) {
      this.tone(chord[[0,2,1,2][[2,5,10,13].indexOf(beat)]], at, tick * 0.65, 'square', 0.055, this.music);
    }
    if (beat === 0 || beat === 8) this.tone(42, at, 0.09, 'sine', 0.2, this.music, 25);
    if (beat === 4 || beat === 12) this.noise(at, 0.055, 0.095, this.music, 1700);
    if (beat % 4 === 2) this.noise(at, 0.022, 0.045, this.music, 6000);
  }

  tone(note, at, duration, wave = 'square', amplitude = 0.15, bus = this.effects, endNote = null) {
    if (!this.context || duration <= 0) return;
    const source = this.context.createOscillator(), envelope = this.context.createGain();
    source.type = wave; source.frequency.setValueAtTime(frequency(note), at);
    if (endNote !== null) source.frequency.exponentialRampToValueAtTime(frequency(endNote), at + duration);
    source.connect(envelope); envelope.connect(bus);
    this.envelope(envelope.gain, at, duration, amplitude);
    this.trackVoice(source, [envelope], at, duration);
  }

  noise(at, duration, amplitude, bus = this.effects, cutoff = 3000) {
    if (!this.context || duration <= 0) return;
    const source = this.context.createBufferSource(), filter = this.context.createBiquadFilter(), envelope = this.context.createGain();
    source.buffer = this.noiseBuffer; filter.type = 'highpass'; filter.frequency.value = cutoff;
    source.connect(filter); filter.connect(envelope); envelope.connect(bus);
    this.envelope(envelope.gain, at, duration, amplitude);
    this.trackVoice(source, [filter, envelope], at, duration);
  }

  envelope(gain, at, duration, amplitude) {
    const attack = Math.min(0.006, duration / 5);
    gain.setValueAtTime(0.0001, at);
    gain.linearRampToValueAtTime(amplitude, at + attack);
    gain.exponentialRampToValueAtTime(Math.max(0.0001, amplitude * 0.65), at + duration * 0.45);
    gain.exponentialRampToValueAtTime(0.0001, at + duration);
  }

  trackVoice(source, nodes, at, duration) {
    const voice = { source, nodes };
    this.voices.add(voice);
    source.onended = () => {
      this.voices.delete(voice);
      source.disconnect(); for (const node of nodes) node.disconnect();
    };
    source.start(at); source.stop(at + duration + 0.015);
  }

  halt() {
    if (this.timer !== null) { this.clearInterval(this.timer); this.timer = null; }
    for (const voice of [...this.voices]) {
      try { voice.source.stop(); } catch { /* Already ended. */ }
      voice.source.disconnect(); for (const node of voice.nodes) node.disconnect();
      voice.source.onended = null;
    }
    this.voices.clear();
  }

  sfx(type) {
    // Ending a muted stage must still prevent its loop resuming on a later click.
    if (type === 'victory' || type === 'defeat') {
      if (this._finished) return; // Duplicate callbacks must not cancel the fanfare.
      this.halt(); this._finished = true;
    }
    if (!this._enabled || this._paused || this._destroyed || this.context?.state !== 'running') return;
    const now = this.context.currentTime;
    if (now - (this.lastEffect.get(type) ?? -Infinity) < (EFFECT_GAPS[type] ?? 0.07)) return;
    const positive = ['success','pickup','record','deliver','complete','align','coffee'].includes(type);
    if (positive && now - (this.lastEffect.get('positive') ?? -Infinity) < 0.07) return;
    this.lastEffect.set(type, now);
    if (positive) this.lastEffect.set('positive', now);
    const at = now + 0.008;
    const notes = (list, spacing = 0.075, duration = 0.11, wave = 'square', level = 0.16) =>
      list.forEach((note, i) => this.tone(note, at + i * spacing, duration, wave, level));
    switch (type) {
      case 'jump': this.tone(60, at, 0.12, 'square', 0.12, this.effects, 84); break;
      case 'pickup': notes([76,83,88], 0.045, 0.08, 'triangle', 0.23); break;
      case 'record': notes([79,84], 0.07, 0.1); break;
      case 'success': notes([76,81], 0.06, 0.1, 'triangle', 0.22); break;
      case 'deliver': notes([72,76,79], 0.065, 0.14, 'triangle', 0.25); break;
      case 'complete': notes([72,76,79,84], 0.08, 0.17); break;
      case 'align': notes([74,81], 0.06, 0.12, 'triangle', 0.23); break;
      case 'error': this.tone(49, at, 0.18, 'triangle', 0.3, this.effects, 43); break;
      case 'hit': this.noise(at, 0.12, 0.19, this.effects, 650); this.tone(55, at, 0.15, 'square', 0.11, this.effects, 37); break;
      case 'radio': this.noise(at, 0.055, 0.09); notes([81,76,81], 0.1, 0.055, 'square', 0.12); break;
      case 'warning': notes([81,81], 0.17, 0.09, 'square', 0.11); break;
      case 'water': this.noise(at, 0.19, 0.12, this.effects, 2200); break;
      case 'brush': this.noise(at, 0.055, 0.15, this.effects, 1200); this.noise(at + 0.08, 0.055, 0.1, this.effects, 1800); break;
      case 'neutral': notes([67,74,79], 0.045, 0.09, 'sine', 0.24); break;
      case 'paint': this.noise(at, 0.14, 0.08, this.effects, 900); this.tone(76, at + 0.04, 0.12, 'sine', 0.16); break;
      case 'coffee': notes([72,79,83,86], 0.09, 0.14, 'triangle', 0.24); break;
      case 'victory': notes([72,76,79,84,83,79,86], 0.13, 0.22); this.tone(48, at, 1.05, 'triangle', 0.2); break;
      case 'defeat': notes([72,70,67,63,60], 0.16, 0.22, 'triangle', 0.26); break;
      default: break;
    }
  }

  destroy() {
    this._destroyed = true; this._enabled = false; this._generation++; this.stop();
    if (this.context) { const closed = this.context.close(); closed?.catch?.(() => {}); }
    this.context = null;
  }
}
