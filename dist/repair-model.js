/** Spatial, device-independent treatment rules for the IEEI minigame. */
export const REPAIR_SURFACE = Object.freeze({ width: 600, height: 240, coverage: 0.95, radius: 30 });
const W = REPAIR_SURFACE.width, H = REPAIR_SURFACE.height;
const distance = (a, b) => Math.hypot((a.x - b.x) * W, (a.y - b.y) * H);
const validPoint = p => Number.isFinite(p?.x) && Number.isFinite(p?.y) && p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1;

function cellsFor(kind) {
  const cells = [];
  const columns = kind === 'pipe' ? 9 : 12;
  const rows = kind === 'pipe' ? 4 : 7;
  for (let row = 0; row < rows; row++) for (let col = 0; col < columns; col++) {
    const x = 0.5 + (col - (columns - 1) / 2) * 0.045;
    const y = 0.5 + (row - (rows - 1) / 2) * 0.08;
    if (kind === 'support' && row > 1 && row < rows - 2 && col !== 5 && col !== 6) continue;
    if (kind === 'vessel' && ((x - 0.5) / 0.275) ** 2 + ((y - 0.5) / 0.29) ** 2 > 1) continue;
    cells.push({ x, y, w: 0.046, h: 0.081, clean: false, brushMask: 0, brushTravel: [0, 0, 0, 0], brushed: false, painted: false });
  }
  return cells;
}

export function makeRepairPoints() {
  return [
    { id: 'rust-1', kind: 'pipe', x: 470, y: 434, label: 'Linha de processo', hint: 'Comece pela linha. Varra, esfregue, aplique e pinte.' },
    { id: 'rust-2', kind: 'support', x: 1600, y: 300, label: 'Suporte estrutural', hint: 'Suba a escada e alcance o suporte na passarela.' },
    { id: 'rust-3', kind: 'vessel', x: 2820, y: 434, label: 'Vaso de pressão', hint: 'Uma superfície maior para concluir a missão.' },
  ].map(point => ({ ...point, step: 0, progress: 0, cells: cellsFor(point.kind), zones: (point.kind === 'support'
    ? [{ x: 0.34, y: 0.30 }, { x: 0.5, y: 0.5 }, { x: 0.66, y: 0.70 }]
    : [{ x: 0.35, y: 0.48 }, { x: 0.5, y: 0.51 }, { x: 0.65, y: 0.48 }]
  ).map(zone => ({ ...zone, r: 32 / W, ry: 32 / H, done: false })) }));
}

export function canReachRepair(player, target) {
  if (Math.abs(player.x - target.x) > 135) return false;
  if (target.kind === 'support') return player.grounded === true && Math.abs(player.y - (target.y + 50)) <= 25;
  return Math.abs(player.y - (target.y + 66)) <= 75;
}

function segmentDistance(point, a, b) {
  const ax = a.x * W, ay = a.y * H, dx = (b.x - a.x) * W, dy = (b.y - a.y) * H;
  const px = point.x * W, py = point.y * H;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(px - ax - t * dx, py - ay - t * dy);
}

// Exact segment length inside a brush's circle avoids dependence on how often
// a browser dispatches pointermove events.
function travelWithin(point, a, b, radius) {
  const dx = (b.x - a.x) * W, dy = (b.y - a.y) * H;
  const ox = (a.x - point.x) * W, oy = (a.y - point.y) * H;
  const aa = dx * dx + dy * dy;
  if (aa < 1e-8) return 0;
  const bb = 2 * (ox * dx + oy * dy), cc = ox * ox + oy * oy - radius * radius;
  const discriminant = bb * bb - 4 * aa * cc;
  if (discriminant <= 0) return 0;
  const root = Math.sqrt(discriminant);
  const lo = Math.max(0, (-bb - root) / (2 * aa));
  const hi = Math.min(1, (-bb + root) / (2 * aa));
  return Math.max(0, hi - lo) * Math.sqrt(aa);
}

export function repairCoverage(target) {
  if (target.step >= 4) return 1;
  if (target.step === 2) return target.zones.filter(zone => zone.done).length / target.zones.length;
  const property = ['clean', 'brushed', '', 'painted'][target.step];
  return target.cells.filter(cell => cell[property]).length / target.cells.length;
}

/** Mutates spatial treatment only; engine owns time, score and sound. */
export function applyRepairGesture(target, tool, stroke, gesture) {
  const outcome = { stroke: null, changed: false, advanced: false, completed: target.step >= 4 };
  if (gesture?.type === 'end' || !validPoint(gesture) || tool !== target.step || target.step >= 4) return outcome;
  if (!['start', 'move'].includes(gesture.type) || (gesture.type === 'move' && !validPoint(stroke))) return outcome;
  const point = { x: gesture.x, y: gesture.y };
  outcome.stroke = point;
  if (target.step === 2) {
    if (gesture.type === 'start') {
      const zone = target.zones.find(zone => !zone.done && distance(zone, point) <= 32);
      if (zone) { zone.done = true; outcome.changed = true; }
    }
  } else if (gesture.type === 'move' && stroke && validPoint(stroke) && distance(stroke, point) > 0.05) {
    const dx = (point.x - stroke.x) * W, dy = (point.y - stroke.y) * H;
    const direction = Math.abs(dx) >= Math.abs(dy) ? (dx >= 0 ? 0 : 1) : (dy >= 0 ? 2 : 3);
    for (const cell of target.cells) {
      if (segmentDistance(cell, stroke, point) > REPAIR_SURFACE.radius) continue;
      if (target.step === 1) {
        const travel = travelWithin(cell, stroke, point, REPAIR_SURFACE.radius);
        cell.brushTravel[direction] += travel;
        if (cell.brushTravel[direction] >= 12) cell.brushMask |= (1 << direction);
        const brushed = (cell.brushMask & 3) === 3 || (cell.brushMask & 12) === 12;
        if (brushed && !cell.brushed) { cell.brushed = true; outcome.changed = true; }
      } else {
        const key = target.step === 0 ? 'clean' : 'painted';
        if (!cell[key]) { cell[key] = true; outcome.changed = true; }
      }
    }
  }
  target.progress = repairCoverage(target);
  const threshold = target.step === 2 ? 1 : REPAIR_SURFACE.coverage;
  if (target.progress >= threshold) {
    // Finish tiny untouched islands without demanding pixel hunting.
    const key = ['clean', 'brushed', '', 'painted'][target.step];
    if (key) for (const cell of target.cells) cell[key] = true;
    target.step++;
    target.progress = 0;
    outcome.advanced = true;
    outcome.completed = target.step >= 4;
    outcome.stroke = null;
  }
  return outcome;
}
