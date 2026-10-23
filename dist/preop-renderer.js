// Original Canvas artwork for the commissioning scavenger hunt.
import { canReachPreop } from './preop-model.js';
const INK = '#203f42';
const FONT = '"Trebuchet MS", "DejaVu Sans", sans-serif';
const PALETTE = {
  oil: { color: '#c48d3d', pale: '#fae8b1', dark: '#79522b', name: 'ÓLEO', symbol: 'O' },
  gas: { color: '#8a8bb6', pale: '#e2ddf0', dark: '#55516f', name: 'GÁS', symbol: 'G' },
  water: { color: '#5a9fb0', pale: '#cce9e8', dark: '#2b6879', name: 'ÁGUA', symbol: 'A' },
};
const motionQuery = typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
const reduced = s => s.reducedMotion === true || Boolean(motionQuery?.matches);
function rr(c,x,y,w,h,r,fill,stroke=INK,lw=2){c.beginPath();c.roundRect(x,y,w,h,r);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=lw;c.stroke();}}
function ellipse(c,x,y,rx,ry,fill,stroke=null,lw=2){c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=lw;c.stroke();}}
function path(c,pts,fill,stroke=INK,lw=2,close=true){c.beginPath();pts.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));if(close)c.closePath();if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=lw;c.stroke();}}
function line(c,x,y,xx,yy,color=INK,lw=2){path(c,[[x,y],[xx,yy]],null,color,lw,false);}
function label(c,t,x,y,size=12,color=INK,align='center',weight=800){c.font=`${weight} ${size}px ${FONT}`;c.fillStyle=color;c.textAlign=align;c.textBaseline='middle';c.fillText(t,x,y);}
function check(c,x,y,r=11){ellipse(c,x,y,r,r,'#bedb85',INK,2);path(c,[[x-r*.5,y],[x-r*.1,y+r*.38],[x+r*.52,y-r*.38]],null,INK,2.5,false);}
function bolt(c,x,y){ellipse(c,x,y,2.5,2.5,'#d5ddbd',INK,1);line(c,x-1,y+1,x+1,y-1,INK,1);}
function withinView(s,x,pad=130){return x>(s.camera||0)-pad&&x<(s.camera||0)+1200+pad;}
function closeEnough(s,t){return Boolean(s.player)&&canReachPreop(s.player,t);}
function prompt(c,s,t,words,y){
  if(!closeEnough(s,t)||s.activeTarget||s.preop.closing)return;
  const width=Math.max(108,Math.min(224,words.length*6.6+39));
  rr(c,t.x-width/2,y,width,26,8,'#fff2be',INK,2);
  rr(c,t.x-width/2+5,y+4,18,18,4,'#295c5c',null);label(c,'E',t.x-width/2+14,y+13,10,'#fff8da');
  label(c,words,t.x+12,y+13,10,'#244d4a');
}
function marker(c,x,y,color,content,t,animate=true){
  const lift=animate?Math.sin(t*2.3)*2:0;
  ellipse(c,x,y+lift,16,16,'#fff4cc',color,3);label(c,content,x,y+lift,14,color);
  path(c,[[x-4,y+20+lift],[x,y+25+lift],[x+4,y+20+lift]],color,null);
}
function board(c,s){
  const p=s.preop,b=p.board,x=b.x,y=b.y,all=p.stations.every(t=>t.done);
  c.save();c.translate(x,y);
  ellipse(c,0,53,119,10,'#183d3728');
  line(c,-90,15,-90,60,'#456c62',9);line(c,90,15,90,60,'#456c62',9);
  rr(c,-126,-169,252,204,12,'#547d70',INK,3);
  rr(c,-119,-161,238,179,7,'#eef1d2',INK,2);
  rr(c,-115,-157,230,29,5,'#315f59',null);label(c,'QUADRO DE FECHAMENTO',0,-142,11,'#f3ecc8');
  label(c,'P-83 / PRÉ-OP',0,-116,9,'#50756a');
  p.stations.forEach((station,i)=>{
    const theme=PALETTE[station.id],yy=-100+i*31;
    rr(c,-106,yy,212,27,5,station.done?'#d3e7af':theme.pale,'#8eab91',1);
    ellipse(c,-91,yy+13,8,8,theme.color,null);label(c,theme.symbol,-91,yy+13,9,'#fff9df');
    label(c,theme.name,-76,yy+13,9,theme.dark,'left');
    label(c,station.done?'PRONTO':'PENDENTE',93,yy+13,8,station.done?'#356f4e':'#705e43','right');
    if(station.done)check(c,40,yy+13,7);
  });
  rr(c,-106,-3,212,26,5,all?'#bfdc82':'#d7dfc1',INK,1.5);label(c,all?'PRONTO PARA ENCERRAR':'3 SISTEMAS · UM SÓ TIME',0,10,10);
  for(const xx of [-116,116]){bolt(c,xx,-149);bolt(c,xx,24);}
  c.restore();
  prompt(c,s,b,all?'Fechar as TAPs':'Consultar pendências',y-205);
}
function statusRibbon(c,station,theme,y){
  const accepted=station.acceptedIds?.length||0,total=station.requiredIds?.length||1;
  rr(c,-76,y,152,23,6,station.done?'#d1e8aa':theme.pale,station.done?'#4d8059':theme.dark,1.7);
  label(c,station.done?'PRONTO PARA FECHAR':accepted?`${accepted} / ${total} EVIDÊNCIAS`:'PENDÊNCIA ABERTA',0,y+12,9,station.done?'#326348':theme.dark);
}
function oilEquipment(c,theme){
  rr(c,-81,-76,161,70,24,'#7cad9a',INK,3);ellipse(c,-58,-41,23,35,'#a7c7a5',INK,3);
  rr(c,-39,-88,59,24,6,'#cad2ae',INK,2);line(c,-7,-88,-7,-112,'#3a6e64',8);ellipse(c,-7,-114,19,6,theme.color,INK,2);
  rr(c,-77,-4,154,15,3,'#607b69',INK,2);line(c,-61,10,-61,60,'#486b5f',9);line(c,60,10,60,60,'#486b5f',9);
  for(let i=0;i<5;i++)line(c,-25+i*17,-65,-25+i*17,-23,'#568775',2);
  rr(c,18,-62,58,28,4,theme.pale,theme.dark,2);label(c,'TAG',47,-47,9,theme.dark);
}
function gasEquipment(c,theme,points=[]){
  rr(c,-69,-115,138,128,10,'#849e9f',INK,3);rr(c,-57,-102,114,59,5,'#294f56',INK,2);
  for(let j=0;j<3;j++){ellipse(c,-32+j*32,-73,8,8,points[j]?.recorded?'#bddb83':'#8b9f9c',INK,1.5);label(c,String(j+1),-32+j*32,-73,8);}
  path(c,[[-44,-55],[-28,-63],[-12,-54],[4,-64],[19,-56],[39,-63]],null,'#cae28e',2,false);
  rr(c,-57,-34,71,25,5,theme.pale,INK,1.5);label(c,'GÁS / CAMPO',-21,-21,8,theme.dark);
  ellipse(c,39,-23,10,10,'#eed88d',INK,2);line(c,-48,13,-48,60,'#526e64',8);line(c,48,13,48,60,'#526e64',8);
}
function waterEquipment(c,theme){
  line(c,-90,-31,90,-31,'#325d63',31);line(c,-90,-31,90,-31,'#80b4af',22);
  rr(c,-36,-63,72,68,13,'#a9c9ae',INK,3);line(c,0,-64,0,-94,INK,7);ellipse(c,0,-99,35,10,theme.color,INK,3);line(c,-32,-99,32,-99,INK,2);
  rr(c,-25,-48,50,29,4,theme.pale,theme.dark,1.5);label(c,'ÁGUA',0,-33,9,theme.dark);
  for(const xx of [-72,72]){rr(c,xx-5,-52,10,42,2,'#bed2b4',INK,2);line(c,xx,-10,xx,60,'#4a7168',7);}
}
function station(c,s,st){
  const theme=PALETTE[st.id]||PALETTE.oil;c.save();c.translate(st.x,st.y);
  ellipse(c,0,55,102,9,'#183d3728');
  if(st.id==='oil')oilEquipment(c,theme);else if(st.id==='gas')gasEquipment(c,theme,s.preop.fieldPoints);else waterEquipment(c,theme);
  rr(c,-91,-171,182,32,7,theme.pale,theme.dark,2);ellipse(c,-70,-155,10,10,theme.color,null);label(c,theme.symbol,-70,-155,10,'#fff8e1');label(c,`SISTEMA DE ${theme.name}`,9,-155,11,theme.dark);
  rr(c,-82,12,164,22,4,'#edf0d2',INK,1.5);label(c,st.code||theme.name,0,23,st.id==='water'?9:11,theme.dark);
  statusRibbon(c,st,theme,38);
  if(st.done){check(c,0,-191,15);}else marker(c,0,-199,theme.color,'!',s.elapsed||0,!reduced(s));
  c.restore();
  prompt(c,s,st,st.done?'Conferir prontidão':'Entregar evidência',st.y-239);
}
function paper(c,x,y,theme,kind='document',angle=0){
  c.save();c.translate(x,y);c.rotate(angle);
  if(kind==='tag'){
    rr(c,-29,-15,58,30,4,theme.pale,theme.dark,2);ellipse(c,-21,0,3,3,'#f8f0d0',theme.dark,1);label(c,'TAG',3,-4,9,theme.dark);line(c,-7,6,22,6,theme.dark,1.5);
  }else{
    path(c,[[-21,-28],[11,-28],[21,-18],[21,28],[-21,28]],'#fff8d9',INK,1.8);path(c,[[11,-28],[11,-18],[21,-18]],theme.pale,INK,1.3);
    rr(c,-16,-22,24,8,2,theme.color,null);label(c,kind==='revision'?'REV.':'FIC',-4,-18,5,'#fff8de');
    for(let i=0;i<3;i++)line(c,-13,-5+i*7,13-(i%2)*7,-5+i*7,'#8d9c82',1.5);
    path(c,[[-11,19],[-4,14],[-1,19],[8,12]],null,theme.dark,1.4,false);
  }c.restore();
}
function rack(c,s,r){
  if(r.available===false)return;
  const theme=r.id==='tags'?PALETTE.oil:r.id==='documents'?PALETTE.water:PALETTE[s.preop.radio?.targetId]||PALETTE.gas;
  const isRevision=r.id==='revision',available=r.itemIds?.filter(id=>{const item=s.preop.items.find(i=>i.id===id);return item?.available&&!item.collected&&!item.delivered;}).length||0;
  c.save();c.translate(r.x,r.y);
  line(c,-53,14,-53,60,'#5c7966',8);line(c,53,14,53,60,'#5c7966',8);rr(c,-71,3,142,16,4,'#d4cba5',INK,2.5);
  rr(c,-66,-96,132,85,6,isRevision?'#f0d78d':'#dbe0bf',INK,2);
  label(c,isRevision?'ÚLTIMA REVISÃO':r.id==='tags'?'PLACAS / TAGS':'DOCUMENTAÇÃO',0,-82,9,theme.dark);
  const positions=isRevision?[0]:[-35,0,35];positions.forEach((x,i)=>paper(c,x,-36,theme,r.id==='tags'?'tag':isRevision?'revision':'document',(i-1)*.05));
  if(!available){c.save();c.globalAlpha=.85;rr(c,-66,-57,132,31,4,'#e9ebd6',null);label(c,'NA PRANCHETA / ENTREGUE',0,-41,6.5,'#567467');c.restore();}
  rr(c,-71,23,142,22,4,theme.pale,theme.dark,1.5);label(c,isRevision?'+15s · RÁDIO':r.id==='tags'?'CONFIRA O CÓDIGO':'REVISÃO + ASSINATURA',0,35,8,theme.dark);
  if(available)marker(c,0,-124,theme.color,isRevision?'!':'↓',s.elapsed||0,!reduced(s));
  c.restore();prompt(c,s,r,isRevision?'Recolher revisão':'Examinar opções',r.y-168);
}
function fieldPoint(c,s,p,index){
  const theme=PALETTE.gas;c.save();c.translate(p.x,p.y);
  const foot=p.y<400?40:60;
  line(c,0,11,0,foot,'#57756b',7);
  rr(c,-34,-29,68,47,8,p.recorded?'#c7df9f':theme.pale,theme.dark,2.5);
  rr(c,-24,-20,48,21,4,'#355b60',null);
  if(p.recorded)check(c,0,-9,8);else{ellipse(c,0,-10,8,8,'#bed3b3',null);ellipse(c,0,-10,4,4,theme.dark,null);rr(c,-11,-23,10,4,1,'#bed3b3',null);}
  label(c,`CAMPO ${index+1}`,0,10,7,theme.dark);
  if(p.recorded)check(c,0,-49,12);else marker(c,0,-52,theme.color,String(index+1),s.elapsed||0,!reduced(s));
  const evidence=s.preop.items.find(item=>item.id==='gas-evidence');
  const recollect=s.preop.fieldPoints.every(point=>point.recorded)&&evidence?.available&&!evidence.collected&&!evidence.delivered;
  c.restore();prompt(c,s,p,recollect?'Recolher registro':p.recorded?'Já registrado':'Registrar evidência',p.y-94);
}
function directional(c,s){
  const cam=s.camera||0;
  for(const [x,title] of [[415,'ÓLEO →'],[1230,'GÁS →'],[2800,'ÁGUA →']]){
    if(!withinView(s,x,100))continue;rr(c,x-50,203,100,27,5,'#315f59',INK,1.5);label(c,title,x,217,10,'#f0efd0');
  }
  if(cam>500){rr(c,cam+28,82,147,29,7,'#edf0d3e8','#6e9182',1.5);label(c,'← QUADRO INICIAL',cam+101,97,9,'#345f54');}
}
export function drawPreopScene(c,s){
  if(!s.preop)return;c.save();c.translate(-(s.camera||0),0);
  directional(c,s);
  if(withinView(s,s.preop.board.x,150))board(c,s);
  for(const st of s.preop.stations)if(withinView(s,st.x))station(c,s,st);
  for(const r of s.preop.racks)if(withinView(s,r.x))rack(c,s,r);
  for(const [i,p] of s.preop.fieldPoints.entries())if(withinView(s,p.x,80))fieldPoint(c,s,p,i);
  c.restore();
}
function radio(c,s){
  const r=s.preop.radio;if(!r?.triggered||s.elapsed>=r.until)return;
  const theme=PALETTE[r.targetId]||PALETTE.gas;
  rr(c,326,67,548,88,12,'#fff0c3',INK,2.5);rr(c,344,82,38,48,7,'#375f62',INK,2);line(c,352,83,352,70,INK,3);
  rr(c,350,88,26,13,3,'#c6df95',null);for(let i=0;i<3;i++)line(c,352,109+i*5,373,109+i*5,'#adc3a0',1.5);
  label(c,'CHAMADA NO RÁDIO',404,85,9,theme.dark,'left');label(c,'Chegou a última revisão!',404,108,19,INK,'left');
  label(c,`Sistema de ${theme.name.toLowerCase()} · busque a revisão sinalizada · +15s`,404,135,10,'#566d57','left');
}
function closure(c,s){
  const close=s.preop.closing;if(!close)return;
  const progress=Math.min(1,(close.elapsed||0)/(close.duration||2.4));
  c.save();c.fillStyle='#173e4488';c.fillRect(0,0,1200,600);
  rr(c,288,162,624,276,18,'#f2f0d0',INK,3);label(c,'FECHAMENTO DAS TAPs',600,196,13,'#4e7567');
  const names=['Assinaturas','Digitalização','Registro no FIC'];
  for(let i=0;i<3;i++){
    const x=426+i*174,done=progress>=(i+1)/3,active=progress>=i/3;
    ellipse(c,x,267,30,30,done?'#bddb83':active?'#f4d67d':'#d6ddbf',INK,2);
    if(done)check(c,x,267,23);else if(i===0){path(c,[[x-14,276],[x+9,251],[x+15,257],[x-8,282]],'#5b8d82',INK,2);line(c,x-16,284,x+16,284,INK,2);}
    else if(i===1){rr(c,x-20,258,40,22,4,'#6f9d92',INK,2);rr(c,x-14,247,28,24,2,'#fff8d7',INK,1.5);if(active)line(c,x-12,251+((progress*3)%1)*16,x+12,251+((progress*3)%1)*16,'#73a661',2);}
    else{rr(c,x-20,251,40,29,4,'#375f62',INK,2);label(c,'FIC',x,266,12,'#d4e5b2');line(c,x,280,x,287,INK,3);line(c,x-13,287,x+13,287,INK,3);}
    label(c,names[i],x,315,11,active?'#315c54':'#7b8d76');
    if(i<2)label(c,'→',x+87,268,24,'#7a9e7b');
  }
  rr(c,362,346,476,10,5,'#d1dcba',null);if(progress>0)rr(c,362,346,476*progress,10,5,'#7cab61',null);
  label(c,'TAP aprovada (FIC concluída)',600,389,21,'#35664f');label(c,'Três sistemas. Pendências resolvidas. Equipe pronta!',600,416,10,'#5c7767');c.restore();
}
export function drawPreopOverlay(c,s){
  if(!s.preop)return;c.save();rr(c,20,12,268,32,8,'#edf0d3eb','#6e9182',1.5);label(c,'P-83 · PRÉ-OP · CAÇA ÀS PENDÊNCIAS',154,28,9.5,'#345f54');
  radio(c,s);closure(c,s);c.restore();
}
