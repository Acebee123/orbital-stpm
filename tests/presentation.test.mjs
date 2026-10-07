import test from 'node:test';
import assert from 'node:assert/strict';
import {CONFIG,TIMING,hybridMotion} from '../src/model.mjs';
import {ATOMIC,phaseAt} from '../src/atomic-model.mjs';
import {probabilitySamples,orbitalEnvelope} from '../src/zoom-model.mjs';
import {ATOMIC_PARTICLE_COUNT,ATOMIC_ROTATION,atomicDisplayPoint,HYBRID_DURATION,HYBRID_STAGES,hybridStageAt,hybridRowPosition,hybridReveal} from '../src/presentation-model.mjs';
test('all dense atomic clouds retain their shape, phases and short tail at production sample count',()=>{
 assert.equal(ATOMIC_PARTICLE_COUNT,26000);
 for(const key of Object.keys(ATOMIC)){
  const cloud=probabilitySamples(key,ATOMIC_PARTICLE_COUNT);let inside=0;
  assert.equal(cloud.signs.length,ATOMIC_PARTICLE_COUNT);
  for(let i=0;i<cloud.signs.length;i++){
   const p=Array.from(cloud.positions.slice(i*3,i*3+3));
   if(orbitalEnvelope(key,p)<=1)inside++;
   if(ATOMIC[key].family!=='s')assert.equal(cloud.signs[i],phaseAt(key,p));
   assert.ok(cloud.weights[i]>0&&cloud.weights[i]<=1);
  }
  assert.ok(inside/ATOMIC_PARTICLE_COUNT>.89,key);
 }
});
test('z-up display maps dz² lobes vertically and its xy torus horizontally without changing scientific axes',()=>{
 assert.deepEqual(ATOMIC_ROTATION,[-Math.PI/2,0,0]);
 assert.deepEqual(atomicDisplayPoint([0,0,1]),[0,1,-0]);
 for(let i=0;i<24;i++){
  const a=i*Math.PI/12,local=[Math.cos(a),Math.sin(a),0],world=atomicDisplayPoint(local);
  assert.equal(world[1],0);assert.ok(Math.abs(Math.hypot(...world)-1)<1e-12);
  assert.equal(phaseAt('dz2',local),-1);
 }
});
test('each hybrid starts in a centred, separated row using only one s and the required p orbitals',()=>{
 for(const config of Object.values(CONFIG)){
  const row=config.directions.map((_,i)=>hybridRowPosition(i,config.count));
  assert.ok(Math.abs(row.reduce((s,p)=>s+p[0],0))<1e-12);
  assert.ok(row.every(p=>p[1]===0&&p[2]===0));
  for(let i=1;i<row.length;i++)assert.ok(Math.abs(row[i][0]-row[i-1][0]-3.3)<1e-12);
  assert.equal(config.input.split(' + ').filter(v=>v==='s').length,1);
  assert.equal(config.input.split(' + ').filter(v=>v==='p').length,config.count-1);
 }
});
test('hybrid-only playback preserves inspection holds and ends before any bond approach or example',()=>{
 assert.equal(hybridStageAt(0),0);assert.equal(hybridStageAt(3),1);assert.equal(hybridStageAt(6),2);assert.equal(hybridStageAt(12),3);
 assert.deepEqual(hybridMotion(TIMING.atomicHold),{gather:0,morph:0});
 assert.deepEqual(hybridMotion(TIMING.gatherEnd),{gather:1,morph:0});
 assert.deepEqual(hybridMotion(TIMING.morphEnd),{gather:1,morph:1});
 assert.ok(HYBRID_DURATION-TIMING.morphEnd>=4);
 assert.equal(hybridReveal(12.5),0);assert.equal(hybridReveal(14.5),1);
 assert.doesNotMatch(JSON.stringify(HYBRID_STAGES),/CH₄|Methane|Borane|hydrogen|molecule|σ bond/);
});
