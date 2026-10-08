import test from 'node:test';
import assert from 'node:assert/strict';
import {driftPoint,orbitalMotionType} from '../src/particle-motion.mjs';
import {probabilitySamples,angularAmplitude} from '../src/zoom-model.mjs';
import {ATOMIC} from '../src/atomic-model.mjs';
import {hybridDensitySamples,hybridWavefunction,hybridEnvelope} from '../src/hybrid-density.mjs';
test('continuous atomic drift retains radial shells and angular nodal sectors',()=>{
 for(const key of Object.keys(ATOMIC)){
  const samples=probabilitySamples(key,256),type=orbitalMotionType(key);
  for(let i=0;i<256;i++){
   const p=Array.from(samples.positions.subarray(i*3,i*3+3)),r=Math.hypot(...p),phase=Math.sign(angularAmplitude(key,p));
   for(const time of [0,.01,1,7,45,120]){
    const q=driftPoint(type,p,time,samples.seeds[i]);
    assert.ok(Math.abs(Math.hypot(...q)-r)<1e-10,`${key}: radial nodes and radial density must remain fixed`);
    assert.equal(Math.sign(angularAmplitude(key,q)),phase,`${key}: dots must stay within their angular nodal sector`);
    const next=driftPoint(type,p,time+.001,samples.seeds[i]);
    assert.ok(Math.hypot(...q.map((v,k)=>v-next[k]))<r*.001,`${key}: no jumps`);
    if(type<=3||type===8)assert.ok(Math.abs(angularAmplitude(key,p)-angularAmplitude(key,q))<1e-10,`${key}: symmetry flow must preserve angular density`);
   }
  }
 }
});
test('hybrid flow preserves lobe envelope, wavefunction density and phase',()=>{
 for(const key of ['sp','sp2','sp3']){
  const samples=hybridDensitySamples(key,256);
  for(let i=0;i<256;i++){
   const p=Array.from(samples.positions.subarray(i*3,i*3+3));
   for(const time of [1,7,45]){
    const q=driftPoint(9,p,time,samples.seeds[i]);
    assert.ok(Math.abs(hybridEnvelope(p)-hybridEnvelope(q))<1e-10);
    assert.ok(Math.abs(hybridWavefunction(key,p)-hybridWavefunction(key,q))<1e-10);
   }
  }
 }
});
