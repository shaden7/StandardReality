import test from 'node:test';import assert from 'node:assert/strict';
import {initialWorld,applyAction,advanceWorld,agentView,applyAgentDecision,snapshot,loadSnapshot,replay} from '../src/simulation.js';
const run=(w,n)=>{for(let i=0;i<n;i++)w=advanceWorld(w);return w;};
test('idle world produces autonomous physical actions without player input',()=>{
 const w=run(initialWorld(),25);
 assert.ok(w.events.some(e=>e.actorId==='neri'&&e.type==='ItemPickedUp'&&e.itemId==='ore'));
 assert.ok(w.events.some(e=>e.actorId==='ivo'&&e.type==='PositionChanged'));
 assert.ok(w.decisions.some(d=>d.actorId==='mara'));
});
test('agents do not know remote generator state until locally observed',()=>{
 let w=initialWorld();w.entities.find(e=>e.id==='mara').x=18;w.entities.find(e=>e.id==='mara').y=12;
 w.entities.find(e=>e.id==='player').x=5;w.entities.find(e=>e.id==='player').y=9;
 w=applyAction(w,{type:'toggleGenerator'});w=advanceWorld(w);
 assert.equal(w.agents.mara.knowledge.generatorOn,undefined);
 assert.notEqual(w.decisions.findLast(d=>d.actorId==='mara').goal,'Restore power');
});
test('heard false accusation remains attributed and changes later action',()=>{
 let w=initialWorld();w=applyAction(w,{type:'speak',text:'Mara stole the food'});
 const belief=Object.values(w.agents.ivo.beliefs)[0];
 assert.equal(belief.subject,'mara');assert.equal(belief.sourceId,'player');
 assert.equal(w.agents.ivo.relationships.mara,-10);
 w=run(w,20);
 assert.ok(w.decisions.some(d=>d.actorId==='ivo'&&d.goal==='Clarify theft claim'));
 assert.equal(w.events.some(e=>e.actorId==='mara'&&e.type==='ItemPickedUp'&&e.itemId==='food'),false);
});
test('seeded tick replay and loaded state reproduce agent trajectories',()=>{
 const actions=Array.from({length:18},()=>({type:'tick'}));
 assert.deepEqual(replay(42,actions),replay(42,actions));
 const half=run(initialWorld(),9);
 assert.deepEqual(run(loadSnapshot(snapshot(half)),9),run(half,9));
});
test('NPC repair obeys same tool and location preconditions as player',()=>{
 let w=initialWorld();w.entities.find(e=>e.id==='player').x=5;w.entities.find(e=>e.id==='player').y=9;
 w=applyAction(w,{type:'toggleGenerator'});
 w=applyAction(w,{type:'repair',actorId:'mara'});
 assert.equal(w.events.at(-1).type,'ActionRejected');assert.equal(w.systems.generatorOn,false);
});
test('LLM receives subjective view and cannot target unseen objects',()=>{
 const w=initialWorld(),view=agentView(w,'mara');
 assert.equal('systems' in view,false);
 assert.equal(view.visibleEntities.some(e=>e.id==='ore'),false);
 assert.throws(()=>applyAgentDecision(w,'mara',{type:'pickup',targetId:'ore'},'Get salvage',null,12),/outside current perception/);
 const next=applyAgentDecision(w,'mara',{type:'observe'},'Inspect surroundings',{total_tokens:40},12);
 assert.equal(next.decisions.at(-1).source,'llm');
 assert.equal(next.events.at(-1).decisionId,next.decisions.at(-1).id);
 assert.equal(next.llm.tokens,40);
});
