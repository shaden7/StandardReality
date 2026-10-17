import test from 'node:test';import assert from 'node:assert/strict';
import {initialWorld,applyAction,replay,snapshot,loadSnapshot} from '../src/simulation.js';
test('valid movement emits persistent event',()=>{const w=applyAction(initialWorld(),{type:'move',dx:1,dy:0});assert.equal(w.entities[0].x,6);assert.equal(w.events[0].type,'PositionChanged');});
test('invalid diagonal movement is rejected',()=>{const w=applyAction(initialWorld(),{type:'move',dx:1,dy:1});assert.equal(w.entities[0].x,5);assert.equal(w.events[0].type,'ActionRejected');});
test('item can be picked up and dropped',()=>{let w=initialWorld();w=applyAction(w,{type:'pickup',targetId:'cup'});assert.equal(w.entities[0].carrying,'cup');w=applyAction(w,{type:'drop',targetId:'cup'});assert.equal(w.entities[0].carrying,null);});
test('same action stream replays identically',()=>{const actions=[{type:'move',dx:1,dy:0},{type:'pickup',targetId:'cup'},{type:'move',dx:0,dy:1}];assert.deepEqual(replay(42,actions),replay(42,actions));});
test('snapshot reload preserves state',()=>{const w=applyAction(initialWorld(),{type:'pickup',targetId:'cup'});assert.deepEqual(loadSnapshot(snapshot(w)),w);});
