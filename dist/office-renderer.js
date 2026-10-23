// An original, playful interpretation of an EDISEN office—not a floor plan.
const INK = '#23434a';
const TEAL = '#438c89';
const PAPER = '#fffdf0';
const FONT = '"Trebuchet MS", Arial, sans-serif';
const reducedMotionQuery = typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
function reducedMotion(s){return s?.reducedMotion===true||Boolean(reducedMotionQuery?.matches);}
function specialStyle(kind){
  return kind==='return'?{color:'#b8842d',dark:'#785321',pale:'#fff2bf',title:'Remarcação de retorno',icon:'↶'}:
    kind==='urgent'?{color:'#ce6654',dark:'#8b3f38',pale:'#ffead9',title:'Urgente',icon:'!'}:null;
}
function dangerPulse(t,reduce){return reduce?1:.7+.3*(.5+.5*Math.sin(t*Math.PI*2*1.8));}
function rect(c,x,y,w,h,r,fill,stroke=INK,lw=2){c.beginPath();c.roundRect(x,y,w,h,r);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=lw;c.stroke();}}
function oval(c,x,y,rx,ry,fill,stroke=null,lw=2){c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=lw;c.stroke();}}
function poly(c,pts,fill,stroke=INK,lw=2,close=true){c.beginPath();pts.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));if(close)c.closePath();if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=lw;c.lineJoin='round';c.lineCap='round';c.stroke();}}
function ln(c,x,y,xx,yy,color=INK,lw=2){poly(c,[[x,y],[xx,yy]],null,color,lw,false);}
function label(c,t,x,y,size=12,color=INK,align='center',weight=800){c.font=`${weight} ${size}px ${FONT}`;c.fillStyle=color;c.textAlign=align;c.textBaseline='middle';c.fillText(t,x,y);}
function visible(x,w,cam){return x+w>=cam-70&&x<=cam+1270;}

function city(c,cam){
  const g=c.createLinearGradient(0,65,0,350);g.addColorStop(0,'#c4e6eb');g.addColorStop(1,'#e1efeb');c.fillStyle=g;c.fillRect(0,65,1200,315);
  oval(c,1030-cam*.035,116,34,34,'#fdf1c4');
  // Abstract downtown Rio skyline, with the stepped silhouettes of glass towers.
  for(let i=-1;i<14;i++){
    const x=i*152-(cam*.12%152),height=90+((i+15)*47%120),y=343-height;
    poly(c,[[x,343],[x,y+25],[x+28,y+25],[x+28,y],[x+94,y],[x+94,y+35],[x+124,y+35],[x+124,343]],i%2?'#b1cbd3':'#a4c2cc',null);
    for(let row=y+12;row<341;row+=20){ln(c,x+32,row,x+91,row,'#d5e5e6',2);}
    for(let k=0;k<3;k++)ln(c,x+39+k*21,y+4,x+39+k*21,342,'#c5dee1',3);
  }
  for(let i=0;i<7;i++){
    const x=i*224-(cam*.24%224)+75,h=90+(i%3)*29;
    rect(c,x,350-h,100,h,0,i%2?'#88b3c2':'#96beca',null);
    for(let j=0;j<4;j++)for(let k=0;k<4;k++)rect(c,x+10+j*21,362-h+k*23,12,14,1,'#c7dde1',null);
  }
  // Reflections read as glass, while staying behind the actual play area.
  c.fillStyle='#ffffff25';poly(c,[[60,65],[165,65],[380,350],[265,350]],'#ffffff22',null);poly(c,[[660,65],[728,65],[946,350],[860,350]],'#ffffff28',null);
}
function windows(c,s){
  const cam=s.camera||0;city(c,cam);
  const offset=cam*.52%240;
  for(let x=-offset-240;x<1440;x+=240){
    rect(c,x,63,240,296,0,null,'#718e94',2);
    rect(c,x-5,64,11,298,0,'#f4f7ef','#a6bbba',1.5);
    ln(c,x+1,65,x+1,360,'#ffffff',2);
    ln(c,x+2,285,x+237,285,'#e5f0e9',7);
    ln(c,x+2,290,x+237,290,'#a3bfc0',1.5);
  }
  rect(c,0,354,1200,22,0,'#e3e9df','#9caaa7',2);
  rect(c,0,371,1200,99,0,'#d1ded9',null);
  ln(c,0,375,1200,375,'#eff5ea',3);
  // Acoustic ceiling and long suspended office lights.
  c.fillStyle='#e8eeeb';c.fillRect(0,0,1200,63);
  ln(c,0,62,1200,62,'#b4c4c0',2);
  for(let i=-1;i<5;i++){
    const x=i*365-(cam*.62%365)+140;
    ln(c,x+24,0,x+24,21,'#b3c3c1',2);ln(c,x+175,0,x+175,21,'#b3c3c1',2);
    rect(c,x,20,202,10,4,'#b8ccc9','#8fa8a7',1.5);rect(c,x+5,28,192,5,2,'#ffffe9',null);
    c.fillStyle='#ffffea10';poly(c,[[x+7,33],[x+194,33],[x+243,190],[x-42,190]],'#ffffea10',null);
  }
}
function plant(c,x,y,size=1){
  c.save();c.translate(x,y);c.scale(size,size);
  poly(c,[[-20,-37],[20,-37],[15,0],[-14,0]],'#e5d8b9',INK,2);rect(c,-23,-40,46,9,4,'#f8edcf',INK,2);
  ln(c,0,-38,0,-115,'#527e60',4);
  for(let i=0;i<5;i++){
    const yy=-52-i*14,dir=i%2?1:-1;
    c.save();c.translate(dir*13,yy-8);c.rotate(dir*-.6);oval(c,0,0,10,24,i%2?'#8cbc87':'#559674',INK,1.5);ln(c,0,16,0,-15,'#a6d19b',1);c.restore();
    ln(c,0,yy+3,dir*15,yy-4,'#527e60',2);
  }
  c.restore();
}
function officeChair(c,x,y){
  rect(c,x-20,y-71,40,46,11,'#517e87',INK,2);ln(c,x,y-26,x,y-5,'#70878a',5);rect(c,x-27,y-31,54,11,5,'#6f9699',INK,2);
  ln(c,x-22,y-44,x-22,y-28,INK,3);ln(c,x+22,y-44,x+22,y-28,INK,3);ln(c,x-27,y-45,x-15,y-45,INK,3);ln(c,x+15,y-45,x+27,y-45,INK,3);
  ln(c,x,y-5,x-24,y+3,'#547177',4);ln(c,x,y-5,x+24,y+3,'#547177',4);oval(c,x-24,y+5,5,4,INK);oval(c,x+24,y+5,5,4,INK);
}
function monitor(c,x,y,variant=0){
  rect(c,x-32,y-52,64,43,4,'#526e76',INK,2);rect(c,x-28,y-48,56,35,2,variant?'#afcecb':'#c8e2df',null);
  rect(c,x-24,y-44,48,6,1,variant?'#63a097':'#538c93',null);
  for(let i=0;i<3;i++){ln(c,x-21,y-31+i*5,x+17-(i%2)*8,y-31+i*5,'#6faca8',2);}
  ln(c,x,y-9,x,y-2,'#5c777b',5);rect(c,x-17,y-3,34,4,2,'#687f83',INK,1);
}
function paperPile(c,x,y,count=9,w=55){
  for(let i=0;i<count;i++){
    const shift=((i*7)%5)-2;rect(c,x+shift,y-i*4,w,5,1,i%3?'#f9f7e7':'#e5ece8','#9aa9a6',1);
  }
  ln(c,x+9,y-count*4+9,x+w-9,y-count*4+9,'#bdc7be',1);
}
function backWorkstations(c,s){
  const cam=s.camera||0,world=s.worldWidth||6600;c.save();c.translate(-cam*.76,0);
  for(let i=0;i<Math.ceil(world*.76/530)+3;i++){
    const x=i*530+450;if(!visible(x,420,cam*.76))continue;
    officeChair(c,x+90,455);officeChair(c,x+290,455);
    rect(c,x+18,375,364,70,4,'#e6ece5','#91a8a6',2);rect(c,x+10,372,380,12,4,'#f6f8ed','#91a8a6',2);
    monitor(c,x+94,371,i%2);monitor(c,x+288,371,(i+1)%2);
    rect(c,x+185,321,10,77,2,'#bed0cd','#8ca4a0',2);
    rect(c,x+15,392,372,45,3,'#a7c4bf','#7d9b98',2);
    for(let j=0;j<6;j++)ln(c,x+30+j*60,398,x+30+j*60,431,'#bdd3cc',1);
    if(i%2)plant(c,x+405,452,.66);else paperPile(c,x+331,369,5,36);
  }
  c.restore();
}
function meetingRoom(c,x){
  // A clean glass meeting room with a teal horizontal privacy band.
  rect(c,x,153,360,300,5,'#d7e9e762','#809e9e',2);
  rect(c,x+8,162,344,282,3,null,'#f9fff3',2);
  ln(c,x+119,155,x+119,451,'#e6eee8',7);ln(c,x+246,155,x+246,451,'#e6eee8',7);
  rect(c,x+6,273,348,38,0,'#90bdb685',null);
  label(c,'SALA DE REUNIÃO',x+180,291,10,'#43746f');
  officeChair(c,x+115,427);officeChair(c,x+264,427);
  rect(c,x+78,384,204,11,4,'#d6e2d6','#708e89',2);ln(c,x+106,396,x+106,448,'#7e9691',5);ln(c,x+249,396,x+249,448,'#7e9691',5);
  rect(c,x+138,216,84,45,4,'#486e77','#38525a',2);label(c,'A REUNIÃO',x+180,231,9,'#e7f3db');label(c,'PODERIA SER UM E-MAIL',x+180,247,5.9,'#c5ddce');
  ln(c,x+331,315,x+331,351,'#3c7171',5);ln(c,x+8,161,x+82,161,'#f9ffff',2);
  poly(c,[[x+24,163],[x+61,163],[x+150,271],[x+112,271]],'#ffffff1c',null);
}
function cabinet(c,x,y){
  rect(c,x,y,126,150,4,'#edf0e7','#829b98',2);rect(c,x+5,y+7,116,136,3,'#d4dfd5',null);
  for(let i=0;i<3;i++){
    rect(c,x+8,y+10+i*44,110,40,2,'#e8ede0','#acbeb2',1.5);rect(c,x+45,y+25+i*44,39,7,3,'#8fa9a3','#65817c',1);
    if(i===0){label(c,'ARQUIVO',x+63,y+20,7,'#65817c');}
  }
}
function poster(c,x,y,title,sub,color='#f3d887'){
  c.save();c.translate(x,y);c.rotate(-.018);rect(c,0,0,108,87,4,'#f7faee',INK,2);rect(c,6,6,96,75,2,color,null);label(c,title,54,30,12);
  const lines=[''];for(const word of String(sub).split(' ')){const last=lines.length-1;if(lines[last].length&&lines[last].length+word.length+1>17)lines.push(word);else lines[last]+=(lines[last]?' ':'')+word;}
  lines.forEach((value,i)=>label(c,value,54,lines.length>1?49+i*12:54,7.5,'#49766d'));c.restore();
}
function middleOffice(c,s){
  const cam=s.camera||0,world=s.worldWidth||6600,coffeeX=s.office?.coffee?.x??world-230;c.save();c.translate(-cam,0);
  const rooms=[1060,3040],cabinets=[1620,3750];
  if(world>6000){rooms.push(world-1900);cabinets.push(world-1050);}
  for(const x of rooms)if(visible(x,360,cam))meetingRoom(c,x);
  for(const x of cabinets)if(visible(x,138,cam))cabinet(c,x,310);
  for(const x of [480,1850,2480,4190,coffeeX-330])if(visible(x,70,cam))plant(c,x+25,466,.85);
  if(visible(2360,150,cam)){poster(c,2360,227,'RESPIRA.','O CAFÉ ESTÁ LOGO ALI.');oval(c,2537,220,23,23,'#f6f7e9',INK,2);ln(c,2537,220,2537,205,INK,2);ln(c,2537,220,2547,223,INK,2);}
  if(visible(coffeeX-1000,110,cam))poster(c,coffeeX-1000,228,'QUASE LÁ!','PENDÊNCIAS NÃO TÊM FIM.','#bedfc9');
  for(const x of [1500,2890,4340,coffeeX-1030].filter((x,i,a)=>a.indexOf(x)===i))if(visible(x,116,cam)){rect(c,x,183,116,34,6,'#3d817e',INK,2);label(c,'COPA   →',x+58,201,13,'#eff6df');}
  c.restore();
}
function andersonCubicle(c){
  // Starting point: lovingly excessive paper piles and an unmistakable nameplate.
  officeChair(c,205,463);
  rect(c,45,306,302,139,5,'#c2d5d0',INK,2);rect(c,52,314,286,65,3,'#dbe7dd','#8eaaa0',1.5);
  rect(c,35,392,326,14,4,'#f6f4e5',INK,2.5);rect(c,48,406,301,62,4,'#e2e7d9',INK,2);
  rect(c,54,415,72,44,3,'#cfdbce','#91a79c',1.5);ln(c,71,428,108,428,'#789c8e',3);ln(c,71,447,108,447,'#789c8e',3);
  monitor(c,270,391);paperPile(c,62,388,27,72);paperPile(c,135,388,17,66);
  c.save();c.translate(95,294);c.rotate(-.07);rect(c,-30,-14,71,28,3,'#f7dc90',INK,1.5);label(c,'URGENTE',5,0,10,'#a05b40');c.restore();
  rect(c,140,318,119,31,5,'#447f79',INK,2);label(c,'ANDERSON',199.5,334,12,'#eff8db');
  rect(c,285,325,31,29,2,'#f4da91','#c1ab72',1);label(c,'café?',300,338,8,'#8c7745');
  rect(c,45,471,314,12,3,'#75958a',INK,2);
}
function desk(c,d,i){
  const {x,y,w}=d,h=500-y;
  oval(c,x+w/2,503,w*.6,6,'#3a62551c');
  // The entire desk front is solid, matching the physical collision rectangle.
  rect(c,x+5,y+8,w-10,h-8,3,i%2?'#c2d2cc':'#d1d9cf',INK,2.5);
  rect(c,x+12,y+17,w-24,h-28,3,'#e3e8dc','#93aaa0',1.5);
  if(i%3===1){for(let j=0;j<2;j++){ln(c,x+13,y+35+j*20,x+w-13,y+35+j*20,'#a6b8ad',1.5);rect(c,x+w/2-12,y+24+j*20,24,4,2,'#6f9186',null);}}
  else{ln(c,x+w*.63,y+17,x+w*.63,491,'#9bafa5',1.5);rect(c,x+w*.8-9,y+27,18,4,2,'#6f9186',null);}
  rect(c,x-1,y,w+2,11,3,'#fcf8e9',INK,2.5);ln(c,x+3,y+3,x+w-3,y+3,'#fffef3',2);
  // Small desktop objects keep the full jump arc and landing surface legible.
  if(i%3===0){paperPile(c,x+12,y-3,5,38);rect(c,x+w-37,y-22,23,20,3,'#81aaa1',INK,1.5);ln(c,x+w-30,y-22,x+w-32,y-35,'#e4ad4b',3);ln(c,x+w-23,y-22,x+w-20,y-36,'#517880',3);}
  else if(i%3===1){rect(c,x+16,y-8,58,7,2,'#a2b3aa',INK,1.5);for(let k=0;k<6;k++)ln(c,x+21+k*8,y-6,x+21+k*8,y-3,'#e2e9de',1);paperPile(c,x+w-42,y-3,3,29);}
  else{c.save();c.translate(x+29,y-11);c.rotate(-.1);rect(c,-18,-7,39,14,1,'#fbf8e9','#9eb2a4',1);ln(c,-10,-3,9,-3,'#9eb2a4',1);c.restore();rect(c,x+w-40,y-24,23,23,3,'#c0d4a3',INK,1.5);oval(c,x+w-28.5,y-24,11,3,'#8ba472',INK,1);}
  // An understated edge marker reinforces that desks must be jumped.
  for(let k=0;k<3;k++)poly(c,[[x+10+k*9,y+7],[x+14+k*9,y+7],[x+12+k*9,y+11],[x+8+k*9,y+11]],'#6d9d91',null);
}
function floor(c,s){
  const cam=s.camera||0,world=s.worldWidth||6600;c.save();c.translate(-cam,0);
  rect(c,0,466,world,34,0,'#d8e1d5',null);ln(c,0,469,world,469,'#afc3b6',2);
  const g=c.createLinearGradient(0,500,0,600);g.addColorStop(0,'#becbbb');g.addColorStop(1,'#9db2a2');c.fillStyle=g;c.fillRect(0,500,world,100);ln(c,0,500,world,500,INK,3);
  for(let x=0;x<world;x+=210){ln(c,x,501,x-50,600,'#90aa9b',1.4);ln(c,x,542,x+209,542,'#c9d6c4',1.2);ln(c,x-25,578,x+184,578,'#8fa99a',1.1);}
  for(let x=700;x<world-500;x+=900){c.save();c.translate(x+130,550);c.globalAlpha=.45;poly(c,[[-23,-6],[2,-6],[2,-13],[22,0],[2,13],[2,6],[-23,6]],'#6e9683',null);c.restore();}
  c.restore();
}
function cup(c,x,y,scale=1,steam=0){
  c.save();c.translate(x,y);c.scale(scale,scale);
  c.strokeStyle='#7d9690';c.lineWidth=2;
  for(let i=-1;i<=1;i++){
    c.beginPath();c.moveTo(i*6,-18);c.bezierCurveTo(i*6-7,-25,i*6+7,-31,i*6+Math.sin(steam*3+i)*3,-38);c.stroke();
  }
  oval(c,0,12,20,4,'#e8e9d6',INK,1.7);c.beginPath();c.arc(14,-2,7,-Math.PI/2,Math.PI/2);c.lineWidth=4;c.strokeStyle=INK;c.stroke();c.lineWidth=2;c.strokeStyle='#f8f7de';c.stroke();
  rect(c,-13,-15,27,26,5,'#fffbe7',INK,2);oval(c,.5,-15,13.5,4,'#77543c',INK,1.5);oval(c,-3,-15,6,2,'#c89a65');label(c,'☕',0,0,10,'#567f69');c.restore();
}
function pantry(c,coffee,t){
  const x=coffee.x,y=coffee.y||430;
  c.save();c.translate(x,y);
  rect(c,-185,-228,385,298,6,'#e5ecdf','#8ea79b',2);
  for(let k=0;k<6;k++)ln(c,-183,-178+k*39,198,-178+k*39,'#c6d6c7',1);
  for(let k=0;k<6;k++)ln(c,-166+k*66,-225,-166+k*66,68,'#c6d6c7',1);
  rect(c,-164,-204,154,58,5,'#b0c9bd',INK,2);rect(c,12,-204,163,58,5,'#b0c9bd',INK,2);
  ln(c,-87,-201,-87,-148,'#77998b',1.5);ln(c,92,-201,92,-148,'#77998b',1.5);
  for(const xx of [-99,-76,79,104])ln(c,xx,-175,xx,-160,'#5d8377',3);
  rect(c,-175,23,364,47,4,'#d5dfcd',INK,2);rect(c,-183,16,380,12,3,'#faf7e3',INK,2.5);
  for(let k=0;k<3;k++){rect(c,-164+k*114,33,103,31,3,'#b9cebd','#85a492',1.5);ln(c,-126+k*114,42,-99+k*114,42,'#668d7d',3);}
  rect(c,-89,-266,179,47,8,'#3c8177',INK,2.5);label(c,'COPA',0,-248,23,'#f0f5d6');label(c,'UMA PAUSA MERECIDA',0,-230,7.2,'#c7dfc4');
  // Large, easy-to-find automatic machine. Its cup is at the engine's click centre.
  rect(c,-65,-129,130,143,12,'#556c70',INK,3);rect(c,-57,-121,114,125,8,'#b0c1b8',INK,2);
  rect(c,-42,-109,84,29,5,'#234e4b',INK,2);label(c,coffee.collected?'PRONTO!':'EXPRESSO',0,-97,11,'#cce5b1');
  for(let k=0;k<3;k++)oval(c,-20+k*20,-85,2,2,coffee.collected?'#bce77b':'#8fb8a0');
  rect(c,-41,-68,82,70,5,'#3e5355',INK,2);rect(c,-37,-63,74,62,3,'#6c7e75',null);
  rect(c,-10,-68,20,28,4,'#c6d0c6',INK,2);rect(c,-4,-41,8,10,2,'#314c49',null);
  rect(c,-48,3,96,8,2,'#374c4d',INK,1.5);for(let k=0;k<10;k++)ln(c,-40+k*9,5,-40+k*9,9,'#819a8b',1);
  oval(c,46,-50,6,6,'#a8d87e',INK,1.5);oval(c,46,-31,5,5,'#d2dcc0',INK,1.5);
  if(!coffee.collected){
    const pulse=Math.sin(t*3)*3;oval(c,0,-2,35+pulse,35+pulse,'#f6d87526','#d8bd66',1.5);cup(c,0,-2,1,t);
    rect(c,-67,40,134,28,6,'#f5dc8e',INK,2);label(c,'CLIQUE OU E',0,54,12);
  }else{label(c,'✓',0,-20,38,'#c0e684');}
  // Pantry details: water bottle, cups, bins and a cheerful plant.
  rect(c,102,-40,24,54,6,'#b4d6ce99',INK,1.5);rect(c,108,-46,13,10,3,'#5b8e9b',INK,1.5);rect(c,105,-16,18,17,2,'#e5ecd6',null);
  for(let i=0;i<3;i++)cup(c,-118+i*6,8-i*5,.5,0);
  c.restore();
}

function face(c,cx,cy,r=25,facing=1,stress=false){
  oval(c,cx-r,cy+1,5,8,'#e9b385',INK,1.5);oval(c,cx+r,cy+1,5,8,'#e9b385',INK,1.5);
  oval(c,cx,cy,r,r+1,'#efc39c',INK,2.5);
  c.beginPath();c.moveTo(cx-r+1,cy-5);c.bezierCurveTo(cx-r-5,cy-r-9,cx-3,cy-r-13,cx+9,cy-r+1);c.bezierCurveTo(cx+r+3,cy-r+1,cx+r+8,cy-12,cx+r-1,cy-3);c.lineTo(cx+r-6,cy-15);c.quadraticCurveTo(cx+2,cy-12,cx-8,cy-22);c.quadraticCurveTo(cx-15,cy-8,cx-r+1,cy-5);c.fillStyle='#51463b';c.fill();c.strokeStyle=INK;c.lineWidth=2.5;c.stroke();
  const eyes=r*.35,eyeY=cy-3;
  oval(c,cx-eyes,eyeY,r*.23,r*.28,'#fff8e7',INK,1.1);oval(c,cx+eyes,eyeY,r*.23,r*.28,'#fff8e7',INK,1.1);
  oval(c,cx-eyes+facing*2,eyeY+1,2.2,3.4,INK);oval(c,cx+eyes+facing*2,eyeY+1,2.2,3.4,INK);
  ln(c,cx-eyes-4,cy-14,cx-eyes+5,cy-(stress?17:15),'#5c493e',2);ln(c,cx+eyes-4,cy-(stress?16:15),cx+eyes+5,cy-14,'#5c493e',2);
  poly(c,[[cx,cy+1],[cx-2,cy+8],[cx+4,cy+8]],null,'#bb865e',1.4,false);
  c.beginPath();c.moveTo(cx-7,cy+13);c.quadraticCurveTo(cx+1,cy+(stress?12:21),cx+9,cy+12);c.strokeStyle=INK;c.lineWidth=1.8;c.stroke();
  if(stress){poly(c,[[cx+r-2,cy-16],[cx+r+4,cy-6],[cx+r+4,cy-2],[cx+r-2,cy]],'#a5dce0','#5b9cb1',1);}
}
function sleeve(c,x,y,angle,shade='#d5e7eb'){
  c.save();c.translate(x,y);c.rotate(angle);rect(c,-6,-2,13,26,5,shade,INK,2);rect(c,-6,19,13,7,2,'#f2f4e9',INK,1.3);oval(c,.5,29,6,7,'#efc39c',INK,1.6);c.restore();
}
export function drawAnderson(c,x,y,o={}){
  c.save();c.translate(x,y);if(o.scale)c.scale(o.scale,o.scale);
  const t=o.time||0,walk=o.walking?Math.sin(t*13):0,facing=o.facing===-1?-1:1;
  oval(c,0,-1,o.ducking?31:26,5,'#254f4126');
  if(o.ducking){
    poly(c,[[-9,-19],[-29,-12],[-21,-4],[-2,-6],[13,-4],[25,-10],[12,-21]],'#b6a37b',INK,2.5);
    rect(c,-30,-7,24,8,4,'#765443',INK,2);rect(c,6,-7,26,8,4,'#765443',INK,2);
    rect(c,-15,-31,39,19,7,'#cfe4e9',INK,2);sleeve(c,19,-27,-.95,'#cfe4e9');
    face(c,facing*7,-40,19,facing,Boolean(o.stress));
  }else{
    const lean=o.walking?facing*.045:0;c.rotate(lean);const bob=o.walking?Math.abs(walk)*2:Math.sin(t*2)*.5;c.translate(0,-bob);
    const left=walk*7,right=-walk*7;
    poly(c,[[-17,-34],[-17+left,-10],[-4+left,-7],[-1,-33]],'#b9aa85',INK,2.5);poly(c,[[0,-33],[3+right,-7],[17+right,-10],[17,-34]],'#cbb995',INK,2.5);
    ln(c,-10,-30,-10+left,-12,'#dcd0ae',1.4);ln(c,8,-30,10+right,-12,'#e1d4b0',1.4);
    rect(c,-21+left,-10,26,10,4,'#795b49',INK,2.5);rect(c,1+right,-10,27,10,4,'#88654c',INK,2.5);ln(c,-18+left,-3,1+left,-3,'#b8956d',1);ln(c,6+right,-3,25+right,-3,'#b8956d',1);
    sleeve(c,-20,-63,walk*.7+.16,'#c3dce2');
    rect(c,-22,-65,44,35,9,'#d6e7e8',INK,2.5);rect(c,-21,-35,42,6,2,'#725c43',INK,1.5);rect(c,-3,-35,7,6,1,'#c5bf96',INK,1);
    poly(c,[[-11,-64],[0,-54],[9,-64],[4,-69],[-5,-69]],'#fbfaf0',INK,1.4);ln(c,0,-54,0,-37,'#a1b9bd',1.2);oval(c,3,-48,1.1,1.1,'#839da3');oval(c,3,-40,1.1,1.1,'#839da3');
    // A badge lanyard makes the administrator's outfit distinct from coveralls.
    poly(c,[[-10,-62],[-4,-44],[10,-44],[14,-62]],null,'#438982',2,false);rect(c,-3,-47,15,16,2,'#fffce4',INK,1);rect(c,-1,-45,11,4,1,'#4b9a8c',null);oval(c,4.5,-38,2,2,'#c9a481');
    sleeve(c,20,-62,-walk*.7-.2,'#d6e7e8');
    face(c,0,-85,25,facing,Boolean(o.stress));
    if(o.success)cup(c,31,-39,.7,t);
  }
  if(o.player){rect(c,-38,o.ducking?-83:-141,76,17,5,'#e4f1d3',INK,1.8);label(c,'ANDERSON',0,o.ducking?-74.5:-132.5,9);}
  c.restore();
}
function department(origin){
  const str=String(origin||'PSPO');
  if(str.includes('Pré')||str.toLowerCase().includes('preop'))return{color:'#c77c62',first:'PRÉ-OP',second:'P-83'};
  return{color:{SMS:'#c79243',IEEI:'#6c9e73',IED:'#6896ac'}[str]||'#659e96',first:str,second:'VIAGEM'};
}
function specialForm(c,f,t,reduce){
  const style=specialStyle(f.kind),w=f.w||54,h=f.h||64,pulse=dangerPulse(t-(f.startedAt||0),reduce);
  c.save();c.translate(f.x,f.y);c.rotate(reduce?0:(f.angle||0));
  // The sheet stays fully opaque; only its warning outline gently pulses.
  c.save();c.globalAlpha=pulse*.42;rect(c,-w/2-5,-h/2-5,w+10,h+10,8,null,style.color,3);c.restore();
  const dir=f.vx>0?-1:1;
  for(let i=0;i<3;i++)ln(c,dir*(w/2+10),-14+i*14,dir*(w/2+25+(i%2)*9),-14+i*14,style.color+'99',2.5);
  rect(c,-w/2+3,-h/2+4,w,h,3,'#38585430',null);
  poly(c,[[-w/2,-h/2],[w/2-11,-h/2],[w/2,-h/2+11],[w/2,h/2],[-w/2,h/2]],style.pale,style.dark,2.7);
  poly(c,[[w/2-11,-h/2],[w/2-11,-h/2+11],[w/2,-h/2+11]],'#fffcef',style.dark,1.4);
  rect(c,-w/2+5,-h/2+5,w-15,13,2,style.color,null);label(c,'!',-w/2+12,-h/2+12,12,'#fff8e4');label(c,'FORM',7,-h/2+12,6.5,'#fff8e4');
  if(f.kind==='return'){
    label(c,'Remarcação',0,-5,7.8,style.dark);label(c,'de',0,6,8,style.dark);label(c,'retorno',0,17,9.5,style.dark);
  }else{
    label(c,'Urgente',0,2,11.5,style.dark);label(c,'!',0,20,14,style.color);
  }
  c.restore();
  // The full title travels with its sheet, above the collision body, for legibility.
  const captionWidth=f.kind==='return'?156:92,captionY=f.y-h/2-25;
  c.save();rect(c,f.x-captionWidth/2,captionY-11,captionWidth,22,6,style.pale,style.color,2);label(c,style.title,f.x,captionY,10,style.dark);
  poly(c,[[f.x-4,captionY+11],[f.x,captionY+16],[f.x+4,captionY+11]],style.pale,style.color,1.5);
  c.save();c.globalAlpha=pulse;oval(c,f.x+w/2+13,f.y-h/2+4,10,10,style.color,style.dark,1.5);label(c,'!',f.x+w/2+13,f.y-h/2+4,14,'#fff8e4');c.restore();c.restore();
}
function form(c,f,t,reduce=false){
  if(f.active===false)return;
  if(specialStyle(f.kind)){specialForm(c,f,t,reduce);return;}
  const w=f.w||44,h=f.h||56,dep=department(f.origin);
  c.save();c.translate(f.x,f.y);c.rotate(f.angle||0);
  const dir=f.vx>0?-1:1;ln(c,dir*(w/2+7),-12,dir*(w/2+25),-12,'#75999180',2);ln(c,dir*(w/2+8),0,dir*(w/2+18),0,'#75999180',2);ln(c,dir*(w/2+8),12,dir*(w/2+28),12,'#75999180',2);
  rect(c,-w/2+3,-h/2+4,w,h,3,'#38585422',null);
  poly(c,[[-w/2,-h/2],[w/2-10,-h/2],[w/2,-h/2+10],[w/2,h/2],[-w/2,h/2]],PAPER,INK,2);
  poly(c,[[w/2-10,-h/2],[w/2-10,-h/2+10],[w/2,-h/2+10]],'#d9e6da',INK,1.5);
  rect(c,-w/2+4,-h/2+8,w-17,4,1,dep.color,null);
  label(c,dep.first,0,-4,dep.first.length>5?8:10,dep.color);label(c,dep.second,0,8,7,'#7c8e7d');
  ln(c,-w/2+7,17,w/2-7,17,'#bfccbc',1.2);ln(c,-w/2+7,22,w/2-12,22,'#bfccbc',1.2);
  c.restore();
}
function specialAnnouncement(c,cue,s,style,reduce){
  const duration=cue.warningDuration||.65,started=cue.startedAt??cue.until-duration,age=Math.max(0,(s.elapsed||0)-started),intro=Math.min(1,age/.18);
  // A short arrival bounce stays well above Anderson and the projectile lane.
  const scale=reduce?1:intro<.72?.86+intro/.72*.17:1.03-(intro-.72)/.28*.03;
  c.save();c.translate(600,108+(reduce?0:(1-intro)*-8));c.scale(scale,scale);
  poly(c,[[-220,-20],[-240,-20],[-231,0],[-240,20],[-220,20]],style.color,style.dark,2);
  poly(c,[[220,-20],[240,-20],[231,0],[240,20],[220,20]],style.color,style.dark,2);
  rect(c,-218,-28,440,66,12,'#38585430',null);rect(c,-220,-32,440,66,12,style.pale,style.dark,2.5);
  const pulse=dangerPulse(age,reduce);c.save();c.globalAlpha=pulse;oval(c,-177,0,21,21,style.color,style.dark,2);label(c,'!',-177,0,29,'#fff9e6');c.restore();
  label(c,'FORM ESPECIAL A CAMINHO',20,-16,8.5,style.dark);label(c,style.title,20,5,21,style.dark);label(c,'Cuidado com essa demanda!',20,24,9,style.dark);
  c.restore();
}
function incomingCue(c,cue,s,reduce=false){
  if(!cue||cue.until<=s.elapsed)return;
  const x=Math.max(50,Math.min(1150,cue.x-(s.camera||0))),y=Math.max(95,Math.min(455,cue.y)),special=specialStyle(cue.kind);
  if(special){
    specialAnnouncement(c,cue,s,special,reduce);
    c.save();c.globalAlpha=dangerPulse((s.elapsed||0)-(cue.startedAt||0),reduce);oval(c,x,y,19,19,special.pale,special.color,3);label(c,'!',x,y,25,special.dark);c.restore();return;
  }
  const dep=department(cue.origin);c.save();c.globalAlpha=dangerPulse(s.elapsed||0,reduce);rect(c,x-39,y-16,78,32,9,'#fff2c9',dep.color,2);label(c,'! '+dep.first,x,y,12,dep.color);c.restore();
}
export function drawOffice(c,s){
  const cam=s.camera||0,t=s.elapsed||0,office=s.office||{},coffee=office.coffee||{x:(s.worldWidth||6600)-230,y:430,collected:false},reduce=reducedMotion(s);
  c.save();c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,1200,600);c.lineCap='round';c.lineJoin='round';
  windows(c,s);backWorkstations(c,s);middleOffice(c,s);floor(c,s);
  c.save();c.translate(-cam,0);
  if(visible(35,330,cam))andersonCubicle(c);
  if(visible(coffee.x-185,385,cam))pantry(c,coffee,t);
  (s.platforms||[]).forEach((d,i)=>{if(visible(d.x,d.w,cam))desk(c,d,i);});
  for(const f of office.forms||[])if(visible(f.x-90,180,cam))form(c,f,t,reduce);
  if(s.player){
    const invulnerable=t<(office.invulnerableUntil||0),p=s.player;
    c.save();if(invulnerable&&Math.floor(t*13)%2)c.globalAlpha=.38;
    drawAnderson(c,p.x,p.y,{time:t,walking:p.walking,facing:p.facing,ducking:p.ducking,stress:(office.hits||0)>0||p.walking,player:true,success:coffee.collected});c.restore();
    if(invulnerable){for(let i=0;i<3;i++){const a=t*5+i*2.1;label(c,'✦',p.x+Math.cos(a)*36,p.y-(p.ducking?66:120)+Math.sin(a)*9,13,'#bb874b');}}
  }
  for(const p of s.particles||[]){c.globalAlpha=Math.min(1,Math.max(0,p.life/(p.maxLife||1)));oval(c,p.x,p.y,p.size||3,p.size||3,p.color||'#f4d074');}c.restore();
  incomingCue(c,office.telegraph,s,reduce);
  // Architectural identification remains readable throughout the long corridor.
  rect(c,20,12,322,32,8,'#f2f5e9e8','#8ca7a2',1.5);rect(c,28,19,29,18,4,'#438b80',null);label(c,'B',42.5,28,12,'#f2f7db');label(c,'EDISEN  ·  TORRE B  ·  12º ANDAR',69,28,10.2,'#3e6764','left');
  c.restore();
}
export function drawOfficePortrait(c,size=128){
  c.save();c.clearRect(0,0,c.canvas?.width||size,c.canvas?.height||size);oval(c,size/2,size/2,size*.46,size*.46,'#c7dfdb');
  c.translate(size/2,size*.96);c.scale(size/128,size/128);drawAnderson(c,0,0,{time:0,walking:false,scale:1});c.restore();
}
