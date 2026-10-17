import {createAgents,observe,hear,decide} from './agents.js';
export const WIDTH=22,HEIGHT=15;
export const roomAt=(x,y)=>x<2||x>=21||y<2||y>=14?null:x>=17&&y>=10?'exterior':x<=10&&y<=7?'canteen':x>=11&&y<=7?'workshop':x<=10?'engine':'airlock';
export const isPassable=(x,y)=>!!roomAt(x,y)&&!(x===10&&y<=7&&y!==4)&&!(y===7&&x<=16&&![5,13].includes(x))&&!(x===16&&y>=8&&y!==11);
const dist=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
export function initialWorld(seed=42){return {version:2,seed,tick:0,nextId:1,entities:[
 {id:'player',name:'You',kind:'person',x:5,y:4,carrying:null},
 {id:'mara',name:'Mara (mechanic)',kind:'person',x:13,y:4,carrying:null},
 {id:'ivo',name:'Ivo (cook)',kind:'person',x:6,y:8,carrying:null},
 {id:'neri',name:'Neri (archivist)',kind:'person',x:13,y:10,carrying:null},
 {id:'ore',name:'Strange salvage',kind:'item',x:18,y:12,carriedBy:null},
 {id:'cup',name:'Metal mug',kind:'item',x:5,y:5,carriedBy:null},
 {id:'tool',name:'Spanner',kind:'item',x:13,y:6,carriedBy:null},
 {id:'food',name:'Food crate',kind:'item',x:7,y:8,carriedBy:null}
],systems:{generatorOn:true,lightsOn:true,coolingOn:true,cargoTemperature:4,samplesSpoiled:false},agents:createAgents(),events:[],decisions:[],llm:{calls:0,latencyMs:0,tokens:0}};}
const emit=(w,type,data={})=>{const e={id:w.nextId++,tick:w.tick,type,...data};w.events.push(e);if(w.events.length>1200)w.events.shift();return e;};
function systems(w,causeId){const s=w.systems;if(s.lightsOn!==s.generatorOn){s.lightsOn=s.generatorOn;emit(w,'LightingChanged',{on:s.lightsOn,causeId});}if(s.coolingOn!==s.generatorOn){s.coolingOn=s.generatorOn;emit(w,'CoolingChanged',{on:s.coolingOn,causeId});}}
function resolve(w,a){
 const actor=w.entities.find(e=>e.id===(a.actorId||'player')&&e.kind==='person');
 if(!actor)return emit(w,'ActionRejected',{actorId:a.actorId,reason:'Unknown actor'});
 const reject=reason=>emit(w,'ActionRejected',{actorId:actor.id,action:a.type,reason});
 const item=w.entities.find(e=>e.id===a.targetId);
 if(a.type==='move'){
  if(!Number.isInteger(a.dx)||!Number.isInteger(a.dy)||Math.abs(a.dx)+Math.abs(a.dy)!==1)return reject('Movement must be one orthogonal step');
  const x=actor.x+a.dx,y=actor.y+a.dy;if(!isPassable(x,y)||w.entities.some(e=>e.kind==='person'&&e.id!==actor.id&&e.x===x&&e.y===y))return reject('Blocked');
  const from={x:actor.x,y:actor.y};actor.x=x;actor.y=y;if(actor.carrying){const held=w.entities.find(e=>e.id===actor.carrying);held.x=x;held.y=y;}
  return emit(w,'PositionChanged',{actorId:actor.id,from,to:{x,y}});
 }
 if(a.type==='speak'){
  if(typeof a.text!=='string'||!a.text.trim()||a.text.length>300)return reject('Invalid speech');
  const spoken=emit(w,'StatementSpoken',{actorId:actor.id,text:a.text.trim()});
  for(const listener of w.entities.filter(e=>e.kind==='person'&&e.id!==actor.id&&dist(e,actor)<=5)){
   const e=emit(w,'StatementHeard',{actorId:listener.id,speakerId:actor.id,text:a.text.trim(),causeId:spoken.id});
   if(w.agents[listener.id])hear(w,listener.id,e);
  }return spoken;
 }
 if(a.type==='observe')return emit(w,'Observed',{actorId:actor.id,observations:observe(w,actor.id,roomAt)});
 if(a.type==='toggleGenerator'||a.type==='repair'){
  if(roomAt(actor.x,actor.y)!=='engine')return reject('Generator controls are in the engine room');
  if(a.type==='repair'&&(w.systems.generatorOn||actor.carrying!=='tool'))return reject('Repair requires failed generator and spanner');
  w.systems.generatorOn=a.type==='repair'?true:!w.systems.generatorOn;
  const e=emit(w,a.type==='repair'?'GeneratorRepaired':'GeneratorSwitched',{actorId:actor.id,on:w.systems.generatorOn});systems(w,e.id);return e;
 }
 if(a.type==='give'){
  const other=w.entities.find(e=>e.id===a.recipientId&&e.kind==='person');
  if(!item||item.kind!=='item'||!other||actor.carrying!==item.id||other.carrying||dist(actor,other)>1)return reject('Transfer requires held item, free hands and proximity');
  actor.carrying=null;other.carrying=item.id;item.carriedBy=other.id;item.x=other.x;item.y=other.y;return emit(w,'ItemGiven',{actorId:actor.id,recipientId:other.id,itemId:item.id});
 }
 if(!item||item.kind!=='item')return reject('Target item not found');
 if(a.type==='pickup'){if(item.carriedBy||actor.carrying||dist(actor,item)>1)return reject('Hands full or object out of reach');actor.carrying=item.id;item.carriedBy=actor.id;item.x=actor.x;item.y=actor.y;return emit(w,'ItemPickedUp',{actorId:actor.id,itemId:item.id});}
 if(a.type==='drop'){if(actor.carrying!==item.id)return reject('Actor is not holding item');actor.carrying=null;item.carriedBy=null;item.x=actor.x;item.y=actor.y;return emit(w,'ItemDropped',{actorId:actor.id,itemId:item.id});}
 return reject('Unsupported action');
}
export function applyAction(world,action){const w=structuredClone(world);w.tick++;resolve(w,action);return w;}
export function advanceWorld(world){
 const w=structuredClone(world);w.tick++;const s=w.systems;
 if(!s.coolingOn){const before=s.cargoTemperature;s.cargoTemperature=Math.min(24,before+2);if(before!==s.cargoTemperature){const e=emit(w,'CargoTemperatureChanged',{temperature:s.cargoTemperature,causeId:w.events.findLast(x=>x.type==='CoolingChanged')?.id});if(s.cargoTemperature>=12&&!s.samplesSpoiled){s.samplesSpoiled=true;emit(w,'SamplesSpoiled',{causeId:e.id});}}}
 else if(s.cargoTemperature>4){s.cargoTemperature=Math.max(4,s.cargoTemperature-2);emit(w,'CargoTemperatureChanged',{temperature:s.cargoTemperature});}
 for(const id of Object.keys(w.agents)){
  const observations=observe(w,id,roomAt),choice=decide(w,id,isPassable,roomAt);
  const record={id:w.nextId++,tick:w.tick,actorId:id,source:'rule',goal:choice.goal,reason:choice.reason,observations,action:choice.action};
  w.decisions.push(record);if(w.decisions.length>300)w.decisions.shift();
  if(choice.action){const event=resolve(w,{...choice.action,actorId:id});event.decisionId=record.id;}
 }return w;
}
export function agentView(w,id){
 const actor=w.entities.find(e=>e.id===id),a=w.agents[id];
 if(!actor||!a)throw Error('Unknown agent');
 return {actorId:id,position:{x:actor.x,y:actor.y},room:roomAt(actor.x,actor.y),carrying:actor.carrying,goal:a.goal,needs:a.needs,relationships:a.relationships,knowledge:a.knowledge,beliefs:a.beliefs,memory:a.memory.slice(-8),visibleEntities:w.entities.filter(e=>e.id!==id&&!e.carriedBy&&dist(e,actor)<=3).map(e=>({id:e.id,name:e.name,kind:e.kind,x:e.x,y:e.y})),tick:w.tick};
}
export function applyAgentDecision(world,id,proposal,reason,usage,latencyMs){
 const w=structuredClone(world),view=agentView(w,id);
 const visible=new Set(view.visibleEntities.map(e=>e.id));
 if(proposal.targetId&&!visible.has(proposal.targetId)&&proposal.targetId!==view.carrying)throw Error('LLM target is outside current perception');
 if(proposal.recipientId&&!visible.has(proposal.recipientId))throw Error('LLM recipient is outside current perception');
 w.tick++;
 const d={id:w.nextId++,tick:w.tick,actorId:id,source:'llm',goal:w.agents[id].goal,reason:String(reason||'Model proposal').slice(0,180),action:proposal,observations:[],latencyMs,tokens:usage?.total_tokens??null};
 w.decisions.push(d);if(w.decisions.length>300)w.decisions.shift();
 w.llm.calls++;w.llm.latencyMs+=latencyMs;w.llm.tokens+=usage?.total_tokens||0;
 if(proposal.type!=='wait'){const event=resolve(w,{...proposal,actorId:id});event.decisionId=d.id;}
 return w;
}
export const replay=(seed,actions)=>actions.reduce((w,a)=>a.type==='tick'?advanceWorld(w):applyAction(w,a),initialWorld(seed));
export const snapshot=w=>JSON.stringify(w);
export function loadSnapshot(value){const w=JSON.parse(value);if(w.version!==2||!Array.isArray(w.entities)||!Array.isArray(w.events)||!Array.isArray(w.decisions)||!w.agents)throw Error('Unsupported snapshot');return w;}
