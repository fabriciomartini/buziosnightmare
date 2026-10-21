// Original vector artwork. Everything is drawn locally; no image downloads required.
const INK = '#203f42';
const C = { ink:INK, cream:'#fff4ce', teal:'#3a9d96', tealDark:'#28746f', mint:'#a8d4aa', orange:'#ef923c', yellow:'#f4c759', rust:'#b84f32' };

function rr(c,x,y,w,h,r=10,fill,stroke=INK,line=3){
  c.beginPath(); c.roundRect(x,y,w,h,r); if(fill){c.fillStyle=fill;c.fill();} if(stroke){c.lineWidth=line;c.strokeStyle=stroke;c.stroke();}
}
function ellipse(c,x,y,rx,ry,fill,stroke=null,line=3){c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=line;c.stroke();}}
function path(c,pts,fill,stroke=INK,line=3,close=true){c.beginPath();pts.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));if(close)c.closePath();if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=line;c.lineJoin='round';c.lineCap='round';c.stroke();}}
function line(c,x,y,xx,yy,color=INK,width=3){path(c,[[x,y],[xx,yy]],null,color,width,false);}
function text(c,t,x,y,size=16,color=INK,align='center',weight=800){c.font=`${weight} ${size}px "Trebuchet MS", sans-serif`;c.fillStyle=color;c.textAlign=align;c.textBaseline='middle';c.fillText(t,x,y);}
function bolt(c,x,y){ellipse(c,x,y,3.2,3.2,'#aec0a5',INK,1.4);line(c,x-1.3,y+1.3,x+1.3,y-1.3,INK,1);}
function cloud(c,x,y,s=1){c.save();c.translate(x,y);c.scale(s,s);c.fillStyle='#f5f7da';c.beginPath();c.moveTo(-65,16);c.bezierCurveTo(-85,-10,-45,-31,-24,-19);c.bezierCurveTo(-16,-48,37,-41,40,-12);c.bezierCurveTo(65,-22,87,9,61,21);c.closePath();c.fill();c.restore();}

function distant(c,camera,t){
  const sky=c.createLinearGradient(0,0,0,380);sky.addColorStop(0,'#8dd5ce');sky.addColorStop(.7,'#c0e5cf');sky.addColorStop(1,'#e7e8b7');c.fillStyle=sky;c.fillRect(0,0,1200,600);
  // Small, warm sun and misty cloud banks keep the industrial scene inviting.
  ellipse(c,1010-camera*.035,88,45,45,'#ffe6a0');ellipse(c,1010-camera*.035,88,61,61,'#ffe6a026');
  for(let i=0;i<8;i++)cloud(c,i*280-camera*.09+Math.sin(t*.05+i)*8,70+(i%3)*42,.6+(i%2)*.25);
  const sea=c.createLinearGradient(0,340,0,540);sea.addColorStop(0,'#6bafa4');sea.addColorStop(1,'#377e7c');c.fillStyle=sea;c.fillRect(0,340,1200,260);
  for(let row=0;row<4;row++)for(let i=0;i<14;i++){let x=i*104-(camera*.15%104)+Math.sin(t*.3+row)*12;line(c,x,365+row*25,x+30+(i%3)*7,365+row*25,'#a9d5be88',2);}
  // Distant FPSO silhouette.
  c.save();c.translate(870-camera*.1,320);path(c,[[-180,16],[180,16],[148,45],[-150,45]],'#4b989282',null);rr(c,-140,-32,65,46,3,'#599f9788',null);rr(c,-60,-56,46,70,3,'#599f9788',null);line(c,20,16,20,-69,'#599f9788',8);line(c,20,-69,130,-19,'#599f9788',5);line(c,132,-20,132,8,'#599f9788',2);line(c,-155,13,158,13,'#599f9788',3);c.restore();
  for(let i=0;i<3;i++){let x=300+i*355-camera*.03;path(c,[[x,127+i*19],[x+5,123+i*19],[x+10,127+i*19],[x+15,123+i*19],[x+21,127+i*19]],null,'#438b82',2,false);}
}

function crane(c,x,y){
  c.save();c.translate(x,y);const steel='#d7a747';
  path(c,[[-17,0],[-11,-202],[11,-202],[18,0]],steel,INK,3);
  for(let i=0;i<5;i++)path(c,[[-12,-i*40],[12,-(i+1)*40],[-12,-(i+1)*40]],null,INK,2,false);
  path(c,[[-18,-202],[163,-272],[167,-254],[17,-186]],'#efbf51',INK,3);
  for(let i=0;i<4;i++){const xx=20+i*35;line(c,xx,-208-i*13,xx+22,-198-i*13,INK,2);}
  rr(c,-39,-205,53,35,4,'#e7a644');rr(c,-31,-198,24,16,3,'#7dbaa8');line(c,161,-254,161,-116,INK,2);path(c,[[155,-116],[155,-107],[166,-107],[169,-113]],null,INK,3,false);c.restore();
}
function tank(c,x,y,w,h){
  c.save();c.translate(x,y);rr(c,0,0,w,h,18,'#8bb7a2',INK,3);ellipse(c,w/2,7,w/2,16,'#b7d2ae',INK,3);c.fillStyle='#acc9aa';c.fillRect(8,19,11,h-34);
  line(c,2,h-28,w-2,h-28,'#4e8779',5);line(c,4,37,w-4,37,'#4e8779',5);rr(c,w*.22,h*.45,w*.56,30,3,'#e9e7bd',INK,2);text(c,'P–83',w/2,h*.45+16,17);
  for(let iy=0;iy<h;iy+=21){line(c,w-14,iy,w-2,iy,'#315f58',2);}line(c,w-14,0,w-14,h,'#315f58',2);line(c,w-2,0,w-2,h,'#315f58',2);c.restore();
}
function backgroundIndustry(c,s){
  const cam=s.camera||0;c.save();c.translate(-cam*.42,0);
  for(let i=-1;i<6;i++){
    const x=i*590+80;
    if(i%2===0)crane(c,x+155,375);
    rr(c,x,288,213,118,8,'#6a9b89',INK,3);
    path(c,[[x-9,288],[x+17,272],[x+199,272],[x+222,288]],'#c5c58a',INK,3);
    for(let q=0;q<4;q++)rr(c,x+16+q*46,307,30,33,4,'#abd0b1',INK,2);
    rr(c,x+82,356,48,50,4,'#3e7266',INK,2);line(c,x+84,374,x+128,374,'#6c9987',2);
    tank(c,x+288,236,95,166);tank(c,x+399,278,73,124);
    // Pipes disappear behind the live deck, with generous contrast separation.
    c.strokeStyle='#578775';c.lineWidth=22;c.lineJoin='round';c.beginPath();c.moveTo(x+250,410);c.lineTo(x+250,329);c.lineTo(x+316,329);c.stroke();
    c.strokeStyle='#b2bf8b';c.lineWidth=14;c.stroke();
    line(c,x-25,411,x+500,411,'#376c62',12);line(c,x-25,405,x+500,405,'#a4b68a',3);
    for(let k=0;k<6;k++)line(c,x+k*90,411,x+k*90+28,473,'#47776c',12);
  }
  c.restore();
}
function railing(c,x,y,w){line(c,x,y,x+w,y,'#e8c958',5);line(c,x,y+21,x+w,y+21,'#b69d44',3);for(let i=0;i<=w;i+=62)line(c,x+i,y-2,x+i,y+48,'#b59b45',5);}
function deck(c,s){
  const cam=s.camera||0;c.save();c.translate(-cam,0);const world=s.worldWidth||3200;
  railing(c,0,453,world);
  c.fillStyle='#6b8574';c.fillRect(0,500,world,100);c.fillStyle='#bdc398';c.fillRect(0,500,world,18);line(c,0,500,world,500,INK,4);line(c,0,519,world,519,INK,4);
  // Bevelled hull with alternating hazard strip and riveted plates.
  c.save();c.beginPath();c.rect(0,523,world,17);c.clip();c.fillStyle='#efbc4c';c.fillRect(0,523,world,17);for(let i=-30;i<world;i+=48)path(c,[[i,523],[i+20,523],[i+3,540],[i-17,540]],INK,null);c.restore();
  for(let i=0;i<world;i+=190){rr(c,i+8,553,175,60,5,'#608575',INK,2);bolt(c,i+20,564);bolt(c,i+171,564);line(c,i+23,580,i+155,580,'#7b9b80',2);}
  // Scatter small paint marks and service-point numbers along the deck.
  for(let x=260;x<world;x+=420){line(c,x,510,x+40,510,'#e1d591',3);text(c,String(Math.floor(x/420)+1).padStart(2,'0'),x+60,510,11,'#536d60');}
  for(const p of s.platforms||[]){
    if(p.y>=490&&p.w>1000)continue;
    const h=p.h||19;rr(c,p.x,p.y,p.w,h,4,'#7b9c80',INK,3);line(c,p.x+4,p.y+4,p.x+p.w-4,p.y+4,'#e0d696',4);
    for(let xx=p.x+18;xx<p.x+p.w;xx+=70){line(c,xx,p.y+h,xx,500,'#3e6a5b',8);line(c,xx,p.y+h,xx+40,500,'#5b8568',5);}railing(c,p.x,p.y-47,p.w);
  }
  for(const l of s.ladders||[]){
    const w=l.w||42;line(c,l.x,l.y,l.x,l.y+l.h,'#253e3d',9);line(c,l.x+w,l.y,l.x+w,l.y+l.h,'#253e3d',9);line(c,l.x,l.y,l.x,l.y+l.h,'#efc253',5);line(c,l.x+w,l.y,l.x+w,l.y+l.h,'#efc253',5);
    for(let yy=l.y+9;yy<l.y+l.h;yy+=18)line(c,l.x,yy,l.x+w,yy,'#efc253',5);
  }
  c.restore();
}

function clipboard(c,x,y){c.save();c.translate(x,y);c.rotate(.1);rr(c,-12,-19,26,36,3,'#795333',INK,2);rr(c,-9,-15,20,29,2,'#fff2ca',null);rr(c,-5,-21,12,6,2,'#a9b29b',INK,1.5);for(let i=0;i<3;i++){line(c,-3,-7+i*7,6,-7+i*7,'#78907d',1.5);path(c,[[-7,-8+i*7],[-5,-6+i*7],[-2,-10+i*7]],null,'#5a9770',1.5,false);}c.restore();}
function helmet(c,color){
  c.fillStyle=color;c.strokeStyle=INK;c.lineWidth=3;c.beginPath();c.moveTo(-26,-92);c.quadraticCurveTo(-29,-115,0,-117);c.quadraticCurveTo(29,-115,26,-92);c.closePath();c.fill();c.stroke();
  rr(c,-30,-96,60,9,5,color,INK,3);line(c,-3,-111,-3,-99,'#fff7cf77',6);line(c,10,-109,13,-99,'#203f4224',3);
}
function character(c,x,y,opts={}){
  const t=opts.time||0,walk=opts.walking?Math.sin(t*12):0,bob=opts.walking?Math.abs(walk)*2:Math.sin(t*2)*.8;
  c.save();c.translate(x,y);if(opts.scale)c.scale(opts.scale,opts.scale);ellipse(c,0,-2,29,6,'#183d3733');c.translate(0,-bob);
  // Slightly oversized boots and head give everyone a warm comic silhouette.
  c.save();c.translate(0,walk*1);path(c,[[-17,-29],[-18+walk*5,-7],[-3+walk*5,-7],[-2,-29]],opts.pants||'#337c77',INK,3);rr(c,-22+walk*5,-10,24,11,4,'#30494b',INK,3);c.restore();
  path(c,[[3,-29],[4-walk*5,-7],[19-walk*5,-7],[18,-29]],opts.pants||'#337c77',INK,3);rr(c,1-walk*5,-10,25,11,4,'#30494b',INK,3);
  if(opts.female){ellipse(c,-18,-68,13,24,'#493d32',INK,3);ellipse(c,16,-69,14,23,'#493d32',INK,3);}
  rr(c,-22,-60,44,36,9,opts.shirt||'#ed9443',INK,3);c.fillStyle='#f4de80';c.fillRect(-21,-40,42,6);line(c,0,-56,0,-25,'#9b6337',2);
  // Arms are outside the body and sleeves, for a clear carrying pose.
  path(c,[[-21,-54],[-30,-33],[-22,-27],[-13,-47]],opts.shirt||'#ed9443',INK,3);ellipse(c,-24,-29,6,6,'#e8ad73',INK,2);
  path(c,[[21,-54],[29,-35],[22,-29],[14,-46]],opts.shirt||'#ed9443',INK,3);ellipse(c,24,-30,6,6,'#e8ad73',INK,2);
  if(opts.player&&opts.role!=='ieei')clipboard(c,28,-38);
  if(opts.role==='ieei'&&opts.player){line(c,26,-31,39,-57,'#8d6440',6);rr(c,31,-70,21,19,3,'#c2cbbb',INK,2);for(let i=0;i<4;i++)line(c,34+i*5,-68,34+i*5,-60,'#656e5d',2);}
  ellipse(c,-24,-77,6,9,'#e9ae75',INK,2);ellipse(c,24,-77,6,9,'#e9ae75',INK,2);ellipse(c,0,-79,25,26,'#f0bc87',INK,3);
  // Distinct hair, even when a hard hat is deliberately absent.
  if(!opts.helmet){path(c,[[-23,-89],[-24,-98],[-17,-100],[-15,-106],[-6,-101],[0,-109],[6,-102],[17,-105],[22,-97],[25,-89]],'#594b37',INK,2);}
  if(opts.female){path(c,[[-21,-87],[-22,-98],[0,-101],[20,-94],[16,-87],[5,-96],[-9,-86]],'#554437',null);}
  const eyeShift=opts.facing===-1?-2:2;
  ellipse(c,-9,-81,7,9,'#fff8d9',INK,1.5);ellipse(c,9,-81,7,9,'#fff8d9',INK,1.5);ellipse(c,-9+eyeShift,-79,2.4,3.8,INK);ellipse(c,9+eyeShift,-79,2.4,3.8,INK);
  path(c,[[0,-77],[-2,-69],[4,-69]],null,'#b47b54',1.8,false);
  c.beginPath();c.arc(1,-69,8,.15,Math.PI-.2);c.strokeStyle=INK;c.lineWidth=2;c.stroke();ellipse(c,-17,-69,4,2.5,'#df8a6455');ellipse(c,17,-69,4,2.5,'#df8a6455');
  if(opts.role==='ieei'){path(c,[[-8,-66],[-2,-69],[2,-67],[6,-69],[11,-65],[1,-64]],'#554437',null);}
  if(opts.glasses){rr(c,-19,-89,17,15,4,'#e5f7d655',INK,2.5);rr(c,2,-89,17,15,4,'#e5f7d655',INK,2.5);line(c,-2,-84,2,-84,INK,2.5);line(c,-24,-84,-19,-84,INK,2);line(c,19,-84,24,-84,INK,2);line(c,-16,-86,-10,-86,'#fffbe3',2);line(c,6,-86,12,-86,'#fffbe3',2);}
  if(opts.helmet)helmet(c,opts.hat||'#f4cc5e');
  if(opts.hearing){c.beginPath();c.arc(0,-85,27,Math.PI,Math.PI*2);c.strokeStyle=INK;c.lineWidth=4;c.stroke();rr(c,-31,-88,10,22,5,'#567778',INK,2);rr(c,21,-88,10,22,5,'#567778',INK,2);}
  if(opts.player){rr(c,-31,-140,62,16,5,opts.role==='sms'?'#d9ead1':'#fff1c3',INK,2);text(c,'VOCÊ',0,-132,10);}
  c.restore();
}
function check(c,x,y,r=14){ellipse(c,x,y,r,r,'#b9dd77',INK,2.5);path(c,[[x-r*.45,y],[x-r*.1,y+r*.34],[x+r*.48,y-r*.35]],null,INK,3,false);}
function hazardWork(c,w,t){
  if(w.risk==='glasses'){
    rr(c,w.x+38,w.y-45,43,12,3,'#81a09a',INK,2);line(c,w.x+50,w.y-33,w.x+50,w.y,'#3d5b55',4);line(c,w.x+76,w.y-33,w.x+76,w.y,'#3d5b55',4);
    ellipse(c,w.x+37,w.y-46,9,9,'#c4c7b1',INK,2);line(c,w.x+24,w.y-42,w.x+35,w.y-48,INK,7);
    if(!w.recorded)for(let k=0;k<4;k++){const flick=Math.sin(t*12+k)*3;line(c,w.x+44,w.y-49,w.x+51+k*4+flick,w.y-54-k*3,'#f7c24c',2);}
  }else if(w.risk==='helmet'){
    // Hanging pipe visually explains why a helmet matters here.
    line(c,w.x+60,w.y-187,w.x+60,w.y-155,'#586f62',2);line(c,w.x+122,w.y-187,w.x+122,w.y-155,'#586f62',2);rr(c,w.x+41,w.y-157,100,14,7,'#719d90',INK,2);ellipse(c,w.x+138,w.y-150,7,7,'#2e615b',INK,2);
  }else if(w.risk==='hearing'){
    rr(c,w.x+36,w.y-47,37,42,5,'#e9b74f',INK,2.5);rr(c,w.x+40,w.y-39,28,17,3,'#334f49',INK,2);for(let k=0;k<3;k++)line(c,w.x+44+k*9,w.y-36,w.x+44+k*9,w.y-25,'#9ab39a',2);ellipse(c,w.x+43,w.y-3,7,7,'#384d46',INK,2);ellipse(c,w.x+69,w.y-3,7,7,'#384d46',INK,2);
    for(let k=0;k<2;k++){c.beginPath();c.arc(w.x+78,w.y-32,8+k*7,-.8,.8);c.strokeStyle='#c99939';c.lineWidth=2;c.stroke();}
  }
}
function workers(c,s){
  c.save();c.translate(-s.camera,0);
  for(const w of s.workers||[]){
    if(w.x<s.camera-130||w.x>s.camera+1330)continue;
    hazardWork(c,w,s.elapsed);const risky=w.risk&&!w.corrected&&!w.recorded;
    character(c,w.x,w.y,{time:s.elapsed+(Number(w.id)||0),helmet:!risky||w.risk!=='helmet',glasses:!risky||w.risk!=='glasses',hearing:w.risk==='hearing'&&!risky,hat:w.risk?'#efc04f':'#d3e2cf',shirt:w.risk?'#e8a451':'#80aca1'});
    if(w.recorded){check(c,w.x,w.y-136,13);}
    else if(risky&&w.visibleSince!==null&&w.visibleSince!==undefined){
      const remain=Math.max(0,1-(s.elapsed-w.visibleSince)/2);ellipse(c,w.x,w.y-136,13,13,'#fff1bc',INK,2);c.beginPath();c.arc(w.x,w.y-136,17,-Math.PI/2,-Math.PI/2+Math.PI*2*remain);c.strokeStyle='#b96935';c.lineWidth=4;c.stroke();text(c,'!',w.x,w.y-135,18,'#9a4a2a');
    }else if(w.corrected){text(c,'✓',w.x,w.y-134,18,'#d9efd0');}
  }
  c.restore();
}
function rustPoint(c,r,s){
  const done=r.step>=4;c.save();c.translate(r.x,r.y);
  // Corrosion lives on a real pipe spool, not a floating collectible.
  line(c,-48,21,-48,500-r.y,'#496e60',8);line(c,48,21,48,500-r.y,'#496e60',8);
  rr(c,-67,-31,134,62,16,done?'#56aaa0':'#86a998',INK,3);c.fillStyle=done?'#8ed4bd':'#bfd0ac';c.fillRect(-54,-23,108,8);
  for(const xx of [-61,51]){rr(c,xx,-38,10,76,3,done?'#77bba4':'#b2b990',INK,2);bolt(c,xx+5,-29);bolt(c,xx+5,29);}
  if(!done){
    const fade=r.step>=3?.32:r.step>=2?.5:1;c.globalAlpha=fade;
    path(c,[[-36,-8],[-24,-20],[-11,-15],[-1,-25],[12,-17],[27,-20],[34,-4],[28,5],[37,17],[18,22],[9,16],[-7,25],[-16,17],[-32,18],[-27,6]],'#b86d3e',null);
    path(c,[[-25,-4],[-12,-12],[-1,-9],[7,-16],[21,-8],[17,4],[27,12],[9,13],[1,19],[-10,9],[-23,10]],'#8e4c32',null);
    for(let i=0;i<12;i++)ellipse(c,Math.sin(i*2.4)*25,Math.cos(i*3.7)*15,2.7,1.8,i%2?'#d58b43':'#633f30');c.globalAlpha=1;
  }
  if(done){check(c,0,0,16);text(c,'REPARADO',0,-54,11,'#173f3a');}
  else{
    const pulse=Math.sin(s.elapsed*3)*2;ellipse(c,0,-59,17+pulse,17+pulse,'#fbe9a2',INK,2);text(c,'↗',0,-60,23);text(c,'TRATAR',0,51,11,'#203f42');
    if(r.step){for(let i=0;i<4;i++)ellipse(c,-18+i*12,66,4,4,i<r.step?'#a8d969':'#8c9c7e',INK,1);}
  }
  c.restore();
}
function station(c,p,i,s){
  const done=p.step>=3;c.save();c.translate(p.x,p.y);let h=95;
  if(i%3===0){
    rr(c,-51,-55,102,50,14,'#62a7a0',INK,3);ellipse(c,3,-32,29,29,'#93c4af',INK,3);ellipse(c,3,-32,15,15,'#426e63',INK,3);rr(c,-54,-5,110,12,3,'#7a8e71',INK,3);rr(c,-34,-77,34,26,4,'#d4cda2',INK,2);for(let n=0;n<4;n++)line(c,18+n*7,-48,18+n*7,-17,'#366e68',2);
  }else if(i%3===1){
    rr(c,-44,-92,88,90,8,'#e1c76b',INK,3);rr(c,-31,-76,62,37,4,'#385f56',INK,2);for(let a=0;a<4;a++){ellipse(c,-20+a*14,-59,4,4,done?'#bce78c':'#9dc5a0');}line(c,-28,-23,8,-23,INK,3);ellipse(c,25,-22,7,7,'#bd6241',INK,2);h=122;
  }else{
    rr(c,-64,-36,128,28,7,'#79ada0',INK,3);rr(c,-32,-45,64,49,6,'#98c1a9',INK,3);line(c,0,-45,0,-73,INK,8);ellipse(c,0,-78,30,10,'#e8b94e',INK,3);line(c,-28,-78,28,-78,INK,3);line(c,-12,-84,12,-72,INK,2);h=109;
  }
  const labels=['CONJUNTO','PAINEL','SISTEMA'];text(c,labels[i%3]+' 0'+(i+1),0,21,12);
  if(done)check(c,0,-h,16);else{ellipse(c,0,-h,17,17,'#fff1bd',INK,2.5);text(c,String(i+1),0,-h,18);}
  for(let k=0;k<3;k++)ellipse(c,-15+k*15,38,4,4,k<p.step?'#b9df7c':'#7b9581',INK,1.5);c.restore();
}
function sign(c,x,y,title,sub){
  c.save();c.translate(x,y);line(c,-54,0,-54,77,'#645f43',7);line(c,54,0,54,77,'#645f43',7);rr(c,-94,-44,188,65,8,'#f5d576',INK,3);rr(c,-85,-35,170,47,4,null,'#bb9643',1);text(c,title,0,-19,18);if(sub)text(c,sub,0,1,10,'#51604b');bolt(c,-83,-27);bolt(c,83,-27);c.restore();
}
export function drawGame(c,s,dt=0){
  if(!s)return;c.save();c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,1200,600);c.lineCap='round';c.lineJoin='round';
  distant(c,s.camera||0,s.elapsed||0);backgroundIndustry(c,s);deck(c,s);
  c.save();c.translate(-(s.camera||0),0);
  sign(c,130,421,'P–83',s.stageId==='sms'?'OLHO VIVO NA SEGURANÇA':s.stageId==='ieei'?'MISSÃO CONTRA A CORROSÃO':'PRONTOS PARA A PRÓXIMA ETAPA');
  // Direction markers anchor the side-scrolling journey.
  for(let x=900;x<(s.worldWidth||3200);x+=850){rr(c,x,430,64,35,5,'#408f83',INK,2);text(c,'→',x+32,448,32,'#e8e5b4');}
  for(const r of s.rust||[])rustPoint(c,r,s);
  (s.stations||[]).forEach((p,i)=>station(c,p,i,s));c.restore();
  workers(c,s);
  if(s.player){c.save();c.translate(-(s.camera||0),0);const p=s.player;character(c,p.x,p.y,{time:s.elapsed||0,walking:p.walking,facing:p.facing,player:true,female:s.stageId==='sms',role:s.stageId,helmet:true,glasses:true,hat:s.stageId==='sms'?'#fff1c4':s.stageId==='ieei'?'#badaac':'#fff0bd',shirt:s.stageId==='sms'?'#3e9e92':s.stageId==='ieei'?'#70a88a':'#e89a48'});c.restore();}
  c.save();c.translate(-(s.camera||0),0);
  for(const p of s.particles||[]){c.globalAlpha=Math.min(1,Math.max(0,p.life/(p.maxLife||1)));ellipse(c,p.x,p.y,p.size||3,p.size||3,p.color||'#f1d270');}
  c.restore();
  // Rounded vignette adds depth without obscuring working areas.
  const vignette=c.createLinearGradient(0,0,0,600);vignette.addColorStop(0,'#133d3910');vignette.addColorStop(.7,'#133d3900');vignette.addColorStop(1,'#102c2c25');c.fillStyle=vignette;c.fillRect(0,0,1200,600);c.restore();
}

export function drawPortrait(c,who='sms',size=128){
  c.save();c.clearRect(0,0,size,size);ellipse(c,size/2,size/2,size*.46,size*.46,who==='sms'?'#d5e6b0':who==='ieei'?'#f5d487':'#b9dad0');c.translate(size/2,size*.96);c.scale(size/128,size/128);character(c,0,0,{time:0,player:false,female:who==='sms',role:who,helmet:true,glasses:true,hat:who==='ieei'?'#bad9a6':'#fff1be',shirt:who==='sms'?'#3e9e92':who==='ieei'?'#75a98a':'#e89a48',scale:1.03});c.restore();
}
