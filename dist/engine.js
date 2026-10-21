import { drawGame } from './renderer.js';
import { RULES, clamp, observationOutcome, canReach, treatmentOutcome, tapOutcome, deadlineExpired } from './rules.js';

const WIDTH = 1200;
const HEIGHT = 600;
const GROUND = 500;
const STAGES = {
  sms: { label: 'SMS · Olho vivo no convés', objective: 'Registre 5 desvios antes que os trabalhadores os corrijam.', limit: null },
  ieei: { label: 'IEEI · Operação anticorrosão', objective: 'Trate os 3 pontos de corrosão em menos de 60 segundos.', limit: RULES.repairSeconds },
  preop: { label: 'Pré-Op / P-83 · Prontos para a TAP', objective: 'Conclua a preparação dos 3 sistemas em menos de 75 segundos.', limit: RULES.tapSeconds },
};
const RISK_LABELS = { glasses: 'Sem óculos de proteção', helmet: 'Sem capacete', hearing: 'Sem protetor auricular' };
const TOOL_LABELS = ['Jato d’água', 'Escova', 'Neutralizador', 'Pintura'];

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
  return {
    stageId,
    stageLabel: config.label,
    objective: config.objective,
    mode: 'playing',
    worldWidth: 3400,
    camera: 0,
    elapsed: 0,
    player: { x: 165, y: GROUND, vx: 0, vy: 0, facing: 1, walking: false, grounded: true, climbing: false },
    platforms: [
      { x: 730, y: 430, w: 135, h: 70 },
      { x: 1320, y: 350, w: 315, h: 22 },
      { x: 2210, y: 400, w: 245, h: 22 },
      { x: 2930, y: 435, w: 125, h: 65 },
    ],
    ladders: [{ x: 1365, y: 350, w: 48, h: 150 }, { x: 2260, y: 400, w: 48, h: 100 }],
    workers: stageId === 'sms' ? makeWorkers() : [],
    rust: stageId === 'ieei' ? [
      { id: 'rust-1', x: 470, y: 434, step: 0, progress: 0, label: 'Linha de processo' },
      { id: 'rust-2', x: 1600, y: 434, step: 0, progress: 0, label: 'Suporte estrutural' },
      { id: 'rust-3', x: 2820, y: 434, step: 0, progress: 0, label: 'Vaso de pressão' },
    ] : [],
    stations: stageId === 'preop' ? [
      { id: 'tap-1', x: 470, y: 440, step: 0, label: 'Sistema de óleo', name: 'Óleo' },
      { id: 'tap-2', x: 1600, y: 440, step: 0, label: 'Sistema de gás', name: 'Gás' },
      { id: 'tap-3', x: 2820, y: 440, step: 0, label: 'Sistema de água', name: 'Água' },
    ] : [],
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
    this.message(stageId === 'sms' ? 'Observe os EPIs! Cada desvio fica visível por 2 segundos.' : 'Aproxime-se de um ponto destacado e clique nele.', 'info', 4);
    this.emit();
  }

  getSnapshot() { return this.state; }

  pause(value = true) {
    if (!this.state || this.state.mode === 'ended') return;
    this.state.mode = value ? 'paused' : 'playing';
    this.keys.clear();
    this.jumpQueued = false;
    this.lastTime = null;
    this.emit();
  }

  handleKeyDown(event) {
    if (!this.state || this.state.mode !== 'playing') return;
    if (event.target?.closest?.('input, textarea, select, [contenteditable="true"]')) return;
    const accepted = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'KeyA', 'KeyD', 'KeyW', 'KeyS'];
    if (!accepted.includes(event.code)) return;
    if (event.code === 'Space' && event.target?.closest?.('button')) return;
    event.preventDefault();
    if (this.state.activeTarget) return;
    this.keys.add(event.code);
    if (!event.repeat && ['Space', 'ArrowUp', 'KeyW'].includes(event.code)) this.jumpQueued = true;
  }

  handleKeyUp(event) { this.keys.delete(event.code); }

  // Optional touch controls can call this without synthesizing browser events.
  setControl(code, pressed) {
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
    this.state.activeTarget = null;
    this.state.selectedTool = null;
    this.state.toolProgress = 0;
    this.keys.clear();
    this.emit();
  }

  getTarget() {
    const s = this.state;
    if (!s?.activeTarget) return null;
    return (s.activeTarget.type === 'repair' ? s.rust : s.stations).find(t => t.id === s.activeTarget.id) || null;
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

  chooseTap(index) {
    const s = this.state;
    const target = this.getTarget();
    if (!target || s.mode !== 'playing' || s.activeTarget.type !== 'tap' || !Number.isInteger(index) || index < 0 || index >= RULES.tapSteps) return false;
    const outcome = tapOutcome(target.step, index);
    target.step = outcome.step;
    if (!outcome.accepted) {
      s.elapsed += outcome.penalty;
      s.timeLeft = Math.max(0, STAGES[s.stageId].limit - s.elapsed);
      this.message('Ordem incorreta: confira a prontidão antes de avançar. −5 segundos.', 'error');
      if (deadlineExpired(s.elapsed, STAGES[s.stageId].limit)) this.end(false, 'O prazo terminou antes da conclusão dos três sistemas.');
    } else if (outcome.completed) {
      s.correct += 1;
      s.completedCount = s.correct;
      s.score += 100;
      this.burst(target.x, target.y, '#b5ec65');
      this.message(`${target.label}: TAP aprovada (FIC concluída).`, 'success');
      this.closeInteraction();
      if (s.correct >= 3) this.end(true, 'Três sistemas com TAP aprovada (FIC concluída)!');
    } else this.message('Etapa confirmada. Continue a sequência de preparação.', 'success');
    this.emit();
    return outcome.accepted;
  }

  message(text, tone = 'info', seconds = 3) {
    if (!this.state) return;
    this.state.feedback = { text, tone, until: this.state.elapsed + seconds };
    this.emit();
  }

  burst(x, y, color) {
    for (let i = 0; i < 14; i++) {
      const angle = Math.PI * 2 * i / 14;
      this.state.particles.push({ x, y, vx: Math.cos(angle) * 100, vy: Math.sin(angle) * 100 - 50, life: 0.8, maxLife: 0.8, color, size: 3 + i % 3 });
    }
  }

  updatePhysics(dt) {
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
    s.elapsed += dt;
    const limit = STAGES[s.stageId].limit;
    if (limit !== null) {
      s.timeLeft = Math.max(0, limit - s.elapsed);
      if (deadlineExpired(s.elapsed, limit)) {
        this.end(false, s.stageId === 'ieei' ? 'O minuto terminou. Os três pontos precisam estar completamente tratados.' : 'O prazo terminou antes da conclusão dos três sistemas.');
        return;
      }
    }
    this.updatePhysics(physicsDt);
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
    s.activeTarget = null;
    s.selectedTool = null;
    this.keys.clear();
    this.jumpQueued = false;
    this.emit();
    this.callbacks.onEnd?.({ success, stageId: s.stageId, score: s.score, correct: s.correct, elapsed: s.elapsed, reason });
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
