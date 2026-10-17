import test from 'node:test';import assert from 'node:assert/strict';
import {initialWorld} from '../src/simulation.js';
import {localInterpret,validateProposal} from '../src/intent.js';
test('free-form local movement',()=>assert.deepEqual(localInterpret('Please go north',initialWorld()),{type:'move',dx:0,dy:-1}));
test('pickup is grounded in world items',()=>assert.deepEqual(localInterpret('pick up the mug',initialWorld()),{type:'pickup',targetId:'cup'}));
test('unrecognized intent stays unrecognized',()=>assert.equal(localInterpret('build a violin from the crawler engine',initialWorld()),null));
test('invalid AI proposals are rejected',()=>assert.throws(()=>validateProposal({type:'move',dx:99,dy:0},initialWorld())));
test('invented target cannot enter canonical world',()=>assert.throws(()=>validateProposal({type:'pickup',targetId:'dragon'},initialWorld())));
test('speaker is limited',()=>assert.deepEqual(validateProposal({type:'speak',text:'Hello'},initialWorld()),{type:'speak',text:'Hello'}));
test('a new floor object is proposed without a library entry',()=>{
 assert.deepEqual(localInterpret('ich werfe eine banane auf den boden',initialWorld()),{type:'createItem',name:'banane'});
 assert.deepEqual(localInterpret('I throw a banana on the floor',initialWorld()),{type:'createItem',name:'banana'});
 assert.throws(()=>validateProposal({type:'createItem',name:'../../secret'},initialWorld()),/Invalid object name/);
});
