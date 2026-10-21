import { Game } from './engine.js';
import { drawGame, drawPortrait } from './renderer.js';

const $ = id => document.getElementById(id);
const sequence = ['sms', 'ieei', 'preop'];
const STORAGE = 'buzios-nightmare-v1';
const levels = {
  sms: { number: '01', department: 'SMS', title: 'Olho no desvio', person: 'Jaqueline', role: 'Segurança, Meio Ambiente e Saúde', short: 'Um olhar atento faz toda a diferença.', color: '#b6d477', objective: 'Registre 5 desvios', goal: 5, story: 'Jaqueline chegou ao convés. Alguns trabalhadores estão sem EPI, mas se ajeitam assim que percebem sua presença. Observe rápido e registre apenas desvios reais na prancheta de auditoria comportamental.', rules: ['Caminhe com as setas e clique nos trabalhadores com desvio.', 'Você tem 2 segundos antes que cada trabalhador corrija o EPI.', 'Registre 5 desvios. Cada acerto vale +1; falso registro vale −1. Placar negativo encerra a tentativa.'], meta: 'Sem limite geral de tempo · As oportunidades de observação são únicas por tentativa.' },
  ieei: { number: '02', department: 'IEEI', title: 'Ferrugem, aqui não!', person: 'José Roberto', role: 'Integração de Equipamentos Estáticos e Inspeção', short: 'A corrosão não tira folga. Você também não.', color: '#efc775', objective: 'Recupere 3 pontos', goal: 3, story: 'A maresia não deu trégua à P-83. José Roberto tem um minuto para encontrar e recuperar três pontos de corrosão espalhados pelo convés. Cada tratamento precisa acontecer na ordem certa.', rules: ['Aproxime-se do ponto enferrujado e clique nele.', 'Escolha: jato d’água → escova → neutralizador → pintura.', 'Segure e arraste sobre a área central até completar cada etapa. Recupere os 3 pontos em menos de 60 segundos.'], meta: '60 segundos · O cronômetro continua durante o tratamento. Sequência simplificada exclusivamente para a dinâmica do jogo.' },
  ied: { number: '03', department: 'IED', title: 'Máquinas em movimento', short: 'Integração de Equipamentos Dinâmicos', color: '#c7d4c4', future: true },
  pspo: { number: '04', department: 'PSPO', title: 'Tudo no planejamento', short: 'Planejamento e Suporte para Operação', color: '#d5d3bb', future: true },
  preop: { number: '05', department: 'Pré-Op / P-83', title: 'Prontos para a TAP', person: 'Equipe P-83', role: 'Pré-operação da P-83 · Fase proposta', short: 'Preparar. Verificar. Aprovar.', color: '#c2b9d9', objective: 'Prepare 3 sistemas', goal: 3, story: 'O próximo marco da P-83 está chegando. Percorra o convés e ajude a equipe a preparar os sistemas de óleo, gás e água para a TAP. Esta terceira missão é uma proposta para a demonstração.', rules: ['Caminhe até os sistemas destacados e clique para abrir a missão.', 'Siga: prontidão CCM → verificação em campo → documentação e aprovação.', 'Conclua os 3 sistemas em menos de 75 segundos. Cada escolha fora de ordem custa 5 segundos.'], meta: '75 segundos · Proposta de roteiro · Marco final: TAP aprovada (FIC concluída). Interação lúdica simplificada.' }
};
let save = { completed: [], best: {} };
try { const parsed = JSON.parse(localStorage.getItem(STORAGE)); if (parsed && Array.isArray(parsed.completed)) save = { completed: parsed.completed.filter(x => sequence.includes(x)), best: parsed.best || {} }; } catch { /* Storage may be unavailable in private mode. */ }
let mode = 'campaign', activeStage = null, game = null, selectedStage = null, result = null, pauseCause = null, lastFeedback = '', audio = null, soundEnabled = false;
const persist = () => { try { localStorage.setItem(STORAGE, JSON.stringify(save)); } catch { /* Gameplay works without persistence. */ } };
const nextCampaign = () => sequence.find(id => !save.completed.includes(id)) || 'sms';
const unlocked = id => mode === 'free' || sequence.indexOf(id) === 0 || sequence.slice(0, sequence.indexOf(id)).every(x => save.completed.includes(x));
const modalOpen = () => [...document.querySelectorAll('dialog')].some(d => d.open);
function showDialog(id) { const dialog = $(id); if (!dialog.open) dialog.showModal(); }
function closeAll() { for (const d of document.querySelectorAll('dialog')) if (d.open) d.close(); }

const icon = (type, cls = '') => {
 const paths = {
  water: '<path d="M9 20h13v9H9zM22 21l16-10 6 9-17 9M15 30v15H6V25" fill="#82bcd0"/><path d="M43 17l6-4M46 23l7 1M44 29l7 5" fill="none" stroke="#5295b1"/>',
  brush: '<path d="M17 29l22-22 9 9-22 22" fill="#c8955b"/><path d="M7 32l16-9 13 13-10 16z" fill="#e9d397"/><path d="M10 38l16 14M16 34l15 12M23 29l12 11" fill="none"/>',
  neutral: '<path d="M22 6h16v8l-3 4v7l11 19q2 7-6 7H18q-8 0-5-7l12-19V18l-3-4z" fill="#b9d981"/><path d="M19 37h21" fill="none"/><circle cx="30" cy="42" r="3" fill="#7ca44f"/><path d="M27 8h7" fill="none"/>',
  paint: '<path d="M10 9h35v15H10z" fill="#79b5a0"/><path d="M45 16h6v19H29v11" fill="none"/><path d="M25 44h8v11h-8z" fill="#d4a65f"/>'
 };
 return `<svg class="${cls}" viewBox="0 0 60 60" fill="none" stroke="#23483c" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[type]}</svg>`;
};
function cardDrawing(id) {
 const base = '<g stroke="#294b3d" stroke-width="2.8" stroke-linejoin="round" stroke-linecap="round">';
 const end = '</g>';
 const illustrations = {
  sms: `${base}<path d="M95 117V83q0-20 24-22 25 1 28 22v34" fill="#eea459"/><path d="M101 100h39M110 84v34M133 83v35" stroke="#f8e7a3" stroke-width="7"/><path d="M107 67q-20-30 4-45 30-9 36 19l-6 31z" fill="#765746"/><ellipse cx="124" cy="52" rx="22" ry="25" fill="#efbc83"/><path d="M98 44q2-29 28-29 26 1 26 29z" fill="#f6d36b"/><path d="M121 16v22M94 44h63" fill="none"/><circle cx="116" cy="54" r="2" fill="#294b3d"/><circle cx="132" cy="54" r="2" fill="#294b3d"/><path d="M118 65q8 6 14-1" fill="none"/><rect x="144" y="72" width="32" height="40" rx="4" fill="#fff3c8" transform="rotate(10 160 92)"/><path d="M154 80h14M153 89l4 4 7-9M154 100h13" fill="none"/><path d="M83 78l-9-8M78 89H66M84 98l-9 6" stroke="#6e903c"/>${end}`,
  ieei: `${base}<path d="M22 72h147v34H22" fill="#afc8b5"/><path d="M37 64v50M51 64v50M150 64v50" stroke="#73967f" stroke-width="9"/><path d="M78 70l13-8 13 12 15-3 7 20-17 15-19-5-16 5-6-20z" fill="#b8683e"/><path d="M132 57l32-34 16 15-37 33" fill="#a47a50"/><path d="M117 69l15-22 23 21-18 18z" fill="#e9d7a0"/><path d="M121 66l21 14M128 59l20 14" fill="none"/><path d="M102 47l2-13M89 49l-9-9M165 89l12 1" stroke="#c28d3e"/><circle cx="61" cy="34" r="12" fill="#f6de95"/><path d="M57 34l3 3 6-7" fill="none"/>${end}`,
  ied: `${base}<path d="M34 94h133v14H34z" fill="#7b9f91"/><rect x="52" y="50" width="94" height="44" rx="10" fill="#b1c5b4"/><path d="M66 54v35M78 54v35M90 54v35M102 54v35M114 54v35" stroke="#789784"/><circle cx="148" cy="72" r="27" fill="#d7dfc9"/><circle cx="148" cy="72" r="13" fill="#829d8c"/><path d="M30 66h23v18H30M74 50V33h47v17" fill="#c4d2bb"/><path d="M154 27l5-10M169 36l11-4" fill="none"/>${end}`,
  pspo: `${base}<rect x="63" y="24" width="87" height="86" rx="7" fill="#f1edd3"/><path d="M63 45h87"/><path d="M82 17v14M131 17v14" stroke-width="6"/><path d="M77 60l5 5 8-10M77 80l5 5 8-10M103 60h29M103 80h20M77 97h54" fill="none"/><circle cx="160" cy="88" r="24" fill="#b5c5a7"/><path d="M160 73v17l10 5" fill="none"/>${end}`,
  preop: `${base}<path d="M40 113V50h91v63" fill="#b2c7b5"/><path d="M54 50V28h63v22" fill="#e1e4ce"/><rect x="53" y="61" width="64" height="38" rx="4" fill="#31594d"/><path d="M62 88l10-12 8 7 12-15 17 12" fill="none" stroke="#c2db81"/><circle cx="152" cy="78" r="32" fill="#c2d77e"/><path d="M136 77l12 13 23-28" fill="none" stroke-width="7"/><path d="M156 26v12M177 33l-7 10" stroke="#8d7fa0"/>${end}`
 };
 return `<svg viewBox="0 0 220 120" aria-hidden="true">${illustrations[id]}</svg>`;
}
function renderMenu() {
 $('mode-campaign').setAttribute('aria-pressed', mode === 'campaign');
 $('mode-free').setAttribute('aria-pressed', mode === 'free');
 $('mode-description').textContent = mode === 'free' ? 'Seu convés, suas regras. Jogue qualquer uma das três missões disponíveis, na ordem que quiser.' : 'Uma missão de cada vez. Conclua SMS para desbloquear IEEI e depois Pré-Op/P-83.';
 $('campaign-start').innerHTML = `${save.completed.length && save.completed.length < 3 ? 'Continuar campanha' : 'Iniciar campanha'} <span>➜</span>`;
 $('mission-grid').innerHTML = Object.entries(levels).map(([id, l]) => {
  const lock = !l.future && !unlocked(id), done = save.completed.includes(id);
  return `<button class="mission-card ${l.future ? 'future' : lock ? 'locked' : ''}" data-stage="${id}" style="--card-color:${l.color}" ${l.future || lock ? 'disabled' : ''} aria-label="${l.department}: ${l.future ? 'em breve' : lock ? 'bloqueada na campanha' : l.title}"><div class="card-art"><span class="card-number">${l.number}</span><span class="card-status">${l.future ? 'EM BREVE' : done ? '✓ CONCLUÍDA' : lock ? 'BLOQUEADA' : id === 'preop' ? 'PROPOSTA' : 'DISPONÍVEL'}</span>${cardDrawing(id)}</div><div class="card-content"><h3>${l.department}</h3><p>${l.short}</p><div class="card-bottom"><span>${l.future ? 'Próximos capítulos' : lock ? 'Avance na campanha' : l.person}</span><span>${l.future || lock ? '○' : '↗'}</span></div></div></button>`;
 }).join('');
}
function setMode(value) { mode = value; renderMenu(); }
function brief(id) {
 if (!levels[id] || levels[id].future || !unlocked(id)) return;
 selectedStage = id; const l = levels[id];
 $('brief-eyebrow').textContent = `MISSÃO ${l.number} / ${l.department} ${mode === 'campaign' ? '· CAMPANHA' : '· MODO LIVRE'}`;
 $('brief-title').textContent = l.title; $('brief-person').textContent = `${l.person} · ${l.role}`;
 $('brief-story').textContent = l.story; $('brief-rules').innerHTML = l.rules.map(r => `<li>${r}</li>`).join('');
 $('brief-meta').textContent = l.meta;
 const ctx = $('brief-portrait').getContext('2d'); ctx.clearRect(0,0,180,190); drawPortrait(ctx,id,180);
 showDialog('brief-dialog');
}
function start(id) {
 closeAll(); pauseCause = null; activeStage = id; lastFeedback = ''; result = null;
 $('home-screen').hidden = true; $('game-screen').hidden = false; document.body.classList.add('in-game');
 const l = levels[id]; $('game-department').textContent = `${l.department} / ${mode === 'campaign' ? 'CAMPANHA' : 'LIVRE'}`; $('game-title').textContent = l.title;
 $('hud-person').textContent = l.person.toUpperCase(); $('hud-objective').textContent = l.objective;
 $('metric-label').textContent = id === 'sms' ? 'PLACAR' : 'TEMPO';
 $('audit-panel').hidden = id !== 'sms'; $('audit-panel').open = false;
 if (!game) game = new Game($('game-canvas'), { onUpdate: update, onEnd: end, onInteraction: interaction });
 game.start(id); $('game-canvas').focus(); window.scrollTo(0,0);
}
function goHome() {
 closeAll(); if (game) { game.destroy(); game = null; }
 activeStage = null; pauseCause = null; dragging = false;
 $('game-screen').hidden = true; $('home-screen').hidden = false; document.body.classList.remove('in-game'); renderMenu(); window.scrollTo(0,0);
}
function update(s) {
 if (!s || !activeStage) return;
 const l = levels[s.stageId];
 if (s.stageId === 'sms') $('audit-list').innerHTML = s.auditLog.length ? s.auditLog.map((entry,i) => `<li>Registro ${i+1} · ${entry.label} · ${entry.time.toFixed(1)}s</li>`).join('') : '<li class="empty-record">Nenhum desvio registrado. Observe os EPIs no convés.</li>';
 $('goal-counter').textContent = `${s.correct} / ${l.goal}`;
 $('goal-dots').innerHTML = Array.from({length:l.goal},(_,i) => `<span class="goal-dot ${i < s.correct ? 'done' : ''}">${i < s.correct ? '✓' : ''}</span>`).join('');
 $('metric-value').textContent = s.timeLeft === null ? s.score : `${Math.ceil(s.timeLeft)}s`;
 $('metric-value').parentElement.classList.toggle('danger', s.timeLeft !== null && s.timeLeft <= 15);
 const feedback = s.feedback?.text && s.feedback.until >= s.elapsed ? s.feedback.text : s.stageId === 'sms' ? 'A prancheta está pronta. Continue pelo convés e observe os EPIs.' : 'Explore o convés. Aproxime-se de um ponto destacado para interagir.';
 $('game-feedback').textContent = feedback; $('game-feedback').dataset.tone = s.feedback.until >= s.elapsed ? s.feedback.tone : 'info';
 if (feedback !== lastFeedback) { if (s.feedback.until >= s.elapsed) { if (s.feedback.tone === 'success') beep(600); if (s.feedback.tone === 'error') beep(180); } lastFeedback = feedback; }
 if (s.mode === 'paused' && pauseCause !== 'help' && !$('pause-dialog').open) showDialog('pause-dialog');
 if (s.activeTarget) updateInteraction(s);
 else if ($('interaction-dialog').open) { $('interaction-dialog').close(); dragging = false; if(s.mode === 'playing') $('game-canvas').focus(); }
}
function end(outcome) {
 result = outcome; dragging = false; closeAll(); const l = levels[outcome.stageId];
 if (outcome.success) {
  if (mode === 'campaign' && !save.completed.includes(outcome.stageId)) save.completed.push(outcome.stageId);
  const best = save.best[outcome.stageId]; if (!best || outcome.elapsed < best) save.best[outcome.stageId] = outcome.elapsed; persist(); beep(860);
 }
 const campaignDone = outcome.success && mode === 'campaign' && sequence.every(id => save.completed.includes(id));
 $('result-medal').textContent = outcome.success ? '★' : '↻';
 $('result-eyebrow').textContent = outcome.success ? campaignDone ? 'CAMPANHA CONCLUÍDA' : 'MISSÃO CUMPRIDA' : 'NOVA TENTATIVA';
 $('result-title').textContent = outcome.success ? campaignDone ? 'Turno de respeito!' : 'Boa, equipe!' : 'Vamos de novo?';
 $('result-message').textContent = campaignDone ? 'SMS, integridade e pré-operação: as três missões foram concluídas. IED e PSPO ficam para os próximos capítulos.' : outcome.reason;
 $('result-stats').innerHTML = `<span><strong>${outcome.correct} / ${l.goal}</strong>${outcome.stageId === 'sms' ? 'registros' : 'concluídos'}</span><span><strong>${Math.ceil(outcome.elapsed)}s</strong>de missão</span>`;
 $('result-next').innerHTML = `${!outcome.success ? 'Recomeçar fase' : mode === 'campaign' && !campaignDone ? 'Próxima missão' : 'Jogar novamente'} <span>${outcome.success ? '➜' : '↻'}</span>`;
 showDialog('result-dialog');
}
function pauseGame() { if (game?.getSnapshot()?.mode === 'playing') { pauseCause = 'pause'; game.pause(true); } }
function resume() { if ($('pause-dialog').open) $('pause-dialog').close(); pauseCause = null; game?.pause(false); if (!$('interaction-dialog').open) $('game-canvas').focus(); }
function help() { if(game?.getSnapshot()?.mode === 'playing') {pauseCause = 'help';game.pause(true);} showDialog('help-dialog'); }
$('help-dialog').addEventListener('close', () => {if(pauseCause === 'help') { pauseCause = null;game?.pause(false); }});
function beep(frequency) { if (!soundEnabled || !audio) return; try { const osc=audio.createOscillator(), gain=audio.createGain();osc.type='sine';osc.frequency.value=frequency;gain.gain.setValueAtTime(.045,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.12);osc.connect(gain);gain.connect(audio.destination);osc.start();osc.stop(audio.currentTime+.13); } catch {} }

const toolNames = ['Jato d’água','Escova','Neutralizador','Pintura'], toolIcons = ['water','brush','neutral','paint'];
const taps = [ ['Prontidão CCM','Verificar a prontidão do sistema para a atividade.'], ['Verificação em campo','Realizar a verificação com a equipe responsável.'], ['Documentação e aprovação','TAP aprovada (FIC concluída).'] ];
$('tool-grid').innerHTML = toolNames.map((name,i)=>`<button class="tool-button" data-tool="${i}"><em>${i+1}</em>${icon(toolIcons[i])}<span>${name}</span></button>`).join('');
$('tap-options').innerHTML = taps.map(([name,desc],i)=>`<button class="tap-option" data-tap="${i}"><span>${i+1}</span><span>${name}<small>${desc}</small></span></button>`).join('');
function interaction({type,target,state}) {
 dragging = false;
 $('repair-content').hidden = type !== 'repair'; $('tap-content').hidden = type !== 'tap';
 $('interaction-eyebrow').textContent = type === 'repair' ? `IEEI / PONTO ${state.rust.indexOf(target)+1} DE 3` : `PRÉ-OP / SISTEMA ${state.stations.indexOf(target)+1} DE 3`;
 $('interaction-title').textContent = type === 'repair' ? target.label : target.label;
 $('interaction-intro').textContent = type === 'repair' ? 'Trate a área na sequência correta. O relógio continua correndo!' : 'Prepare o sistema para a TAP. Escolha fora de ordem: −5 segundos.';
 updateInteraction(state); showDialog('interaction-dialog');
}
function updateInteraction(s) {
 const target = (s.activeTarget.type === 'repair' ? s.rust : s.stations).find(t=>t.id===s.activeTarget.id); if (!target) return;
 $('interaction-time').textContent = `${Math.ceil(s.timeLeft)}s restantes`;
 $('interaction-status').textContent = s.feedback?.text || '';
 if (s.activeTarget.type === 'repair') {
  document.querySelectorAll('[data-tool]').forEach(btn => { const n=Number(btn.dataset.tool); btn.classList.toggle('done',n<target.step);btn.classList.toggle('active',n===s.selectedTool);btn.disabled=n<target.step;btn.setAttribute('aria-pressed',n===s.selectedTool); });
  const pct = Math.round((target.progress || 0)*100);
  $('work-percent').textContent = `${pct}%`; $('work-progress-fill').style.width=`${pct}%`;
  document.querySelector('.work-progress').setAttribute('aria-valuenow',pct);
  $('work-label').textContent = `Etapa ${Math.min(target.step+1,4)} de 4 · ${toolNames[target.step] || 'Concluído'}`;
  $('work-prompt').textContent = s.selectedTool === null ? `Selecione: ${toolNames[target.step]}` : 'Segure e esfregue na área central';
  $('rust-art').style.opacity = target.step < 1 ? 1 : target.step === 1 ? 1 - target.progress*.92 : .08;
  $('paint-art').style.opacity = target.step === 3 ? target.progress : 0;
  $('work-area').classList.toggle('working',s.selectedTool !== null);
  $('tool-cursor').innerHTML = s.selectedTool === null ? '' : icon(toolIcons[s.selectedTool]);
 } else document.querySelectorAll('[data-tap]').forEach(btn=>{const n=Number(btn.dataset.tap);btn.classList.toggle('done',n<target.step);btn.disabled=n<target.step;btn.firstElementChild.textContent=n<target.step?'✓':n+1;});
}
let dragging=false, lastPoint=null;
const area = $('work-area');
area.addEventListener('pointerdown',e=>{if(e.button>0 || !game?.getSnapshot()?.activeTarget)return;dragging=true;lastPoint={x:e.clientX,y:e.clientY};area.setPointerCapture(e.pointerId);e.preventDefault();});
area.addEventListener('pointermove',e=>{
 const r=area.getBoundingClientRect(), x=e.clientX-r.left,y=e.clientY-r.top;
 $('tool-cursor').style.left=`${x}px`;$('tool-cursor').style.top=`${y}px`;$('tool-cursor').style.display='block';
 if(!dragging || !lastPoint)return;
 const distance=Math.hypot(e.clientX-lastPoint.x,e.clientY-lastPoint.y)*600/r.width;lastPoint={x:e.clientX,y:e.clientY};
 if(x/r.width>.31 && x/r.width<.69 && y/r.height>.19 && y/r.height<.83)game?.work(distance);
});
const release = ()=>{dragging=false;lastPoint=null;};
area.addEventListener('pointerup',release);area.addEventListener('pointercancel',release);area.addEventListener('lostpointercapture',release);
area.addEventListener('pointerleave',()=>{$('tool-cursor').style.display='none';});
$('tool-grid').addEventListener('click',e=>{const btn=e.target.closest('[data-tool]');if(btn) game?.chooseTool(Number(btn.dataset.tool));});
$('tap-options').addEventListener('click',e=>{const btn=e.target.closest('[data-tap]');if(btn) game?.chooseTap(Number(btn.dataset.tap));});
$('interaction-close').onclick=()=>game?.closeInteraction();
$('interaction-dialog').addEventListener('cancel',e=>{e.preventDefault();game?.closeInteraction();});
$('pause-dialog').addEventListener('cancel',e=>{e.preventDefault();resume();});
$('result-dialog').addEventListener('cancel',e=>{e.preventDefault();goHome();});
for(const b of document.querySelectorAll('[data-close]')) b.onclick=()=>b.closest('dialog').close();
for(const b of document.querySelectorAll('.help-button')) b.onclick=help;
$('mode-campaign').onclick=()=>setMode('campaign');$('mode-free').onclick=()=>setMode('free');
$('campaign-start').onclick=()=>{setMode('campaign');brief(nextCampaign());};
$('free-start').onclick=()=>{setMode('free');$('mission-heading').scrollIntoView({behavior:'smooth',block:'center'});};
$('mission-grid').onclick=e=>{const card=e.target.closest('[data-stage]');if(card && !card.disabled)brief(card.dataset.stage);};
$('brief-play').onclick=()=>start(selectedStage);
$('back-home').onclick=pauseGame;$('pause-game').onclick=pauseGame;
$('pause-home').onclick=goHome;$('result-home').onclick=goHome;
$('resume-game').onclick=resume;$('restart-game').onclick=()=>start(activeStage);
$('result-next').onclick=()=>{if(result.success && mode==='campaign' && !sequence.every(id=>save.completed.includes(id))) {goHome();brief(nextCampaign());} else start(activeStage);};
$('reset-progress').onclick=()=>showDialog('reset-dialog');$('confirm-reset').onclick=()=>{save={completed:[],best:{}};persist();$('reset-dialog').close();renderMenu();};
$('sound-toggle').onclick=async()=>{soundEnabled=!soundEnabled;try{if(soundEnabled){const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)throw new Error('Audio unavailable');audio ||=new Audio();await audio.resume();beep(440);}}catch{soundEnabled=false;}$('sound-toggle').style.background=soundEnabled?'#c6df90':'';$('sound-toggle').setAttribute('aria-label',soundEnabled?'Desativar sons':'Ativar sons');$('sound-toggle').title=soundEnabled?'Desativar sons':'Ativar sons';};
$('fullscreen').onclick=async()=>{try{if(!document.fullscreenElement)await $('game-screen').requestFullscreen();else await document.exitFullscreen();}catch{$('game-feedback').textContent='Tela cheia indisponível neste navegador. Use o zoom do navegador para ampliar.';}};
window.addEventListener('keydown',e=>{if(e.code==='Escape' && activeStage && !modalOpen()){e.preventDefault();pauseGame();}});
for(const button of document.querySelectorAll('[data-key]')){
 button.addEventListener('pointerdown',e=>{e.preventDefault();button.setPointerCapture(e.pointerId);game?.setControl(button.dataset.key,true);});
 for(const event of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(event,()=>game?.setControl(button.dataset.key,false));
}
window.addEventListener('blur',release);

const preview = { stageId:'sms',mode:'paused',worldWidth:3400,camera:120,elapsed:0,player:{x:330,y:500,vx:0,vy:0,facing:1,walking:false},platforms:[{x:750,y:430,w:135,h:70}],ladders:[],workers:[{id:'preview-1',x:620,y:500,risk:null,corrected:true,recorded:false,visibleSince:null},{id:'preview-2',x:1020,y:500,risk:null,corrected:true,recorded:false,visibleSince:null}],rust:[],stations:[],particles:[],activeTarget:null,score:0,correct:0,timeLeft:null,stageLabel:'P-83'};
drawGame($('hero-canvas').getContext('2d'),preview,0);
renderMenu();
