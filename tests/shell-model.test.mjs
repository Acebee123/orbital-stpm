import test from 'node:test';
import assert from 'node:assert/strict';
import {shellDistribution,shellView,shellElectronPosition,shellRadius} from '../src/shell-model.mjs';
import {FILL_SECONDS,groundConfiguration,validateConfiguration,spinBoxes} from '../src/configuration-model.mjs';
const expected=[[1],[2],[2,1],[2,2],[2,3],[2,4],[2,5],[2,6],[2,7],[2,8],[2,8,1],[2,8,2],[2,8,3],[2,8,4],[2,8,5],[2,8,6],[2,8,7],[2,8,8],[2,8,8,1],[2,8,8,2]];
test('H–Ca shell populations, counted markers and guide rings match independent reference',()=>{
 for(let z=1;z<=20;z++){
  assert.deepEqual(shellDistribution(z),expected[z-1]);
  const view=shellView(z);assert.equal(view.visibleCount,z);assert.equal(new Set(view.records.map(e=>e.id)).size,z);
  assert.deepEqual(view.shells.map(s=>s.count),expected[z-1]);assert.equal(view.clouds.length,0);
  for(const e of view.records)for(const time of [0,.1,4,100])assert.ok(Math.abs(Math.hypot(...shellElectronPosition(e,time))-shellRadius(e.n))<1e-10);
 }
});
test('schematic markers move smoothly with stable separation and never exceed Z during replay',()=>{
 for(let z=1;z<=20;z++){
  for(let t=0;t<=z*FILL_SECONDS;t+=.23){const v=shellView(z,t);assert.ok(v.visibleCount<=z);assert.equal(v.shells.reduce((sum,s)=>sum+s.count,0),v.visibleCount);}
  const v=shellView(z);
  for(const e of v.records){const a=shellElectronPosition(e,3),b=shellElectronPosition(e,3.001);assert.ok(Math.hypot(...a.map((x,i)=>x-b[i]))<.002);}
  for(const s of v.shells){const same=v.records.filter(e=>e.n===s.n);for(let i=0;i<same.length;i++)for(let j=i+1;j<same.length;j++){const a=shellElectronPosition(same[i],4),b=shellElectronPosition(same[j],4);assert.ok(Math.hypot(...a.map((x,k)=>x-b[k]))>.8);}}
 }
});
test('completion gate locks empty, wrong, extra, missing and invalid-spin entries for all 20 elements',()=>{
 for(let z=1;z<=20;z++){
  const rows=groundConfiguration(z).map(r=>({...r,spins:spinBoxes(r.type,r.electrons)}));
  assert.equal(validateConfiguration([],z).complete,false);
  assert.equal(validateConfiguration(rows,z).complete,true);
  const wrong=rows.map((r,i)=>i===0?{...r,electrons:r.electrons===1?2:1,spins:null}:r);
  assert.equal(validateConfiguration(wrong,z).complete,false);assert.equal(validateConfiguration(wrong,z).entries[0].state,'incorrect');
  assert.equal(validateConfiguration(rows,z).complete,true);
  assert.equal(validateConfiguration([...rows,{n:'',type:'',electrons:''}],z).complete,false);
  assert.equal(validateConfiguration(rows.slice(1),z).complete,false);
  assert.equal(validateConfiguration(rows.map((r,i)=>i===0?{...r,spins:[['up','up']]}:r),z).complete,false);
 }
 // Completing Hydrogen cannot unlock a switched, unfinished Helium draft.
 assert.equal(validateConfiguration([{n:1,type:'s',electrons:1}],2).complete,false);
});
