import test from 'node:test';
import assert from 'node:assert/strict';
import {CONFIGURATION_ELEMENTS,groundConfiguration,configurationText,spinBoxes,validateSpins,validateConfiguration,validateEntry,moveEntry,fillingState,FILL_SECONDS} from '../src/configuration-model.mjs';
import {fillingRadial,fillingSamples} from '../src/filling-samples.mjs';
import {probabilitySamples} from '../src/zoom-model.mjs';
const references=['1s1','1s2','1s2 2s1','1s2 2s2','1s2 2s2 2p1','1s2 2s2 2p2','1s2 2s2 2p3','1s2 2s2 2p4','1s2 2s2 2p5','1s2 2s2 2p6','1s2 2s2 2p6 3s1','1s2 2s2 2p6 3s2','1s2 2s2 2p6 3s2 3p1','1s2 2s2 2p6 3s2 3p2','1s2 2s2 2p6 3s2 3p3','1s2 2s2 2p6 3s2 3p4','1s2 2s2 2p6 3s2 3p5','1s2 2s2 2p6 3s2 3p6','1s2 2s2 2p6 3s2 3p6 4s1','1s2 2s2 2p6 3s2 3p6 4s2'];
const answer=z=>groundConfiguration(z).map((r,i)=>({...r,id:i,spins:spinBoxes(r.type,r.electrons)}));
test('all twenty neutral ground states match independent H–Ca reference configurations',()=>{
 assert.equal(CONFIGURATION_ELEMENTS.length,20);
 for(let z=1;z<=20;z++){const rows=answer(z);assert.equal(configurationText(rows),references[z-1]);assert.equal(rows.reduce((s,r)=>s+r.electrons,0),z);assert.equal(validateConfiguration(rows,z).complete,true);assert.equal(CONFIGURATION_ELEMENTS[z-1].electronCount,z);}
 assert.throws(()=>groundConfiguration(21),RangeError);
});
test('each element rejects wrong electron counts persistently and accepts corrections',()=>{
 for(let z=1;z<=20;z++){const correct=answer(z),wrong=correct.map((r,i)=>i===0?{...r,electrons:r.electrons===2?1:2,spins:spinBoxes('s',r.electrons===2?1:2)}:r);assert.equal(validateConfiguration(wrong,z).entries[0].state,'incorrect');assert.equal(validateConfiguration(wrong,z).complete,false);assert.equal(validateConfiguration(wrong,z).entries[0].state,'incorrect');assert.equal(validateConfiguration(correct,z).complete,true);}
});
test('empty rows stay neutral; invalid quantum numbers, capacities and premature 3d stay incorrect',()=>{
 assert.equal(validateEntry({n:'',type:'',electrons:''},0,6).state,'neutral');
 for(const r of [{n:1,type:'p',electrons:1},{n:2,type:'d',electrons:1},{n:1,type:'s',electrons:3},{n:2,type:'p',electrons:7},{n:3,type:'d',electrons:11},{n:4,type:'s',electrons:1.5}])assert.equal(validateEntry(r,0,20).state,'incorrect');
 for(const z of [19,20]){const rows=answer(z);rows[5]={n:3,type:'d',electrons:z-18,spins:spinBoxes('d',z-18)};assert.equal(validateConfiguration(rows,z).entries[5].state,'incorrect');assert.equal(validateConfiguration(answer(z),z).complete,true);}
});
test('Pauli and Hund are checked independently, including equivalent p orientation choices',()=>{
 assert.match(validateSpins('s',2,[['up','up']]),/Pauli/);
 assert.match(validateSpins('p',2,[['up','down'],[],[]]),/Hund/);
 assert.match(validateSpins('p',2,[['up'],['down'],[]]),/parallel/);
 assert.equal(validateSpins('p',2,[['down'],[],['down']]),'');
 assert.equal(validateSpins('p',4,[['up'],['up','down'],['up']]),'');
 assert.equal(validateSpins('p',6,[['down','up'],['up','down'],['down','up']]),'');
 assert.match(validateSpins('p',4,[['up','down'],['up','down'],[]]),/Hund/);
});
test('order, extra/removed rows and correction cannot falsely trigger overall completion',()=>{
 const original=answer(16),moved=moveEntry(original,0,1);assert.equal(validateConfiguration(moved,16).complete,false);assert.equal(validateConfiguration(moveEntry(moved,1,0),16).complete,true);
 const extra=[...original,{n:'',type:'',electrons:''}];assert.equal(validateConfiguration(extra,16).complete,false);assert.equal(validateConfiguration(extra,16).entries.at(-1).state,'neutral');assert.equal(validateConfiguration(original.slice(0,-1),16).complete,false);
 assert.equal(validateConfiguration(answer(1),2).complete,false);assert.equal(validateConfiguration(answer(20),20).complete,true);assert.equal(validateConfiguration(answer(1),1).complete,true);
});
test('all twenty filling timelines conserve electrons and occupy each degenerate orbital before pairing',()=>{
 for(let z=1;z<=20;z++){
  for(let t=0;t<=z*FILL_SECONDS;t+=.17){const state=fillingState(z,t);assert.ok(state.electronsPlaced>=0&&state.electronsPlaced<=z+.000001);assert.ok(state.occupations.every(x=>x>=0&&x<=2));assert.ok(Math.abs(state.occupations.reduce((a,b)=>a+b,0)-state.inSubshell)<1e-8);if(state.inSubshell>state.occupations.length)assert.ok(state.occupations.every(x=>x>=1));assert.equal(state.current.type==='d',false);}
  assert.equal(fillingState(z,z*FILL_SECONDS+100).complete,true);assert.equal(fillingState(z,0).electronsPlaced,0);assert.equal(fillingState(z,z*FILL_SECONDS).done,z);
 }
 assert.equal(fillingState(19,18*FILL_SECONDS+.8).current.key,'4s');
});
test('3p has its radial node at r=6; 4s has three radial nodes and alternating phase',()=>{
 assert.ok(Math.abs(fillingRadial(3,1,6))<1e-12);assert.ok(fillingRadial(3,1,5)*fillingRadial(3,1,7)<0);
 for(const r of [1.871644455,6.61081458,15.51754097])assert.ok(Math.abs(fillingRadial(4,0,r))<2e-6);
 const signs=[0,3,10,20].map(r=>Math.sign(fillingRadial(4,0,r)));assert.deepEqual(signs,[1,-1,1,-1]);
});
test('3D filling reuses existing atomic clouds and new 3p/4s samples retain radial/angular phase and nodes',()=>{
 assert.deepEqual(fillingSamples(2,'p',0,500).positions,probabilitySamples('px',500).positions);
 for(const [n,type,axis] of [[3,'p',0],[3,'p',1],[3,'p',2],[4,'s',0]]){const cloud=fillingSamples(n,type,axis,1200),scale=type==='s'?3.95/26:.28;for(let i=0;i<cloud.signs.length;i++){const p=Array.from(cloud.positions.slice(i*3,i*3+3)),r=Math.hypot(...p)/scale,angular=type==='s'?1:p[axis]/Math.max(1e-9,Math.hypot(...p));assert.equal(cloud.signs[i],Math.sign(angular*fillingRadial(n,type==='s'?0:1,r)));assert.ok(cloud.weights[i]>=0&&cloud.weights[i]<=1);}assert.equal(cloud.signs.length,1200);}
});
