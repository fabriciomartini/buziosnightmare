/** Fictional commissioning mission data: readable clues, finite evidence and one radio revision. */
export const PREOP_SECONDS = 120;
export const PREOP_BONUS_SECONDS = 15;
export const PREOP_PENALTY_SECONDS = 5;
export function makePreop() {
  const stations = [
    { id: 'oil', name: 'Óleo', label: 'Sistema de óleo', code: 'OLE-083', x: 650, y: 440, hint: 'Busque a placa OLE-083 no almoxarifado.', requiredIds: ['oil-tag'] },
    { id: 'gas', name: 'Gás', label: 'Sistema de gás', code: 'GAS-083', x: 1800, y: 440, hint: 'Registre os três pontos de campo e entregue a evidência.', requiredIds: ['gas-evidence'] },
    { id: 'water', name: 'Água', label: 'Sistema de água', code: 'AGU-083 · Rev. 2 assinada', x: 3020, y: 440, hint: 'Encontre o documento AGU-083, revisão 2, com assinatura.', requiredIds: ['water-document'] },
  ].map(station => ({ ...station, kind: 'station', done: false, step: 0, acceptedIds: [] }));
  const items = [
    { id: 'oil-tag', label: 'Placa OLE-083', detail: 'Identificação OLE-083 · Óleo', systemId: 'oil', kind: 'tag', correct: true, rackId: 'tags' },
    { id: 'oil-decoy', label: 'Placa OLE-038', detail: 'Identificação OLE-038 · confira os números', systemId: 'oil', kind: 'tag', correct: false, rackId: 'tags' },
    { id: 'tag-decoy', label: 'Placa AGU-083', detail: 'Identificação AGU-083 · Água', systemId: 'water', kind: 'tag', correct: false, rackId: 'tags' },
    { id: 'gas-evidence', label: 'Registro GAS-083', detail: 'Três verificações de campo registradas', systemId: 'gas', kind: 'field', correct: true, rackId: 'field-3', available: false },
    { id: 'water-document', label: 'AGU-083 · Rev. 2', detail: 'Revisão 2 · assinado ✓', systemId: 'water', kind: 'document', correct: true, rackId: 'documents' },
    { id: 'water-old', label: 'AGU-083 · Rev. 1', detail: 'Revisão 1 · assinado ✓', systemId: 'water', kind: 'document', correct: false, rackId: 'documents' },
    { id: 'water-unsigned', label: 'AGU-083 · Rev. 2', detail: 'Revisão 2 · assinatura pendente', systemId: 'water', kind: 'document', correct: false, rackId: 'documents' },
    { id: 'radio-revision', label: 'Revisão complementar', detail: 'Nova revisão recebida pelo rádio', systemId: null, kind: 'revision', correct: true, rackId: 'revision', available: false },
  ].map(item => ({ available: true, collected: false, delivered: false, ...item }));
  return {
    inventory: [], capacity: 2, items, stations,
    fieldPoints: [
      { id: 'field-1', kind: 'field', label: 'Gás · campo 1/3', x: 1450, y: 310, recorded: false },
      { id: 'field-2', kind: 'field', label: 'Gás · campo 2/3', x: 2100, y: 440, recorded: false },
      { id: 'field-3', kind: 'field', label: 'Gás · campo 3/3', x: 2370, y: 360, recorded: false },
    ],
    racks: [
      { id: 'tags', kind: 'rack', label: 'Almoxarifado · placas', x: 1000, y: 440, itemIds: ['oil-tag', 'oil-decoy', 'tag-decoy'], available: true },
      { id: 'documents', kind: 'rack', label: 'Arquivo · documentos', x: 3240, y: 440, itemIds: ['water-document', 'water-old', 'water-unsigned'], available: true },
      { id: 'revision', kind: 'rack', label: 'Nova revisão · rádio', x: 2600, y: 440, itemIds: ['radio-revision'], available: false },
    ],
    board: { id: 'board', kind: 'board', label: 'Quadro de fechamento · TAPs', x: 190, y: 440 },
    radio: { triggered: false, targetId: null, until: 0, text: '' },
    bonusSeconds: 0, closing: null,
  };
}
export function preopTargets(preop) {
  return [preop.board, ...preop.stations, ...preop.racks.filter(rack => rack.available), ...preop.fieldPoints];
}
export function canReachPreop(player, target) {
  // Elevated field points must be reached on their walkway, not clicked below it.
  return Math.abs(player.x - target.x) <= (target.kind === 'field' ? 95 : 135) && Math.abs(player.y - target.y) <= (target.kind === 'field' ? 85 : 125);
}
