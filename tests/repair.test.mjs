import test from 'node:test';
import assert from 'node:assert/strict';
import { makeRepairPoints, canReachRepair, applyRepairGesture, REPAIR_SURFACE } from '../dist/repair-model.js';

function gestureSession(target, tool) {
  let stroke = null;
  return gesture => {
    const result = applyRepairGesture(target, tool, stroke, gesture);
    stroke = result.stroke;
    return result;
  };
}

function sweep(target, tool, samples = 1, reverse = false) {
  const send = gestureSession(target, tool);
  send({type:'start', x:.2, y:.5});
  for (let n = 1; n <= samples; n++) send({type:'move', x:.2 + .6 * n / samples, y:.5});
  if (reverse) for (let n = 1; n <= samples; n++) send({type:'move', x:.8 - .6 * n / samples, y:.5});
  send({type:'end', x:.2, y:.5});
}

test('repair points have distinct surfaces and require climbing to the support', () => {
  const [pipe, support, vessel] = makeRepairPoints();
  assert.deepEqual([pipe.kind, support.kind, vessel.kind], ['pipe','support','vessel']);
  assert.ok(vessel.cells.length > pipe.cells.length);
  assert.notEqual(support.cells.length, pipe.cells.length);
  assert.equal(canReachRepair({x:support.x, y:500, grounded:true}, support), false);
  assert.equal(canReachRepair({x:support.x, y:350, grounded:false}, support), false);
  assert.equal(canReachRepair({x:support.x, y:350, grounded:true}, support), true);
  assert.equal(canReachRepair({x:pipe.x, y:500}, pipe), true);
});

test('coverage follows the swept area and cannot be farmed by rubbing one corner', () => {
  const target = makeRepairPoints()[0];
  const cell = target.cells[0], send = gestureSession(target, 0);
  for (let repeat = 0; repeat < 100; repeat++) {
    send({type:'start', x:cell.x - .01, y:cell.y});
    send({type:'move', x:cell.x + .01, y:cell.y});
    send({type:'end', x:cell.x, y:cell.y});
  }
  assert.equal(target.step, 0);
  assert.ok(target.progress > 0 && target.progress < .4);
  assert.ok(target.cells.some(cell => cell.clean));
  assert.ok(target.cells.some(cell => !cell.clean));
});

test('water, brush and paint coverage do not depend on pointer event frequency', () => {
  for (const tool of [0,1,3]) {
    const a = makeRepairPoints()[2], b = makeRepairPoints()[2];
    a.step = b.step = tool;
    sweep(a, tool, 1, tool === 1);
    sweep(b, tool, 32, tool === 1);
    assert.deepEqual(a.cells.map(c => [c.clean,c.brushed,c.painted]), b.cells.map(c => [c.clean,c.brushed,c.painted]));
    assert.equal(a.progress, b.progress);
  }
});

test('brushing needs opposite passes and cannot finish with repeated one-way strokes', () => {
  const target = makeRepairPoints()[0]; target.step = 1;
  for (let n = 0; n < 20; n++) sweep(target, 1, 8);
  assert.equal(target.progress, 0);
  assert.ok(target.cells.some(cell => cell.brushMask));
  sweep(target, 1, 8, true);
  assert.ok(target.cells.some(cell => cell.brushed));
});

test('neutralizer requires three separate valid applications and ignores duplicate or dragged hits', () => {
  const target = makeRepairPoints()[0]; target.step = 2;
  const send = gestureSession(target, 2), [a,b,c] = target.zones;
  send({type:'start', x:0, y:0}); send({type:'end', x:0, y:0});
  assert.equal(target.progress, 0);
  for (let n = 0; n < 10; n++) send({type:'start', x:a.x, y:a.y});
  assert.equal(target.progress, 1/3);
  send({type:'move', x:b.x, y:b.y}); send({type:'move', x:c.x, y:c.y});
  assert.equal(target.progress, 1/3);
  send({type:'end', x:c.x, y:c.y});
  send({type:'start', x:b.x, y:b.y}); send({type:'end', x:b.x, y:b.y});
  assert.equal(target.progress, 2/3);
  const final = send({type:'start', x:c.x, y:c.y});
  assert.equal(final.advanced, true); assert.equal(target.step, 3);
});

test('invalid coordinates, wrong tools, hover and released strokes cannot treat a surface', () => {
  const target = makeRepairPoints()[0], send = gestureSession(target, 0);
  for (const point of [{x:NaN,y:.5},{x:.5,y:Infinity},{x:-1,y:.5},{x:1.1,y:.5}]) send({type:'start',...point});
  send({type:'move',x:.2,y:.5}); send({type:'move',x:.8,y:.5});
  assert.equal(target.progress, 0, 'pointer movement requires a start');
  const wrong = applyRepairGesture(target, 3, {x:.2,y:.5}, {type:'move',x:.8,y:.5});
  assert.equal(wrong.changed, false); assert.equal(target.progress, 0);
  send({type:'start',x:.2,y:.5}); send({type:'end',x:.2,y:.5});
  send({type:'move',x:.8,y:.5}); send({type:'move',x:.2,y:.5});
  assert.equal(target.progress, 0, 'a release terminates the stroke');
});

test('95 percent completion removes tiny remaining islands without demanding every pixel', () => {
  const target = makeRepairPoints()[2];
  const count = Math.ceil(target.cells.length * REPAIR_SURFACE.coverage);
  assert.ok(count < target.cells.length);
  target.cells.slice(0, count - 1).forEach(cell => {cell.clean = true;});
  const send = gestureSession(target, 0);
  send({type:'start',x:.01,y:.01});
  assert.equal(target.step, 0, 'below the threshold the stage remains open');
  target.cells[count - 1].clean = true;
  const result = send({type:'start',x:.01,y:.01});
  assert.equal(result.advanced, true);
  assert.equal(target.step, 1);
  assert.ok(target.cells.every(cell => cell.clean));
});
