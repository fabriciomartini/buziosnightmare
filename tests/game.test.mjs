import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../dist/engine.js';
import { observationOutcome, treatmentOutcome, tapOutcome, deadlineExpired } from '../dist/rules.js';

/** Browser API stand-ins; the real engine, rules and renderer run in these tests. */
function harness(t) {
  const windowListeners = new Map();
  const documentListeners = new Map();
  const canvasListeners = new Map();
  const frames = new Map();
  const calls = new Map();
  const gradients = [];
  let nextFrame = 0;
  let clock = 0;
  const events = listeners => ({
    addEventListener(name, callback) { listeners.set(name, callback); },
    removeEventListener(name, callback) { if (listeners.get(name) === callback) listeners.delete(name); },
  });
  const context = new Proxy({}, {
    get(object, property) {
      if (property in object) return object[property];
      if (property === 'createLinearGradient') return () => {
        const gradient = { stops: [], addColorStop(...args) { this.stops.push(args); } };
        gradients.push(gradient);
        return gradient;
      };
      if (property === 'measureText') return text => ({ width: String(text).length * 8 });
      return (...args) => { calls.set(property, (calls.get(property) || 0) + 1); };
    },
    set(object, property, value) { object[property] = value; return true; },
  });
  globalThis.window = events(windowListeners);
  globalThis.document = { hidden: false, ...events(documentListeners) };
  globalThis.requestAnimationFrame = callback => { const id = ++nextFrame; frames.set(id, callback); return id; };
  globalThis.cancelAnimationFrame = id => frames.delete(id);
  const canvas = {
    ...events(canvasListeners),
    getContext(type) { assert.equal(type, '2d'); return context; },
    getBoundingClientRect() { return { left: 10, top: 20, width: 600, height: 300 }; },
  };
  const endings = [];
  const updates = [];
  const interactions = [];
  const game = new Game(canvas, {
    onEnd: result => endings.push(result),
    onUpdate: state => updates.push({ mode: state.mode, elapsed: state.elapsed, score: state.score }),
    onInteraction: result => interactions.push(result),
  });
  t.after(() => {
    game.destroy();
    delete globalThis.window;
    delete globalThis.document;
    delete globalThis.requestAnimationFrame;
    delete globalThis.cancelAnimationFrame;
  });
  const frame = (milliseconds = 16.6667) => {
    clock += milliseconds;
    const pending = [...frames.entries()];
    frames.clear();
    for (const [, callback] of pending) callback(clock);
  };
  const click = (worldX, worldY) => canvasListeners.get('pointerdown')({
    button: 0,
    clientX: 10 + (worldX - game.state.camera) / 2,
    clientY: 20 + worldY / 2,
  });
  const key = (code, extras = {}) => {
    const event = { code, repeat: false, preventDefault() { this.prevented = true; }, ...extras };
    windowListeners.get('keydown')(event);
    return event;
  };
  const approach = target => {
    game.state.player.x = target.x - 70;
    game.state.player.y = 500;
    game.update(0);
    click(target.x, target.y);
  };
  return { game, canvas, frame, click, key, approach, calls, gradients, frames, endings, updates, interactions, windowListeners, documentListeners, canvasListeners };
}

test('real renderer runs from RAF using the logical 1200 × 600 canvas', t => {
  const h = harness(t);
  h.game.start('sms');
  h.frame();
  assert.equal(h.canvas.width, 1200);
  assert.equal(h.canvas.height, 600);
  assert.ok(h.calls.get('fillRect') > 0);
  assert.ok(h.calls.get('ellipse') > 0);
  assert.ok(h.calls.get('fillText') > 0);
  assert.ok(h.gradients.some(g => g.stops.length >= 2));
  assert.equal(h.frames.size, 1, 'exactly one next frame is scheduled');
  assert.equal(h.game.state.workers.find(w => w.risk).visibleSince, 0);
});

test('SMS: scaled pointer coordinates record a real hazard and do not allow duplicate farming', t => {
  const h = harness(t);
  h.game.start('sms'); h.frame();
  const worker = h.game.state.workers.find(w => w.risk);
  h.click(worker.x, worker.y - 65);
  assert.equal(h.game.state.score, 1);
  assert.equal(h.game.state.correct, 1);
  assert.equal(h.game.state.auditLog.length, 1);
  assert.equal(worker.recorded, true);
  h.click(worker.x, worker.y - 65);
  assert.equal(h.game.state.score, 1);
  assert.equal(h.game.state.correct, 1);
});

test('visible interaction markers are clickable, including the tall TAP panel marker', t => {
  const h = harness(t);
  h.game.start('sms'); h.frame();
  const worker = h.game.state.workers.find(w => w.risk);
  h.click(worker.x, worker.y - 136);
  assert.equal(h.game.state.correct, 1);
  h.game.start('ieei');
  const rust = h.game.state.rust[0];
  h.game.state.player.x = rust.x;
  h.click(rust.x, rust.y - 75);
  assert.equal(h.game.state.activeTarget.id, rust.id);
  h.game.start('preop');
  const station = h.game.state.stations[1];
  h.game.state.player.x = station.x;
  h.game.update(0);
  h.click(station.x, station.y - 122);
  assert.equal(h.game.state.activeTarget.id, station.id);
});

test('SMS: a compliant worker causes negative score, failure, and a clean restart', t => {
  const h = harness(t);
  h.game.start('sms'); h.frame();
  h.key('ArrowRight');
  const worker = h.game.state.workers.find(w => !w.risk);
  h.click(worker.x, worker.y - 70);
  assert.equal(h.game.state.score, -1);
  assert.equal(h.game.state.mode, 'ended');
  assert.equal(h.endings.length, 1);
  assert.equal(h.endings[0].success, false);
  assert.equal(h.game.keys.size, 0);
  h.game.start('sms');
  assert.equal(h.game.state.score, 0);
  assert.equal(h.game.state.correct, 0);
  assert.equal(h.game.state.attempt, 2);
  assert.ok(h.game.state.workers.every(w => !w.recorded && !w.corrected));
});

test('SMS: correction happens at exactly two seconds and a late observation is invalid', t => {
  const h = harness(t);
  h.game.start('sms'); h.frame();
  const worker = h.game.state.workers.find(w => w.risk);
  h.game.update(1.999);
  assert.equal(worker.corrected, false);
  h.game.update(0.001);
  assert.equal(worker.corrected, true);
  h.click(worker.x, worker.y - 70);
  assert.equal(h.game.state.score, -1);
  assert.equal(h.endings[0].success, false);
});

test('SMS: five valid observations across a moving viewport finish the level', t => {
  const h = harness(t);
  h.game.start('sms'); h.frame();
  const hazards = h.game.state.workers.filter(w => w.risk);
  for (const worker of hazards.slice(0, 2)) h.click(worker.x, worker.y - 70);
  h.game.state.player.x = 1400;
  h.game.update(0.1);
  assert.equal(h.game.state.camera, 1010);
  for (const worker of hazards.slice(2, 5)) h.click(worker.x, worker.y - 70);
  assert.equal(h.game.state.correct, 5);
  assert.equal(h.game.state.score, 5);
  assert.equal(h.game.state.mode, 'ended');
  assert.equal(h.endings.length, 1);
  assert.equal(h.endings[0].success, true);
});

test('SMS: missing too many observation windows fails instead of stranding the player', t => {
  const h = harness(t);
  h.game.start('sms'); h.frame();
  for (const x of [165, 1400, 2400, 3300]) {
    h.game.state.player.x = x;
    h.game.update(0);
    h.game.update(2);
    if (h.game.state.mode === 'ended') break;
  }
  assert.equal(h.game.state.mode, 'ended');
  assert.equal(h.endings[0].success, false);
  assert.match(h.endings[0].reason, /corrigiram/);
});

test('IEEI: approach is required, wrong tools do not progress, and dragging advances each stage', t => {
  const h = harness(t);
  h.game.start('ieei'); h.frame();
  const rust = h.game.state.rust[0];
  h.click(rust.x, rust.y);
  assert.equal(h.game.state.activeTarget, null);
  assert.match(h.game.state.feedback.text, /perto/);
  h.approach(rust);
  assert.deepEqual(h.game.state.activeTarget, { type: 'repair', id: rust.id });
  assert.equal(h.interactions.length, 1);
  assert.equal(h.game.chooseTool(1), false);
  h.game.work(45);
  assert.equal(rust.progress, 0);
  assert.equal(h.game.chooseTool(0), true);
  h.game.work(0);
  assert.equal(rust.progress, 0, 'stationary clicking does not count as work');
  h.game.work(45);
  assert.equal(rust.progress, 0.25);
  h.game.closeInteraction();
  h.approach(rust);
  assert.equal(h.game.state.toolProgress, 0.25, 'partial work survives dismissal');
  h.game.chooseTool(0);
  for (let i = 0; i < 3; i++) h.game.work(45);
  assert.equal(rust.step, 1);
  assert.equal(h.game.state.selectedTool, null);
  for (let tool = 1; tool < 4; tool++) {
    assert.equal(h.game.chooseTool(tool), true);
    for (let i = 0; i < 4; i++) h.game.work(45);
  }
  assert.equal(rust.step, 4);
  assert.equal(h.game.state.correct, 1);
  assert.equal(h.game.state.score, 100);
  assert.equal(h.game.state.activeTarget, null);
});

test('IEEI: all three fully treated points finish successfully before the deadline', t => {
  const h = harness(t);
  h.game.start('ieei'); h.frame();
  h.game.update(59);
  for (const rust of h.game.state.rust) {
    h.approach(rust);
    for (let tool = 0; tool < 4; tool++) {
      h.game.chooseTool(tool);
      for (let i = 0; i < 4; i++) h.game.work(45);
    }
  }
  assert.equal(h.game.state.correct, 3);
  assert.equal(h.game.state.score, 300);
  assert.equal(h.endings[0].success, true);
  assert.equal(h.endings[0].elapsed, 59);
});

test('IEEI: the deadline runs while working and expires at exactly 60 seconds', t => {
  const h = harness(t);
  h.game.start('ieei'); h.frame();
  h.approach(h.game.state.rust[0]);
  h.game.update(59.999);
  assert.equal(h.game.state.mode, 'playing');
  h.game.update(0.001);
  assert.equal(h.game.state.timeLeft, 0);
  assert.equal(h.game.state.mode, 'ended');
  assert.equal(h.game.state.activeTarget, null);
  assert.equal(h.endings[0].success, false);
  h.game.chooseTool(0); h.game.work(1000);
  assert.equal(h.game.state.correct, 0);
});

test('slow rendering frames do not extend the one-minute deadline', t => {
  const h = harness(t);
  h.game.start('ieei'); h.frame();
  h.frame(30000);
  assert.equal(h.game.state.timeLeft, 30);
  h.frame(30000);
  assert.equal(h.game.state.mode, 'ended');
  assert.equal(h.game.state.timeLeft, 0);
  assert.equal(h.endings[0].elapsed, 60);
});

test('pausing freezes timers, clears controls, and hidden documents pause the game', t => {
  const h = harness(t);
  h.game.start('ieei'); h.frame();
  h.key('ArrowRight');
  h.game.update(1);
  h.game.pause(true);
  const x = h.game.state.player.x;
  h.game.update(10);
  assert.equal(h.game.state.elapsed, 1);
  assert.equal(h.game.state.player.x, x);
  assert.equal(h.game.keys.size, 0);
  h.game.pause(false);
  h.game.update(1);
  assert.equal(h.game.state.elapsed, 2);
  assert.equal(h.game.state.player.x, x);
  document.hidden = true;
  h.documentListeners.get('visibilitychange')();
  assert.equal(h.game.state.mode, 'paused');
});

test('movement supports jumps, one-way platform landing, climbing, and world bounds', t => {
  const h = harness(t);
  h.game.start('ieei'); h.frame();
  h.key('Space'); h.game.update(0.02);
  assert.ok(h.game.state.player.y < 500);
  assert.ok(h.game.state.player.vy < 0);
  const p = h.game.state.player;
  p.x = 780; p.y = 420; p.vy = 100;
  h.game.update(0.1);
  assert.equal(p.y, 430);
  assert.equal(p.grounded, true);
  p.x = 1389; p.y = 500; p.vy = 0;
  h.key('ArrowUp'); h.game.update(0.5);
  assert.equal(p.climbing, true);
  assert.equal(p.y, 410);
  h.game.update(0.5);
  assert.equal(p.y, 350);
  h.game.keys.clear();
  p.x = 3399; h.key('ArrowRight'); h.game.update(1);
  assert.equal(p.x, 3355);
  assert.equal(h.game.state.camera, 2200);
});

test('controls ignore text fields, prevent scrolling, and do not move during interactions', t => {
  const h = harness(t);
  h.game.start('ieei'); h.frame();
  const ignored = h.key('ArrowRight', { target: { closest: () => ({}) } });
  assert.equal(h.game.keys.size, 0);
  assert.equal(ignored.prevented, undefined);
  assert.equal(h.key('ArrowRight').prevented, true);
  h.approach(h.game.state.rust[0]);
  assert.equal(h.game.keys.size, 0);
  const x = h.game.state.player.x;
  h.key('ArrowRight'); h.game.update(0.1);
  assert.equal(h.game.state.player.x, x);
  h.game.closeInteraction();
  h.game.setControl('ArrowRight', true); h.game.update(0.1);
  assert.ok(h.game.state.player.x > x);
  h.game.setControl('ArrowRight', false);
  assert.equal(h.game.keys.size, 0);
});

test('Pré-Op: wrong order costs five seconds and three completed systems win', t => {
  const h = harness(t);
  h.game.start('preop'); h.frame();
  const stations = h.game.state.stations;
  h.approach(stations[0]);
  assert.equal(h.game.chooseTap(2), false);
  assert.equal(stations[0].step, 0);
  assert.equal(h.game.state.timeLeft, 70);
  for (const station of stations) {
    if (!h.game.state.activeTarget) h.approach(station);
    for (let step = 0; step < 3; step++) assert.equal(h.game.chooseTap(step), true);
    assert.equal(station.step, 3);
  }
  assert.equal(h.game.state.correct, 3);
  assert.equal(h.game.state.score, 300);
  assert.equal(h.endings[0].success, true);
  assert.match(h.endings[0].reason, /TAP aprovada \(FIC concluída\)/);
});

test('Pré-Op: an incorrect action can consume the final seconds and fail', t => {
  const h = harness(t);
  h.game.start('preop'); h.frame();
  h.approach(h.game.state.stations[0]);
  h.game.update(71);
  h.game.chooseTap(2);
  assert.equal(h.game.state.mode, 'ended');
  assert.equal(h.game.state.timeLeft, 0);
  assert.equal(h.endings[0].success, false);
});

test('destroy removes input listeners and cancels RAF', t => {
  const h = harness(t);
  h.game.start('sms'); h.frame();
  h.game.destroy();
  assert.equal(h.windowListeners.size, 0);
  assert.equal(h.documentListeners.size, 0);
  assert.equal(h.canvasListeners.size, 0);
  assert.equal(h.frames.size, 0);
});

test('pure rules preserve exact boundaries and reject invalid work samples', () => {
  const worker = { risk: 'helmet', corrected: false, recorded: false, visibleSince: 10 };
  assert.equal(observationOutcome(worker, 11.999, 4, 4).won, true);
  assert.equal(observationOutcome(worker, 12, 0, 0).failed, true);
  assert.equal(observationOutcome({ ...worker, recorded: true }, 10, 2, 2).type, 'duplicate');
  for (const movement of [0, -5, NaN, Infinity]) assert.equal(treatmentOutcome(0, 0, 0, movement).progress, 0);
  assert.equal(treatmentOutcome(0, 1, 0, 45).progress, 0);
  assert.equal(tapOutcome(0, 2).penalty, 5);
  assert.equal(tapOutcome(2, 2).completed, true);
  assert.equal(deadlineExpired(59.999, 60), false);
  assert.equal(deadlineExpired(60, 60), true);
});

const officeForm = (player, id = 90, y = player.y - 55) => ({
  id: `form-${id}`, x: player.x, y, w: 44, h: 56, vx: 0, vy: 0,
  origin: ['IED', 'IEEI', 'SMS', 'Pré-Op/P-83'][id % 4], angle: 0, active: true,
});

test('PSPO: desks are solid, harmless, and traversable only after a jump', t => {
  const h = harness(t);
  h.game.start('pspo'); h.frame();
  const s = h.game.state, desk = s.platforms[0];
  assert.equal(s.worldWidth, 5600);
  assert.equal(s.platforms.length, 7);
  assert.equal(s.ladders.length, 0);
  assert.equal(s.timeLeft, null);
  s.player.x = desk.x - 40;
  h.game.setControl('ArrowRight', true);
  for (let i = 0; i < 20; i++) h.game.update(1 / 120);
  assert.equal(s.player.x, desk.x - 18, 'walking is stopped at the desk edge');
  assert.equal(s.player.y, 500);
  assert.equal(s.office.hits, 0, 'furniture is not a damaging obstacle');
  h.game.setControl('Space', true);
  for (let i = 0; i < 95; i++) h.game.update(1 / 120);
  assert.ok(s.player.x > desk.x + desk.w, 'a real jump crosses the tabletop');
  assert.equal(s.office.hits, 0);
});

test('PSPO: a form counts once, recovery prevents stacked hits, and only the third hit loses', t => {
  const h = harness(t);
  h.game.start('pspo');
  const s = h.game.state;
  s.office.forms.push(officeForm(s.player, 90));
  h.game.update(0);
  assert.equal(s.office.hits, 1);
  assert.equal(s.mode, 'playing');
  assert.equal(s.office.forms.length, 0, 'a colliding form is removed');
  s.office.forms.push(officeForm(s.player, 91));
  h.game.update(0.5);
  assert.equal(s.office.hits, 1);
  assert.equal(s.office.forms.length, 0, 'contact while recovering cannot cause a later delayed hit');
  h.game.update(0.7);
  s.office.forms.push(officeForm(s.player, 92));
  h.game.update(0);
  assert.equal(s.office.hits, 2);
  assert.equal(s.mode, 'playing');
  h.game.update(1.2);
  s.office.forms.push(officeForm(s.player, 93));
  h.game.update(0);
  assert.equal(s.office.hits, 3);
  assert.equal(s.mode, 'ended');
  assert.equal(h.endings[0].success, false);
  assert.equal(h.endings[0].hits, 3);
  h.game.update(1000);
  assert.equal(h.endings.length, 1);
});

test('PSPO: ducking avoids a chest-height form but standing in its path causes a hit', t => {
  const h = harness(t);
  h.game.start('pspo');
  const s = h.game.state;
  h.game.setControl('ArrowDown', true);
  s.office.forms.push(officeForm(s.player, 94, 420));
  h.game.update(0);
  assert.equal(s.player.ducking, true);
  assert.equal(s.office.hits, 0);
  h.game.setControl('ArrowDown', false);
  h.game.update(0);
  assert.equal(s.player.ducking, false);
  assert.equal(s.office.hits, 1);
});

test('PSPO: reaching the copa is not victory until a nearby coffee is collected', t => {
  const h = harness(t);
  h.game.start('pspo');
  const s = h.game.state, coffee = s.office.coffee;
  h.key('KeyE'); h.click(coffee.x, coffee.y);
  assert.equal(s.office.coffee.collected, false, 'remote keyboard and pointer attempts are rejected');
  assert.equal(s.mode, 'playing');
  s.player.x = coffee.x - 100;
  h.game.update(0);
  assert.equal(s.mode, 'playing', 'proximity alone does not finish the mission');
  h.click(coffee.x, coffee.y);
  assert.equal(s.office.coffee.collected, true);
  assert.equal(s.office.progress, 1);
  assert.equal(s.correct, 1);
  assert.equal(h.endings[0].success, true);
  assert.equal(h.endings[0].distance, coffee.x - 165);
  h.game.start('pspo');
  h.game.state.player.x = h.game.state.office.coffee.x - 100;
  h.game.setControl('KeyE', true);
  assert.equal(h.game.state.mode, 'ended', 'touch control follows the same coffee collection path');
});

test('PSPO: spawn cues are deterministic, pause freezes the office, and restart removes forms', t => {
  const h = harness(t);
  h.game.start('pspo');
  const s = h.game.state;
  s.player.x = 400; h.game.update(0);
  assert.equal(s.office.telegraph.origin, 'IED');
  assert.equal(s.office.telegraph.until, 0.75);
  assert.equal(s.office.forms.length, 0);
  h.game.update(0.75);
  assert.equal(s.office.forms[0].origin, 'IED');
  assert.equal(s.office.forms[0].y, 450);
  h.game.setControl('ArrowDown', true); h.game.update(0);
  const formX = s.office.forms[0].x, elapsed = s.elapsed, distance = s.office.distance;
  h.game.pause(true); h.game.update(40);
  assert.equal(s.elapsed, elapsed);
  assert.equal(s.office.forms[0].x, formX);
  assert.equal(s.player.ducking, false);
  assert.equal(h.game.keys.size, 0);
  h.game.pause(false);
  s.player.x = 200; h.game.update(0);
  assert.equal(s.office.distance, distance, 'backtracking does not erase achieved route progress');
  h.game.start('pspo');
  assert.equal(h.game.state.office.forms.length, 0);
  assert.equal(h.game.state.office.hits, 0);
  assert.equal(h.game.state.office.progress, 0);
  assert.equal(h.game.state.office.spawnIndex, 0);
  assert.equal(h.game.state.office.telegraph, null);
  h.game.start('sms');
  assert.equal(h.game.state.office, null);
  assert.equal(h.game.state.worldWidth, 3400);
  assert.equal(h.game.state.workers.length, 19);
});

test('PSPO: the full corridor is beatable using only normal movement, jumps, ducking and coffee control', t => {
  const h = harness(t);
  h.game.start('pspo');
  const s = h.game.state;
  const origins = new Set();
  const crossed = new Set();
  let jumps = 0;
  // This route controller reads the same desk and projectile positions visible
  // to a player. It never teleports, removes forms, changes lives or grants immunity.
  for (let frame = 0; frame < 18000 && s.mode === 'playing'; frame++) {
    const p = s.player, office = s.office;
    let right = true, duck = false, jump = false;
    if (office.telegraph) { right = false; origins.add(office.telegraph.origin); }
    const incoming = office.forms.find(form => form.active && form.x > p.x - 65);
    if (incoming) {
      origins.add(incoming.origin);
      const dx = incoming.x - p.x;
      if (incoming.y >= 440) {
        right = !p.grounded || dx <= 140;
        jump = p.grounded && dx <= 140 && dx > -40;
      } else if (incoming.y >= 400) { right = false; duck = true; }
      else right = false;
    }
    const desk = s.platforms.find(d => d.x >= p.x && d.x - (p.x + 18) < 55);
    if (right && desk && p.grounded) jump = true;
    h.game.setControl('ArrowRight', right);
    h.game.setControl('ArrowDown', duck && !jump);
    if (jump) { h.game.setControl('Space', true); jumps++; }
    h.game.update(1 / 120);
    h.game.setControl('Space', false);
    for (const [index, desk] of s.platforms.entries()) if (p.x > desk.x + desk.w) crossed.add(index);
    if (p.x >= office.coffee.x - 110) h.game.setControl('KeyE', true);
  }
  assert.equal(s.mode, 'ended', 'the route reaches a terminal state');
  assert.equal(h.endings[0]?.success, true, h.endings[0]?.reason || `stuck at ${s.player.x}`);
  assert.equal(s.office.hits, 0, 'each form pattern has a safe response');
  assert.equal(crossed.size, 7, 'all seven solid desks were crossed');
  assert.ok(jumps >= 7);
  assert.deepEqual([...origins].sort(), ['IED', 'IEEI', 'SMS', 'Pré-Op/P-83'].sort());
  assert.equal(s.office.coffee.collected, true);
});
