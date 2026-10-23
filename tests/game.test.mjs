import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../dist/engine.js';
import { observationOutcome, tapOutcome, deadlineExpired, alignmentMatches, angleDistance, dynamicSyncStep } from '../dist/rules.js';

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
  const sounds = [];
  const game = new Game(canvas, {
    onEnd: result => endings.push(result),
    onUpdate: state => updates.push({ mode: state.mode, elapsed: state.elapsed, score: state.score }),
    onInteraction: result => interactions.push(result),
    onSound: result => sounds.push(result),
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
    game.state.player.y = target.kind === 'support' ? 350 : 500;
    game.update(0);
    click(target.x, target.y);
  };
  return { game, canvas, frame, click, key, approach, calls, gradients, frames, endings, updates, interactions, sounds, windowListeners, documentListeners, canvasListeners };
}

function settleVictory(h) {
  assert.equal(h.game.state.mode, 'celebrating');
  h.game.update(h.game.state.celebration.duration);
  assert.equal(h.game.state.mode, 'ended');
}

function repairStroke(game, x1, y1, x2, y2, reverse = false, samples = 1) {
  game.repairGesture({ type: 'start', x: x1, y: y1 });
  for (let i = 1; i <= samples; i++) game.repairGesture({ type: 'move', x: x1 + (x2 - x1) * i / samples, y: y1 + (y2 - y1) * i / samples });
  if (reverse) for (let i = 1; i <= samples; i++) game.repairGesture({ type: 'move', x: x2 + (x1 - x2) * i / samples, y: y2 + (y1 - y2) * i / samples });
  game.repairGesture({ type: 'end', x: x1, y: y1 });
}

function finishRepairTool(h, target, tool = target.step, gestureDelay = 0) {
  assert.equal(h.game.chooseTool(tool), true);
  if (tool === 2) {
    for (const zone of target.zones) {
      h.game.repairGesture({ type: 'start', x: zone.x, y: zone.y });
      h.game.repairGesture({ type: 'end', x: zone.x, y: zone.y });
      if (gestureDelay) h.game.update(gestureDelay);
    }
  } else {
    for (const cell of target.cells) {
      if (target.step !== tool) break;
      repairStroke(h.game, cell.x - .08, cell.y, cell.x + .08, cell.y, tool === 1);
      if (gestureDelay) h.game.update(gestureDelay);
    }
  }
  assert.equal(target.step, tool + 1, `tool ${tool} completes local treatment`);
}

function finishRepair(h, target, gestureDelay = 0) {
  for (let tool = target.step; tool < 4; tool++) finishRepairTool(h, target, tool, gestureDelay);
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
  assert.equal(h.endings.length, 0, 'the celebration precedes the score menu');
  settleVictory(h);
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

test('IEEI: local gestures require proximity and the right tool; partial work survives dismissal', t => {
  const h = harness(t);
  h.game.start('ieei'); h.frame();
  const rust = h.game.state.rust[0];
  h.click(rust.x, rust.y);
  assert.equal(h.game.state.activeTarget, null);
  assert.match(h.game.state.feedback.text, /Aproxime|perto/);
  h.approach(rust);
  assert.deepEqual(h.game.state.activeTarget, { type: 'repair', id: rust.id });
  assert.equal(h.interactions.length, 1);
  assert.equal(h.game.chooseTool(1), false);
  const cell = rust.cells[0];
  repairStroke(h.game, cell.x - .04, cell.y, cell.x + .04, cell.y);
  assert.equal(rust.progress, 0);
  assert.equal(h.game.chooseTool(0), true);
  h.game.repairGesture({type:'start', x:0, y:0});
  h.game.repairGesture({type:'move', x:0, y:0});
  h.game.repairGesture({type:'end', x:0, y:0});
  assert.equal(rust.progress, 0, 'stationary or outside input cannot treat the surface');
  repairStroke(h.game, cell.x - .04, cell.y, cell.x + .04, cell.y);
  const partial = rust.progress;
  assert.ok(partial > 0 && partial < .95);
  h.game.closeInteraction(); h.approach(rust);
  assert.equal(h.game.state.toolProgress, partial, 'partial work survives dismissal');
  finishRepair(h, rust);
  assert.equal(rust.step, 4);
  assert.equal(h.game.state.correct, 1);
  assert.equal(h.game.state.score, 100);
  assert.equal(h.game.state.activeTarget, null);
});

test('IEEI: all three fully treated points celebrate before the score menu and keep the completion time', t => {
  const h = harness(t);
  h.game.start('ieei'); h.frame();
  h.game.update(89);
  for (const rust of h.game.state.rust) { h.approach(rust); finishRepair(h, rust); }
  assert.equal(h.game.state.correct, 3);
  assert.equal(h.game.state.score, 300);
  assert.equal(h.game.state.mode, 'celebrating');
  assert.equal(h.endings.length, 0);
  settleVictory(h);
  assert.equal(h.endings[0].success, true);
  assert.equal(h.endings[0].elapsed, 89);
});

test('IEEI: the deadline runs while working and expires at exactly 90 seconds', t => {
  const h = harness(t);
  h.game.start('ieei'); h.frame();
  h.approach(h.game.state.rust[0]);
  h.game.update(89.999);
  assert.equal(h.game.state.mode, 'playing');
  h.game.update(0.001);
  assert.equal(h.game.state.timeLeft, 0);
  assert.equal(h.game.state.mode, 'ended');
  assert.equal(h.game.state.activeTarget, null);
  assert.equal(h.endings[0].success, false);
  h.game.chooseTool(0); repairStroke(h.game, .1, .5, .9, .5);
  assert.equal(h.game.state.correct, 0);
});

test('IEEI: E and tool keys work nearby; the elevated support cannot be opened from the deck', t => {
  const h = harness(t); h.game.start('ieei');
  const s = h.game.state, [pipe, support] = s.rust;
  h.key('KeyE'); assert.equal(s.activeTarget, null);
  s.player.x = pipe.x; h.key('KeyE');
  assert.equal(s.activeTarget.id, pipe.id);
  h.key('Digit2'); assert.equal(s.selectedTool, null);
  h.key('Digit1'); assert.equal(s.selectedTool, 0);
  h.game.closeInteraction();
  s.player.x = support.x; s.player.y = 500;
  assert.equal(h.game.interactRepair(support.id), false);
  h.click(support.x, support.y); assert.equal(s.activeTarget, null);
  s.player.y = 350;
  h.game.setControl('KeyE', true); h.game.setControl('KeyE', false);
  assert.equal(s.activeTarget.id, support.id);
});

test('IEEI: pause and tool changes terminate drag sessions without losing completed local work', t => {
  const h = harness(t); h.game.start('ieei');
  const target = h.game.state.rust[0]; h.approach(target); h.game.chooseTool(0);
  const cell = target.cells[0];
  repairStroke(h.game, cell.x-.01, cell.y, cell.x+.01, cell.y);
  const progress = target.progress;
  h.game.repairGesture({type:'start', x:.2, y:.5});
  h.game.pause(true); h.game.update(10);
  h.game.repairGesture({type:'move', x:.8, y:.5});
  assert.equal(target.progress, progress);
  h.game.pause(false);
  h.game.repairGesture({type:'move', x:.8, y:.5});
  assert.equal(target.progress, progress, 'resume does not draw a line from a stale pointer');
  h.game.repairGesture({type:'start', x:.2, y:.5});
  h.game.chooseTool(1);
  h.game.chooseTool(0);
  h.game.repairGesture({type:'move', x:.8, y:.5});
  assert.equal(target.progress, progress, 'tool selection requires a fresh stroke');
});

test('slow rendering frames do not extend the ninety-second deadline', t => {
  const h = harness(t);
  h.game.start('ieei'); h.frame();
  h.frame(45000);
  assert.equal(h.game.state.timeLeft, 45);
  h.frame(45000);
  assert.equal(h.game.state.mode, 'ended');
  assert.equal(h.game.state.timeLeft, 0);
  assert.equal(h.endings[0].elapsed, 90);
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

function preopOpen(h, id) {
  const s = h.game.state, mission = s.preop;
  const target = [mission.board, ...mission.stations, ...mission.racks, ...mission.fieldPoints].find(target => target.id === id);
  h.game.closeInteraction();
  s.player.x = target.x; s.player.y = target.kind === 'field' ? Math.min(500, target.y + 40) : 500;
  s.player.vy = 0; s.player.grounded = true;
  assert.equal(h.game.interactPreop(id), true, `open ${id}`);
  return target;
}

function preopTake(h, rack, item) { preopOpen(h, rack); assert.equal(h.game.takeEvidence(item), true); h.game.closeInteraction(); }
function preopDeliver(h, station, item) { preopOpen(h, station); assert.equal(h.game.deliverEvidence(item), true); h.game.closeInteraction(); }
function preopField(h) { for (const point of h.game.state.preop.fieldPoints) preopOpen(h, point.id); }

test('Pré-Op: proximity and active-rack checks prevent remote collection and field shortcuts', t => {
  const h = harness(t); h.game.start('preop'); h.frame();
  const s = h.game.state;
  assert.equal(s.timeLeft, 120); assert.equal(s.worldWidth, 3600);
  assert.equal(h.game.takeEvidence('oil-tag'), false);
  assert.equal(h.game.interactPreop('tags'), false);
  assert.equal(h.game.recordFieldPoint('field-1'), false);
  s.player.x = 1450; s.player.y = 500;
  assert.equal(h.game.interactPreop('field-1'), false, 'cannot record elevated point from the deck');
  preopOpen(h, 'tags');
  assert.equal(h.game.takeEvidence('water-document'), false, 'the document belongs to another rack');
  assert.equal(h.game.takeEvidence('radio-revision'), false, 'surprise evidence starts unavailable');
  assert.equal(h.game.chooseTap(0), false, 'legacy sequence cannot bypass evidence collection');
});

test('Pré-Op: two-slot inventory preserves wrong evidence and supports returning and recollecting it', t => {
  const h = harness(t); h.game.start('preop');
  const mission = h.game.state.preop;
  preopOpen(h, 'tags');
  assert.equal(h.game.takeEvidence('oil-decoy'), true);
  assert.equal(h.game.takeEvidence('tag-decoy'), true);
  assert.equal(h.game.takeEvidence('oil-tag'), false);
  assert.deepEqual(mission.inventory, ['oil-decoy', 'tag-decoy']);
  assert.equal(h.game.takeEvidence('oil-decoy'), false, 'no duplicate collection');
  preopOpen(h, 'oil');
  assert.equal(h.game.deliverEvidence('oil-decoy'), false);
  assert.equal(h.game.state.timeLeft, 115);
  assert.deepEqual(mission.inventory, ['oil-decoy', 'tag-decoy']);
  assert.equal(mission.stations[0].done, false);
  assert.equal(h.game.dropEvidence('oil-decoy'), true);
  assert.equal(mission.items.find(item => item.id === 'oil-decoy').available, true);
  preopOpen(h, 'tags');
  assert.equal(h.game.takeEvidence('oil-tag'), true);
  preopDeliver(h, 'oil', 'oil-tag');
  assert.equal(h.game.state.correct, 1);
  assert.equal(h.game.dropEvidence('oil-tag'), false, 'accepted evidence cannot be duplicated');
  preopOpen(h, 'tags');
  assert.equal(h.game.takeEvidence('oil-tag'), false);
  assert.equal(h.game.takeEvidence('oil-decoy'), true, 'returned decoy remains recoverable');
});

test('Pré-Op: last field point waits for capacity and the completed field evidence remains recoverable', t => {
  const h = harness(t); h.game.start('preop');
  const mission = h.game.state.preop;
  preopTake(h, 'tags', 'oil-tag'); preopTake(h, 'tags', 'oil-decoy');
  preopOpen(h, 'field-1'); preopOpen(h, 'field-2');
  const last = mission.fieldPoints[2];
  h.game.state.player.x = last.x; h.game.state.player.y = 400;
  assert.equal(h.game.interactPreop(last.id), false);
  assert.equal(last.recorded, false, 'a full prancheta cannot lose the final evidence');
  assert.equal(h.game.dropEvidence('oil-decoy'), true);
  assert.equal(h.game.interactPreop(last.id), true);
  assert.deepEqual(mission.inventory, ['oil-tag', 'gas-evidence']);
  assert.equal(h.game.dropEvidence('gas-evidence'), true);
  assert.equal(h.game.interactPreop(last.id), true, 'the field evidence can be recovered after return');
  assert.equal(mission.inventory.filter(id => id === 'gas-evidence').length, 1);
});

test('Pré-Op: the radio appears once, adds fifteen seconds, and never reopens a completed system', t => {
  const h = harness(t); h.game.start('preop');
  const s = h.game.state, mission = s.preop;
  preopTake(h, 'documents', 'water-document');
  preopDeliver(h, 'water', 'water-document');
  assert.equal(mission.stations.find(station => station.id === 'water').done, true);
  assert.equal(mission.radio.triggered, true); assert.equal(mission.radio.targetId, 'gas');
  assert.equal(mission.bonusSeconds, 15); assert.equal(s.timeLeft, 135);
  assert.deepEqual(mission.stations.find(station => station.id === 'gas').requiredIds, ['gas-evidence', 'radio-revision']);
  const radioUntil = mission.radio.until;
  assert.equal(h.game.triggerPreopRadio(), false);
  assert.equal(mission.radio.until, radioUntil);
  preopField(h); preopDeliver(h, 'gas', 'gas-evidence');
  assert.equal(mission.stations.find(station => station.id === 'gas').done, false, 'radio complement is still required');
  preopTake(h, 'revision', 'radio-revision'); preopDeliver(h, 'gas', 'radio-revision');
  preopTake(h, 'tags', 'oil-tag'); preopDeliver(h, 'oil', 'oil-tag');
  assert.equal(s.correct, 3); assert.equal(mission.bonusSeconds, 15);
  assert.equal(s.mode, 'playing', 'completion still requires returning to the board');
  assert.equal(h.game.finishPreop(), false, 'cannot close remotely');
  preopOpen(h, 'board'); assert.equal(h.game.finishPreop(), true);
  const elapsed = s.elapsed;
  h.game.update(2.399); assert.equal(s.mode, 'playing');
  assert.equal(s.elapsed, elapsed, 'accepted closure freezes the deadline during its animation');
  h.game.update(0.001); settleVictory(h);
  assert.equal(h.endings[0].success, true);
  assert.match(h.endings[0].reason, /TAP aprovada \(FIC concluída\)/);
});

test('Pré-Op: all six system orders preserve completed work and permit final closure', t => {
  const h = harness(t);
  for (const order of [['oil','gas','water'], ['oil','water','gas'], ['gas','oil','water'], ['gas','water','oil'], ['water','oil','gas'], ['water','gas','oil']]) {
    h.game.start('preop');
    const mission = h.game.state.preop;
    for (const id of order) {
      if (id === 'gas') preopField(h);
      else preopTake(h, id === 'oil' ? 'tags' : 'documents', id === 'oil' ? 'oil-tag' : 'water-document');
      const base = id === 'oil' ? 'oil-tag' : id === 'gas' ? 'gas-evidence' : 'water-document';
      preopDeliver(h, id, base);
      const station = mission.stations.find(station => station.id === id);
      if (!station.done) { preopTake(h, 'revision', 'radio-revision'); preopDeliver(h, id, 'radio-revision'); }
      assert.equal(station.done, true, `${order.join('→')}: ${id}`);
    }
    assert.equal(mission.bonusSeconds, 15);
    assert.ok(mission.stations.every(station => station.done));
    preopOpen(h, 'board'); assert.equal(h.game.finishPreop(), true);
    h.game.update(2.4); settleVictory(h); assert.equal(h.endings.at(-1).success, true);
  }
});

test('Pré-Op: pause freezes mission and radio; restart clears inventory, extra time and evidence', t => {
  const h = harness(t); h.game.start('preop');
  preopTake(h, 'tags', 'oil-tag'); preopDeliver(h, 'oil', 'oil-tag');
  preopTake(h, 'revision', 'radio-revision');
  const s = h.game.state;
  h.game.update(1);
  const before = JSON.stringify({elapsed:s.elapsed,time:s.timeLeft,radio:s.preop.radio,inventory:s.preop.inventory});
  h.game.pause(true); h.game.update(50);
  assert.equal(h.game.dropEvidence('radio-revision'), false);
  assert.equal(h.game.interactPreop('revision'), false);
  assert.equal(JSON.stringify({elapsed:s.elapsed,time:s.timeLeft,radio:s.preop.radio,inventory:s.preop.inventory}), before);
  h.game.pause(false); h.game.update(1);
  assert.equal(s.elapsed, 2);
  h.game.start('preop');
  const fresh = h.game.state;
  assert.equal(fresh.timeLeft, 120); assert.equal(fresh.correct, 0); assert.equal(fresh.attempt, 2);
  assert.deepEqual(fresh.preop.inventory, []); assert.equal(fresh.preop.bonusSeconds, 0);
  assert.equal(fresh.preop.radio.triggered, false); assert.equal(fresh.preop.closing, null);
  assert.ok(fresh.preop.fieldPoints.every(point => !point.recorded));
  assert.ok(fresh.preop.stations.every(station => !station.done && !station.acceptedIds.length));
  assert.equal(fresh.preop.items.find(item => item.id === 'radio-revision').available, false);
});

test('Pré-Op: the deadline runs inside panels and incorrect delivery can consume the final seconds', t => {
  const h = harness(t); h.game.start('preop');
  preopOpen(h, 'board'); assert.equal(h.game.finishPreop(), false);
  h.game.update(119.999); assert.equal(h.game.state.mode, 'playing');
  h.game.update(0.001); assert.equal(h.game.state.mode, 'ended');
  assert.equal(h.game.state.timeLeft, 0); assert.equal(h.endings[0].success, false);
  h.game.start('preop'); preopTake(h, 'tags', 'oil-decoy'); preopOpen(h, 'oil');
  h.game.update(116); assert.equal(h.game.deliverEvidence('oil-decoy'), false);
  assert.equal(h.game.state.mode, 'ended'); assert.equal(h.game.state.timeLeft, 0);
  assert.equal(h.endings[1].success, false);
});

function movePreopTo(h, x) {
  const s = h.game.state, direction = x > s.player.x ? 'ArrowRight' : 'ArrowLeft';
  h.game.setControl(direction, true);
  let steps = 0;
  while (Math.abs(s.player.x - x) > 3 && s.mode === 'playing' && steps++ < 5000) h.game.update(1 / 120);
  h.game.setControl(direction, false);
  assert.ok(Math.abs(s.player.x - x) <= 3, `route could not reach ${x}; position ${s.player.x}, mode ${s.mode}`);
  for (let i=0;i<48;i++) h.game.update(1 / 120);
}
function climbPreop(h, y) {
  h.game.setControl('ArrowUp', true);
  let steps = 0;
  while (h.game.state.player.y > y + .1 && h.game.state.mode === 'playing' && steps++ < 300) h.game.update(1 / 120);
  h.game.setControl('ArrowUp', false);
  assert.ok(Math.abs(h.game.state.player.y - y) < 1, `climb failed: ${h.game.state.player.y}`);
}
function preopRouteOpen(h, id) {
  assert.equal(h.game.interactPreop(id), true, `route opens ${id}`);
  h.game.update(.5); // Allow time to read the local interaction.
}

test('IEEI: normal controls reach all surfaces including the support, with time for localized treatment', t => {
  const h = harness(t); h.game.start('ieei');
  const s = h.game.state;
  movePreopTo(h, 470);
  assert.equal(h.game.interactRepair('rust-1'), true);
  finishRepair(h, s.rust[0], .15);
  movePreopTo(h, 1389); climbPreop(h, 350); movePreopTo(h, 1600);
  assert.equal(h.game.interactRepair('rust-2'), true);
  finishRepair(h, s.rust[1], .15);
  movePreopTo(h, 2820);
  assert.equal(h.game.interactRepair('rust-3'), true);
  finishRepair(h, s.rust[2], .15);
  assert.equal(s.correct, 3); assert.equal(s.score, 300);
  assert.ok(s.elapsed < 90, `elapsed ${s.elapsed}`);
  settleVictory(h);
  assert.equal(h.endings[0].success, true);
  t.diagnostic(`IEEI route accepted after ${s.elapsed.toFixed(2)}s including 150ms per localized treatment stroke.`);
});

test('Pré-Op: all systems, elevated field evidence, radio revision and return are beatable with normal controls', t => {
  const h = harness(t); h.game.start('preop'); h.frame();
  const s = h.game.state;
  // All movement below uses normal controls; no teleport, inventory injection or time edits.
  h.game.setControl('Space', true); h.game.update(1/120); h.game.setControl('Space', false);
  assert.ok(s.player.y < 500);
  movePreopTo(h, 1000); preopRouteOpen(h, 'tags'); assert.equal(h.game.takeEvidence('oil-tag'), true); h.game.closeInteraction();
  movePreopTo(h, 650); preopRouteOpen(h, 'oil'); assert.equal(h.game.deliverEvidence('oil-tag'), true); h.game.closeInteraction();
  movePreopTo(h, 1389); climbPreop(h, 350); movePreopTo(h, 1450);
  assert.equal(h.game.interactPreop('field-1'), true);
  movePreopTo(h, 2100); h.game.setControl('KeyE', true); h.game.setControl('KeyE', false);
  assert.equal(s.preop.fieldPoints[1].recorded, true, 'E registers the nearby field point');
  movePreopTo(h, 2284); climbPreop(h, 400); movePreopTo(h, 2370);
  assert.equal(h.game.interactPreop('field-3'), true); assert.ok(s.preop.inventory.includes('gas-evidence'));
  movePreopTo(h, 1800); preopRouteOpen(h, 'gas'); assert.equal(h.game.deliverEvidence('gas-evidence'), true); h.game.closeInteraction();
  movePreopTo(h, 2600); preopRouteOpen(h, 'revision'); assert.equal(h.game.takeEvidence('radio-revision'), true); h.game.closeInteraction();
  movePreopTo(h, 3240); preopRouteOpen(h, 'documents'); assert.equal(h.game.takeEvidence('water-document'), true); h.game.closeInteraction();
  assert.equal(s.preop.inventory.length, 2);
  movePreopTo(h, 3020); preopRouteOpen(h, 'water');
  assert.equal(h.game.deliverEvidence('water-document'), true); assert.equal(s.preop.stations[2].done, false);
  assert.equal(h.game.deliverEvidence('radio-revision'), true); h.game.closeInteraction();
  assert.equal(s.correct, 3); assert.equal(s.mode, 'playing');
  movePreopTo(h, 190); preopRouteOpen(h, 'board'); assert.equal(h.game.finishPreop(), true);
  h.game.update(2.4); settleVictory(h);
  assert.equal(h.endings[0]?.success, true, h.endings[0]?.reason);
  assert.ok(s.elapsed < 135, `elapsed ${s.elapsed}`);
  t.diagnostic(`Pre-Op route accepted after ${s.elapsed.toFixed(2)}s including panel reading delays.`);
  assert.ok(s.preop.fieldPoints.every(point => point.recorded));
  assert.ok(s.preop.stations.every(station => station.done));
  assert.equal(s.preop.bonusSeconds, 15); assert.equal(s.score, 300);
  assert.equal(s.preop.inventory.length, 0);
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

test('all five victories celebrate before publishing one result, freezing time and input', t => {
  const h = harness(t);
  for (const stage of ['sms','ieei','ied','pspo','preop']) {
    h.game.start(stage); h.game.update(.5);
    const s = h.game.state;
    s.score = 123; s.correct = 3;
    const elapsed = s.elapsed, timeLeft = s.timeLeft, position = {...s.player};
    const before = h.endings.length, soundBefore = h.sounds.filter(event => event.type === 'victory').length;
    h.game.end(true, 'Concluído!');
    assert.equal(s.mode, 'celebrating');
    assert.equal(s.activeTarget, null);
    assert.equal(h.endings.length, before);
    h.game.end(true, 'Duplicado'); h.game.end(false, 'Tardio');
    assert.equal(h.sounds.filter(event => event.type === 'victory').length, soundBefore + 1);
    h.key('ArrowRight'); h.key('Space'); h.game.setControl('ArrowRight', true);
    h.game.update(.5); h.frame();
    assert.equal(s.elapsed, elapsed); assert.equal(s.timeLeft, timeLeft);
    assert.equal(s.player.x, position.x); assert.equal(s.player.y, position.y);
    assert.equal(h.game.keys.size, 0);
    assert.equal(h.endings.length, before);
    h.game.update(s.celebration.duration - s.celebration.elapsed);
    assert.equal(s.mode, 'ended'); assert.equal(h.endings.length, before + 1);
    assert.equal(h.endings.at(-1).score, 123);
    assert.equal(h.endings.at(-1).elapsed, elapsed);
    assert.equal(h.endings.at(-1).reason, 'Concluído!');
    h.game.update(10); h.game.end(true, 'Duplicado');
    assert.equal(h.endings.length, before + 1);
  }
});

test('celebrations pause on hidden tabs and resume without skipping to the score menu', t => {
  const h = harness(t); h.game.start('ieei');
  h.game.end(true, 'Concluído!'); h.game.update(.7);
  document.hidden = true; h.documentListeners.get('visibilitychange')();
  assert.equal(h.game.state.mode, 'paused');
  h.game.update(30); assert.equal(h.game.state.celebration.elapsed, .7);
  assert.equal(h.endings.length, 0);
  document.hidden = false; h.game.pause(false);
  assert.equal(h.game.state.mode, 'celebrating');
  h.game.update(.5); assert.ok(h.game.state.celebration.elapsed > .7);
  assert.equal(h.endings.length, 0);
  settleVictory(h); assert.equal(h.endings.length, 1);
});

test('restart, stage changes and destroy cancel pending celebrations; defeat is immediate', t => {
  const h = harness(t); h.game.start('ieei');
  h.game.end(true, 'Vitória antiga'); h.game.update(.5);
  h.game.start('ieei'); h.game.update(3);
  assert.equal(h.game.state.mode, 'playing'); assert.equal(h.endings.length, 0);
  h.game.end(true, 'Outra vitória'); h.game.start('pspo'); h.game.update(3);
  assert.equal(h.endings.length, 0);
  h.game.end(false, 'Derrota');
  assert.equal(h.game.state.mode, 'ended'); assert.equal(h.endings.length, 1);
  assert.equal(h.endings[0].success, false);
  h.game.start('sms'); h.game.end(true, 'Não publicar'); h.game.destroy(); h.frame(5000);
  assert.equal(h.endings.length, 1);
  assert.equal(h.frames.size, 0);
});

test('pure rules preserve observation and deadline boundaries', () => {
  const worker = { risk: 'helmet', corrected: false, recorded: false, visibleSince: 10 };
  assert.equal(observationOutcome(worker, 11.999, 4, 4).won, true);
  assert.equal(observationOutcome(worker, 12, 0, 0).failed, true);
  assert.equal(observationOutcome({ ...worker, recorded: true }, 10, 2, 2).type, 'duplicate');
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
  assert.equal(s.worldWidth, 6600);
  assert.equal(s.platforms.length, 9);
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
  settleVictory(h);
  assert.equal(h.endings[0].success, true);
  assert.equal(h.endings[0].distance, coffee.x - 165);
  h.game.start('pspo');
  h.game.state.player.x = h.game.state.office.coffee.x - 100;
  h.game.setControl('KeyE', true);
  settleVictory(h);
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

function playOfficeRoute(h, { collect = true, specialReactionDelay = 0.2, rush = false, stopAtSpecial = null } = {}) {
  const s = h.game.state;
  const origins = new Set();
  const crossed = new Set();
  const cues = new Map();
  let jumps = 0;
  // This route controller reads the same desk and projectile positions visible
  // to a player. It never teleports, removes forms, changes lives or grants immunity.
  for (let frame = 0; frame < 18000 && s.mode === 'playing'; frame++) {
    const p = s.player, office = s.office;
    let right = true, duck = false, jump = false;
    if (office.telegraph) {
      const cue = office.telegraph;
      cues.set(cue.id, { kind: cue.kind, startedAt: cue.startedAt, until: cue.until });
      // Simulate a human continuing the prior movement for 200ms after the
      // special announcement; the controller cannot react instantly to it.
      right = rush || (cue.kind !== 'normal' && s.elapsed - cue.startedAt < specialReactionDelay);
      if (cue.origin) origins.add(cue.origin);
    }
    const incoming = office.forms.find(form => form.active && form.x > p.x - 65);
    if (incoming) {
      if (incoming.origin) origins.add(incoming.origin);
      const dx = incoming.x - p.x;
      if (incoming.y >= 440) {
        const jumpDistance = incoming.kind === 'urgent' ? 160 : 140;
        right = !p.grounded || dx <= jumpDistance;
        jump = p.grounded && dx <= jumpDistance && dx > -40;
      } else if (incoming.y >= 400) { right = false; duck = true; }
      else right = false;
    }
    const desk = s.platforms.find(d => d.x >= p.x && d.x - (p.x + 18) < 55);
    if (rush) {
      right = true; duck = false; jump = false;
      if (incoming) {
        const dx = incoming.x - p.x;
        // Keep running until a form or a desk actually requires a response.
        // Before a desk, avoid committing to a jump underneath a high form.
        if (desk && dx < 800 && p.grounded && p.y >= 495) right = false;
        if (incoming.y >= 440 && dx < 180) {
          const leapAt = incoming.kind === 'urgent' ? 160 : 150;
          if (p.grounded && dx <= leapAt) { jump = true; right = true; }
          else if (p.grounded) right = false;
        } else if (incoming.y >= 400 && dx < 260) {
          if (p.y >= 495) { duck = true; right = !desk; }
          else if (p.grounded) jump = true;
        } else if (incoming.y < 400 && dx < 260 && p.y < 495 && p.grounded) jump = true;
      }
    }
    if (right && desk && p.grounded) jump = true;
    h.game.setControl('ArrowRight', right);
    h.game.setControl('ArrowDown', duck && !jump);
    if (jump) { h.game.setControl('Space', true); jumps++; }
    h.game.update(1 / 120);
    h.game.setControl('Space', false);
    if (office.telegraph?.kind === stopAtSpecial) {
      h.game.setControl('ArrowRight', false); h.game.setControl('ArrowDown', false);
      break;
    }
    for (const [index, desk] of s.platforms.entries()) if (p.x > desk.x + desk.w) crossed.add(index);
    if (p.x >= office.coffee.x - 110) {
      if (collect) h.game.setControl('KeyE', true);
      else { h.game.setControl('ArrowRight', false); break; }
    }
  }
  if (s.mode === 'celebrating') settleVictory(h);
  return { origins, crossed, cues, jumps };
}

test('PSPO: the longer corridor and all ten forms are beatable with normal controls and 200ms special-reaction delay', t => {
  const h = harness(t);
  h.game.start('pspo');
  const s = h.game.state;
  const { origins, crossed, cues, jumps } = playOfficeRoute(h);
  assert.equal(s.mode, 'ended', 'the route reaches a terminal state');
  assert.equal(h.endings[0]?.success, true, h.endings[0]?.reason || `stuck at ${s.player.x}`);
  assert.equal(s.office.hits, 0, 'each form pattern has a safe response');
  assert.equal(crossed.size, 9, 'all nine solid desks were crossed');
  assert.ok(jumps >= 9);
  assert.deepEqual([...origins].sort(), ['IED', 'IEEI', 'SMS', 'Pré-Op/P-83'].sort());
  assert.equal(s.office.coffee.collected, true);
  assert.equal(s.office.spawnHistory.length, 10);
  assert.equal(s.office.spawnHistory.filter(form => form.kind === 'normal').length, 8);
  for (const kind of ['return', 'urgent']) {
    const encounters = s.office.spawnHistory.filter(form => form.kind === kind);
    assert.equal(encounters.length, 1, `${kind} launches exactly once`);
    const form = encounters[0];
    assert.ok(cues.has(form.id));
    assert.ok(form.spawnedAt - form.startedAt >= form.warningDuration - 1e-8);
    assert.ok(form.playerX < s.office.coffee.x - 550, 'special launches well before the coffee machine');
  }
});

test('PSPO: a fast controls-only route still encounters both unique specials before coffee', t => {
  const h = harness(t);
  h.game.start('pspo');
  const s = h.game.state;
  playOfficeRoute(h, { rush: true });
  assert.equal(h.endings[0]?.success, true, h.endings[0]?.reason || `stuck at ${s.player.x}`);
  for (const kind of ['return', 'urgent']) {
    const forms = s.office.spawnHistory.filter(form => form.kind === kind);
    assert.equal(forms.length, 1);
    assert.ok(forms[0].playerX < s.office.coffee.x - 550);
  }
  assert.equal(s.office.spawnHistory.length, 10);
});

test('PSPO: backtracking across the special encounter locations never re-arms either form', t => {
  const h = harness(t);
  h.game.start('pspo');
  playOfficeRoute(h, { collect: false });
  const s = h.game.state;
  assert.equal(s.office.spawnHistory.length, 10);
  const originalIds = s.office.spawnHistory.map(form => form.id);
  h.game.setControl('ArrowRight', false); h.game.setControl('ArrowLeft', true);
  for (let i = 0; i < 4000 && s.player.x > 1800; i++) {
    const desk = s.platforms.find(d => d.x + d.w < s.player.x && s.player.x - 18 - (d.x + d.w) < 55);
    if (desk && s.player.grounded) h.game.setControl('Space', true);
    h.game.update(1 / 120); h.game.setControl('Space', false);
  }
  assert.ok(s.player.x <= 1800, 'actual leftward movement crosses both encounter locations');
  h.game.setControl('ArrowLeft', false);
  playOfficeRoute(h);
  assert.equal(h.endings[0].success, true);
  assert.deepEqual(s.office.spawnHistory.map(form => form.id), originalIds);
  assert.equal(new Set(originalIds).size, 10);
});

test('PSPO: special warning pauses, launches with fresh relative distance, and resets only for a new attempt', t => {
  const h = harness(t);
  h.game.start('pspo');
  playOfficeRoute(h, { stopAtSpecial: 'return' });
  const s = h.game.state, cue = s.office.telegraph;
  assert.equal(cue.kind, 'return');
  assert.equal(cue.label, 'Remarcação de retorno');
  assert.equal(cue.origin, null);
  assert.ok(cue.until > cue.startedAt);
  const elapsed = s.elapsed, until = cue.until, count = s.office.spawnHistory.length;
  h.game.pause(true); h.game.update(20);
  assert.equal(s.elapsed, elapsed); assert.equal(s.office.telegraph.until, until);
  assert.equal(s.office.spawnHistory.length, count);
  h.game.pause(false); h.game.setControl('ArrowRight', true);
  for (let i = 0; i < 76; i++) h.game.update(1 / 120);
  assert.equal(s.office.spawnHistory.length, count);
  for (let i = 0; i < 4; i++) h.game.update(1 / 120);
  const form = s.office.spawnHistory.find(f => f.kind === 'return');
  assert.ok(form);
  assert.equal(form.x - form.playerX, 330, 'launch is relative to current position, not the old warning location');
  assert.ok(form.spawnedAt - form.startedAt >= 0.65 - 1e-8);
  const normal = s.office.spawnHistory.find(f => f.kind === 'normal');
  assert.ok(form.spawnDistance < normal.spawnDistance);
  assert.ok(form.warningDuration < normal.warningDuration);
  assert.ok(form.spawnDistance / Math.abs(form.vx) < normal.spawnDistance / Math.abs(normal.vx));
  assert.ok(Number.isFinite(s.office.forms.find(f => f.kind === 'return').angle));
  h.game.start('pspo');
  assert.equal(h.game.state.office.spawnHistory.length, 0);
  assert.equal(h.game.state.office.spawnIndex, 0);
  playOfficeRoute(h);
  assert.equal(h.game.state.office.spawnHistory.filter(f => f.kind === 'return').length, 1);
  assert.equal(h.game.state.office.spawnHistory.filter(f => f.kind === 'urgent').length, 1);
});

test('PSPO: specials share the existing three-hit rule and chest-height return remains duckable', t => {
  const h = harness(t);
  h.game.start('pspo');
  const s = h.game.state;
  const special = (kind, y) => ({ ...officeForm(s.player, 95, y), id: `${kind}-1`, kind, label: kind === 'return' ? 'Remarcação de retorno' : 'Urgente', origin: null, w: 54, h: 64 });
  s.office.forms.push(special('return', 414));
  h.game.setControl('ArrowDown', true); h.game.update(0);
  assert.equal(s.office.hits, 0, 'return bottom446 stays above crouching top448');
  h.game.setControl('ArrowDown', false); h.game.update(0);
  assert.equal(s.office.hits, 1);
  assert.match(s.feedback.text, /Remarcação de retorno/);
  h.game.update(1.2);
  s.office.forms.push(special('urgent', 455)); h.game.update(0);
  assert.equal(s.office.hits, 2); assert.equal(s.mode, 'playing');
  assert.match(s.feedback.text, /Urgente/);
  h.game.update(1.2);
  s.office.forms.push(officeForm(s.player, 96)); h.game.update(0);
  assert.equal(s.office.hits, 3); assert.equal(s.mode, 'ended');
});

function finishAlignmentWithControls(h) {
  const machine = h.game.getTarget();
  for (let frame = 0; frame < 1800 && machine.phase === 'align' && h.game.state.mode === 'playing'; frame++) {
    if (machine.alignmentArmed && h.game.state.elapsed >= machine.cooldownUntil && alignmentMatches(machine.angleA, machine.angleB, machine.tolerance)) h.game.alignMachine();
    h.game.update(1 / 120);
  }
  assert.equal(machine.phase, 'sync');
  return machine;
}

function keepNeedleCentered(h, maxFrames = 800) {
  const machine = h.game.getTarget();
  for (let frame = 0; frame < maxFrames && machine.phase === 'sync' && h.game.state.mode === 'playing'; frame++) {
    h.game.setControl('ArrowLeft', machine.needle > 0.06);
    h.game.setControl('ArrowRight', machine.needle < -0.06);
    h.game.update(1 / 120);
  }
  h.game.setControl('ArrowLeft', false); h.game.setControl('ArrowRight', false);
  return machine;
}

test('IED: circular alignment accepts the exact boundary and wraps across zero', () => {
  assert.ok(alignmentMatches(0.2, 0.7, 0.5));
  assert.equal(alignmentMatches(0.2, 0.7001, 0.5), false);
  assert.ok(alignmentMatches(Math.PI * 2 - 0.1, 0.1, 0.2));
  assert.ok(Math.abs(angleDistance(-0.1, 0.1) - 0.2) < 1e-9);
  const m = { index: 0, needle: 0, band: 0.3, stableTime: 3.99, controlTime: 0 };
  const inside = dynamicSyncStep(m, 0, 0.01);
  assert.ok(inside.inside);
  assert.ok(Math.abs(inside.stableTime - 4) < 1e-9);
  const outside = dynamicSyncStep({ ...m, needle: 0.31 }, 0, 0.01);
  assert.equal(outside.inside, false);
  assert.equal(outside.stableTime, 0);
});

test('IED: proximity and sequence are required, and closed barriers block even jumps', t => {
  const h = harness(t);
  h.game.start('ied');
  const s = h.game.state, [first, second] = s.dynamic.machines;
  assert.equal(s.timeLeft, 90);
  h.click(first.x, first.y);
  assert.equal(s.activeTarget, null);
  assert.match(s.feedback.text, /perto/);
  s.player.x = second.x - 70;
  h.click(second.x, second.y);
  assert.equal(s.activeTarget, null);
  assert.match(s.feedback.text, /ordem/);
  const gate = s.dynamic.barriers[0];
  s.player.x = gate.x - 40; s.player.y = 500;
  h.game.setControl('ArrowRight', true);
  for (let i = 0; i < 30; i++) h.game.update(1 / 120);
  assert.equal(s.player.x, gate.x - 18);
  h.game.setControl('Space', true);
  for (let i = 0; i < 100; i++) h.game.update(1 / 120);
  assert.equal(s.player.x, gate.x - 18, 'a closed integration gate cannot be jumped over');
  assert.equal(s.dynamic.completed, 0);
});

test('IED: bad alignment costs three seconds, cooldown prevents spam, and three fresh windows unlock sync', t => {
  const h = harness(t);
  h.game.start('ied');
  h.approach(h.game.state.dynamic.machines[0]);
  const s = h.game.state, m = h.game.getTarget();
  const oldVibration = m.vibration;
  assert.equal(h.game.alignMachine(), false);
  assert.equal(s.timeLeft, 87);
  assert.equal(m.faults, 1);
  assert.ok(m.vibration > oldVibration);
  for (let i = 0; i < 10; i++) h.game.alignMachine();
  assert.equal(m.faults, 1);
  finishAlignmentWithControls(h);
  assert.equal(m.alignmentHits, 3);
  assert.equal(m.faults, 1);
  assert.equal(s.correct, 0, 'alignment alone does not finish a machine');
});

test('IED: Space is routed once without moving the character, while buttons retain native keyboard activation', t => {
  const h = harness(t);
  h.game.start('ied'); h.approach(h.game.state.dynamic.machines[0]);
  const s = h.game.state, m = h.game.getTarget();
  const button = { closest: selector => selector === 'button' ? {} : null };
  const native = h.key('Space', { target: button });
  assert.equal(native.prevented, undefined);
  assert.equal(m.faults, 0);
  const first = h.key('Space');
  assert.equal(first.prevented, true);
  assert.equal(m.faults, 1);
  h.key('Space', { repeat: true });
  assert.equal(m.faults, 1);
  h.key('ArrowRight');
  const x = s.player.x;
  h.game.update(0.1);
  assert.equal(s.player.x, x);
  assert.equal(h.game.jumpQueued, false);
});

test('IED: sync requires four continuous seconds, excursions reset progress and penalties are paced', t => {
  const h = harness(t);
  h.game.start('ied'); h.approach(h.game.state.dynamic.machines[0]);
  const s = h.game.state, m = finishAlignmentWithControls(h);
  // Center through actual directional controls and earn less than four seconds.
  for (let i = 0; i < 300; i++) {
    h.game.setControl('ArrowLeft', m.needle > 0.06);
    h.game.setControl('ArrowRight', m.needle < -0.06);
    h.game.update(1 / 120);
  }
  assert.ok(m.stableTime > 1 && m.stableTime < 4);
  h.game.setControl('ArrowLeft', false); h.game.setControl('ArrowRight', true);
  while (Math.abs(m.needle) <= m.band) h.game.update(1 / 120);
  assert.equal(m.stableTime, 0);
  const faults = m.faults;
  const before = s.elapsed;
  h.game.update(0.1);
  assert.equal(m.faults, faults, 'staying outside does not charge every frame');
  assert.ok(s.elapsed - before < 0.11);
  h.game.setControl('ArrowRight', false);
  keepNeedleCentered(h);
  assert.equal(m.phase, 'done');
  assert.equal(s.correct, 1);
  assert.equal(s.dynamic.barriers[0].open, true);
  assert.equal(s.platforms[0].y, s.platforms[0].baseY);
  assert.equal(s.activeTarget, null);
});

test('IED: closing resets continuous stability; pause freezes the challenge; restarting clears progress', t => {
  const h = harness(t);
  h.game.start('ied'); h.approach(h.game.state.dynamic.machines[0]);
  const s = h.game.state, m = finishAlignmentWithControls(h);
  for (let i = 0; i < 180; i++) {
    h.game.setControl('ArrowLeft', m.needle > 0.06);
    h.game.setControl('ArrowRight', m.needle < -0.06);
    h.game.update(1 / 120);
  }
  assert.ok(m.stableTime > 0);
  const elapsed = s.elapsed, needle = m.needle, stable = m.stableTime;
  h.game.pause(true); h.game.update(10);
  assert.equal(s.elapsed, elapsed); assert.equal(m.needle, needle); assert.equal(m.stableTime, stable);
  assert.equal(h.game.keys.size, 0);
  h.game.pause(false); h.game.closeInteraction();
  assert.equal(m.stableTime, 0);
  assert.equal(h.game.keys.size, 0);
  h.game.update(1);
  assert.ok(s.elapsed > elapsed, 'clock keeps running while interaction is dismissed');
  h.game.start('ied');
  assert.equal(h.game.state.timeLeft, 90);
  assert.equal(h.game.state.dynamic.completed, 0);
  assert.ok(h.game.state.dynamic.machines.every(machine => machine.phase === 'align' && !machine.alignmentHits && !machine.faults));
  assert.ok(h.game.state.dynamic.barriers.every(gate => !gate.open));
});

test('IED: the 90-second deadline remains active inside the challenge and is exact', t => {
  const h = harness(t);
  h.game.start('ied'); h.approach(h.game.state.dynamic.machines[0]);
  h.game.update(89.999);
  assert.equal(h.game.state.mode, 'playing');
  h.game.update(0.001);
  assert.equal(h.game.state.mode, 'ended');
  assert.equal(h.game.state.timeLeft, 0);
  assert.equal(h.endings[0].success, false);
});

test('IED: all three machines and moving platforms are beatable in under 90 seconds using only normal controls', t => {
  const h = harness(t);
  h.game.start('ied');
  const s = h.game.state;
  let jumps = 0;
  const movedPlatforms = new Set();
  for (let frame = 0; frame < 12000 && s.mode === 'playing'; frame++) {
    const target = s.dynamic.machines[s.dynamic.completed];
    if (s.activeTarget) {
      if (target.phase === 'align') {
        if (target.alignmentArmed && s.elapsed >= target.cooldownUntil && alignmentMatches(target.angleA, target.angleB, target.tolerance)) h.game.setControl('Space', true);
      } else {
        h.game.setControl('ArrowLeft', target.needle > 0.06);
        h.game.setControl('ArrowRight', target.needle < -0.06);
      }
    } else {
      h.game.setControl('ArrowRight', true);
      const obstacle = s.platforms.find(platform => platform.x > s.player.x && platform.x - (s.player.x + 18) < 55);
      if (obstacle && s.player.grounded) { h.game.setControl('Space', true); jumps++; }
      if (Math.abs(s.player.x - target.x) <= 110 && Math.abs(s.player.y - target.y) <= 145) h.click(target.x, target.y);
    }
    h.game.update(1 / 120);
    h.game.setControl('Space', false);
    s.platforms.forEach((platform, index) => { if (Math.abs(platform.y - platform.baseY) > 1) movedPlatforms.add(index); });
  }
  settleVictory(h);
  assert.equal(h.endings[0]?.success, true, h.endings[0]?.reason || `stuck at ${s.player.x}`);
  assert.ok(s.elapsed < 90);
  assert.equal(s.dynamic.completed, 3);
  assert.equal(s.dynamic.totalFaults, 0);
  assert.ok(jumps >= 3, 'the route uses actual jumps over all catwalk obstacles');
  assert.equal(movedPlatforms.size, 3, 'all platforms were moving before integration');
  assert.ok(s.dynamic.barriers.every(gate => gate.open));
  assert.ok(s.platforms.every(platform => platform.y === platform.baseY));
  assert.ok(s.dynamic.machines.every(machine => machine.phase === 'done' && machine.alignmentHits === 3 && machine.stableTime === 4));
});
