// A short victory beat shared by the five original characters.
const motionQuery = typeof window !== 'undefined' && typeof window.matchMedia === 'function'
  ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
const CAPTIONS = {
  sms: ['Jaqueline', 'Cinco observações. Convés mais seguro!'],
  ieei: ['José Roberto', 'Três reparos. Ferrugem vencida!'],
  ied: ['Willian', 'Tudo alinhado. P-83 no ritmo!'],
  pspo: ['Anderson', 'Café na mão. Missão cumprida!'],
  preop: ['Fabrício', 'TAP aprovada (FIC concluída)'],
};

export function celebrationPose(state) {
  if (!state?.celebration) return null;
  const duration = state.celebration.duration || 2.8;
  const time = Math.max(0, Math.min(duration, state.celebration.elapsed || 0));
  const reduced = state.reducedMotion === true || Boolean(motionQuery?.matches);
  const lift = reduced ? 1 : Math.min(1, time / .34);
  // Two small hops, followed by a held victory pose; no motion after completion.
  const beat = Math.abs(Math.sin(Math.min(1, time / 1.5) * Math.PI * 2));
  const hop = reduced || time > 1.5 ? 0 : beat * 17;
  const sway = reduced || time >= duration ? 0 : Math.sin(time * 6) * .035 * lift;
  return { time, duration, reduced, lift, hop, sway };
}

function caption(c, value, x, y, size, color = '#23483f') {
  c.font = `800 ${size}px "Trebuchet MS", Arial, sans-serif`;
  c.fillStyle = color; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(value, x, y);
}
function star(c, x, y, size, color) {
  c.save(); c.translate(x,y); c.beginPath();
  for(let i=0;i<8;i++){const angle=i*Math.PI/4-Math.PI/2, radius=i%2?size*.28:size;const p=[Math.cos(angle)*radius,Math.sin(angle)*radius];i?c.lineTo(...p):c.moveTo(...p);}
  c.closePath();c.fillStyle=color;c.fill();c.restore();
}

export function drawCelebrationOverlay(c, state) {
  const pose = celebrationPose(state); if (!pose) return;
  const {time, duration, reduced} = pose;
  const px = (state.player?.x || 600) - (state.camera || 0);
  const py = (state.player?.y || 500) - 85 - pose.hop;
  c.save(); c.setTransform(1,0,0,1,0,0);
  const colors = ['#f3c754','#80bd98','#e58d62','#9b8bbb','#eaf1bf'];
  if(reduced){
    for(let i=0;i<5;i++){const a=i*Math.PI*.4;star(c,px+Math.cos(a)*69,py-24+Math.sin(a)*53,6,colors[i]);}
  } else {
    const age=Math.min(time,2.6), alpha=Math.min(1,time/.18)*Math.min(1,(duration+.25-time)/.5);
    c.globalAlpha=Math.max(0,alpha);
    for(let i=0;i<25;i++){
      const angle=(i*2.39996)-Math.PI, speed=46+(i%5)*15;
      const x=px+Math.cos(angle)*speed*age;
      const y=py-24+Math.sin(angle)*speed*age+28*age*age;
      c.save();c.translate(x,y);c.rotate(i+age*(i%2?2:-2));c.fillStyle=colors[i%colors.length];c.fillRect(-3,-5,6,10);c.restore();
    }
    for(let i=0;i<4;i++){const a=i*Math.PI/2+time*.6;star(c,px+Math.cos(a)*67,py-18+Math.sin(a)*59,5+Math.sin(time*4+i)*1.5,colors[i]);}
  }
  c.globalAlpha=1;
  const show = reduced ? 1 : Math.min(1,time/.23);
  c.save();c.translate(600,show*9);c.globalAlpha=show;
  c.beginPath();c.roundRect(-246,31,492,72,16);c.fillStyle='#fff6d9f5';c.fill();c.strokeStyle='#345d4d';c.lineWidth=3;c.stroke();
  star(c,-216,57,10,'#c89835');star(c,216,57,10,'#c89835');
  caption(c,'MISSÃO CUMPRIDA!',0,55,21);
  caption(c,CAPTIONS[state.stageId]?.[1] || 'Mandou bem!',0,82,13,'#60764e');
  c.restore();c.restore();
}
