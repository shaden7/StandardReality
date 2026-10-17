// Private perception and rule decisions. Beliefs retain source, not canonical truth.
const dist=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
const home={mara:{x:13,y:4},ivo:{x:6,y:4},neri:{x:18,y:12}};
export function createAgents(){return Object.fromEntries(['mara','ivo','neri'].map(id=>[id,{goal:id==='mara'?'Maintain machinery':id==='ivo'?'Protect food':'Study salvage',needs:{rest:0},relationships:{player:0,mara:0,ivo:0,neri:0},memory:[],knowledge:{},beliefs:{},plan:null}]));}
const remember=(a,m)=>{a.memory.push(m);if(a.memory.length>30)a.memory.shift();};
export function observe(w,id,roomAt){
 const person=w.entities.find(e=>e.id===id),a=w.agents[id];if(!person||!a)return [];
 const room=roomAt(person.x,person.y),seen=[];
 const mark=(key,value)=>{if(JSON.stringify(a.knowledge[key]?.value)!==JSON.stringify(value)){a.knowledge[key]={value,tick:w.tick,source:'observed'};remember(a,{type:'observation',key,value,tick:w.tick});seen.push(key);}};
 mark('lightsOn',w.systems.lightsOn);
 if(['canteen','engine'].includes(room))mark('coolingOn',w.systems.coolingOn);
 if(['workshop','engine'].includes(room))mark('generatorOn',w.systems.generatorOn);
 if(room==='canteen')mark('cargoTemperature',w.systems.cargoTemperature);
 for(const e of w.entities.filter(e=>e.id!==id&&dist(e,person)<=3&&!e.carriedBy))mark('position:'+e.id,{x:e.x,y:e.y});
 return seen;
}
export function hear(w,id,event){
 const a=w.agents[id];remember(a,{type:'hearsay',tick:w.tick,speakerId:event.speakerId,text:event.text,eventId:event.id});
 const match=event.text.match(/\b(mara|ivo|neri|you|player)\b.{0,35}\b(stole|took|stiehlt|stahl|gestohlen)\b.{0,35}\b(ore|salvage|food|crate|tool|spanner|cup|mug)\b/i);
 if(match){const subject=match[1].toLowerCase()==='you'?'player':match[1].toLowerCase(),key=`theft:${subject}:${match[3].toLowerCase()}`;
  a.beliefs[key]={claim:event.text,subject,confidence:Math.max(.1,Math.min(.9,.55+(a.relationships[event.speakerId]||0)/100)),sourceId:event.speakerId,eventId:event.id,tick:w.tick};
  a.relationships[subject]=(a.relationships[subject]||0)-10;
 }
}
function route(start,goal,w,passable,range=0){
 const key=p=>`${p.x},${p.y}`,queue=[{x:start.x,y:start.y,first:null}],visited=new Set([key(start)]);
 for(let i=0;i<queue.length;i++){const p=queue[i];if(dist(p,goal)<=range)return p.first;
  for(const [dx,dy] of [[0,-1],[-1,0],[1,0],[0,1]]){const n={x:p.x+dx,y:p.y+dy};
   if(!passable(n.x,n.y)||visited.has(key(n))||w.entities.some(e=>e.kind==='person'&&e.x===n.x&&e.y===n.y))continue;
   visited.add(key(n));queue.push({...n,first:p.first||{type:'move',dx,dy}});}
 }return null;
}
export function decide(w,id,passable,roomAt){
 const a=w.agents[id],person=w.entities.find(e=>e.id===id),k=a.knowledge;
 const choose=(goal,reason,action)=>{a.goal=goal;a.plan=action;return {goal,reason,action};};
 const step=(point,range=0)=>route(person,point,w,passable,range);
 const item=id=>w.entities.find(e=>e.id===id);
 if(id==='mara'&&k.generatorOn?.value===false){
  const tool=item('tool');
  if(person.carrying!=='tool'){
   if(tool&&!tool.carriedBy&&dist(person,tool)<=1)return choose('Restore power','Observed generator failure; spanner in reach',{type:'pickup',targetId:'tool'});
   const last=k['position:tool']?.value,move=last&&step(last,1);if(move)return choose('Restore power','Seeking last observed spanner position',move);
  }else if(roomAt(person.x,person.y)==='engine')return choose('Restore power','At generator with spanner',{type:'repair'});
  const move=step({x:5,y:9},1);if(move)return choose('Restore power','Moving toward generator controls',move);
 }
 if(id==='ivo'&&k.coolingOn?.value===false){
  const food=item('food');
  if(person.carrying!=='food'){
   if(food&&!food.carriedBy&&dist(person,food)<=1)return choose('Protect food','Cooling failure observed; food in reach',{type:'pickup',targetId:'food'});
   const last=k['position:food']?.value,move=last&&step(last,1);if(move)return choose('Protect food','Seeking last observed food position',move);
  }else if(roomAt(person.x,person.y)!=='workshop'){const move=step({x:13,y:4});if(move)return choose('Protect food','Moving food from warm storage',move);}
 }
 const concern=Object.values(a.beliefs).find(b=>b.subject!==id&&b.confidence>=.5&&w.tick>b.tick);
 if(concern&&!a.memory.some(m=>m.type==='confronted'&&m.eventId===concern.eventId)){
  const subject=w.entities.find(e=>e.id===concern.subject);
  if(subject&&dist(person,subject)<=5){remember(a,{type:'confronted',eventId:concern.eventId,tick:w.tick});return choose('Clarify theft claim',`Heard ${concern.sourceId}'s claim #${concern.eventId}; confidence ${concern.confidence.toFixed(2)}`,{type:'speak',text:`I heard that ${concern.subject} stole something. Is it true?`});}
  const last=k['position:'+concern.subject]?.value||home[concern.subject],move=last&&step(last,4);if(move)return choose('Clarify theft claim',k['position:'+concern.subject]?'Seeking accused person at last observed position':'Seeking accused person at known work area',move);
 }
 if(id==='neri'){
  if(person.carrying==='ore')return choose('Study salvage','Holding salvage; inspecting it',{type:'observe'});
  const ore=item('ore'),last=k['position:ore']?.value;
  if(last){if(ore&&!ore.carriedBy&&dist(person,ore)<=1)return choose('Study salvage','Observed salvage in reach',{type:'pickup',targetId:'ore'});
   const move=step(last,1);if(move)return choose('Study salvage','Following observed salvage position',move);}
  const move=step(home.neri,2);if(move)return choose('Explore exterior','Routine route toward exterior',move);
 }
 if(id==='ivo'&&person.carrying==='food'&&k.coolingOn?.value===true)return choose('Restock food','Cooling restored; setting food down',{type:'drop',targetId:'food'});
 const move=step(home[id]);if(move)return choose(id==='mara'?'Inspect machinery':'Prepare meals','Routine route toward work area',move);
 if(w.tick%8===0)return choose(a.goal,'Routine observation',{type:'observe'});
 return choose(a.goal,'No actionable change perceived',null);
}
