/** Small deterministic rules shared by the game and its automated checks. */
export const RULES = Object.freeze({
  viewSeconds: 2,
  observationsToWin: 5,
  repairsToWin: 3,
  repairSeconds: 90,
  tapSeconds: 120,
  tapPenaltySeconds: 5,
  workPixelsPerStep: 180,
  repairSteps: 4,
  tapSteps: 3,
  officeMaxHits: 3,
  officeInvulnerabilitySeconds: 1.2,
  officeWarningSeconds: 0.75,
  dynamicSeconds: 90,
  dynamicAlignmentHits: 3,
  dynamicAlignmentPenalty: 3,
  dynamicSyncPenalty: 2,
  dynamicAlignmentCooldown: 0.55,
  dynamicStableSeconds: 4,
});

export function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

export function observationOutcome(worker, elapsed, score, correct) {
  if (worker.recorded) return { type: 'duplicate', score, correct };
  const open = Boolean(worker.risk) && !worker.corrected && worker.visibleSince !== null &&
    elapsed - worker.visibleSince < RULES.viewSeconds;
  const nextScore = score + (open ? 1 : -1);
  const nextCorrect = correct + (open ? 1 : 0);
  return {
    type: open ? 'correct' : 'false-positive',
    score: nextScore,
    correct: nextCorrect,
    failed: nextScore < 0,
    won: nextCorrect >= RULES.observationsToWin,
  };
}

export function canReach(player, target) {
  return Math.abs(player.x - target.x) <= 165 && Math.abs(player.y - target.y) <= 145;
}

export function treatmentOutcome(step, selectedTool, progress, movement) {
  if (step >= RULES.repairSteps || selectedTool !== step || !Number.isFinite(movement) || movement <= 0) {
    return { step, progress, completed: step >= RULES.repairSteps, advanced: false };
  }
  const nextProgress = clamp(progress + Math.min(movement, 45) / RULES.workPixelsPerStep, 0, 1);
  const advanced = nextProgress >= 1;
  const nextStep = step + (advanced ? 1 : 0);
  return {
    step: nextStep,
    progress: advanced ? 0 : nextProgress,
    completed: nextStep >= RULES.repairSteps,
    advanced,
  };
}

export function tapOutcome(step, choice) {
  if (step >= RULES.tapSteps) return { step, accepted: false, completed: true, penalty: 0 };
  const accepted = choice === step;
  return {
    step: step + (accepted ? 1 : 0),
    accepted,
    completed: accepted && step + 1 >= RULES.tapSteps,
    penalty: accepted ? 0 : RULES.tapPenaltySeconds,
  };
}

export function deadlineExpired(elapsed, limit) {
  return limit !== null && elapsed >= limit;
}

export function rectanglesOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function officeHitOutcome(hits, elapsed, invulnerableUntil) {
  if (elapsed < invulnerableUntil) return { hits, invulnerableUntil, damaged: false, failed: false };
  const nextHits = Math.min(RULES.officeMaxHits, hits + 1);
  return {
    hits: nextHits,
    invulnerableUntil: elapsed + RULES.officeInvulnerabilitySeconds,
    damaged: true,
    failed: nextHits >= RULES.officeMaxHits,
  };
}

export function angleDistance(angleA, angleB) {
  const circle = Math.PI * 2;
  const difference = ((angleA - angleB) % circle + circle) % circle;
  return Math.min(difference, circle - difference);
}

export function alignmentMatches(angleA, angleB, tolerance) {
  return angleDistance(angleA, angleB) <= tolerance + 1e-9;
}

export function dynamicSyncStep(machine, input, dt) {
  const controlTime = machine.controlTime + dt;
  const sign = machine.index === 1 ? -1 : 1;
  const drift = sign * (0.30 + machine.index * 0.05) + 0.12 * Math.sin(controlTime * 1.3 + machine.index * 1.2);
  const needle = clamp(machine.needle + (drift + clamp(input, -1, 1) * (0.95 + machine.index * 0.1)) * dt, -1, 1);
  const inside = Math.abs(needle) <= machine.band;
  return {
    needle,
    controlTime,
    stableTime: inside ? machine.stableTime + dt : 0,
    inside,
  };
}
