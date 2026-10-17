import {initialWorld,applyAction,advanceWorld,isPassable,roomAt,snapshot,loadSnapshot,WIDTH,HEIGHT} from './simulation.js';
import {interpretIntent} from './intent.js';
import './style.css';
const app=document.querySelector('#app');
app.innerHTML=`<header><h1>STANDARD<span>REALITY</span></h1><small>THE MENDER · M1 ACTION INTERPRETER</small></header><main><section><canvas id="world" width="704" height="480" tabindex="0" aria-label="Crawler world"></canvas><div class="hint">Move: WASD / arrows · Select an item by clicking · Pick up / drop: E · Type 'generator off' in ENGINE · Wait: buttons</div><form id="command"><input id="intent" placeholder="Try: go north, take mug, drop mug..." autocomplete="off"/><button>Attempt</button></form><div id="feedback"></div></section><aside><h2>WORLD STATE</h2><div id="details"></div><div class="buttons"><button id="save">Save snapshot</button><button id="load">Load snapshot</button><button id="reset">Reset</button><button id="wait">Wait</button><button id="wait5">Wait 5</button></div><h2>EVENT LOG</h2><div id="events"></div><h2>EXPERIMENT NOTES</h2><p>Free-form intentions are interpreted by an optional server-side LLM, validated, then attempted in the deterministic world. Speak near someone to generate witnessed statements. No AI key required for basic actions.</p></aside></main>`;
let world=initialWorld(),selected='cup';
const canvas=document.querySelector('#world'),ctx=canvas.getContext('2d'),size=32;
const colors={canteen:'#314a4c',workshop:'#594836',engine:'#493e50',airlock:'#3b4d40',exterior:'#283b34'};
function draw(){
 ctx.fillStyle='#11191b';ctx.fillRect(0,0,704,480);
 for(let y=0;y<HEIGHT;y++)for(let x=0;x<WIDTH;x++){
  const room=roomAt(x,y),pass=isPassable(x,y);
  ctx.fillStyle=pass?colors[room]:'#182329';ctx.fillRect(x*size,y*size,size-1,size-1);
  if(pass&&((x*17+y*19)%13===0)){ctx.fillStyle='#76817644';ctx.fillRect(x*size+8,y*size+8,3,3);}
 }
 for(const e of world.entities){
  if(e.kind==='item'&&e.carriedBy)continue;
  ctx.fillStyle=e.id===selected?'#f3c56a':(e.kind==='person'?'#92d4c8':'#c0a975');
  if(e.kind==='person'){ctx.beginPath();ctx.arc(e.x*size+16,e.y*size+16,10,0,Math.PI*2);ctx.fill();}
  else ctx.fillRect(e.x*size+9,e.y*size+9,14,14);
  if(e.id==='player'){ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.strokeRect(e.x*size+4,e.y*size+4,24,24);}
 }
 ctx.fillStyle='#c5d6d1';ctx.font='11px monospace';
 for(const [name,x,y] of [['CANTEEN',3,2],['WORKSHOP',12,2],['ENGINE',3,9],['AIRLOCK',12,9],['OUTSIDE',17,10]])ctx.fillText(name,x*size,y*size+12);
 document.querySelector('#details').innerHTML=`<p>Tick: <b>${world.tick}</b> · Position: <b>${world.entities[0].x},${world.entities[0].y}</b></p><p>Room: <b>${roomAt(world.entities[0].x,world.entities[0].y)}</b></p><p>Holding: <b>${world.entities.find(e=>e.id===world.entities[0].carrying)?.name||'nothing'}</b></p><p>Selected: <b>${world.entities.find(e=>e.id===selected)?.name||'none'}</b></p>`;
 document.querySelector('#details').insertAdjacentHTML('beforeend',`<p>Generator: <b>${world.systems.generatorOn?'ON':'OFF'}</b> · Lights: <b>${world.systems.lightsOn?'ON':'OFF'}</b></p><p>Cooling: <b>${world.systems.coolingOn?'ON':'OFF'}</b> · Cargo: <b>${world.systems.cargoTemperature}°C</b></p><p>Samples: <b>${world.systems.samplesSpoiled?'SPOILED':'OK'}</b></p>`);
 document.querySelector('#events').replaceChildren(...world.events.slice(-14).reverse().map(e=>{const p=document.createElement('p');p.textContent=`#${e.id} [${e.tick}] ${e.type}: ${e.reason||e.itemId||e.actorId||''}`;return p;}));
}
function act(a){world=applyAction(world,a);draw();}
function step(dx,dy){act({type:'move',dx,dy});}
function itemAction(){
 const actor=world.entities[0],item=world.entities.find(e=>e.id===selected);
 if(item)act({type:actor.carrying===item.id?'drop':'pickup',targetId:item.id});
}
canvas.addEventListener('click',e=>{const rect=canvas.getBoundingClientRect(),x=Math.floor((e.clientX-rect.left)*canvas.width/rect.width/size),y=Math.floor((e.clientY-rect.top)*canvas.height/rect.height/size);const item=world.entities.find(a=>a.kind==='item'&&!a.carriedBy&&a.x===x&&a.y===y);if(item)selected=item.id;draw();canvas.focus();});
window.addEventListener('keydown',e=>{
 if(['INPUT','TEXTAREA'].includes(document.activeElement?.tagName))return;
 const dirs={w:[0,-1],ArrowUp:[0,-1],s:[0,1],ArrowDown:[0,1],a:[-1,0],ArrowLeft:[-1,0],d:[1,0],ArrowRight:[1,0]};
 if(dirs[e.key]){e.preventDefault();step(...dirs[e.key]);}else if(e.key.toLowerCase()==='e')itemAction();
});
document.querySelector('#command').addEventListener('submit',async e=>{
 e.preventDefault();
 const input=document.querySelector('#intent'),button=document.querySelector('#command button'),intent=input.value.trim();
 if(!intent||button.disabled)return;
 input.value='';button.disabled=true;document.querySelector('#feedback').textContent='Interpreting: '+intent;
 try{
  const {proposal,source,error}=await interpretIntent(intent,world);
  if(!proposal)document.querySelector('#feedback').textContent='Not yet representable: '+intent+(error?' ('+error+')':'');
  else{
   if(proposal.type==='wait')world=advanceWorld(world);
   else world=applyAction(world,proposal);
   document.querySelector('#feedback').textContent=(source==='llm'?'LLM':'Local parser')+' proposed '+JSON.stringify(proposal)+(error?' · AI unavailable: '+error:'');
  }
  draw();
 }catch(err){document.querySelector('#feedback').textContent='Action failed: '+err.message;}
 finally{button.disabled=false;input.focus();}
});
document.querySelector('#save').onclick=()=>{localStorage.setItem('standardReality.m0',snapshot(world));document.querySelector('#feedback').textContent='Snapshot saved locally.';};
document.querySelector('#load').onclick=()=>{try{world=loadSnapshot(localStorage.getItem('standardReality.m0'));draw();}catch{document.querySelector('#feedback').textContent='No valid snapshot found.';}};
document.querySelector('#wait').onclick=()=>{world=advanceWorld(world);draw();};
document.querySelector('#wait5').onclick=()=>{for(let i=0;i<5;i++)world=advanceWorld(world);draw();};
document.querySelector('#reset').onclick=()=>{world=initialWorld();draw();};
draw();
