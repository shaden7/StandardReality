// Pure presentation helpers: turn canonical world data into text and anchors. No rules live here.
export const shortName=(w,id)=>{
 if(id==='player')return 'Du';
 const e=w.entities.find(x=>x.id===id);
 return e?e.name.replace(/\s*\(.*\)$/,''):String(id??'?');
};
const itemName=(w,id)=>w.entities.find(x=>x.id===id)?.name||String(id);
export function formatEvent(w,e){
 const who=shortName(w,e.actorId);
 switch(e.type){
  case 'PositionChanged':case 'Observed':return null;
  case 'StatementSpoken':return {cls:'sp',who,text:e.text};
  case 'StatementHeard':return {cls:'sy',who:'',text:`${who} hört ${shortName(w,e.speakerId)}: „${e.text}“`};
  case 'ActionRejected':return {cls:'rj',who:'',text:`${who}: ${e.action||'Aktion'} abgelehnt, ${e.reason}`};
  case 'ItemPickedUp':return {cls:'ac',who:'',text:`${who} hebt ${itemName(w,e.itemId)} auf.`};
  case 'ItemDropped':return {cls:'ac',who:'',text:`${who} legt ${itemName(w,e.itemId)} ab.`};
  case 'ItemGiven':return {cls:'ac',who:'',text:`${who} gibt ${itemName(w,e.itemId)} an ${shortName(w,e.recipientId)}.`};
  case 'GeneratorSwitched':return {cls:'sy',who:'',text:`Generator ${e.on?'eingeschaltet':'abgeschaltet'} (${who}).`};
  case 'GeneratorRepaired':return {cls:'sy',who:'',text:`Generator repariert (${who}).`};
  case 'LightingChanged':return {cls:'sy',who:'',text:`Beleuchtung ${e.on?'an':'aus'}.`};
  case 'CoolingChanged':return {cls:'sy',who:'',text:`Kühlung ${e.on?'läuft':'steht still'}.`};
  case 'CargoTemperatureChanged':return {cls:'sy',who:'',text:`Fracht: ${e.temperature} °C.`};
  case 'SamplesSpoiled':return {cls:'sy',who:'',text:'Proben sind verdorben.'};
  default:return {cls:'ac',who:'',text:e.type};
 }
}
export function nodeLabel(w,e){
 switch(e.type){
  case 'GeneratorSwitched':return e.on?'Generator an':'Generator aus';
  case 'GeneratorRepaired':return 'Generator repariert';
  case 'LightingChanged':return e.on?'Licht an':'Licht aus';
  case 'CoolingChanged':return e.on?'Kühlung an':'Kühlung aus';
  case 'CargoTemperatureChanged':return `Fracht ${e.temperature} °C`;
  case 'SamplesSpoiled':return 'Proben verdorben';
  case 'StatementSpoken':return `${shortName(w,e.actorId)} spricht`;
  case 'StatementHeard':return `${shortName(w,e.actorId)} hört`;
  case 'ItemPickedUp':return `${itemName(w,e.itemId)} aufgehoben`;
  case 'ItemDropped':return `${itemName(w,e.itemId)} abgelegt`;
  default:return e.type;
 }
}
// Tile-space anchors (tile centre = x+.5). Decor positions mirror render.js.
const GENERATOR={x:3,y:13},COOLER={x:12,y:13.5},LAMP={x:6.5,y:4.5};
export function nodeAnchor(w,e){
 if(e.type==='GeneratorSwitched'||e.type==='GeneratorRepaired')return GENERATOR;
 if(e.type==='LightingChanged')return LAMP;
 if(e.type==='CoolingChanged')return COOLER;
 const ore=w.entities.find(x=>x.id==='ore');
 if(e.type==='CargoTemperatureChanged'||e.type==='SamplesSpoiled')return ore?{x:ore.x+.5,y:ore.y+.5}:{x:18.5,y:12.5};
 const who=w.entities.find(x=>x.id===e.actorId);
 return who?{x:who.x+.5,y:who.y+.5}:null;
}
export function causeTree(w,id){
 const byId=new Map(w.events.map(e=>[e.id,e]));
 let root=byId.get(id);if(!root)return [];
 while(root.causeId&&byId.has(root.causeId))root=byId.get(root.causeId);
 const kids=new Map();
 for(const e of w.events)if(e.causeId&&byId.has(e.causeId)){if(!kids.has(e.causeId))kids.set(e.causeId,[]);kids.get(e.causeId).push(e);}
 const out=[],queue=[root];
 for(let i=0;i<queue.length&&out.length<16;i++){out.push(queue[i]);queue.push(...(kids.get(queue[i].id)||[]));}
 return out;
}
export const latestCaused=w=>w.events.findLast(e=>e.causeId)?.id??null;
const factText={
 lightsOn:v=>v?'Licht ist an':'Licht ist aus',
 coolingOn:v=>v?'Kühlung läuft':'Kühlung steht still',
 generatorOn:v=>v?'Generator läuft':'Generator ist aus',
 cargoTemperature:v=>`Fracht ${v} °C`
};
// What an agent holds true, newest first, with provenance. Observation and hearsay stay distinct.
export function agentFacts(w,id){
 const a=w.agents[id];if(!a)return [];
 const facts=[];
 for(const [key,k] of Object.entries(a.knowledge)){
  if(key.startsWith('position:'))continue;
  facts.push({text:(factText[key]||(()=>`${key}: ${JSON.stringify(k.value)}`))(k.value),kind:'seen',source:'selbst gesehen',confidence:1,tick:k.tick});
 }
 for(const b of Object.values(a.beliefs))facts.push({text:b.claim,kind:'heard',source:`gehört von ${shortName(w,b.sourceId)}`,confidence:b.confidence,tick:b.tick});
 return facts.sort((x,y)=>y.tick-x.tick);
}
