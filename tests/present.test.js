import test from 'node:test';
import assert from 'node:assert/strict';
import {initialWorld,applyAction,advanceWorld} from '../src/simulation.js';
import {formatEvent,causeTree,latestCaused,agentFacts,nodeAnchor} from '../src/present.js';

const blackout=()=>{
 let w=initialWorld();
 w.entities.find(e=>e.id==='player').x=4;w.entities.find(e=>e.id==='player').y=9;
 w=applyAction(w,{type:'toggleGenerator'});
 for(let i=0;i<8;i++)w=advanceWorld(w);
 return w;
};

test('generator blackout forms a cause tree rooted at the switch',()=>{
 const w=blackout(),switched=w.events.find(e=>e.type==='GeneratorSwitched');
 const tree=causeTree(w,w.events.findLast(e=>e.type==='CargoTemperatureChanged').id);
 assert.equal(tree[0].id,switched.id);
 assert.ok(tree.some(e=>e.type==='LightingChanged'));
 assert.ok(tree.some(e=>e.type==='CoolingChanged'));
 assert.ok(latestCaused(w)!==null);
});

test('events are formatted and noise is dropped',()=>{
 const w=blackout();
 assert.equal(formatEvent(w,{type:'PositionChanged',actorId:'player'}),null);
 assert.match(formatEvent(w,{type:'GeneratorSwitched',actorId:'player',on:false}).text,/abgeschaltet/);
 assert.equal(formatEvent(w,{type:'ActionRejected',actorId:'mara',action:'pickup',reason:'Blocked'}).cls,'rj');
});

test('every cause node has a map anchor',()=>{
 const w=blackout();
 for(const e of causeTree(w,latestCaused(w)))assert.ok(nodeAnchor(w,e),e.type);
});

test('agent facts separate seen knowledge from hearsay',()=>{
 let w=advanceWorld(initialWorld());
 w=applyAction(w,{type:'move',dx:1,dy:0});
 w=applyAction(w,{type:'speak',text:'Mara stole the food'});
 const facts=agentFacts(w,'ivo');
 assert.ok(facts.some(f=>f.kind==='seen'));
 assert.ok(facts.every(f=>f.kind!=='heard'||/gehört von/.test(f.source)));
});
