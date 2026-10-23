// Inventory and mission panels for the commissioning adventure.
const $ = id => document.getElementById(id);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const SYMBOLS = { oil: 'O', gas: 'G', water: 'A' };
const TASKS = { oil: 'Placa de identificação', gas: 'Três registros de campo', water: 'Revisão e assinatura' };

export class PreopUI {
  constructor({ getGame, onPause }) {
    this.getGame = getGame; this.onPause = onPause; this.reset();
    for (const root of [$('preop-content'), $('preop-inventory')]) {
      root.addEventListener('click', event => this.click(event));
      root.addEventListener('dragstart', event => {
        const card = event.target.closest('[data-evidence]');
        if (!card) return;
        event.dataTransfer.setData('text/plain', card.dataset.evidence);
        event.dataTransfer.effectAllowed = 'move';
      });
    }
    $('preop-content').addEventListener('dragover', event => {
      if (event.target.closest('[data-delivery]')) { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; }
    });
    $('preop-content').addEventListener('drop', event => {
      const zone = event.target.closest('[data-delivery]'); if (!zone) return;
      event.preventDefault(); this.deliver(event.dataTransfer.getData('text/plain'), zone.dataset.delivery);
    });
  }

  reset() { this.selected = null; this.hudKey = ''; this.panelKey = ''; }

  click(event) {
    const game = this.getGame(), button = event.target.closest('button');
    if (!button || !game || game.state?.mode !== 'playing') return;
    if (button.dataset.take) game.takeEvidence(button.dataset.take);
    else if (button.dataset.drop) { game.dropEvidence(button.dataset.drop); this.selected = null; }
    else if (button.dataset.evidence) { this.selected = button.dataset.evidence; this.panelKey = ''; this.updatePanel(game.state); }
    else if (button.dataset.delivery) this.deliver(this.selected, button.dataset.delivery);
    else if (button.hasAttribute('data-preop-finish')) game.finishPreop();
    else if (button.hasAttribute('data-preop-close')) game.closeInteraction();
    else if (button.hasAttribute('data-preop-pause')) this.onPause();
  }

  deliver(itemId, stationId) {
    const game = this.getGame(); if (!itemId || !game) return;
    game.deliverEvidence(itemId, stationId);
    if (!game.state.preop.inventory.includes(itemId)) this.selected = null;
    this.panelKey = ''; this.updatePanel(game.state);
  }

  itemCard(item, { deliver = false } = {}) {
    return `<article class="evidence-card system-${esc(item.systemId)} ${this.selected === item.id ? 'selected' : ''}"><button class="evidence-main" draggable="${deliver}" data-evidence="${esc(item.id)}" aria-pressed="${this.selected === item.id}" ${deliver ? '' : 'disabled'}><span class="evidence-symbol" aria-hidden="true">${SYMBOLS[item.systemId] || '▤'}</span><span><strong>${esc(item.label)}</strong><small>${esc(item.detail)}</small></span></button><button class="evidence-return" data-drop="${esc(item.id)}" title="Devolver ao ponto de origem">Devolver ↩</button></article>`;
  }

  updateHUD(s) {
    const p = s.preop; if (!p) return;
    const key = JSON.stringify([p.inventory, p.stations.map(t => [t.done,t.acceptedIds,t.requiredIds]), p.fieldPoints.map(f => f.recorded), p.radio.triggered, s.mode]);
    if (key === this.hudKey) return; this.hudKey = key;
    $('preop-capacity').textContent = `${p.inventory.length}/${p.capacity}`;
    $('preop-tasks').innerHTML = p.stations.map(t => {
      const remaining = t.requiredIds.length - t.acceptedIds.length;
      const detail = t.done ? 'Pronto para fechar ✓' : t.id === 'gas' && !p.fieldPoints.every(f => f.recorded) ? `Campo ${p.fieldPoints.filter(f => f.recorded).length}/3` : `${remaining} ${remaining === 1 ? 'evidência' : 'evidências'}`;
      return `<div class="task-pill system-${esc(t.id)} ${t.done ? 'done' : ''}"><b>${SYMBOLS[t.id]} ${esc(t.name)}</b><small>${detail}</small></div>`;
    }).join('');
    $('preop-inventory').innerHTML = Array.from({length:p.capacity}, (_,i) => {
      const item = p.items.find(item => item.id === p.inventory[i]);
      return item ? `<div class="inventory-chip system-${esc(item.systemId)}"><span><b>${SYMBOLS[item.systemId]} ${esc(item.label)}</b></span><button data-drop="${esc(item.id)}" aria-label="Devolver ${esc(item.label)} ao ponto de origem" title="Devolver ao ponto de origem">↩</button></div>` : '<div class="inventory-chip empty">Espaço livre</div>';
    }).join('');
  }

  open(target, s) { this.selected = null; this.panelKey = ''; this.updatePanel(s, target); }

  updatePanel(s, explicitTarget) {
    const p = s.preop; if (!p || s.activeTarget?.type !== 'preop') return;
    const target = explicitTarget || this.getGame().getTarget(); if (!target) return;
    if (!p.inventory.includes(this.selected)) this.selected = null;
    const key = JSON.stringify([target.id, this.selected, p.inventory, p.items.map(i => [i.available,i.collected,i.delivered]), p.stations.map(t => [t.done,t.requiredIds,t.acceptedIds]), p.fieldPoints.map(f=>f.recorded), p.radio.triggered, s.mode]);
    if (key === this.panelKey) return; this.panelKey = key;
    $('interaction-eyebrow').textContent = `PRÉ-OP / ${target.kind === 'board' ? 'QUADRO DE PENDÊNCIAS' : target.kind === 'rack' ? 'BUSCA DE EVIDÊNCIAS' : 'ENTREGA DE EVIDÊNCIAS'}`;
    $('interaction-title').textContent = target.label;
    let html = '';
    if (target.kind === 'board') {
      const ready = p.stations.every(t=>t.done);
      $('interaction-intro').textContent = ready ? 'Tudo conferido. Registre as assinaturas, digitalize as evidências e conclua o fechamento.' : 'Escolha o caminho. Os três sistemas têm uma última pendência; volte aqui quando estiverem prontos.';
      html = `<div class="preop-board-list">${p.stations.map(t => `<article class="board-task system-${esc(t.id)}"><span class="task-icon">${t.done ? '✓' : SYMBOLS[t.id]}</span><div><b>${esc(t.name)} · ${esc(t.code)}</b><p>${esc(t.hint || TASKS[t.id])}</p><small>${t.done ? 'Evidências aceitas · pronto para fechamento' : `${t.acceptedIds.length}/${t.requiredIds.length} evidências entregues`}</small></div></article>`).join('')}</div><p class="preop-tip">▤ A prancheta tem dois espaços. Devolver um item o deixa disponível novamente no ponto de origem.</p>${p.radio.triggered ? '<p class="radio-note">◉ Rádio: revisão extra incluída no sistema indicado. Bônus de 15s já recebido.</p>' : '<p class="preop-tip">Fique atento ao rádio: alguém ainda pode trazer uma última revisão.</p>'}<button class="button primary wide" data-preop-finish ${ready ? '' : 'disabled'}>Fechar as três TAPs <span>✓</span></button>`;
    } else if (target.kind === 'rack') {
      const full = p.inventory.length >= p.capacity;
      $('interaction-intro').textContent = full ? 'Prancheta cheia. Entregue ou devolva uma evidência antes de recolher outra.' : 'Confira os códigos e os detalhes antes de recolher. A prancheta comporta duas evidências.';
      const system = p.stations.find(t => t.id === (target.id === 'tags' ? 'oil' : target.id === 'documents' ? 'water' : p.radio.targetId));
      html = `<div class="request-slip"><b>Pedido do sistema ${esc(system?.name || '')}</b><p>${esc(system?.hint || '')}</p></div><div class="evidence-grid">${target.itemIds.map(id => p.items.find(i=>i.id===id)).filter(Boolean).map(item => `<button class="collect-card system-${esc(item.systemId)}" data-take="${esc(item.id)}" ${full || !item.available || item.collected || item.delivered ? 'disabled' : ''}><span class="evidence-symbol" aria-hidden="true">${SYMBOLS[item.systemId]}</span><b>${esc(item.label)}</b><small>${esc(item.detail)}</small><em>${item.delivered ? 'Já entregue ✓' : item.collected ? 'Na prancheta' : 'Recolher +'}</em></button>`).join('')}</div>${this.inventorySection(p,false)}`;
    } else {
      $('interaction-intro').textContent = target.done ? 'Evidências aceitas. Este sistema aguarda o fechamento no terminal inicial.' : 'Arraste uma evidência até a área de entrega, ou selecione o cartão e pressione Entregar. Item incorreto: −5s.';
      const requirements = target.requiredIds.map(id => ({item:p.items.find(i=>i.id===id),done:target.acceptedIds.includes(id)}));
      html = `<div class="request-slip system-${esc(target.id)}"><b>${SYMBOLS[target.id]} ${esc(target.code)} · ${esc(TASKS[target.id])}</b><p>${esc(target.hint || '')}</p><ul>${requirements.map(({item,done})=>`<li>${done ? '✓' : '○'} ${esc(item?.label || 'Evidência de campo')}</li>`).join('')}</ul></div>${this.inventorySection(p,true)}<button class="delivery-zone ${this.selected ? 'has-selection' : ''}" data-delivery="${esc(target.id)}" ${target.done ? 'disabled' : ''}><span>${target.done ? '✓ EVIDÊNCIAS ACEITAS' : this.selected ? 'ENTREGAR EVIDÊNCIA SELECIONADA ↓' : 'ARRASTE A EVIDÊNCIA ATÉ AQUI ↓'}</span><small>${target.done ? 'Volte ao terminal quando os três sistemas estiverem prontos.' : 'Ou clique num cartão acima e depois aqui.'}</small></button>`;
    }
    html += '<div class="preop-panel-actions"><button class="text-button" data-preop-close>← Voltar ao convés</button><button class="icon-button" data-preop-pause aria-label="Pausar a missão">Ⅱ</button></div>';
    $('preop-content').innerHTML = html;
    if (s.mode !== 'playing') $('preop-content').querySelectorAll('button').forEach(b => b.disabled=true);
  }

  inventorySection(p, deliver) {
    return `<div class="panel-inventory"><b>PRANCHETA · ${p.inventory.length}/${p.capacity}</b><div class="evidence-grid">${p.inventory.map(id=>p.items.find(i=>i.id===id)).filter(Boolean).map(i=>this.itemCard(i,{deliver})).join('') || '<p class="empty-evidence">A prancheta está vazia. Busque as evidências pelo convés.</p>'}</div></div>`;
  }
}
