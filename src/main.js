import {initialWorld,applyAction,advanceWorld,agentView,applyAgentDecision,roomAt,snapshot,loadSnapshot} from './simulation.js';
import {interpretIntent,validateProposal} from './intent.js';
import {createRenderer} from './render.js';
import {formatEvent,shortName,causeTree,latestCaused,agentFacts} from './present.js';
import './style.css';
const app=document.querySelector('#app');
app.innerHTML=`<header><h1>STANDARD<span>REALITY</span></h1><small>THE MENDER · M2 AUTONOMOUS AGENTS</small></header>
<main>
<section>
 <div class="toolbar"><span>Overlay</span><div class="seg" id="overlays"><button data-ov="off">Aus</button><button data-ov="know">Wissen</button><button data-ov="cause">Kausalität</button></div><label><input type="checkbox" id="fog" checked>Sichtlinie</label><span class="hint">Klick wählt aus · Rechtsklick öffnet das Menü · WASD bewegt · E hebt auf oder legt ab</span></div>
 <div id="stage"><canvas id="world" tabindex="0" aria-label="Crawler world"></canvas><div id="menu"></div></div>
 <div class="win" style="margin-top:10px"><div class="title"><span>Chat und Ereignisse</span><span class="mu">Sprache · Aktion · System · abgelehnt</span></div><div class="body"><div id="log"></div><form id="command"><input id="intent" placeholder="Try: say Mara stole the food" autocomplete="off"/><button>Attempt</button></form><div id="feedback"></div></div></div>
</section>
<aside>
 <div class="win"><div class="title"><span>Untersuchen</span><button id="adminToggle">Admin</button></div><div class="body" id="examine"></div></div>
 <div class="win"><div class="title"><span>Simulation</span></div><div class="body"><div class="row"><button id="run">Start</button><label>Speed <select id="speed"><option value="1000">1 tick/s</option><option value="500">2 ticks/s</option><option value="200">5 ticks/s</option></select></label></div><div class="row" style="justify-content:flex-start;gap:6px;flex-wrap:wrap;margin-top:6px"><button id="wait">Step</button><button id="wait5">Step 5</button><button id="save">Save</button><button id="load">Load</button><button id="reset">Reset</button></div></div></div>
 <div class="win"><div class="title"><span>Systeme</span><span id="tickInfo" class="mu"></span></div><div class="body" id="systems"></div></div>
 <div class="win"><div class="title"><span>Hände</span></div><div class="body" id="hands"></div></div>
 <div class="win" id="admin" style="display:none"><div class="title"><span>Admin</span><span id="llm" class="mu"></span></div><div class="body"><div class="hint">Agenten</div><div class="list" id="agents"></div><div class="hint" style="margin-top:8px">Entscheidungen</div><div class="list" id="decisions"></div></div></div>
</aside>
</main>`;
const $=s=>document.querySelector(s);
const esc=s=>String(s).replace(/[&<>"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));
const ROOMS={canteen:'Kantine',workshop:'Werkstatt',engine:'Maschinenraum',airlock:'Schleuse',exterior:'Außen'};
let world=initialWorld(),selected='cup',overlay='off',fog=true,admin=false,causeEvent=null;
let running=false,timer=null,revision=0,runEpoch=0;
let agentBusy=false,lastAgentCall=0,agentCursor=0;
const canvas=$('#world'),renderer=createRenderer(canvas),menu=$('#menu');
const spriteStates=new Map();let assetEpoch=0;
async function requestSprite(item){
 const epoch=assetEpoch;spriteStates.set(item.id,'loading');
 try{
  const response=await fetch('/api/sprite',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name:item.name})});
  const result=await response.json();
  if(!response.ok)throw Error(result.error||'Image generation failed');
  if(!/^\/api\/sprites\/[a-f0-9]{64}\.png$/.test(result.url))throw Error('Invalid sprite URL');
  if(epoch!==assetEpoch)return;
  await renderer.setSprite(item.id,result.url);
  if(epoch!==assetEpoch)return;
  spriteStates.set(item.id,'ready');refresh();
 }catch(error){
  if(epoch!==assetEpoch)return;
  spriteStates.set(item.id,'failed');
  feedback('Grafik für '+item.name+' nicht verfügbar: '+error.message+'. Platzhalter bleibt sichtbar.');
  refresh();
 }
}
function ensureSprites(){
 for(const item of world.entities.filter(e=>e.generated&&e.kind==='item'))if(!spriteStates.has(item.id))void requestSprite(item);
}
function clearSprites(){assetEpoch++;spriteStates.clear();renderer.clearSprites();}
const pause=()=>{running=false;runEpoch++;clearInterval(timer);timer=null;$('#run').textContent='Start';};
async function requestAgentDecision(){
 if(agentBusy||!running||world.tick<15||performance.now()-lastAgentCall<30000)return;
 agentBusy=true;lastAgentCall=performance.now();
 const ids=Object.keys(world.agents),id=ids[agentCursor++%ids.length],view=agentView(world,id),began=performance.now(),epoch=runEpoch;
 try{
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),25000);
  let response;try{response=await fetch('/api/agent-decision',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({view}),signal:controller.signal});}finally{clearTimeout(timeout);}
  if(!response.ok)throw Error('Agent model unavailable');
  const result=await response.json();
  if(!running||runEpoch!==epoch)return;
  const proposal=validateProposal(result.proposal,world);
  world=applyAgentDecision(world,id,proposal,result.reason,result.usage,performance.now()-began);
  revision++;refresh();
 }catch{lastAgentCall=performance.now();}
 finally{agentBusy=false;}
}
const start=()=>{pause();running=true;$('#run').textContent='Pause';timer=setInterval(()=>{world=advanceWorld(world);revision++;refresh();void requestAgentDecision();},Number($('#speed').value));};
function frame(now){
 renderer.draw(world,{selected,overlay,fog,eventId:causeEvent??latestCaused(world)},now);
 requestAnimationFrame(frame);
}
function renderLog(){
 const focus=overlay==='cause'?new Set(causeTree(world,causeEvent??latestCaused(world)).map(e=>e.id)):new Set();
 const lines=[];
 for(const e of world.events.slice(-120)){
  const f=formatEvent(world,e);if(!f)continue;
  const d=document.createElement('div');d.className='ln '+f.cls+(focus.has(e.id)?' hl':'');
  d.append(`[${e.tick}] `);
  if(f.who){const w=document.createElement('span');w.className='who';w.textContent=f.who+': ';d.append(w);}
  d.append(f.text);
  if(e.causeId){const a=document.createElement('span');a.className='why';a.textContent='Warum?';a.title='← Ereignis #'+e.causeId;a.onclick=()=>{causeEvent=e.id;overlay='cause';refresh();};d.append(a);}
  lines.push(d);
 }
 const box=$('#log'),stick=box.scrollTop+box.clientHeight>=box.scrollHeight-24;
 box.replaceChildren(...lines.slice(-60));if(stick)box.scrollTop=box.scrollHeight;
}
function renderExamine(){
 const e=world.entities.find(x=>x.id===selected),box=$('#examine');
 if(!e){box.textContent='Klick auf eine Figur oder ein Objekt.';return;}
 const where=e.carriedBy?`getragen von ${shortName(world,e.carriedBy)}`:`${ROOMS[roomAt(e.x,e.y)]||'—'} (${e.x},${e.y})`;
 const role=(e.name.match(/\((.*)\)/)||[])[1]||(e.kind==='item'?'Gegenstand':'');
 const color={player:'#3f8fd0',mara:'#d98a3d',ivo:'#e8e4d6',neri:'#8d7fd1'}[e.id]||'#8a7f5a';
 let html=`<div style="display:flex;gap:8px;align-items:center;margin-bottom:6px"><div class="avatar" style="background:${color}"></div><div><div style="font-weight:600;color:#fff">${esc(shortName(world,e.id))}</div><div class="mu">${esc(role)}</div></div></div><div>Ort: ${esc(where)}</div>`;
 if(e.kind==='person')html+=`<div>Trägt: ${esc(world.entities.find(x=>x.id===e.carrying)?.name||'nichts')}</div>`;
 if(e.generated)html+=`<div>Grafik: ${{loading:'wird erzeugt',ready:'bereit',failed:'Platzhalter (API nicht verfügbar)'}[spriteStates.get(e.id)]||'ausstehend'}${spriteStates.get(e.id)==='failed'?'<button id="retrySprite">Erneut versuchen</button>':''}</div>`;
 const a=world.agents[e.id];
 if(a&&admin){
  const last=world.decisions.findLast(d=>d.actorId===e.id),facts=agentFacts(world,e.id);
  html+=`<pre class="dbg">${esc(`Ziel: ${a.goal}\nPlan: ${a.plan?JSON.stringify(a.plan):'idle'}\nLetzte Entscheidung: ${last?`#${last.id} ${last.source} · ${last.reason}`:'—'}\nGlaube und Wissen:\n${facts.length?facts.map(f=>`- ${f.text} (${f.source}, ${f.confidence.toFixed(2)})`).join('\n'):'—'}`)}</pre>`;
 }
 box.innerHTML=html;
 $('#retrySprite')?.addEventListener('click',()=>{spriteStates.delete(e.id);ensureSprites();renderExamine();});
}
function renderSystems(){
 const s=world.systems,row=(label,value,ok)=>`<div class="row"><span>${label}</span><span class="${ok?'ok':'bad'}">${value}</span></div>`;
 $('#systems').innerHTML=row('Generator',s.generatorOn?'an':'aus',s.generatorOn)+row('Licht',s.lightsOn?'an':'aus',s.lightsOn)+row('Kühlung',s.coolingOn?'an':'aus',s.coolingOn)+row('Fracht',s.cargoTemperature+' °C',s.cargoTemperature<=5)+row('Proben',s.samplesSpoiled?'verdorben':'ok',!s.samplesSpoiled);
 $('#tickInfo').textContent='Tick '+world.tick;
}
function renderHands(){
 const held=world.entities.find(e=>e.id===world.entities[0].carrying);
 $('#hands').innerHTML=`<div class="slot"><span class="mu">Hand</span><span>${held?esc(held.name):'leer'}</span>${held?'<button id="dropHeld">Ablegen</button>':''}</div>`;
 $('#dropHeld')?.addEventListener('click',()=>act({type:'drop',targetId:held.id}));
}
function renderAdmin(){
 $('#admin').style.display=admin?'':'none';
 $('#adminToggle').style.background=admin?'#2f5a63':'';
 if(!admin)return;
 $('#llm').textContent=`${world.llm.calls} Calls · ${world.llm.tokens} Tokens · ${Math.round(world.llm.latencyMs)} ms`;
 $('#agents').replaceChildren(...Object.entries(world.agents).map(([id,a])=>{const p=document.createElement('p'),person=world.entities.find(e=>e.id===id);p.textContent=`${id} (${person.x},${person.y}) · ${a.goal} · ${a.plan?.type||'idle'} | knows: ${Object.entries(a.knowledge).map(([k,v])=>k+'='+JSON.stringify(v.value)).join(', ')} | beliefs: ${Object.values(a.beliefs).map(b=>b.claim+' ('+b.confidence.toFixed(2)+', from '+b.sourceId+')').join('; ')||'none'}`;return p;}));
 $('#decisions').replaceChildren(...world.decisions.slice(-12).reverse().map(d=>{const p=document.createElement('p');p.textContent=`#${d.id} [${d.tick}] ${d.actorId} · ${d.source} · ${d.goal} → ${d.action?.type||'idle'}: ${d.reason}`;return p;}));
}
function refresh(){
 ensureSprites();
 document.querySelectorAll('#overlays button').forEach(b=>b.classList.toggle('on',b.dataset.ov===overlay));
 renderLog();renderExamine();renderSystems();renderHands();renderAdmin();
}
function act(a){world=applyAction(world,a);if(world.events.at(-1)?.type==='ItemCreated')selected=world.events.at(-1).itemId;revision++;refresh();}
function step(dx,dy){act({type:'move',dx,dy});}
function itemAction(){
 const actor=world.entities[0],item=world.entities.find(e=>e.id===selected&&e.kind==='item');
 if(item)act({type:actor.carrying===item.id?'drop':'pickup',targetId:item.id});
}
const DECOR=[{kind:'generator',name:'Generator',x0:2,y0:12,x1:3,y1:13},{kind:'cooler',name:'Kühlaggregat',x0:11,y0:13,x1:12,y1:13},{kind:'stove',name:'Herd',x0:7,y0:2,x1:8,y1:2},{kind:'bench',name:'Werkbank',x0:14,y0:2,x1:16,y1:2},{kind:'table',name:'Tisch',x0:3,y0:2,x1:4,y1:2}];
const decorAt=(x,y)=>DECOR.find(d=>x>=d.x0&&x<=d.x1&&y>=d.y0&&y<=d.y1);
const feedback=t=>{$('#feedback').textContent=t;};
function openMenu(event){
 event.preventDefault();
 const {x,y}=renderer.tileAt(event),player=world.entities[0];
 const target=world.entities.find(e=>e!==player&&!e.carriedBy&&e.x===x&&e.y===y),decor=decorAt(x,y),entries=[];
 if(target){
  selected=target.id;const name=shortName(world,target.id);
  entries.push(['Untersuchen',()=>feedback(`${target.name}: ${world.agents[target.id]?'Person, wirkt beschäftigt.':'Gegenstand.'}`)]);
  if(target.kind==='item')entries.push(['Aufheben',()=>act({type:'pickup',targetId:target.id})]);
  else{
   entries.push(['Ansprechen',()=>act({type:'speak',text:`Hallo, ${name}.`})]);
   entries.push(['Anklagen: Essen gestohlen',()=>act({type:'speak',text:`${name} stole the food`})]);
   entries.push(['Anklagen: Salvage gestohlen',()=>act({type:'speak',text:`${name} stole the salvage`})]);
   if(player.carrying)entries.push(['Gegenstand geben',()=>act({type:'give',targetId:player.carrying,recipientId:target.id})]);
  }
 }else if(decor){
  entries.push(['Untersuchen',()=>feedback(decor.name+'.')]);
  if(decor.kind==='generator'){
   entries.push(['Generator umschalten',()=>act({type:'toggleGenerator'})]);
   entries.push(['Reparieren',()=>act({type:'repair'})]);
  }
 }else entries.push(['Untersuchen',()=>feedback('Nur abgenutzte Metallplatten.')]);
 menu.replaceChildren(...entries.map(([label,run])=>{const d=document.createElement('div');d.textContent=label;d.onclick=e=>{e.stopPropagation();hideMenu();run();refresh();};return d;}));
 const rect=$('#stage').getBoundingClientRect();
 menu.style.left=Math.min(event.clientX-rect.left,rect.width-190)+'px';menu.style.top=Math.min(event.clientY-rect.top,rect.height-entries.length*30-10)+'px';menu.style.display='block';
 refresh();
}
const hideMenu=()=>{menu.style.display='none';};
document.addEventListener('click',hideMenu);
canvas.addEventListener('contextmenu',openMenu);
canvas.addEventListener('click',e=>{
 const {x,y}=renderer.tileAt(e),hit=world.entities.find(a=>!a.carriedBy&&a.x===x&&a.y===y&&a.kind==='item')||world.entities.find(a=>a.kind==='person'&&a.x===x&&a.y===y);
 if(hit)selected=hit.id;canvas.focus();refresh();
});
window.addEventListener('keydown',e=>{
 if(e.key==='Escape')hideMenu();
 if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))return;
 const dirs={w:[0,-1],ArrowUp:[0,-1],s:[0,1],ArrowDown:[0,1],a:[-1,0],ArrowLeft:[-1,0],d:[1,0],ArrowRight:[1,0]};
 if(dirs[e.key]){e.preventDefault();step(...dirs[e.key]);}else if(e.key.toLowerCase()==='e')itemAction();
});
document.querySelectorAll('#overlays button').forEach(b=>b.onclick=()=>{overlay=b.dataset.ov;refresh();});
$('#fog').onchange=e=>{fog=e.target.checked;};
$('#adminToggle').onclick=()=>{admin=!admin;refresh();};
$('#command').addEventListener('submit',async e=>{
 e.preventDefault();
 const input=$('#intent'),button=$('#command button'),intent=input.value.trim();
 if(!intent||button.disabled)return;
 input.value='';button.disabled=true;feedback('Interpreting: '+intent);
 const requestedAt=revision;
 try{
  const {proposal,source,error}=await interpretIntent(intent,world);
  if(!proposal)feedback('Not yet representable: '+intent+(error?' ('+error+')':''));
  else{
   if(proposal.type==='wait')world=advanceWorld(world);
   else world=applyAction(world,proposal);
   if(world.events.at(-1)?.type==='ItemCreated')selected=world.events.at(-1).itemId;
   revision++;
   feedback((source==='llm'?'LLM':'Local parser')+' proposed '+JSON.stringify(proposal)+(error?' · AI unavailable: '+error:'')+(requestedAt!==revision-1?' · World advanced while interpreting. Action resolved against current state.':''));
  }
  refresh();
 }catch(err){feedback('Action failed: '+err.message);}
 finally{button.disabled=false;input.focus();}
});
$('#save').onclick=()=>{localStorage.setItem('standardReality.m2',snapshot(world));feedback('Snapshot saved locally.');};
$('#load').onclick=()=>{try{pause();world=loadSnapshot(localStorage.getItem('standardReality.m2'));clearSprites();revision++;causeEvent=null;refresh();}catch{feedback('No valid snapshot found.');}};
$('#run').onclick=()=>running?pause():start();
$('#speed').onchange=()=>{if(running)start();};
$('#wait').onclick=()=>{if(running)return;world=advanceWorld(world);revision++;refresh();};
$('#wait5').onclick=()=>{if(running)return;for(let i=0;i<5;i++)world=advanceWorld(world);revision++;refresh();};
$('#reset').onclick=()=>{pause();world=initialWorld();clearSprites();revision++;causeEvent=null;refresh();};
refresh();requestAnimationFrame(frame);
