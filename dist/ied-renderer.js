// Original IED machine characters and the two live challenge instruments.
// Logical sizes: world 1200 × 600; challenge 800 × 340.
const INK='#203f42',GREEN='#a8d878',CREAM='#fff3ca',TEAL='#6ea79e';
const TAU=Math.PI*2;
function r(c,x,y,w,h,rad,fill,stroke=INK,lw=2){c.beginPath();c.roundRect(x,y,w,h,rad);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=lw;c.stroke();}}
function e(c,x,y,rx,ry,fill,stroke=null,lw=2){c.beginPath();c.ellipse(x,y,rx,ry,0,0,TAU);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=lw;c.stroke();}}
function p(c,points,fill,stroke=INK,lw=2,close=true){c.beginPath();points.forEach((v,i)=>i?c.lineTo(...v):c.moveTo(...v));if(close)c.closePath();if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=lw;c.lineJoin='round';c.lineCap='round';c.stroke();}}
function l(c,x,y,xx,yy,color=INK,lw=2){p(c,[[x,y],[xx,yy]],null,color,lw,false);}
function t(c,value,x,y,size=12,color=INK,align='center',weight=800){c.font=`${weight} ${size}px "Trebuchet MS", Arial, sans-serif`;c.textAlign=align;c.textBaseline='middle';c.fillStyle=color;c.fillText(value,x,y);}
function clamp(v,min,max){return Math.max(min,Math.min(max,v));}
function bolt(c,x,y,rad=3){e(c,x,y,rad,rad,'#c4d0b3',INK,1.3);l(c,x-rad*.5,y+rad*.5,x+rad*.5,y-rad*.5,INK,1);}
function check(c,x,y,rad=12){e(c,x,y,rad,rad,GREEN,INK,2);p(c,[[x-rad*.5,y],[x-rad*.1,y+rad*.35],[x+rad*.5,y-rad*.4]],null,INK,2.5,false);}
function gauge(c,x,y,rad,good=false){
  e(c,x,y,rad,rad,'#f4f0d6',INK,2);c.beginPath();c.arc(x,y,rad*.67,-Math.PI*.83,-Math.PI*.17);c.strokeStyle=good?'#83b86a':'#cf9560';c.lineWidth=4;c.stroke();
  const a=good?-1.6:-.7;l(c,x,y,x+Math.cos(a)*rad*.62,y+Math.sin(a)*rad*.62,INK,2);e(c,x,y,2,2,INK);
}
function machineFace(c,x,y,done=false,size=1){
  c.save();c.translate(x,y);c.scale(size,size);
  e(c,-12,-4,9,11,'#fff9df',INK,1.7);e(c,12,-4,9,11,'#fff9df',INK,1.7);e(c,-10,-2,3.2,4.7,INK);e(c,14,-2,3.2,4.7,INK);
  l(c,-21,-18,-4,done?-18:-21,INK,2.5);l(c,4,done?-18:-21,21,-18,INK,2.5);
  c.beginPath();c.moveTo(-12,14);c.quadraticCurveTo(0,done?29:8,12,14);c.strokeStyle=INK;c.lineWidth=2.5;c.stroke();
  if(done){e(c,-24,11,4,2.5,'#d6e7b2');e(c,24,11,4,2.5,'#d6e7b2');}
  c.restore();
}
function motorPump(c,done){
  r(c,-99,0,198,16,4,'#648d79',INK,2.5);r(c,-86,-60,76,59,12,done?'#80b890':'#7eaeb2',INK,2.5);
  for(let k=0;k<5;k++)l(c,-79+k*12,-51,-79+k*12,-10,done?'#57896b':'#4e868d',3);
  r(c,-69,-77,36,17,4,'#a3c2af',INK,2);bolt(c,-62,-69);bolt(c,-39,-69);
  e(c,-47,-28,31,32,done?'#a4cf91':'#b4d6c3',INK,2.5);machineFace(c,-47,-29,done,.82);
  r(c,-10,-35,41,15,4,'#d0c394',INK,2);for(let k=0;k<3;k++)l(c,1+k*9,-34,1+k*9,-21,'#7e8d75',2);
  e(c,61,-28,34,34,done?'#8bc4a0':'#e4b164',INK,2.5);e(c,61,-28,15,15,done?'#66a58c':'#bd8450',INK,2);e(c,61,-28,5,5,'#e8ddae',INK,1.5);
  r(c,62,-80,19,34,5,done?'#8bc4a0':'#dfad63',INK,2);r(c,53,-87,37,11,3,'#c4d0ab',INK,2);bolt(c,58,-81,2);bolt(c,85,-81,2);
  r(c,84,-35,20,16,3,done?'#8bc4a0':'#dfad63',INK,2);r(c,98,-42,9,30,2,'#c5d0ae',INK,2);
  for(const x of [-80,-20,42,83])bolt(c,x,8);
}
function compressor(c,done){
  r(c,-99,5,198,16,4,'#5b867d',INK,2.5);
  r(c,-91,-66,183,71,18,done?'#80b89c':'#7ca7b9',INK,2.5);r(c,-82,-57,164,15,7,'#d1e0bd',null);
  for(let k=0;k<5;k++)l(c,39+k*9,-38,39+k*9,-5,done?'#558f76':'#4c7e93',3);
  r(c,-77,-88,46,26,6,'#92bcae',INK,2);r(c,21,-89,46,26,6,'#93bcb0',INK,2);
  r(c,-70,-94,32,9,2,'#c7d6b4',INK,1.5);r(c,28,-95,32,9,2,'#c7d6b4',INK,1.5);
  l(c,-52,-94,-52,-108,INK,5);l(c,-52,-108,43,-108,INK,5);l(c,43,-108,43,-95,INK,5);
  gauge(c,44,-122,15,done);e(c,-34,-28,31,31,done?'#a9d4a6':'#c7dfd6',INK,2.5);machineFace(c,-34,-27,done,.92);
  for(const x of [-81,-20,38,82])bolt(c,x,13);
}
function bigSet(c,done){
  r(c,-104,7,208,18,4,'#607e70',INK,2.5);
  r(c,-97,-68,78,75,13,done?'#81bba3':'#dba65d',INK,2.5);r(c,17,-84,82,91,17,done?'#83b9a4':'#d6b46b',INK,2.5);
  r(c,-18,-40,35,25,5,'#c3ceb0',INK,2);for(let k=0;k<4;k++)l(c,-11+k*8,-38,-11+k*8,-17,'#6b8e7b',2);
  e(c,-58,-31,32,33,done?'#add1a4':'#eac990',INK,2.5);machineFace(c,-58,-30,done,.93);
  e(c,58,-39,34,35,done?'#a7cfa6':'#ecd59d',INK,2.5);
  for(let i=0;i<8;i++){const a=i*TAU/8;bolt(c,58+Math.cos(a)*26,-39+Math.sin(a)*26,2.5);}
  e(c,58,-39,17,18,done?'#6da68f':'#b88d54',INK,2);r(c,45,-104,28,21,4,'#a8c8b1',INK,2);gauge(c,58,-119,15,done);
  for(const x of [-86,-33,35,87])bolt(c,x,16);
}
function bubble(c,x,y,value,done){
  const w=272;r(c,x-w/2,y-17,w,34,10,done?'#e7efc5':'#fff1c8',INK,2);
  p(c,[[x-4,y+17],[x+6,y+26],[x+15,y+17]],done?'#e7efc5':'#fff1c8',INK,2);l(c,x-2,y+17,x+13,y+17,done?'#e7efc5':'#fff1c8',3);
  t(c,value,x,y,10.7);
}
function machine(c,m,index,elapsed){
  const done=m.phase==='done',sync=m.phase==='sync';c.save();c.translate(m.x,m.y);
  const platformOffset=500-m.y;
  r(c,-100,platformOffset-15,200,15,3,'#6f8975',INK,2.5);for(const x of [-80,80]){l(c,x,17,x,platformOffset-15,'#3e6157',10);bolt(c,x,platformOffset-8);}
  c.save();const amplitude=done?0:clamp(Number(m.vibration)||.7,.15,1.4)*(sync?1.4:2.5);c.translate(Math.sin(elapsed*31+index)*amplitude,Math.sin(elapsed*37+index)*amplitude*.65);
  if(index===0)motorPump(c,done);else if(index===1)compressor(c,done);else bigSet(c,done);c.restore();
  const quips=['Estou desalinhado emocionalmente!','Essa vibração não é entusiasmo!','Meu ritmo precisa de uma ajudinha!'];
  bubble(c,0,index===0?-146:-190,done?'Agora estamos na mesma rotação!':sync?'Quase lá... segura esse ritmo!':quips[index%3],done);
  const labelY=index===0?-107:-151;
  r(c,-83,labelY-12,166,24,7,done?'#4d8972':'#456e6a',INK,1.5);t(c,`${String(index+1).padStart(2,'0')} · ${m.label||['MOTOR + BOMBA','COMPRESSOR','GRANDE CONJUNTO'][index]}`,0,labelY,10,'#f4f1cf');
  if(!done){
    for(const side of [-1,1])for(let k=0;k<2;k++){c.beginPath();c.arc(side*(111+k*8),-29,15+k*4,side>0?-.7:Math.PI-.7,side>0?.7:Math.PI+.7);c.strokeStyle='#bc8c4e';c.lineWidth=2;c.stroke();}
    r(c,-70,33,140,25,7,'#f2d783',INK,2);t(c,sync?'AJUSTAR O RITMO':'ALINHAR EIXOS',0,46,10.5);
  }else{
    check(c,0,43,14);t(c,'ESTÁVEL',0,72,10,'#edf3ce');
  }
  c.restore();
}
function barrier(c,b,elapsed){
  const x=b.x,y=b.y,w=b.w||52,h=b.h||190;
  if(b.open){
    r(c,x+3,y+h-75,12,75,4,'#527b68',INK,2);r(c,x+w-15,y+h-75,12,75,4,'#527b68',INK,2);
    for(const xx of [x+9,x+w-9])e(c,xx,y+h-76,7,7,GREEN,INK,1.5);
    r(c,x-43,y+h-119,w+86,29,7,'#43826c',INK,2);t(c,'PASSAGEM LIVRE',x+w/2,y+h-104,9,'#eff4d1');t(c,'→',x+w/2,y+h-56,33,'#b7de88');
    return;
  }
  r(c,x,y,w,h,5,'#6e897b',INK,3);r(c,x+7,y+8,w-14,h-16,3,'#adc4a1',INK,2);
  c.save();c.beginPath();c.rect(x+8,y+10,w-16,h-20);c.clip();c.fillStyle='#e8c363';c.fillRect(x+8,y+10,w-16,h-20);
  for(let yy=y-20;yy<y+h+30;yy+=41)p(c,[[x,yy],[x+w,yy+27],[x+w,yy+46],[x,yy+19]],'#38564e',null);c.restore();
  r(c,x-37,y+55,w+74,46,7,'#fff0bd',INK,2);t(c,'PASSAGEM',x+w/2,y+71,10);t(c,'BLOQUEADA',x+w/2,y+86,10,'#9c623c');
  e(c,x+w/2,y-10,13,13,'#f2ce6f',INK,2);e(c,x+w/2,y-10,7,7,Math.sin(elapsed*5)>0?'#dc9650':'#edbd58');
  for(const xx of [x+7,x+w-7]){bolt(c,xx,y+8,2);bolt(c,xx,y+h-8,2);}
}
/** Draws the IED world overlay in logical 1200 × 600 coordinates. */
export function drawIEDScene(c,s){
  if(!s?.dynamic)return;c.save();c.translate(-(s.camera||0),0);
  for(const b of s.dynamic.barriers||[])if(b.x+(b.w||52)>s.camera-90&&b.x<s.camera+1290)barrier(c,b,s.elapsed||0);
  (s.dynamic.machines||[]).forEach((m,i)=>{if(m.x>s.camera-190&&m.x<s.camera+1390)machine(c,m,m.index??i,s.elapsed||0);});
  c.restore();
}

function challengeBase(c,title,subtitle){
  c.save();c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,800,340);
  const g=c.createLinearGradient(0,0,0,340);g.addColorStop(0,'#e6eed5');g.addColorStop(1,'#c9dbbd');
  r(c,1.5,1.5,797,337,16,g,INK,3);
  c.save();c.beginPath();c.roundRect(3,3,794,334,14);c.clip();for(let y=64;y<340;y+=22)l(c,0,y,800,y,'#8fac8f1a',1);for(let x=16;x<800;x+=22)l(c,x,63,x,340,'#8fac8f1a',1);c.restore();
  r(c,14,13,772,40,10,'#355e58',null);t(c,title,31,33,12,'#f2efcf','left');t(c,subtitle,769,33,10,'#cadcb7','right');
  for(const [x,y] of [[14,66],[786,66],[14,324],[786,324]])bolt(c,x,y,3.5);
}
function ringRotor(c,x,y,angle,color,reference,tolerance,active=false){
  r(c,x-78,y-50,156,100,18,'#86a99a',INK,2.5);r(c,x-74,y-43,148,12,5,'#b9d2b1',null);
  e(c,x,y,66,66,'#688f82',INK,2.5);e(c,x,y,56,56,color,INK,2.5);e(c,x,y,42,42,'#aec8a8',INK,2);
  if(reference!==undefined){
    c.beginPath();c.arc(x,y,64,reference-tolerance,reference+tolerance);c.strokeStyle=active?'#b7ed6e':'#8ebd74';c.lineWidth=16;c.stroke();
    for(const a of [reference-tolerance,reference+tolerance])l(c,x+Math.cos(a)*54,y+Math.sin(a)*54,x+Math.cos(a)*74,y+Math.sin(a)*74,'#3d7550',2);
  }
  c.save();c.translate(x,y);c.rotate(angle);
  for(let i=0;i<6;i++){
    const a=i*TAU/6;l(c,Math.cos(a)*19,Math.sin(a)*19,Math.cos(a)*39,Math.sin(a)*39,'#527f70',5);
    bolt(c,Math.cos(a)*47,Math.sin(a)*47,2.5);
  }
  // The broad index mark is the one meaningful action cue on each rotor.
  p(c,[[31,-6],[57,-6],[68,0],[57,6],[31,6]],'#fff5d0',INK,2);l(c,39,0,60,0,'#c88539',3);c.restore();
  e(c,x,y,17,17,'#668e7c',INK,2);e(c,x,y,7,7,'#d9dfbb',INK,1.7);
}
function circularDifference(a,b){return Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)));}
function alignmentInstrument(c,m,elapsed){
  const a=Number(m.angleA)||0,b=Number(m.angleB)||0,tol=Number(m.tolerance)||.5;
  const inWindow=circularDifference(a,b)<=tol,armed=m.alignmentArmed!==false;
  const ready=inWindow&&armed;
  r(c,292,67,216,31,10,ready?'#a9d97c':'#eff0d3',ready?'#3d784d':'#7e9a78',2);
  t(c,ready?'AS MARCAS COINCIDIRAM!':!armed?'AGUARDE A PRÓXIMA VOLTA':'OBSERVE AS DUAS MARCAS',400,83,10.5,ready?'#2c583d':'#688362');
  // Coupled shafts: one reference rotor and one receiving the alignment window.
  r(c,309,156,182,17,4,'#b9c6a5',INK,2);for(let i=0;i<6;i++)l(c,355+i*16,157,355+i*16,172,'#739077',2);
  r(c,381,146,38,37,7,ready?'#a8da75':'#d4bd7c',INK,2.5);bolt(c,390,153,2);bolt(c,410,176,2);
  ringRotor(c,234,165,a,'#8fbbac');ringRotor(c,566,165,b,'#e2c67f',a,tol,ready);
  t(c,'EIXO DO MOTOR',234,251,12);t(c,'EIXO DA MÁQUINA',566,251,12);
  t(c,'Marca de referência',234,268,9,'#657e61');t(c,'Marca dentro da janela verde',566,268,9,'#657e61');
  const hits=clamp(Number(m.alignmentHits)||0,0,3);
  for(let i=0;i<3;i++){const x=365+i*35;if(i<hits)check(c,x,300,12);else{e(c,x,300,12,12,'#dce3c1','#7a9971',1.8);t(c,String(i+1),x,300,10,'#71856b');}}
  t(c,'AJUSTES',294,300,9,'#627f60');t(c,`${hits} / 3`,468,300,11);
}
function stableInstrument(c,m,elapsed){
  const needle=clamp(Number(m.needle)||0,-1,1),band=clamp(Number(m.band)||.3,.05,.95),time=clamp(Number(m.stableTime)||0,0,Number(m.requiredStableTime)||4),required=Number(m.requiredStableTime)||4;
  const inside=Math.abs(needle)<=band,xx=400+needle*322;
  r(c,267,71,266,31,10,inside?'#b1dc85':'#f3d79a',inside?'#56864c':'#b48c4e',2);
  t(c,inside?'BOM RITMO. MANTENHA NO VERDE!':'TRAGA O PONTEIRO PARA O VERDE',400,87,10.5);
  // A wide linear instrument makes the controllable target unambiguous.
  r(c,63,140,674,62,16,'#466b5e',INK,3);r(c,75,151,650,39,9,'#e4c58b',INK,1.5);
  c.save();c.beginPath();c.roundRect(76,152,648,37,8);c.clip();r(c,400-band*322,152,band*644,37,0,'#9bce77',null);c.restore();
  for(let i=0;i<=20;i++){
    const x=78+i*32.2;l(c,x,182,x,i%5===0?167:174,i%5===0?'#55734d':'#809463',i%5===0?2:1);
  }
  for(const x of [400-band*322,400+band*322])l(c,x,147,x,196,'#427b47',3);
  l(c,400,154,400,189,'#f6f8d2',2);
  p(c,[[xx-11,122],[xx+11,122],[xx,143]],inside?'#3b7851':'#a9613c',INK,2);l(c,xx,141,xx,201,INK,3);e(c,xx,204,5,5,'#fff1bc',INK,2);
  t(c,'MENOR',80,219,9,'#66815e','left');t(c,'FAIXA ESTÁVEL',400,219,9,'#4b7b4b');t(c,'MAIOR',720,219,9,'#66815e','right');
  t(c,`${time.toFixed(1).replace('.',',')} / ${required.toFixed(1).replace('.',',')} s`,400,250,22,'#365e48');
  r(c,194,275,412,17,8,'#c1d2a7','#789368',1.5);if(time>0)r(c,197,278,clamp(time/required,0,1)*406,11,5,inside?'#73a957':'#a5ba76',null);
  t(c,'TEMPO CONTÍNUO DENTRO DA FAIXA',400,312,9,'#69835e');
}
/** Pure drawing: inputs and wins are exclusively controlled by the engine. */
export function drawIEDChallenge(c,machine,elapsed=0){
  if(!machine)return;const m=machine,phase=m.phase||'align',name=m.label||'CONJUNTO ROTATIVO';
  challengeBase(c,phase==='align'?'01 / ALINHAMENTO':phase==='done'?'CONJUNTO ESTABILIZADO':'02 / RITMO ESTÁVEL',name.toUpperCase());
  if(phase==='align')alignmentInstrument(c,m,elapsed);
  else if(phase==='sync')stableInstrument(c,m,elapsed);
  else{
    check(c,400,139,40);t(c,'Agora estamos na mesma rotação!',400,214,20);t(c,'Passagem liberada. Próximo conjunto!',400,249,12,'#64845f');
  }
  c.restore();
}
