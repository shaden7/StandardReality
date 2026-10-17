// Canvas tile renderer. Reads canonical world state, never mutates it. Drawn in a 22px tile space and scaled up.
import {WIDTH,HEIGHT,roomAt,isPassable} from './simulation.js';
import {causeTree,nodeAnchor,nodeLabel,agentFacts} from './present.js';
export const TILE=32;
const BASE=22,U=TILE/BASE,CW=WIDTH*BASE,CH=HEIGHT*BASE,T=BASE;
const DOORS=[[10,4,'v'],[5,7,'h'],[13,7,'h'],[16,11,'v']];
const LAMPS=[[6,4],[14,4],[5,10],[13,10],[19,11]];
const ROOM_LABELS=[['Kantine',2,6.85],['Werkstatt',11,6.85],['Maschinenraum',2,8.85],['Schleuse',11,8.85],['Außen',17,10.85]];
const PEOPLE={player:['#3f8fd0','#2a2a2a'],mara:['#d98a3d','#4a2a1a'],ivo:['#e8e4d6','#6b6b6b'],neri:['#8d7fd1','#1c1c2a']};
const SRC={seen:'#5dc88a',heard:'#e5b94e'};
const rnd=(x,y,s=1)=>{const v=Math.sin(x*127.1+y*311.7+s*74.7)*43758.5453;return v-Math.floor(v);};
function roundRect(c,x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath();}
function visibleTiles(px,py,radius){
 const seen=new Set();
 for(let y=0;y<HEIGHT;y++)for(let x=0;x<WIDTH;x++){
  const dx=x-px,dy=y-py;if(dx*dx+dy*dy>radius*radius)continue;
  const n=Math.max(Math.abs(dx),Math.abs(dy));let clear=true;
  for(let i=1;i<n;i++)if(!isPassable(Math.round(px+dx*i/n),Math.round(py+dy*i/n))){clear=false;break;}
  if(clear)seen.add(x+','+y);
 }
 return seen;
}
export function createRenderer(canvas){
 canvas.width=CW*U;canvas.height=CH*U;
 const c=canvas.getContext('2d');
 const sprites=new Map();let spriteEpoch=0;
 const light=document.createElement('canvas');light.width=canvas.width;light.height=canvas.height;
 const l=light.getContext('2d');

 function floorTile(x,y){
  const px=x*T,py=y*T,room=roomAt(x,y);
  if(!room){c.fillStyle='#10171b';c.fillRect(px,py,T,T);c.fillStyle='#1a252a';c.fillRect(px+3,py+3,2,2);c.fillRect(px+T-5,py+T-5,2,2);return;}
  if(!isPassable(x,y)){
   c.fillStyle='#26343b';c.fillRect(px,py,T,T);c.fillStyle='#3c505a';c.fillRect(px,py,T,3);
   c.fillStyle='#161f24';c.fillRect(px,py+T-3,T,3);c.fillStyle='#31434b';c.fillRect(px+T/2-1,py+3,2,T-6);return;
  }
  const alt=(x+y)%2;
  c.fillStyle={canteen:['#3f5857','#46605f'],workshop:['#4d4034','#554638'],engine:['#3f3749','#473f52'],airlock:['#344539','#3b4d41'],exterior:['#2b3a2f','#2b3a2f']}[room][alt];
  c.fillRect(px,py,T,T);
  c.fillStyle='rgba(0,0,0,.22)';c.fillRect(px,py+T-1,T,1);c.fillRect(px+T-1,py,1,T);
  if(room==='workshop'){c.fillStyle='rgba(0,0,0,.18)';c.fillRect(px,py+T/2,T,1);c.fillRect(px+T/2,py,1,T);}
  if(room==='engine'&&rnd(x,y)>.8){c.fillStyle='rgba(20,15,10,.35)';c.fillRect(px+4,py+5,8,5);}
  if(room==='airlock'&&(x===15||y===13))for(let i=0;i<T;i+=6){c.fillStyle=(i/6)%2?'#16191a':'#b99a3a';if(x===15)c.fillRect(px,py+i,T,6);else c.fillRect(px+i,py+T-5,6,5);}
  if(room==='exterior')for(let i=0;i<3;i++){c.fillStyle=rnd(x,y,i+2)>.6?'#6a4f8a':'#1f2b23';c.fillRect(px+Math.floor(rnd(x,y,i+7)*16)+2,py+Math.floor(rnd(x,y,i+9)*16)+2,3,3);}
 }
 function door([x,y,o],on){
  const px=x*T,py=y*T;
  c.fillStyle='#2c3a41';c.fillRect(px,py,T,T);c.fillStyle='#4a5e68';
  if(o==='h'){c.fillRect(px,py,4,T);c.fillRect(px+T-4,py,4,T);}else{c.fillRect(px,py,T,4);c.fillRect(px,py+T-4,T,4);}
  c.fillStyle=on?'#4fd08a':'#e0483c';c.fillRect(px+T/2-2,py+T/2-2,4,4);
 }
 function decor(s,now){
  [[3,2],[4,2]].forEach(([x,y])=>{c.fillStyle='#8a6a44';c.fillRect(x*T+1,y*T+3,T-2,T-6);c.fillStyle='#a2805a';c.fillRect(x*T+1,y*T+3,T-2,4);});
  [[14,2],[15,2],[16,2]].forEach(([x,y])=>{c.fillStyle='#6b7276';c.fillRect(x*T,y*T+3,T,T-6);c.fillStyle='#8b949a';c.fillRect(x*T,y*T+3,T,3);c.fillStyle='#d0a64a';c.fillRect(x*T+6,y*T+9,3,6);});
  [[7,2],[8,2]].forEach(([x,y])=>{c.fillStyle='#3a3d40';c.fillRect(x*T+1,y*T+2,T-2,T-4);c.fillStyle=s.generatorOn?'#e0803a':'#202224';c.beginPath();c.arc(x*T+T/2,y*T+T/2,5,0,7);c.fill();});
  const gx=2*T,gy=12*T,shake=s.generatorOn?Math.sin(now/60)*.6:0;
  c.fillStyle='#4a525c';c.fillRect(gx+2+shake,gy+2,2*T-4,2*T-4);c.fillStyle='#6a7480';c.fillRect(gx+2+shake,gy+2,2*T-4,5);
  c.fillStyle='#2e353c';c.fillRect(gx+8+shake,gy+12,2*T-16,2*T-20);c.fillStyle=s.generatorOn?'#4fd08a':'#e0483c';c.fillRect(gx+6,gy+2*T-9,5,4);
  c.fillStyle=s.coolingOn?'#5f8896':'#4d5c63';c.fillRect(11*T+1,13*T+2,2*T-2,T-4);c.fillStyle='#86b0be';c.fillRect(11*T+1,13*T+2,2*T-2,4);
  if(s.coolingOn){c.fillStyle='rgba(220,245,255,.7)';for(let i=0;i<8;i++)c.fillRect(11*T+2+i*5,13*T+T-4-(i%2)*3,2,2);}
 }
 function item(e,cx,cy,s,now){
  const sprite=sprites.get(e.id);
  if(sprite){c.drawImage(sprite,cx-10,cy-10,20,20);return;}
  if(e.id==='cup'){c.fillStyle='#aab4b8';c.fillRect(cx-3,cy-4,6,7);c.fillStyle='#d6dde0';c.fillRect(cx-3,cy-4,6,2);}
  else if(e.id==='tool'){c.strokeStyle='#c9ced1';c.lineWidth=3;c.beginPath();c.moveTo(cx-5,cy+5);c.lineTo(cx+5,cy-5);c.stroke();c.fillStyle='#c9ced1';c.fillRect(cx+3,cy-8,5,5);}
  else if(e.id==='food'){c.fillStyle='#8f6a3c';c.fillRect(cx-7,cy-5,14,11);c.fillStyle='#b58a52';c.fillRect(cx-7,cy-5,14,3);c.fillStyle='#5a3f22';c.fillRect(cx-1,cy-5,2,11);}
  else if(e.id==='ore'){
   const pulse=.5+.5*Math.sin(now/500);
   c.fillStyle=s.samplesSpoiled?'#7d9a3c':'#8a63d8';c.beginPath();c.moveTo(cx,cy-9);c.lineTo(cx+6,cy+1);c.lineTo(cx,cy+7);c.lineTo(cx-6,cy+1);c.closePath();c.fill();
   c.fillStyle=s.samplesSpoiled?'#b4cf6a':'#c2a4ff';c.fillRect(cx-1,cy-5,2,6);
   c.globalCompositeOperation='lighter';c.fillStyle=(s.samplesSpoiled?'rgba(150,190,70,':'rgba(150,100,255,')+(.08+.1*pulse)+')';c.beginPath();c.arc(cx,cy,T*1.2,0,7);c.fill();c.globalCompositeOperation='source-over';
  }else{c.fillStyle='#9a8f70';c.fillRect(cx-5,cy-5,10,10);}
 }
 function person(e,now,selected){
  const [suit,hair]=PEOPLE[e.id]||['#999','#333'],cx=e.x*T+T/2,cy=e.y*T+T/2+Math.sin(now/400+e.x)*.8;
  c.fillStyle='rgba(0,0,0,.35)';c.beginPath();c.ellipse(cx,cy+8,7,3,0,0,7);c.fill();
  if(e.id==='player'||e.id===selected){c.strokeStyle=e.id===selected?'#f3c56a':'#ffffff';c.lineWidth=1.5;c.beginPath();c.ellipse(cx,cy+8,9,4,0,0,7);c.stroke();}
  c.fillStyle=suit;c.fillRect(cx-5,cy-3,10,11);c.fillRect(cx-7,cy-2,2,7);c.fillRect(cx+5,cy-2,2,7);
  c.fillStyle='rgba(0,0,0,.2)';c.fillRect(cx-5,cy+5,10,3);
  c.fillStyle='#d9b48f';c.beginPath();c.arc(cx,cy-6,5,0,7);c.fill();
  c.fillStyle=hair;c.fillRect(cx-5,cy-11,10,4);
  if(e.id==='ivo'){c.fillStyle='#f2efe6';c.fillRect(cx-4,cy-16,8,6);}
  if(e.id==='mara'){c.fillStyle='#e8c53a';c.fillRect(cx-6,cy-12,12,3);}
 }
 function pill(x,y,text,color,align){
  c.font='11px monospace';const w=c.measureText(text).width+10,bx=align==='l'?x-w:x;
  c.fillStyle='rgba(8,13,16,.9)';roundRect(c,bx,y-8,w,16,3);c.fill();c.strokeStyle=color;c.lineWidth=1;c.stroke();
  c.fillStyle='#e6efec';c.textBaseline='middle';c.textAlign='left';c.fillText(text,bx+5,y+.5);
  return {x:bx,y:y-8,w,h:16};
 }
 function bubble(cx,top,rows,speech){
  c.font='11px monospace';c.textBaseline='middle';c.textAlign='left';
  let w=0;for(const r of rows)w=Math.max(w,c.measureText(r[0]).width);w+=speech?12:22;
  const rowH=speech?15:27,h=rows.length*rowH+6,bx=Math.max(3,Math.min(CW-w-3,cx-w/2)),by=Math.max(3,top-h-6),fill=speech?'#f1f5f3':'rgba(8,13,16,.93)';
  c.fillStyle=fill;roundRect(c,bx,by,w,h,4);c.fill();c.strokeStyle=speech?'#c3cfca':'#4a5d66';c.lineWidth=1;c.stroke();
  c.fillStyle=fill;c.beginPath();c.moveTo(cx-4,by+h-.5);c.lineTo(cx+4,by+h-.5);c.lineTo(cx,by+h+5);c.closePath();c.fill();
  rows.forEach((r,i)=>{
   if(speech){c.fillStyle='#1c2629';c.fillText(r[0],bx+6,by+10+i*rowH);return;}
   const yy=by+10+i*rowH;c.fillStyle=SRC[r[1]];c.fillRect(bx+6,yy-3,6,6);
   c.fillStyle='#e6efec';c.fillText(r[0],bx+17,yy);c.fillStyle='#8497a0';c.fillText(`${r[2]} · ${Math.round(r[3]*100)} %`,bx+17,yy+12);
  });
 }
 function lighting(w,s,player,now){
  l.setTransform(U,0,0,U,0,0);l.globalCompositeOperation='source-over';l.clearRect(0,0,CW,CH);
  l.fillStyle=`rgba(3,7,11,${s.lightsOn?.34:.88})`;l.fillRect(0,0,CW,CH);
  l.globalCompositeOperation='destination-out';
  const hole=(x,y,r,a)=>{const g=l.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,`rgba(0,0,0,${a})`);g.addColorStop(1,'rgba(0,0,0,0)');l.fillStyle=g;l.beginPath();l.arc(x,y,r,0,7);l.fill();};
  if(s.lightsOn)for(const [x,y] of LAMPS)hole((x+.5)*T,(y+.5)*T,6.5*T,.95);
  hole(player.x*T+T/2,player.y*T+T/2,(s.lightsOn?3:4.8)*T*(1+(s.lightsOn?0:Math.sin(now/90)*.03)),.95);
  c.setTransform(1,0,0,1,0,0);c.drawImage(light,0,0);c.setTransform(U,0,0,U,0,0);
  c.globalCompositeOperation='lighter';
  const glow=(x,y,r,rgb,a)=>{const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,`rgba(${rgb},${a})`);g.addColorStop(1,`rgba(${rgb},0)`);c.fillStyle=g;c.beginPath();c.arc(x,y,r,0,7);c.fill();};
  if(s.lightsOn)for(const [x,y] of LAMPS)glow((x+.5)*T,(y+.5)*T,5*T,'255,225,160',.14);
  else{const a=.18+.14*Math.sin(now/350);for(const d of DOORS)glow((d[0]+.5)*T,(d[1]+.5)*T,3.2*T,'230,50,40',a);}
  c.globalCompositeOperation='source-over';
 }
 function overlayKnowledge(w,player,visible){
  c.strokeStyle='rgba(127,184,239,.6)';c.lineWidth=1;c.setLineDash([4,4]);
  const cx=player.x*T+T/2,cy=player.y*T+T/2,r=5*T;
  c.beginPath();c.moveTo(cx,cy-r);c.lineTo(cx+r,cy);c.lineTo(cx,cy+r);c.lineTo(cx-r,cy);c.closePath();c.stroke();c.setLineDash([]);
  for(const e of w.entities){
   if(!w.agents[e.id]||!visible(e))continue;
   const rows=agentFacts(w,e.id).slice(0,2).map(f=>[f.text,f.kind,f.source,f.confidence]);
   if(rows.length)bubble(e.x*T+T/2,e.y*T-12,rows,false);
  }
 }
 function overlayCause(w,eventId,now){
  const events=causeTree(w,eventId).filter(e=>nodeAnchor(w,e)),at=new Map(events.map(e=>[e.id,nodeAnchor(w,e)]));
  if(!events.length)return;
  const newest=Math.max(...events.map(e=>e.id)),color=e=>e.type.startsWith('Statement')?'#7fd6c2':'#f0b429';
  for(const e of events){
   const from=at.get(e.causeId),to=at.get(e.id);if(!from)continue;
   const x1=from.x*T,y1=from.y*T,x2=to.x*T,y2=to.y*T,dx=x2-x1,dy=y2-y1,d=Math.hypot(dx,dy)||1;
   if(d<4)continue;
   const mx=(x1+x2)/2-dy*.18,my=(y1+y2)/2+dx*.18;
   c.strokeStyle=color(e);c.lineWidth=2;c.setLineDash([6,4]);c.lineDashOffset=-now/50;
   c.beginPath();c.moveTo(x1,y1);c.quadraticCurveTo(mx,my,x2,y2);c.stroke();c.setLineDash([]);
   const ax=x2-mx,ay=y2-my,al=Math.hypot(ax,ay)||1,ux=ax/al,uy=ay/al,ex=x2-ux*10,ey=y2-uy*10;
   c.fillStyle=color(e);c.beginPath();c.moveTo(ex,ey);c.lineTo(ex-ux*8-uy*4,ey-uy*8+ux*4);c.lineTo(ex-ux*8+uy*4,ey-uy*8-ux*4);c.closePath();c.fill();
  }
  const placed=[];
  for(const e of events){
   const p=at.get(e.id),x=p.x*T,y=p.y*T,r=e.id===newest?8+1.5*Math.sin(now/200):6;
   c.fillStyle='#0d1316';c.beginPath();c.arc(x,y,r+2,0,7);c.fill();c.fillStyle=color(e);c.beginPath();c.arc(x,y,r,0,7);c.fill();
   const text=`#${e.id} ${nodeLabel(w,e)}`;c.font='11px monospace';
   const width=c.measureText(text).width+10,left=x+r+5+width>CW;
   const dir=y>CH/2?-17:17,x0=left?x-r-5-width:x+r+5;
   let ly=y;for(let n=0;n<8&&placed.some(b=>Math.abs(b.y+8-ly)<17&&b.x<x0+width&&b.x+b.w>x0);n++)ly+=dir;
   const box=pill(left?x-r-5:x+r+5,ly,text,color(e),left?'l':'r');placed.push(box);
  }
 }
 return {
  setSprite(id,url){
   return new Promise((resolve,reject)=>{
    const image=new Image(),epoch=spriteEpoch;
    image.onload=()=>{if(epoch===spriteEpoch)sprites.set(id,image);resolve();};
    image.onerror=()=>reject(Error('Sprite could not be loaded'));
    image.src=url;
   });
  },
  clearSprites(){spriteEpoch++;sprites.clear();},
  draw(world,view,now){
   c.setTransform(U,0,0,U,0,0);c.globalCompositeOperation='source-over';c.lineDashOffset=0;c.setLineDash([]);
   const s=world.systems,player=world.entities[0];
   const radius=view.fog?(s.lightsOn?14:4.6):99,seen=view.fog?visibleTiles(player.x,player.y,radius):null;
   const tileSeen=(x,y)=>!seen||seen.has(x+','+y),visible=e=>e.id==='player'||tileSeen(e.x,e.y);
   for(let y=0;y<HEIGHT;y++)for(let x=0;x<WIDTH;x++)floorTile(x,y);
   for(const d of DOORS)door(d,s.generatorOn);
   decor(s,now);
   c.font='11px monospace';c.textBaseline='alphabetic';c.textAlign='left';c.fillStyle='rgba(197,214,209,.5)';
   for(const [name,x,y] of ROOM_LABELS)c.fillText(name,x*T+4,y*T);
   const byId=Object.fromEntries(world.entities.map(e=>[e.id,e]));
   for(const e of world.entities){
    if(e.kind!=='item')continue;
    const holder=e.carriedBy&&byId[e.carriedBy];
    if(holder){if(visible(holder))item(e,holder.x*T+T/2+9,holder.y*T+T/2+2,s,now);}
    else if(tileSeen(e.x,e.y))item(e,e.x*T+T/2,e.y*T+T/2,s,now);
   }
   if(view.selected&&byId[view.selected]?.kind==='item'&&!byId[view.selected].carriedBy){
    const e=byId[view.selected];c.strokeStyle='#f3c56a';c.lineWidth=1.5;c.strokeRect(e.x*T+3,e.y*T+3,T-6,T-6);
   }
   for(const e of world.entities.filter(e=>e.kind==='person'&&visible(e)).sort((a,b)=>a.y-b.y))person(e,now,view.selected);
   lighting(world,s,player,now);
   if(seen){c.fillStyle='rgba(2,5,7,.82)';for(let y=0;y<HEIGHT;y++)for(let x=0;x<WIDTH;x++)if(!seen.has(x+','+y))c.fillRect(x*T,y*T,T,T);}
   c.font='11px monospace';c.textAlign='center';c.textBaseline='middle';
   for(const e of world.entities.filter(e=>e.kind==='person'&&visible(e))){
    const label=e.id==='player'?'Du':e.name.replace(/\s*\(.*\)$/,''),cx=e.x*T+T/2,cy=e.y*T+T+3;
    c.fillStyle='rgba(0,0,0,.6)';c.fillText(label,cx+1,cy+1);c.fillStyle=e.id==='player'?'#fff':e.id===view.selected?'#f3c56a':'#b9cbc6';c.fillText(label,cx,cy);
   }
   if(view.overlay==='off'){
    const spoken=new Map();
    for(const ev of world.events)if(ev.type==='StatementSpoken'&&ev.tick>=world.tick-1)spoken.set(ev.actorId,ev.text);
    for(const [id,text] of spoken){const e=byId[id];if(e&&visible(e))bubble(e.x*T+T/2,e.y*T-10,[[text.length>40?text.slice(0,38)+'…':text]],true);}
   }
   if(view.overlay==='know')overlayKnowledge(world,player,visible);
   if(view.overlay==='cause'&&view.eventId!=null)overlayCause(world,view.eventId,now);
   c.setTransform(1,0,0,1,0,0);
  },
  tileAt(event){
   const r=canvas.getBoundingClientRect();
   return {x:Math.floor((event.clientX-r.left)*canvas.width/r.width/TILE),y:Math.floor((event.clientY-r.top)*canvas.height/r.height/TILE)};
  }
 };
}
