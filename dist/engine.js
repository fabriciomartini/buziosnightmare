import { drawGame } from './renderer.js';
import { makePreop, preopTargets, canReachPreop, PREOP_SECONDS, PREOP_BONUS_SECONDS, PREOP_PENALTY_SECONDS } from './preop-model.js';
import { RULES, clamp, observationOutcome, canReach, treatmentOutcome, deadlineExpired, rectanglesOverlap, officeHitOutcome, angleDistance, alignmentMatches, dynamicSyncStep } from './rules.js';

const WIDTH = 1200;
const HEIGHT = 600;
const GROUND = 500;
const STAGES = {
  sms: { label: 'SMS · Olho vivo no convés', objective: 'Registre 5 desvios antes que os trabalhadores os corrijam.', limit: null },
  ieei: { label: 'IEEI · Operação anticorrosão', objective: 'Trate os 3 pontos de corrosão em menos de 60 segundos.', limit: RULES.repairSeconds },
  preop: { label: 'Pré-Op / P-83 · Só falta uma pendência!', objective: 'Resolva as pendências de óleo, gás e água e retorne ao quadro de fechamento.', limit: PREOP_SECONDS },
  pspo: { label: 'PSPO - Fuja dos forms de viagem!', objective: 'Salte as mesas, evite os formulários e pegue um café na copa.', limit: null },
  ied: { label: 'IED · No ritmo das máquinas', objective: 'Alinhe e sincronize os três conjuntos para estabilizar a P-83.', limit: RULES.dynamicSeconds },
};
const RISK_LABELS = { glasses: 'Sem óculos de proteção', helmet: 'Sem capacete', hearing: 'Sem protetor auricular' };
const TOOL_LABELS = ['Jato d’água', 'Escova', 'Neutralizador', 'Pintura'];
const OFFICE_DESKS = [
  { x: 700, y: 430, w: 120, h: 70 },
  { x: 1350, y: 425, w: 130, h: 75 },
  { x: 2000, y: 435, w: 115, h: 65 },
  { x: 2660, y: 430, w: 125, h: 70 },
  { x: 3320, y: 425, w: 130, h: 75 },
  { x: 3980, y: 435, w: 115, h: 65 },
  { x: 4580, y: 430, w: 120, h: 70 },
  { x: 5260, y: 430, w: 125, h: 70 },
  { x: 5900, y: 425, w: 130, h: 75 },
];
const OFFICE_FORM_ORIGINS = ['IED', 'IEEI', 'SMS', 'Pré-Op/P-83'];
// A finite encounter script gives each special exactly one slot per attempt.
// Slots advance when announced, and never re-arm after a hit, dodge or backtrack.
const OFFICE_ENCOUNTERS = [
  { distance: 180, kind: 'normal', y: 450 },
  { distance: 820, kind: 'normal', y: 375 },
  { distance: 1460, kind: 'normal', y: 420 },
  { distance: 2100, kind: 'return', y: 414 },
  { distance: 2740, kind: 'normal', y: 450 },
  { distance: 3380, kind: 'normal', y: 375 },
  { distance: 4020, kind: 'normal', y: 420 },
  { distance: 4660, kind: 'urgent', y: 455 },
  { distance: 5220, kind: 'normal', y: 450 },
  { distance: 5660, kind: 'normal', y: 420 },
].map((encounter, index, encounters) => {
  const normalIndex = encounters.slice(0, index + 1).filter(item => item.kind === 'normal').length - 1;
  const special = encounter.kind !== 'normal';
  return {
    ...encounter, sequence: index,
    id: special ? `${encounter.kind}-1` : `form-${normalIndex + 1}`,
    label: encounter.kind === 'return' ? 'Remarcação de retorno' : encounter.kind === 'urgent' ? 'Urgente' : 'Formulário de viagem',
    origin: special ? null : OFFICE_FORM_ORIGINS[normalIndex % OFFICE_FORM_ORIGINS.length],
    spawnDistance: encounter.kind === 'return' ? 330 : encounter.kind === 'urgent' ? 300 : 750,
    warningDuration: special ? 0.65 : RULES.officeWarningSeconds,
    vx: encounter.kind === 'return' ? -240 : encounter.kind === 'urgent' ? -280 : -175,
    w: special ? 54 : 44, h: special ? 64 : 56,
  };
});
const DYNAMIC_LABELS = ['Motor e bomba', 'Compressor', 'Grande conjunto final'];

function makeDynamic() {
  return {
    completed: 0,
    totalFaults: 0,
    machines: [500, 1540, 2660].map((x, index) => ({
      id: `machine-${index + 1}`, label: DYNAMIC_LABELS[index], x, y: 430, index,
      phase: 'align', alignmentHits: 0, angleA: 0, angleB: 1.4 + index * 0.35,
      tolerance: [0.50, 0.42, 0.35][index], alignmentArmed: true, cooldownUntil: 0,
      needle: index === 1 ? -0.46 : 0.46, band: [0.30, 0.26, 0.23][index],
      stableTime: 0, requiredStableTime: RULES.dynamicStableSeconds,
      faults: 0, vibration: 0.8 + index * 0.2, controlTime: 0, nextFaultAt: 0,
    })),
    barriers: [950, 2050, 3070].map((x, index) => ({ x, y: 310, w: 52, h: 190, machineId: `machine-${index + 1}`, open: false })),
  };
}

function makeDynamicPlatforms() {
  return [
    { x: 310, y: 430, w: 145, h: 70, baseY: 430, amplitude: 8, machineId: 'machine-1' },
    { x: 1170, y: 425, w: 150, h: 75, baseY: 425, amplitude: 10, machineId: 'machine-2' },
    { x: 2300, y: 430, w: 160, h: 70, baseY: 430, amplitude: 12, machineId: 'machine-3' },
  ];
}

function makeWorkers() {
  const hazards = [440, 920, 1310, 1495, 1690, 1890, 2085, 2280, 2470, 2660, 2880, 3160];
  const safe = [650, 1130, 1590, 1990, 2380, 2770, 3280];
  return [
    ...hazards.map((x, i) => {
      const risk = ['glasses', 'helmet', 'hearing'][i % 3];
      return { id: `worker-${i}`, x, y: GROUND, risk, label: RISK_LABELS[risk], visibleSince: null, corrected: false, recorded: false, variant: i % 4 };
    }),
    ...safe.map((x, i) => ({ id: `safe-${i}`, x, y: GROUND, risk: null, label: 'EPIs completos', visibleSince: null, corrected: false, recorded: false, variant: (i + 2) % 4 })),
  ].sort((a, b) => a.x - b.x);
}

function freshState(stageId) {
  const config = STAGES[stageId];
  const preop = stageId === 'preop' ? makePreop() : null;
  return {
    stageId,
    stageLabel: config.label,
    objective: config.objective,
    mode: 'playing',
    worldWidth: stageId === 'pspo' ? 6600 : stageId === 'preop' ? 3600 : 3400,
    preop,
    camera: 0,
    elapsed: 0,
    player: { x: 165, y: GROUND, vx: 0, vy: 0, facing: 1, walking: false, grounded: true, climbing: false, ducking: false },
    platforms: stageId === 'pspo' ? OFFICE_DESKS.map(desk => ({ ...desk })) : stageId === 'ied' ? makeDynamicPlatforms() : [
      { x: 730, y: 430, w: 135, h: 70 },
      { x: 1320, y: 350, w: 315, h: 22 },
      { x: 2210, y: 400, w: 245, h: 22 },
      { x: 2930, y: 435, w: 125, h: 65 },
    ],
    ladders: ['pspo', 'ied'].includes(stageId) ? [] : [{ x: 1365, y: 350, w: 48, h: 150 }, { x: 2260, y: 400, w: 48, h: 100 }],
    dynamic: stageId === 'ied' ? makeDynamic() : null,
    office: stageId === 'pspo' ? {
      hits: 0, maxHits: RULES.officeMaxHits, invulnerableUntil: 0, progress: 0,
      forms: [], coffee: { x: 6370, y: 430, collected: false }, distance: 0,
      deskCount: OFFICE_DESKS.length, spawnIndex: 0, telegraph: null, spawnHistory: [],
    } : null,
    workers: stageId === 'sms' ? makeWorkers() : [],
    rust: stageId === 'ieei' ? [
      { id: 'rust-1', x: 470, y: 434, step: 0, progress: 0, label: 'Linha de processo' },
      { id: 'rust-2', x: 1600, y: 434, step: 0, progress: 0, label: 'Suporte estrutural' },
      { id: 'rust-3', x: 2820, y: 434, step: 0, progress: 0, label: 'Vaso de pressão' },
    ] : [],
    stations: preop?.stations || [],
    score: 0,
    correct: 0,
    completedCount: 0,
    timeLeft: config.limit,
    activeTarget: null,
    selectedTool: null,
    toolProgress: 0,
    feedback: { text: '', tone: 'info', until: 0 },
    particles: [],
    auditLog: [],
    attempt: 1,
  };
}

/** Browser-only coordinator. Business rules remain testable in rules.js. */
export class Game {
  constructor(canvas, callbacks = {}) {
    this.canvas = canvas;
    this.context = canvas.getContext('2d');
    this.callbacks = callbacks;
    this.state = null;
    this.keys = new Set();
    this.destroyed = false;
    this.lastTime = null;
    this.lastUpdate = 0;
    this.frameId = null;
    this.jumpQueued = false;
    this.attempts = {};
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    this.onKeyDown = this.handleKeyDown.bind(this);
    this.onKeyUp = this.handleKeyUp.bind(this);
    this.onPointerDown = this.handlePointerDown.bind(this);
    this.onBlur = () => { this.keys.clear(); this.jumpQueued = false; if (this.state?.mode === 'playing') this.pause(true); };
    this.onVisibility = () => { if (document.hidden) this.onBlur(); };
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
    document.addEventListener('visibilitychange', this.onVisibility);
    canvas.addEventListener('pointerdown', this.onPointerDown);
    this.frame = this.tick.bind(this);
    this.frameId = requestAnimationFrame(this.frame);
  }

  start(stageId) {
    if (!STAGES[stageId]) throw new Error(`Fase desconhecida: ${stageId}`);
    this.keys.clear();
    this.jumpQueued = false;
    this.state = freshState(stageId);
    this.state.attempt = this.attempts[stageId] = (this.attempts[stageId] || 0) + 1;
    this.lastTime = null;
    this.lastUpdate = 0;
    this.message(stageId === 'sms' ? 'Observe os EPIs! Cada desvio fica visível por 2 segundos.' : stageId === 'pspo' ? 'Setas para andar; ↑ ou espaço para saltar; ↓ para abaixar. Na copa, E ou clique para pegar o café.' : stageId === 'ied' ? 'Salte as passarelas, aproxime-se do primeiro conjunto e clique para integrar.' : stageId === 'preop' ? 'Leia o quadro, recolha as evidências e volte para fechar as TAPs. E ou clique para interagir.' : 'Aproxime-se de um ponto destacado e clique nele.', 'info', 4);
    this.emit();
  }

  getSnapshot() { return this.state; }

  pause(value = true) {
    if (!this.state || this.state.mode === 'ended') return;
    this.state.mode = value ? 'paused' : 'playing';
    this.keys.clear();
    this.jumpQueued = false;
    this.state.player.ducking = false;
    this.lastTime = null;
    this.emit();
  }

  handleKeyDown(event) {
    if (!this.state || this.state.mode !== 'playing') return;
    if (event.target?.closest?.('input, textarea, select, [contenteditable="true"]')) return;
    if (event.code === 'Space' && event.target?.closest?.('button')) return;
    if (this.state.activeTarget?.type === 'dynamic') {
      if (['Space', 'ArrowLeft', 'ArrowRight', 'KeyA', 'KeyD'].includes(event.code)) {
        event.preventDefault();
        if (event.code === 'Space') { if (!event.repeat) this.alignMachine(); }
        else this.keys.add(event.code);
      }
      return;
    }
    if (event.code === 'KeyE' && this.state.stageId === 'preop') {
      event.preventDefault();
      if (!event.repeat && !this.state.activeTarget) this.interactPreop();
      return;
    }
    if (event.code === 'KeyE' && this.state.stageId === 'pspo') {
      event.preventDefault();
      if (!event.repeat) this.collectCoffee();
      return;
    }
    const accepted = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'KeyA', 'KeyD', 'KeyW', 'KeyS'];
    if (!accepted.includes(event.code)) return;
    event.preventDefault();
    if (this.state.activeTarget) return;
    this.keys.add(event.code);
    if (!event.repeat && ['Space', 'ArrowUp', 'KeyW'].includes(event.code)) this.jumpQueued = true;
  }

  handleKeyUp(event) { this.keys.delete(event.code); }

  // Optional touch controls can call this without synthesizing browser events.
  setControl(code, pressed) {
    if (this.state?.activeTarget?.type === 'dynamic') {
      if (pressed && this.state.mode !== 'playing') return;
      if (code === 'Space') { if (pressed) this.alignMachine(); return; }
      if (['ArrowLeft', 'ArrowRight', 'KeyA', 'KeyD'].includes(code)) {
        if (pressed) this.keys.add(code); else this.keys.delete(code);
      }
      return;
    }
    if (code === 'KeyE') { if (pressed) { if (this.state?.stageId === 'preop') this.interactPreop(); else this.collectCoffee(); } return; }
    if (pressed && this.state?.mode !== 'playing') return;
    if (pressed) {
      this.keys.add(code);
      if (['Space', 'ArrowUp'].includes(code)) this.jumpQueued = true;
    } else this.keys.delete(code);
  }

  pointerPosition(event) {
    const rect = this.canvas.getBoundingClientRect();
    return { x: (event.clientX - rect.left) * WIDTH / rect.width + this.state.camera, y: (event.clientY - rect.top) * HEIGHT / rect.height };
  }

  handlePointerDown(event) {
    const s = this.state;
    if (!s || s.mode !== 'playing' || s.activeTarget || event.button > 0) return;
    const point = this.pointerPosition(event);
    if (s.stageId === 'preop') {
      const target = preopTargets(s.preop).find(target => {
        const width = target.kind === 'board' ? 130 : target.kind === 'field' ? 45 : 100;
        const top = { station: 252, board: 220, rack: 185, field: 110 }[target.kind];
        return Math.abs(point.x - target.x) <= width && point.y >= target.y - top && point.y <= target.y + 60;
      });
      if (target) this.interactPreop(target.id);
      return;
    }
    if (s.stageId === 'ied') {
      const machine = s.dynamic.machines.find(m => Math.abs(point.x - m.x) <= 105 && point.y >= m.y - 110 && point.y <= m.y + 85);
      if (!machine) return;
      if (machine.phase === 'done') { this.message('Este conjunto já está integrado e estável.', 'success'); return; }
      if (machine.index !== s.dynamic.completed) { this.message('Integre os conjuntos na ordem do percurso para liberar as passagens.', 'info'); return; }
      if (!canReach(s.player, machine)) { this.message('Chegue mais perto do conjunto para iniciar a integração.', 'info'); return; }
      s.activeTarget = { type: 'dynamic', id: machine.id };
      this.keys.clear(); this.jumpQueued = false;
      s.player.vx = 0; s.player.walking = false;
      if (machine.phase === 'sync') { machine.stableTime = 0; machine.nextFaultAt = s.elapsed + 2; }
      this.callbacks.onInteraction?.({ type: 'dynamic', target: machine, state: s });
      this.emit();
      return;
    }
    if (s.stageId === 'pspo') {
      const coffee = s.office.coffee;
      if (Math.abs(point.x - coffee.x) <= 90 && point.y >= coffee.y - 120 && point.y <= coffee.y + 70) this.collectCoffee();
      return;
    }
    if (s.stageId === 'sms') {
      const worker = [...s.workers].reverse().find(w =>
        (Math.abs(point.x - w.x) <= 38 && point.y >= w.y - 120 && point.y <= w.y + 5) ||
        (Math.abs(point.x - w.x) <= 20 && Math.abs(point.y - (w.y - 136)) <= 20));
      if (worker) this.observe(worker);
      return;
    }
    const type = s.stageId === 'ieei' ? 'repair' : 'tap';
    const candidates = type === 'repair' ? s.rust : s.stations;
    const target = candidates.find((t, index) => {
      const body = Math.abs(point.x - t.x) <= 68 && point.y >= t.y - (type === 'repair' ? 80 : 92) && point.y <= t.y + 70;
      const markerY = t.y - [95, 122, 109][index % 3];
      const marker = type === 'tap' && Math.abs(point.x - t.x) <= 22 && Math.abs(point.y - markerY) <= 22;
      return body || marker;
    });
    if (!target) return;
    const finalStep = type === 'repair' ? RULES.repairSteps : RULES.tapSteps;
    if (target.step >= finalStep) { this.message('Este ponto já foi concluído.', 'success'); return; }
    if (!canReach(s.player, target)) { this.message('Chegue mais perto para interagir.', 'info'); return; }
    s.activeTarget = { type, id: target.id };
    s.selectedTool = null;
    s.toolProgress = target.progress || 0;
    this.keys.clear();
    this.jumpQueued = false;
    s.player.walking = false;
    s.player.vx = 0;
    this.callbacks.onInteraction?.({ type, target, state: s });
    this.emit();
  }

  observe(worker) {
    const s = this.state;
    const outcome = observationOutcome(worker, s.elapsed, s.score, s.correct);
    if (outcome.type === 'duplicate') { this.message('Observação já registrada na prancheta.', 'info'); return; }
    s.score = outcome.score;
    s.correct = outcome.correct;
    s.completedCount = s.correct;
    if (outcome.type === 'correct') {
      worker.recorded = true;
      worker.corrected = true;
      s.auditLog.push({ label: worker.label, time: s.elapsed });
      this.burst(worker.x, worker.y - 80, '#c4ef68');
      this.message(`+1 · ${worker.label}. Observação registrada!`, 'success');
    } else {
      this.burst(worker.x, worker.y - 80, '#ff7d72');
      this.message('−1 · Nenhum desvio ativo. Observe antes de registrar.', 'error');
    }
    this.emit();
    if (outcome.failed) this.end(false, 'Placar negativo: foi registrado um desvio que não estava ocorrendo.');
    else if (outcome.won) this.end(true, 'Cinco observações corretas na prancheta de Jaqueline!');
  }

  closeInteraction() {
    if (!this.state) return;
    const target = this.getTarget();
    if (this.state.activeTarget?.type === 'dynamic' && target?.phase === 'sync') target.stableTime = 0;
    this.state.activeTarget = null;
    this.state.selectedTool = null;
    this.state.toolProgress = 0;
    this.keys.clear();
    this.jumpQueued = false;
    this.emit();
  }

  getTarget() {
    const s = this.state;
    if (!s?.activeTarget) return null;
    if (s.activeTarget.type === 'preop') return preopTargets(s.preop).find(target => target.id === s.activeTarget.id) || null;
    return (s.activeTarget.type === 'dynamic' ? s.dynamic.machines : s.activeTarget.type === 'repair' ? s.rust : s.stations).find(t => t.id === s.activeTarget.id) || null;
  }

  dynamicPenalty(seconds, message) {
    const s = this.state;
    s.elapsed += seconds;
    s.timeLeft = Math.max(0, RULES.dynamicSeconds - s.elapsed);
    this.message(message, 'error');
    if (deadlineExpired(s.elapsed, RULES.dynamicSeconds)) this.end(false, 'O prazo de 90 segundos terminou antes da integração dos três conjuntos.');
  }

  alignMachine() {
    const s = this.state, machine = this.getTarget();
    if (!s || s.mode !== 'playing' || s.activeTarget?.type !== 'dynamic' || machine?.phase !== 'align') return false;
    if (s.elapsed < machine.cooldownUntil || !machine.alignmentArmed) return false;
    machine.cooldownUntil = s.elapsed + RULES.dynamicAlignmentCooldown;
    if (!alignmentMatches(machine.angleA, machine.angleB, machine.tolerance)) {
      machine.faults++; s.dynamic.totalFaults++;
      machine.vibration = Math.min(2, machine.vibration + 0.45);
      this.dynamicPenalty(RULES.dynamicAlignmentPenalty, 'Fora de alinhamento: −3 segundos. Espere as marcas se encontrarem.');
      machine.cooldownUntil = s.elapsed + RULES.dynamicAlignmentCooldown;
      return false;
    }
    machine.alignmentHits++;
    machine.alignmentArmed = false;
    this.message(`Alinhamento ${machine.alignmentHits}/3 confirmado!`, 'success', 3, 'align');
    if (machine.alignmentHits >= RULES.dynamicAlignmentHits) {
      machine.phase = 'sync';
      machine.stableTime = 0;
      machine.controlTime = 0;
      machine.nextFaultAt = s.elapsed + 2;
      this.keys.clear(); this.jumpQueued = false;
      this.message('Eixos alinhados! Use ← e → para manter a agulha na faixa verde por 4 segundos.', 'info', 5);
    }
    this.emit();
    return true;
  }

  collectCoffee() {
    const s = this.state;
    if (!s || s.mode !== 'playing' || !s.office || s.office.coffee.collected) return false;
    const coffee = s.office.coffee;
    if (Math.abs(s.player.x - coffee.x) > 125 || Math.abs(s.player.y - coffee.y) > 125) {
      this.message('A copa fica no fim do corredor. Aproxime-se da máquina para pegar o café.', 'info');
      return false;
    }
    coffee.collected = true;
    s.office.progress = 1;
    s.office.distance = coffee.x - 165;
    s.correct = 1;
    s.completedCount = 1;
    s.score = (RULES.officeMaxHits - s.office.hits) * 100;
    this.burst(coffee.x, coffee.y - 45, '#efcc78');
    this.sound('coffee');
    this.end(true, 'Café na mão! Anderson chegou à copa do 12º andar da Torre B do EDISEN.');
    return true;
  }

  chooseTool(index) {
    const s = this.state;
    const target = this.getTarget();
    if (!target || s.mode !== 'playing' || s.activeTarget.type !== 'repair' || target.step >= RULES.repairSteps) return false;
    if (!Number.isInteger(index) || index < 0 || index >= RULES.repairSteps) return false;
    if (index !== target.step) {
      s.selectedTool = null;
      this.message(`Sequência incorreta. Primeiro: ${TOOL_LABELS[target.step]}.`, 'error');
      this.emit();
      return false;
    }
    s.selectedTool = index;
    this.message(`${TOOL_LABELS[index]} selecionado. Segure e arraste sobre a área.`, 'info');
    this.emit();
    return true;
  }

  work(amount) {
    const s = this.state;
    const target = this.getTarget();
    if (!target || s.mode !== 'playing' || s.activeTarget.type !== 'repair') return;
    if (s.selectedTool === target.step && target.progress === 0 && Number.isFinite(amount) && amount > 0) this.sound(['water', 'brush', 'neutral', 'paint'][target.step]);
    const outcome = treatmentOutcome(target.step, s.selectedTool, target.progress, amount);
    target.step = outcome.step;
    target.progress = outcome.progress;
    s.toolProgress = outcome.progress;
    if (outcome.advanced) {
      s.selectedTool = null;
      if (outcome.completed) {
        s.correct += 1;
        s.completedCount = s.correct;
        s.score += 100;
        this.burst(target.x, target.y, '#b5ec65');
        this.message(`Ponto recuperado! ${s.correct} de 3 concluídos.`, 'success');
        this.closeInteraction();
        if (s.correct >= RULES.repairsToWin) this.end(true, 'Os três pontos de corrosão foram recuperados dentro do prazo!');
      } else this.message(`Etapa concluída! Próximo: ${TOOL_LABELS[target.step]}.`, 'success');
    }
    this.emit();
  }

  preopReady() { return this.state?.stageId === 'preop' && this.state.mode === 'playing' && !this.state.preop.closing; }

  interactPreop(id = null) {
    if (!this.preopReady() || this.state.activeTarget) return false;
    const s = this.state, mission = s.preop;
    const targets = preopTargets(mission);
    const target = id ? targets.find(target => target.id === id) : targets.filter(target => canReachPreop(s.player, target)).sort((a, b) => Math.hypot(a.x - s.player.x, a.y - s.player.y) - Math.hypot(b.x - s.player.x, b.y - s.player.y))[0];
    if (!target || !canReachPreop(s.player, target)) { this.message('Aproxime-se do ponto marcado. Use as escadas para alcançar as verificações elevadas.', 'info'); return false; }
    if (target.kind === 'field') return this.recordFieldPoint(target.id);
    s.activeTarget = { type: 'preop', id: target.id };
    this.keys.clear(); this.jumpQueued = false; s.player.vx = 0; s.player.walking = false;
    this.callbacks.onInteraction?.({ type: 'preop', target, state: s });
    this.emit();
    return true;
  }

  recordFieldPoint(id) {
    if (!this.preopReady() || this.state.activeTarget) return false;
    const s = this.state, mission = s.preop;
    const point = mission.fieldPoints.find(point => point.id === id);
    if (!point || !canReachPreop(s.player, point)) return false;
    const evidence = mission.items.find(item => item.id === 'gas-evidence');
    if (point.recorded) {
      if (mission.fieldPoints.every(point => point.recorded) && evidence.available && !evidence.delivered) return this.takeEvidence(evidence.id);
      this.message('Este ponto já está registrado na evidência de campo.', 'info'); return false;
    }
    const last = mission.fieldPoints.filter(point => point.recorded).length === 2;
    if (last && mission.inventory.length >= mission.capacity) { this.message('Prancheta cheia! Entregue ou devolva um item antes de concluir o registro de campo.', 'info'); return false; }
    point.recorded = true;
    this.sound('record'); this.burst(point.x, point.y - 30, '#b8e288');
    if (last) {
      evidence.available = true;
      this.takeEvidence(evidence.id);
      this.message('Três pontos registrados! Leve a evidência GAS-083 ao sistema de gás.', 'success', 4, false);
    } else this.message(`Verificação ${mission.fieldPoints.filter(point => point.recorded).length}/3 registrada. Continue pelas passarelas.`, 'success', 3, false);
    this.emit(); return true;
  }

  takeEvidence(id) {
    if (!this.preopReady()) return false;
    const s = this.state, mission = s.preop, item = mission.items.find(item => item.id === id);
    if (!item || !item.available || item.collected || item.delivered) return false;
    if (item.kind === 'field') {
      if (!mission.fieldPoints.every(point => point.recorded) || !mission.fieldPoints.some(point => canReachPreop(s.player, point)) || s.activeTarget) return false;
    } else {
      const target = this.getTarget();
      if (s.activeTarget?.type !== 'preop' || target?.kind !== 'rack' || target.id !== item.rackId || !target.available || !canReachPreop(s.player, target)) return false;
    }
    if (mission.inventory.length >= mission.capacity) { this.message('Prancheta cheia: capacidade de dois itens. Entregue ou devolva um item.', 'info'); return false; }
    item.collected = true; item.available = false; mission.inventory.push(item.id);
    this.sound('pickup'); this.message(`${item.label} na prancheta. Confira o pedido antes de entregar.`, 'info');
    this.emit(); return true;
  }

  dropEvidence(id) {
    if (!this.preopReady()) return false;
    const mission = this.state.preop, item = mission.items.find(item => item.id === id);
    if (!item || !mission.inventory.includes(id) || item.delivered) return false;
    mission.inventory = mission.inventory.filter(itemId => itemId !== id);
    item.collected = false; item.available = true;
    this.message(`${item.label} devolvido à origem. Pode ser recolhido novamente.`, 'info');
    this.emit(); return true;
  }

  deliverEvidence(id, stationId = this.state?.activeTarget?.id) {
    if (!this.preopReady()) return false;
    const s = this.state, mission = s.preop;
    const station = mission.stations.find(station => station.id === stationId);
    const item = mission.items.find(item => item.id === id);
    if (!station || station.done || !item || !mission.inventory.includes(id) || s.activeTarget?.type !== 'preop' || s.activeTarget.id !== station.id || !canReachPreop(s.player, station)) return false;
    if (!station.requiredIds.includes(id) || station.acceptedIds.includes(id)) {
      s.elapsed += PREOP_PENALTY_SECONDS;
      s.timeLeft = Math.max(0, PREOP_SECONDS + mission.bonusSeconds - s.elapsed);
      this.message('Evidência incorreta para esta pendência. Confira código, revisão e assinatura. −5 segundos.', 'error');
      if (s.timeLeft <= 0) this.end(false, 'O prazo terminou antes do fechamento das TAPs.');
      return false;
    }
    mission.inventory = mission.inventory.filter(itemId => itemId !== id);
    item.collected = false; item.delivered = true; item.available = false;
    station.acceptedIds.push(id);
    this.burst(station.x, station.y - 50, '#b8e288');
    if (station.requiredIds.every(required => station.acceptedIds.includes(required))) {
      station.done = true; station.step = 3;
      s.correct++; s.completedCount = s.correct; s.score += 100;
      this.sound('complete');
      this.message(`${station.name}: pendências resolvidas e aprovação pronta para fechamento.`, 'success', 4, false);
      if (!mission.radio.triggered) this.triggerPreopRadio();
      else if (s.correct === 3) this.message('Três sistemas prontos! Volte ao quadro no início do convés para fechar as TAPs.', 'success', 6, false);
    } else {
      const remaining = station.requiredIds.filter(required => !station.acceptedIds.includes(required)).map(required => mission.items.find(item => item.id === required)?.label || required);
      this.message(`Evidência aceita. Falta: ${remaining.join(', ')}.`, 'success', 4, 'deliver');
    }
    this.emit(); return true;
  }

  triggerPreopRadio() {
    const s = this.state, mission = s.preop;
    if (mission.radio.triggered) return false;
    const station = ['water', 'gas', 'oil'].map(id => mission.stations.find(station => station.id === id)).find(station => !station.done);
    if (!station) return false;
    const item = mission.items.find(item => item.id === 'radio-revision');
    item.systemId = station.id; item.label = `Revisão complementar · ${station.name}`;
    item.detail = `${station.code} · revisão complementar assinada`; item.available = true;
    station.requiredIds.push(item.id);
    mission.racks.find(rack => rack.id === 'revision').available = true;
    mission.radio = { triggered: true, targetId: station.id, until: s.elapsed + 6, text: `Chegou a última revisão! Busque o complemento de ${station.name} no ponto RÁDIO. +15s` };
    mission.bonusSeconds = PREOP_BONUS_SECONDS;
    s.timeLeft = Math.max(0, PREOP_SECONDS + mission.bonusSeconds - s.elapsed);
    this.sound('radio'); this.message(mission.radio.text, 'info', 6);
    return true;
  }

  finishPreop() {
    if (!this.preopReady()) return false;
    const s = this.state, mission = s.preop;
    if (s.activeTarget?.type !== 'preop' || s.activeTarget.id !== mission.board.id || !canReachPreop(s.player, mission.board)) return false;
    if (!mission.stations.every(station => station.done)) { this.message('Resolva as pendências dos três sistemas antes de fechar as TAPs.', 'info'); return false; }
    if (s.timeLeft <= 0) return false;
    mission.closing = { startedAt: s.elapsed, elapsed: 0, duration: 2.4 };
    this.keys.clear(); this.jumpQueued = false; s.player.vx = 0; s.player.walking = false;
    s.activeTarget = null;
    this.message('Assinaturas confirmadas. Digitalizando as evidências e registrando as aprovações…', 'info', 4);
    this.sound('complete'); this.emit(); return true;
  }

  chooseTap() { return false; }

  sound(type) { this.callbacks.onSound?.({ type, stageId: this.state?.stageId }); }

  message(text, tone = 'info', seconds = 3, soundType) {
    if (!this.state) return;
    this.state.feedback = { text, tone, until: this.state.elapsed + seconds };
    if (soundType) this.sound(soundType);
    else if (soundType !== false && (tone === 'success' || tone === 'error')) this.sound(tone === 'success' ? 'success' : 'error');
    this.emit();
  }

  burst(x, y, color) {
    for (let i = 0; i < 14; i++) {
      const angle = Math.PI * 2 * i / 14;
      this.state.particles.push({ x, y, vx: Math.cos(angle) * 100, vy: Math.sin(angle) * 100 - 50, life: 0.8, maxLife: 0.8, color, size: 3 + i % 3 });
    }
  }

  updateDynamicWorld(dt) {
    const s = this.state, p = s.player;
    for (const machine of s.dynamic.machines) {
      if (machine.phase !== 'done') {
        machine.angleA = (machine.angleA + (1 + machine.index * 0.2) * dt) % (Math.PI * 2);
        machine.angleB = (machine.angleB - (1.1 + machine.index * 0.25) * dt + Math.PI * 2) % (Math.PI * 2);
        machine.vibration = Math.max(0.8 + machine.index * 0.2, machine.vibration - dt * 0.1);
        if (!machine.alignmentArmed && angleDistance(machine.angleA, machine.angleB) > machine.tolerance * 1.35) machine.alignmentArmed = true;
      }
    }
    for (const platform of s.platforms) {
      const machine = s.dynamic.machines.find(m => m.id === platform.machineId);
      const oldY = platform.y;
      platform.y = machine.phase === 'done' ? platform.baseY : platform.baseY + Math.sin(s.elapsed * (2.3 + machine.index * 0.3) + machine.index) * platform.amplitude * machine.vibration;
      platform.h = GROUND - platform.y;
      if (p.grounded && Math.abs(p.y - oldY) < 2 && p.x + 18 > platform.x && p.x - 18 < platform.x + platform.w) p.y += platform.y - oldY;
    }
  }

  updateDynamicPhysics(dt) {
    const s = this.state, p = s.player;
    const left = this.keys.has('ArrowLeft') || this.keys.has('KeyA');
    const right = this.keys.has('ArrowRight') || this.keys.has('KeyD');
    p.ducking = false; p.climbing = false;
    p.vx = s.activeTarget ? 0 : ((right ? 1 : 0) - (left ? 1 : 0)) * 290;
    if (p.vx) p.facing = Math.sign(p.vx);
    if (this.jumpQueued && p.grounded && !s.activeTarget) { p.vy = -560; p.grounded = false; this.sound('jump'); }
    this.jumpQueued = false;
    const oldX = p.x, oldY = p.y;
    p.vy += 1500 * dt;
    let nextY = p.y + p.vy * dt;
    let nextX = clamp(p.x + p.vx * dt, 40, s.worldWidth - 45);
    const solids = [...s.platforms, ...s.dynamic.barriers.filter(barrier => !barrier.open)];
    for (const solid of solids) {
      if (nextY <= solid.y + 0.5 || nextY - 96 >= solid.y + solid.h) continue;
      if (p.vx > 0 && oldX + 18 <= solid.x + 0.5 && nextX + 18 > solid.x) nextX = solid.x - 18;
      if (p.vx < 0 && oldX - 18 >= solid.x + solid.w - 0.5 && nextX - 18 < solid.x + solid.w) nextX = solid.x + solid.w + 18;
    }
    p.x = nextX; p.grounded = false;
    if (p.vy >= 0) for (const solid of solids) {
      if (p.x + 18 > solid.x && p.x - 18 < solid.x + solid.w && oldY <= solid.y + 2 && nextY >= solid.y) {
        nextY = solid.y; p.vy = 0; p.grounded = true;
      }
    }
    if (nextY >= GROUND) { nextY = GROUND; p.vy = 0; p.grounded = true; }
    p.y = nextY;
    p.walking = Math.abs(p.x - oldX) > 0.01;
    if (!p.walking) p.vx = 0;
    s.camera = clamp(p.x - 390, 0, s.worldWidth - WIDTH);
  }

  updateDynamicChallenge(dt) {
    const s = this.state, machine = this.getTarget();
    if (s.activeTarget?.type !== 'dynamic' || machine?.phase !== 'sync') return;
    const left = this.keys.has('ArrowLeft') || this.keys.has('KeyA');
    const right = this.keys.has('ArrowRight') || this.keys.has('KeyD');
    const input = (right ? 1 : 0) - (left ? 1 : 0);
    // Substeps keep continuous stability honest across slower rendering frames.
    const count = Math.max(1, Math.ceil(dt / 0.02));
    for (let i = 0; i < count; i++) {
      const next = dynamicSyncStep(machine, input, dt / count);
      machine.needle = next.needle; machine.controlTime = next.controlTime; machine.stableTime = next.stableTime;
      if (!next.inside && s.elapsed >= machine.nextFaultAt) {
        machine.faults++; s.dynamic.totalFaults++;
        machine.vibration = Math.min(2, machine.vibration + 0.3);
        this.dynamicPenalty(RULES.dynamicSyncPenalty, 'A agulha saiu da faixa: estabilidade reiniciada e −2 segundos. Corrija com ← e →.');
        machine.nextFaultAt = s.elapsed + 2;
        if (s.mode === 'ended') return;
      }
      if (machine.stableTime + 1e-9 >= machine.requiredStableTime) {
        machine.stableTime = machine.requiredStableTime;
        machine.phase = 'done'; machine.vibration = 0;
        s.dynamic.completed++; s.correct++; s.completedCount = s.correct; s.score += 100;
        const barrier = s.dynamic.barriers.find(b => b.machineId === machine.id);
        if (barrier) barrier.open = true;
        const platform = s.platforms.find(p => p.machineId === machine.id);
        if (platform) {
          if (s.player.grounded && Math.abs(s.player.y - platform.y) < 2 && s.player.x + 18 > platform.x && s.player.x - 18 < platform.x + platform.w) s.player.y += platform.baseY - platform.y;
          platform.y = platform.baseY; platform.h = GROUND - platform.baseY;
        }
        this.burst(machine.x, machine.y - 60, '#b8e288');
        this.message(`${machine.label} integrado. Passarela estável e passagem liberada!`, 'success');
        this.closeInteraction();
        if (s.dynamic.completed >= 3) this.end(true, 'Três conjuntos alinhados e sincronizados. A P-83 voltou ao ritmo certo!');
        return;
      }
    }
  }

  updateOfficePhysics(dt) {
    const s = this.state, p = s.player;
    const left = this.keys.has('ArrowLeft') || this.keys.has('KeyA');
    const right = this.keys.has('ArrowRight') || this.keys.has('KeyD');
    const down = this.keys.has('ArrowDown') || this.keys.has('KeyS');
    p.ducking = Boolean(down && p.grounded && !this.jumpQueued);
    p.climbing = false;
    p.vx = ((right ? 1 : 0) - (left ? 1 : 0)) * (p.ducking ? 170 : 290);
    if (p.vx) p.facing = Math.sign(p.vx);
    if (this.jumpQueued && p.grounded) { p.vy = -560; p.grounded = false; p.ducking = false; this.sound('jump'); }
    this.jumpQueued = false;
    const oldX = p.x, oldY = p.y;
    p.vy += 1500 * dt;
    let nextY = p.y + p.vy * dt;
    let nextX = clamp(p.x + p.vx * dt, 40, s.worldWidth - 45);
    const halfWidth = 18, height = p.ducking ? 52 : 96;
    // Office furniture is solid: walking into its edge stops movement, but costs
    // no life. The player must jump until their feet clear the tabletop.
    for (const desk of s.platforms) {
      if (nextY <= desk.y + 0.5 || nextY - height >= desk.y + desk.h) continue;
      if (p.vx > 0 && oldX + halfWidth <= desk.x + 0.5 && nextX + halfWidth > desk.x) nextX = desk.x - halfWidth;
      if (p.vx < 0 && oldX - halfWidth >= desk.x + desk.w - 0.5 && nextX - halfWidth < desk.x + desk.w) nextX = desk.x + desk.w + halfWidth;
    }
    p.x = nextX;
    p.grounded = false;
    if (p.vy >= 0) for (const desk of s.platforms) {
      if (p.x + halfWidth > desk.x && p.x - halfWidth < desk.x + desk.w && oldY <= desk.y + 2 && nextY >= desk.y) {
        nextY = desk.y; p.vy = 0; p.grounded = true;
      }
    }
    if (nextY >= GROUND) { nextY = GROUND; p.vy = 0; p.grounded = true; }
    p.y = nextY;
    p.walking = Math.abs(p.x - oldX) > 0.01;
    if (!p.walking) p.vx = 0;
    s.camera = clamp(p.x - 390, 0, s.worldWidth - WIDTH);
  }

  updateOffice(dt) {
    const s = this.state, office = s.office, p = s.player;
    const totalDistance = office.coffee.x - 165;
    office.distance = Math.max(office.distance, clamp(p.x - 165, 0, totalDistance));
    office.progress = office.distance / totalDistance;
    const encounter = OFFICE_ENCOUNTERS[office.spawnIndex];
    // A near-range special is announced over clear corridor, away from a
    // mandatory furniture jump. Do not require grounded feet: repeated hopping
    // must not postpone the one-off encounter. Warning plus flight time still
    // lets an already airborne player land before the form reaches them.
    const specialFloorClear = !s.platforms.some(desk => desk.x < p.x + 350 && desk.x + desk.w > p.x - 55);
    if (!office.telegraph && office.forms.length === 0 && encounter && office.distance >= encounter.distance && (encounter.kind === 'normal' || specialFloorClear)) {
      office.telegraph = {
        ...encounter, x: p.x + encounter.spawnDistance,
        startedAt: s.elapsed, until: s.elapsed + encounter.warningDuration,
      };
      office.spawnIndex += 1;
      if (encounter.kind !== 'normal') this.message(`Atenção: ${encounter.label}! Um formulário especial está chegando.`, 'error', 1.4, 'warning');
    }
    if (office.telegraph) office.telegraph.x = p.x + office.telegraph.spawnDistance;
    if (office.telegraph && s.elapsed >= office.telegraph.until) {
      const cue = office.telegraph;
      const form = { ...cue, x: p.x + cue.spawnDistance, vy: 0, angle: -0.12, active: true, spawnedAt: s.elapsed };
      office.forms.push(form);
      office.spawnHistory.push({ id: form.id, kind: form.kind, label: form.label, startedAt: cue.startedAt, spawnedAt: s.elapsed, x: form.x, playerX: p.x, spawnDistance: form.spawnDistance, warningDuration: form.warningDuration, vx: form.vx });
      office.telegraph = null;
    }
    const bodyHeight = p.ducking ? 52 : 96;
    const playerRect = { x: p.x - 18, y: p.y - bodyHeight, w: 36, h: bodyHeight };
    for (const form of office.forms) {
      if (!form.active) continue;
      form.x += form.vx * dt;
      form.y += (form.vy || 0) * dt;
      form.angle = Math.sin(s.elapsed * 4 + (form.sequence ?? Number(form.id.match(/\d+/)?.[0] || 0))) * 0.13;
      if (form.x < -80 || form.x < p.x - 80) { form.active = false; continue; }
      if (!rectanglesOverlap(playerRect, { x: form.x - form.w / 2, y: form.y - form.h / 2, w: form.w, h: form.h })) continue;
      // A form disappears on contact even during immunity, so it cannot cause
      // a deferred second hit when the brief recovery window ends.
      form.active = false;
      const outcome = officeHitOutcome(office.hits, s.elapsed, office.invulnerableUntil);
      office.hits = outcome.hits;
      office.invulnerableUntil = outcome.invulnerableUntil;
      if (outcome.damaged) {
        this.burst(p.x, p.y - 65, '#ed9476');
        const label = form.kind && form.kind !== 'normal' ? form.label : `Formulário de ${form.origin}`;
        this.message(`${office.hits}/3 · ${label}! Desvie dos próximos.`, 'error', 3, 'hit');
        if (outcome.failed) {
          office.forms = office.forms.filter(f => f.active);
          this.end(false, 'Três formulários alcançaram Anderson antes do café. Hora de tentar outro caminho até a copa!');
          return;
        }
      }
    }
    office.forms = office.forms.filter(form => form.active);
  }

  updatePhysics(dt) {
    if (this.state.stageId === 'pspo') { this.updateOfficePhysics(dt); return; }
    if (this.state.stageId === 'ied') { this.updateDynamicPhysics(dt); return; }
    const s = this.state;
    const p = s.player;
    const left = this.keys.has('ArrowLeft') || this.keys.has('KeyA');
    const right = this.keys.has('ArrowRight') || this.keys.has('KeyD');
    const up = this.keys.has('ArrowUp') || this.keys.has('KeyW');
    const down = this.keys.has('ArrowDown') || this.keys.has('KeyS');
    p.vx = s.activeTarget ? 0 : ((right ? 1 : 0) - (left ? 1 : 0)) * 290;
    p.walking = Math.abs(p.vx) > 0;
    if (p.vx) p.facing = Math.sign(p.vx);
    const ladder = s.ladders.find(l => Math.abs(p.x - (l.x + l.w / 2)) < l.w / 2 + 18 && p.y >= l.y - 8 && p.y <= l.y + l.h + 8);
    p.climbing = Boolean(!s.activeTarget && ladder && (up || down));
    const oldY = p.y;
    if (p.climbing) {
      p.vy = 0;
      p.y = clamp(p.y + ((down ? 1 : 0) - (up ? 1 : 0)) * 180 * dt, ladder.y, GROUND);
      p.grounded = p.y === ladder.y || p.y === GROUND;
    } else {
      if (this.jumpQueued && p.grounded && !s.activeTarget) {
        p.vy = -560;
        p.grounded = false;
        this.sound('jump');
      }
      p.vy += 1500 * dt;
      p.y += p.vy * dt;
      p.grounded = false;
      if (p.vy >= 0) {
        for (const platform of s.platforms) {
          if (p.x + 15 > platform.x && p.x - 15 < platform.x + platform.w && oldY <= platform.y + 2 && p.y >= platform.y) {
            p.y = platform.y;
            p.vy = 0;
            p.grounded = true;
          }
        }
      }
      if (p.y >= GROUND) { p.y = GROUND; p.vy = 0; p.grounded = true; }
    }
    this.jumpQueued = false;
    p.x = clamp(p.x + p.vx * dt, 40, s.worldWidth - 45);
    s.camera = clamp(p.x - 390, 0, s.worldWidth - WIDTH);
  }

  update(dt, physicsDt = dt) {
    const s = this.state;
    if (!s || s.mode !== 'playing') return;
    if (s.preop?.closing) {
      s.preop.closing.elapsed = Math.min(s.preop.closing.duration, s.preop.closing.elapsed + dt);
      if (s.preop.closing.elapsed >= s.preop.closing.duration) this.end(true, 'Três sistemas com TAP aprovada (FIC concluída)! Assinaturas e evidências registradas.');
      return;
    }
    s.elapsed += dt;
    const limit = s.preop ? PREOP_SECONDS + s.preop.bonusSeconds : STAGES[s.stageId].limit;
    if (limit !== null) {
      s.timeLeft = Math.max(0, limit - s.elapsed);
      if (deadlineExpired(s.elapsed, limit)) {
        this.end(false, s.stageId === 'ieei' ? 'O minuto terminou. Os três pontos precisam estar completamente tratados.' : s.stageId === 'ied' ? 'O prazo de 90 segundos terminou antes da integração dos três conjuntos.' : 'O prazo terminou antes da conclusão dos três sistemas.');
        return;
      }
    }
    if (s.stageId === 'ied') this.updateDynamicWorld(dt);
    this.updatePhysics(physicsDt);
    if (s.stageId === 'ied') {
      this.updateDynamicChallenge(dt);
      if (s.mode === 'ended') return;
    }
    if (s.stageId === 'pspo') {
      this.updateOffice(physicsDt);
      if (s.mode === 'ended') return;
    }
    if (s.stageId === 'sms') {
      for (const worker of s.workers) {
        const visible = worker.x >= s.camera + 35 && worker.x <= s.camera + WIDTH - 35;
        if (visible && worker.visibleSince === null) worker.visibleSince = s.elapsed;
        if (worker.risk && worker.visibleSince !== null && !worker.recorded && s.elapsed - worker.visibleSince >= RULES.viewSeconds) worker.corrected = true;
      }
      const available = s.workers.filter(w => w.risk && !w.corrected && !w.recorded).length;
      if (s.correct + available < RULES.observationsToWin) {
        this.end(false, 'Os trabalhadores corrigiram os desvios antes dos cinco registros. Tente observar e clicar mais rápido.');
        return;
      }
    }
    for (const particle of s.particles) {
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vy += 180 * dt;
      particle.life -= dt;
    }
    s.particles = s.particles.filter(p => p.life > 0);
  }

  end(success, reason) {
    const s = this.state;
    if (!s || s.mode === 'ended') return;
    s.mode = 'ended';
    this.sound(success ? 'victory' : 'defeat');
    s.activeTarget = null;
    s.selectedTool = null;
    this.keys.clear();
    this.jumpQueued = false;
    this.emit();
    this.callbacks.onEnd?.({ success, stageId: s.stageId, score: s.score, correct: s.correct, elapsed: s.elapsed, reason, ...(s.office ? { hits: s.office.hits, distance: s.office.distance } : {}), ...(s.dynamic ? { faults: s.dynamic.totalFaults } : {}) });
  }

  emit() { if (this.state) this.callbacks.onUpdate?.(this.state); }

  tick(timestamp) {
    if (this.destroyed) return;
    // Deadlines follow real active time even on slower devices; only the physics
    // integration is capped to prevent tunnelling after a long rendering frame.
    const dt = this.lastTime === null ? 0 : Math.max((timestamp - this.lastTime) / 1000, 0);
    this.lastTime = timestamp;
    this.update(dt, Math.min(dt, 0.05));
    if (this.state) {
      drawGame(this.context, this.state, dt);
      if (timestamp - this.lastUpdate >= 100) { this.emit(); this.lastUpdate = timestamp; }
    }
    this.frameId = requestAnimationFrame(this.frame);
  }

  destroy() {
    this.destroyed = true;
    cancelAnimationFrame(this.frameId);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    this.keys.clear();
  }
}
