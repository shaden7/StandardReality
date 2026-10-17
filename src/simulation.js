// Canonical, deterministic M0 world. No LLM calls or rendering dependencies.
export const WIDTH = 22, HEIGHT = 15;
const copy = value => structuredClone(value);
export function initialWorld(seed = 42) {
  return {version:1,seed,tick:0,nextId:1,entities:[
    {id:'player',name:'You',kind:'person',x:5,y:4,carrying:null},
    {id:'mara',name:'Mara (mechanic)',kind:'person',x:13,y:4,carrying:null},
    {id:'ivo',name:'Ivo (cook)',kind:'person',x:6,y:8,carrying:null},
    {id:'ore',name:'Strange salvage',kind:'item',x:18,y:12,carriedBy:null},
    {id:'cup',name:'Metal mug',kind:'item',x:5,y:5,carriedBy:null},
    {id:'tool',name:'Spanner',kind:'item',x:13,y:6,carriedBy:null}
  ],events:[]};
}
export function roomAt(x,y) {
  if(x<0||x>=WIDTH||y<0||y>=HEIGHT)return null;
  if(y<=1||x<=1||x>=WIDTH-1||y>=HEIGHT-1)return null;
  if(x>=17 && y>=10)return 'exterior';
  if(x<=10 && y<=7)return 'canteen';
  if(x>=11 && y<=7)return 'workshop';
  if(x<=10 && y>=8)return 'engine';
  return 'airlock';
}
export function isPassable(x,y){
  if(!roomAt(x,y))return false;
  // Internal walls, with door gaps.
  if(x===10 && y<=7 && y!==4)return false;
  if(y===7 && x<=16 && ![5,13].includes(x))return false;
  if(x===16 && y>=8 && y!==11)return false;
  return true;
}
const dist=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
function emit(world,type,data){
  const e={id:world.nextId++,tick:world.tick,type,...data};
  world.events.push(e); return e;
}
export function applyAction(world,action) {
  const next=copy(world); next.tick++;
  const actor=next.entities.find(e=>e.id===(action.actorId||'player')&&e.kind==='person');
  if(!actor){emit(next,'ActionRejected',{reason:'Unknown actor'});return next;}
  const target=next.entities.find(e=>e.id===action.targetId);
  const reject=reason=>emit(next,'ActionRejected',{actorId:actor.id,action:action.type,reason});
  if(action.type==='move'){
    const dx=Number(action.dx),dy=Number(action.dy);
    if(!Number.isInteger(dx)||!Number.isInteger(dy)||Math.abs(dx)+Math.abs(dy)!==1){reject('Movement must be one orthogonal step');return next;}
    const x=actor.x+dx,y=actor.y+dy;
    if(!isPassable(x,y) || next.entities.some(e=>e.kind==='person'&&e.id!==actor.id&&e.x===x&&e.y===y)){reject('Blocked');return next;}
    const from={x:actor.x,y:actor.y}; actor.x=x;actor.y=y;
    if(actor.carrying){const item=next.entities.find(e=>e.id===actor.carrying);item.x=x;item.y=y;}
    emit(next,'PositionChanged',{actorId:actor.id,from,to:{x,y}}); return next;
  }
  if(!target||target.kind!=='item'){reject('Target item not found');return next;}
  if(action.type==='pickup'){
    if(target.carriedBy||actor.carrying){reject('Hands full or object already held');return next;}
    if(dist(actor,target)>1){reject('Object is out of reach');return next;}
    actor.carrying=target.id;target.carriedBy=actor.id;target.x=actor.x;target.y=actor.y;
    emit(next,'ItemPickedUp',{actorId:actor.id,itemId:target.id});return next;
  }
  if(action.type==='drop'){
    if(actor.carrying!==target.id){reject('You are not holding that item');return next;}
    actor.carrying=null;target.carriedBy=null;target.x=actor.x;target.y=actor.y;
    emit(next,'ItemDropped',{actorId:actor.id,itemId:target.id});return next;
  }
  reject('Unsupported action');return next;
}
export function replay(seed,actions){return actions.reduce((w,a)=>applyAction(w,a),initialWorld(seed));}
export function snapshot(world){return JSON.stringify(world);}
export function loadSnapshot(value){
  const world=JSON.parse(value);
  if(world.version!==1||!Array.isArray(world.entities)||!Array.isArray(world.events))throw Error('Unsupported snapshot');
  return world;
}
