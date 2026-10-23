/** Spatial treatment panel: the model owns progress; this view shows every treated patch. */
const W = 600, H = 240;
const INK = '#214b43';
const TOOL_NAMES = ['Jato d’água', 'Escova', 'Neutralizador', 'Pintura'];
const TOOL_VERBS = ['Varra a sujeira', 'Esfregue a ferrugem', 'Aplique nos três pontos', 'Cubra com o rolo'];
const TOOL_HINTS = [
  'Segure e passe o jato por toda a mancha. A sujeira sai onde a água toca.',
  'Segure e faça movimentos de ida e volta sobre cada parte enferrujada.',
  'Clique uma vez em cada círculo numerado para aplicar o neutralizador.',
  'Segure e arraste o rolo. Pinte as áreas ainda sem cobertura.'
];
const ICONS = [
  '<path d="M8 24h11v9H8zM19 25l15-11 7 8-17 11M13 34v11H5V29" fill="#82bcd0"/><path d="M40 18l7-5M43 24l8 1M40 30l8 6" fill="none" stroke="#5295b1"/>',
  '<path d="M18 30L38 9l9 9-20 21" fill="#c8955b"/><path d="M7 33l16-9 13 13-10 14z" fill="#e9d397"/><path d="M11 38l15 12M17 34l15 11M23 30l12 10" fill="none"/>',
  '<path d="M22 6h16v9l-3 4v7l10 17q3 8-6 8H19q-9 0-5-8l11-17v-7l-3-4z" fill="#b9d981"/><path d="M20 37h19" fill="none"/><circle cx="29" cy="44" r="3" fill="#72944a"/><path d="M27 9h7" fill="none"/>',
  '<path d="M9 9h35v15H9z" fill="#79b5a0"/><path d="M44 17h7v17H28v10" fill="none"/><path d="M24 43h8v12h-8z" fill="#d4a65f"/>'
];
function icon(n) { return `<svg viewBox="0 0 58 58" aria-hidden="true" fill="none" stroke="${INK}" stroke-width="2.7" stroke-linejoin="round" stroke-linecap="round">${ICONS[n]}</svg>`; }
function round(c,x,y,w,h,r,fill,stroke=null,width=2) { c.beginPath(); c.roundRect(x,y,w,h,r); if(fill){c.fillStyle=fill;c.fill();} if(stroke){c.lineWidth=width;c.strokeStyle=stroke;c.stroke();} }
function line(c,x1,y1,x2,y2,color=INK,width=2) { c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.strokeStyle=color;c.lineWidth=width;c.stroke(); }
function circle(c,x,y,r,fill,stroke=null,width=2) { c.beginPath();c.arc(x,y,r,0,Math.PI*2);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();} }
function label(c,text,x,y,size=12,color=INK,align='center') { c.fillStyle=color;c.font=`bold ${size}px "Trebuchet MS", sans-serif`;c.textAlign=align;c.textBaseline='middle';c.fillText(text,x,y); }
function check(c,x,y,color='#f5f7d9',scale=1) { c.beginPath();c.moveTo(x-7*scale,y);c.lineTo(x-2*scale,y+5*scale);c.lineTo(x+8*scale,y-6*scale);c.strokeStyle=color;c.lineWidth=3*scale;c.lineJoin='round';c.lineCap='round';c.stroke(); }
function cellBox(cell) { return {x:(cell.x-(cell.w||.046)/2)*W,y:(cell.y-(cell.h||.075)/2)*H,w:(cell.w||.046)*W,h:(cell.h||.075)*H}; }
function cellsPath(c,cells) { c.beginPath();for(const cell of cells){const b=cellBox(cell);c.roundRect(b.x-.6,b.y-.6,b.w+1.2,b.h+1.2,4);} }

export class RepairUI {
  constructor({getGame,host=document.getElementById('repair-content')}={}) {
    this.getGame=getGame;this.host=host;this.target=null;this.state=null;this.pointer=null;this.dragging=false;this.pointerId=null;this.lastStep=null;this.lastTool=null;this.disposed=false;
    this.mount();
  }
  mount() {
    if(!this.host || this.canvas)return;
    this.host.classList.add('repair-panel');
    this.host.innerHTML=`<div class="repair-tools" aria-label="Ferramentas de tratamento">${TOOL_NAMES.map((name,i)=>`<button type="button" class="repair-tool" data-repair-tool="${i}" aria-pressed="false" title="${name} — tecla ${i+1}"><kbd>${i+1}</kbd>${icon(i)}<span>${name}</span><em class="repair-tool-state" aria-hidden="true"></em></button>`).join('')}</div><div class="repair-action"><b data-repair-action>Selecione o jato d’água</b><span data-repair-step>ETAPA 1 / 4</span></div><div class="repair-surface"><canvas width="1200" height="480" tabindex="0" aria-label="Superfície para tratamento. Selecione uma ferramenta e siga as instruções abaixo."></canvas><span class="repair-surface-badge">ÁREA DE TRATAMENTO</span></div><p class="repair-instruction" data-repair-instruction></p><div class="repair-progress-label"><b data-repair-label>Área limpa</b><span data-repair-percent>0%</span></div><div class="repair-progress" role="progressbar" aria-label="Progresso da etapa de tratamento" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span></span></div><div class="repair-footnote"><span>1–4 · selecionar ferramenta</span><span>95% da área conclui a etapa</span></div><div class="repair-announcement" role="status" aria-live="polite"></div>`;
    this.canvas=this.host.querySelector('canvas');this.ctx=this.canvas.getContext('2d');this.buttons=[...this.host.querySelectorAll('[data-repair-tool]')];
    this.action=this.host.querySelector('[data-repair-action]');this.stepLabel=this.host.querySelector('[data-repair-step]');this.hint=this.host.querySelector('[data-repair-instruction]');this.progressLabel=this.host.querySelector('[data-repair-label]');this.percent=this.host.querySelector('[data-repair-percent]');this.meter=this.host.querySelector('.repair-progress');this.fill=this.meter.firstElementChild;this.announcement=this.host.querySelector('.repair-announcement');this.coverageNote=this.host.querySelector('.repair-footnote span:last-child');
    this.abort=new AbortController();const opts={signal:this.abort.signal};
    for(const btn of this.buttons)btn.addEventListener('click',()=>{this.release();this.getGame()?.chooseTool(Number(btn.dataset.repairTool));},opts);
    this.canvas.addEventListener('pointerdown',e=>this.pointerDown(e),opts);
    this.canvas.addEventListener('pointermove',e=>this.pointerMove(e),opts);
    for(const name of ['pointerup','pointercancel','lostpointercapture'])this.canvas.addEventListener(name,e=>{if(this.pointerId===null||e.pointerId===this.pointerId)this.release();},opts);
    this.canvas.addEventListener('pointerleave',()=>{if(!this.dragging){this.pointer=null;this.draw();}},opts);
    this.canvas.addEventListener('contextmenu',e=>e.preventDefault(),opts);
  }
  open(target,state) { this.release();this.target=target;this.lastStep=null;this.lastTool=null;this.pointer=null;this.update(state); }
  update(state) {
    if(this.disposed)return;
    const target=state?.activeTarget?.type==='repair' ? state.rust.find(point=>point.id===state.activeTarget.id) : null;
    if(!target){this.reset();return;}
    if(target.id!==this.target?.id || state.mode!=='playing' || this.lastStep!==target.step || this.lastTool!==state.selectedTool)this.release();
    this.target=target;this.state=state;
    const tool=state.selectedTool,step=Math.min(target.step,3),playing=state.mode==='playing';
    this.buttons.forEach((btn,i)=>{
      const done=i<target.step,active=i===tool,next=i===target.step;
      btn.disabled=!playing||done;btn.classList.toggle('is-done',done);btn.classList.toggle('is-active',active);btn.classList.toggle('is-next',next&&!active);btn.setAttribute('aria-pressed',String(active));btn.querySelector('em').textContent=done?'✓':next?'PRÓXIMA':'';
    });
    const pct=Math.round(Math.min(1,target.progress||0)*100);
    this.action.textContent=!playing?'Tratamento em pausa':tool===null?`Selecione: ${TOOL_NAMES[step]}`:TOOL_VERBS[step];
    this.stepLabel.textContent=`ETAPA ${step+1} / 4`;
    this.hint.textContent=TOOL_HINTS[step];this.coverageNote.textContent=step===2?'Aplique nos 3 pontos para concluir':'95% da área conclui a etapa';
    this.progressLabel.textContent=['Área limpa','Ferrugem removida','Pontos neutralizados','Área pintada'][step];
    this.percent.textContent=step===2?`${target.zones.filter(z=>z.done).length} / 3`:`${pct}%`;
    this.fill.style.width=`${pct}%`;this.meter.setAttribute('aria-valuenow',String(pct));this.meter.setAttribute('aria-valuetext',step===2?`${target.zones.filter(z=>z.done).length} de 3 pontos neutralizados`:`${pct}% da área`);
    this.canvas.setAttribute('aria-label',`${target.label}. ${TOOL_HINTS[step]} Progresso: ${this.percent.textContent}.`);
    this.canvas.classList.toggle('has-tool',tool!==null&&playing);this.host.classList.toggle('repair-paused',!playing);
    if(this.lastStep!==target.step)this.announcement.textContent=`Etapa ${step+1}: ${TOOL_NAMES[step]}. ${TOOL_HINTS[step]}`;
    this.lastStep=target.step;this.lastTool=tool;this.draw();
  }
  position(e) { const r=this.canvas.getBoundingClientRect();return {x:(e.clientX-r.left)/r.width,y:(e.clientY-r.top)/r.height}; }
  canWork() { const s=this.getGame()?.getSnapshot();return s?.mode==='playing'&&s.activeTarget?.type==='repair'&&s.activeTarget.id===this.target?.id&&s.selectedTool!==null; }
  pointerDown(e) {
    if(e.button>0||!this.canWork()||this.dragging)return;
    e.preventDefault();this.pointer=this.position(e);this.pointerId=e.pointerId;this.dragging=true;this.canvas.setPointerCapture(e.pointerId);this.canvas.focus({preventScroll:true});
    this.getGame()?.repairGesture({type:'start',...this.pointer});this.draw();
  }
  pointerMove(e) {
    if(this.dragging&&e.pointerId!==this.pointerId)return;
    this.pointer=this.position(e);
    if(this.dragging&&this.canWork()){e.preventDefault();this.getGame()?.repairGesture({type:'move',...this.pointer});}
    this.draw();
  }
  release() {
    if(!this.dragging)return;
    const id=this.pointerId;this.dragging=false;this.pointerId=null;
    this.getGame()?.repairGesture({type:'end',x:this.pointer?.x||0,y:this.pointer?.y||0});
    if(id!==null&&this.canvas?.hasPointerCapture(id))this.canvas.releasePointerCapture(id);
  }
  reset() { this.release();this.target=null;this.state=null;this.pointer=null;this.lastStep=null;this.lastTool=null; }
  dispose() { this.reset();this.abort?.abort();this.disposed=true; }
  draw() {
    if(!this.ctx||!this.target)return;
    const c=this.ctx,t=this.target,s=this.state;
    c.setTransform(2,0,0,2,0,0);c.clearRect(0,0,W,H);c.lineCap='round';
    const bg=c.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#dfe6cb');bg.addColorStop(1,'#b9d0bf');c.fillStyle=bg;c.fillRect(0,0,W,H);
    for(let i=0;i<8;i++)line(c,i*92-80,0,i*92+160,H,'#f4f3de3b',18);
    this.drawEquipment(c,t);
    this.drawTreatment(c,t);
    if(s?.mode==='playing'&&s.selectedTool!==null&&this.pointer)this.drawCursor(c,s.selectedTool,this.pointer,this.dragging);
    if(s?.mode!=='playing') {c.fillStyle='#eff0da80';c.fillRect(0,0,W,H);round(c,212,95,176,45,10,'#234d43');label(c,'EM PAUSA',300,118,16,'#f9f2d2');}
  }
  drawEquipment(c,t) {
    const metal=c.createLinearGradient(0,45,0,195);metal.addColorStop(0,'#75968b');metal.addColorStop(.23,'#cfe0c8');metal.addColorStop(.55,'#a5c1b2');metal.addColorStop(1,'#6d9388');
    c.fillStyle='#426e5d29';c.beginPath();c.ellipse(300,211,242,12,0,0,Math.PI*2);c.fill();
    if(t.kind==='vessel') {
      round(c,130,176,35,35,3,'#6d8c80',INK,3);round(c,435,176,35,35,3,'#6d8c80',INK,3);round(c,65,40,470,157,78,metal,INK,3);
      line(c,154,49,154,185,'#718f82',6);line(c,446,49,446,185,'#718f82',6);
      round(c,273,21,55,24,5,'#b8cbbb',INK,3);round(c,264,20,73,9,3,'#78998c',INK,2);
      for(const x of [154,446])for(const y of [63,88,148,173])circle(c,x,y,3,'#dce7c8',INK,1);
      label(c,'VASO DE PRESSÃO',300,219,10,'#456c5b');
    } else if(t.kind==='support') {
      round(c,263,72,74,100,3,metal,INK,3);round(c,84,43,432,56,5,metal,INK,3);round(c,84,143,432,56,5,metal,INK,3);
      line(c,90,49,510,49,'#e0e8c7',4);line(c,90,149,510,149,'#e0e8c7',4);
      for(const x of [104,496])for(const y of [71,171]){circle(c,x,y,6,'#d7e0bc',INK,2);line(c,x-3,y,x+3,y,INK,1.5);}
      label(c,'SUPORTE ESTRUTURAL',300,224,10,'#456c5b');
    } else {
      round(c,22,48,556,143,22,metal,INK,3);
      for(const x of [73,508]) {round(c,x,36,20,167,5,'#78998b',INK,3);round(c,x+4,41,8,157,2,'#d5e2bf');for(const y of [53,185])circle(c,x+10,y,4,'#e6e8c7',INK,1.5);}
      line(c,100,58,496,58,'#edf0d5',5);label(c,'LINHA DE PROCESSO',300,218,10,'#456c5b');
    }
  }
  drawTreatment(c,t) {
    const cells=t.cells||[];
    // Every patch maps directly to a model cell; retracing a finished patch cannot advance coverage.
    const rusty=cells.filter(cell=>!cell.brushed),dirty=cells.filter(cell=>!cell.clean),painted=cells.filter(cell=>cell.painted);
    const rust=c.createLinearGradient(0,50,0,185);rust.addColorStop(0,'#cb8546');rust.addColorStop(.5,'#ad5d32');rust.addColorStop(1,'#854a30');
    cellsPath(c,rusty);c.fillStyle=rust;c.fill();
    for(let i=0;i<cells.length;i++) {
      const cell=cells[i],x=cell.x*W,y=cell.y*H;
      if(!cell.brushed) {
        if(cell.brushMask){const b=cellBox(cell);c.fillStyle='#dfb77d80';c.fillRect(b.x,b.y,b.w,b.h);line(c,x-9,y-4,x+9,y-6,'#a6bba4',2);line(c,x-8,y+3,x+8,y+1,'#a6bba4',2);}
        else {circle(c,x+Math.sin(i*2)*7,y+Math.cos(i*3)*4,2+(i%3)*.5,i%2?'#773f2c':'#e6a259');if(i%3===0)line(c,x-5,y-4,x+3,y-6,'#da9253',2);}
      } else if(!cell.painted) {line(c,x-7,y+4,x+5,y-4,'#e5ebd0',1.5);}
    }
    cellsPath(c,dirty);c.fillStyle='#727b5de6';c.fill();
    for(let i=0;i<dirty.length;i++){const cell=dirty[i];circle(c,cell.x*W-5,cell.y*H+3,2.1,i%2?'#a3a581':'#535f4c');}
    if(t.step>=2)for(const zone of t.zones||[])if(zone.done){c.save();cellsPath(c,cells);c.clip();circle(c,zone.x*W,zone.y*H,39,'#bfdb8c70');c.restore();}
    cellsPath(c,painted);const paint=c.createLinearGradient(0,55,0,190);paint.addColorStop(0,'#a2d7b5');paint.addColorStop(.5,'#66af98');paint.addColorStop(1,'#3d8b80');c.fillStyle=paint;c.fill();
    for(let i=0;i<painted.length;i++){const cell=painted[i];if(i%3===0)line(c,cell.x*W-8,cell.y*H-5,cell.x*W+5,cell.y*H-5,'#c2e3c16b',2);}
    // Outline only exposed edges, avoiding a visual grid through the treatment area.
    c.save();c.setLineDash([4,4]);c.strokeStyle='#fff6c9';c.lineWidth=1.7;c.beginPath();
    for(const cell of cells){const x=cell.x*W,y=cell.y*H,hw=.045*W/2,hh=.08*H/2;const has=(dx,dy)=>cells.some(other=>Math.abs(other.x-cell.x-dx)<.004&&Math.abs(other.y-cell.y-dy)<.004);if(!has(-.045,0)){c.moveTo(x-hw,y-hh);c.lineTo(x-hw,y+hh);}if(!has(.045,0)){c.moveTo(x+hw,y-hh);c.lineTo(x+hw,y+hh);}if(!has(0,-.08)){c.moveTo(x-hw,y-hh);c.lineTo(x+hw,y-hh);}if(!has(0,.08)){c.moveTo(x-hw,y+hh);c.lineTo(x+hw,y+hh);}}
    c.stroke();c.restore();
    if(t.step===2)for(let i=0;i<(t.zones||[]).length;i++) {const zone=t.zones[i],x=zone.x*W,y=zone.y*H,r=(zone.r||.052)*W;circle(c,x,y,r,zone.done?'#7da65fe6':'#faf1c2e8',zone.done?'#356344':'#648753',3);if(zone.done)check(c,x,y,'#f3f6d6',1.5);else{label(c,String(i+1),x,y-2,20,'#315c43');label(c,'APLICAR',x,y+15,7,'#6c8055');}}
  }
  drawCursor(c,tool,p,pressed) {
    const x=p.x*W,y=p.y*H;if(x<0||x>W||y<0||y>H)return;
    c.save();circle(c,x,y,tool===2?16:30,pressed?['#73c4d730','#dfb26c25','#cbe49b40','#79bca02c'][tool]:null,'#f8f6d6',1.7);c.translate(x,y);c.rotate(tool===1?-.3:tool===3?.1:0);
    if(tool===0){line(c,-22,21,-7,6,'#315e61',8);line(c,-7,6,3,-3,'#80bdcc',12);if(pressed){for(let i=-2;i<=2;i++){line(c,5,-5,16+i*5,-25-Math.abs(i)*2,'#b7e6e4',2);circle(c,14+i*7,-31-(i%2)*5,2.5,'#d6f5e9');}}}
    else if(tool===1){line(c,0,3,22,25,'#7e603f',7);round(c,-18,-12,36,20,3,'#e6d497',INK,2);for(let i=0;i<6;i++)line(c,-14+i*5,-12,-14+i*5,-3,'#8d7855',2);}
    else if(tool===2){round(c,5,-31,17,26,5,'#bad783',INK,2);round(c,9,-36,9,7,1,'#6c9565',INK,1.5);if(pressed)circle(c,0,5,7,'#d9efae','#8ca95a',1);}
    else{line(c,0,4,0,22,'#315b4d',3);line(c,0,22,13,22,'#315b4d',3);round(c,9,20,8,17,2,'#d5a668',INK,1.5);round(c,-23,-12,46,20,5,'#75b79d',INK,2);line(c,-16,-7,16,-7,'#b4dfb4',3);}
    c.restore();
  }
}
