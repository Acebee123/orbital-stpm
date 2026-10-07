import test from 'node:test';
import assert from 'node:assert/strict';
import {CONFIG} from '../src/model.mjs';
import {probabilitySamples} from '../src/zoom-model.mjs';
import {HYBRID_PARTICLE_COUNT,HYBRID_DISPLAY_SCALE,hybridWavefunction,hybridEnvelope,hybridSourceSamples,hybridDensitySamples} from '../src/hybrid-density.mjs';
test('all hybrid density clouds use production count, correct wavefunction phases and a faint short tail',()=>{
 assert.equal(HYBRID_PARTICLE_COUNT,56000);
 for(const key of Object.keys(CONFIG)){
  const cloud=hybridDensitySamples(key);let inside=0,forward=0,rear=0,positive=0,negative=0;
  assert.equal(cloud.signs.length,HYBRID_PARTICLE_COUNT);
  for(let i=0;i<cloud.signs.length;i++){
   const p=Array.from(cloud.positions.slice(i*3,i*3+3));
   assert.equal(cloud.signs[i],Math.sign(hybridWavefunction(key,p.map(v=>v/HYBRID_DISPLAY_SCALE))));
   if(hybridEnvelope(p)<=1)inside++;
   if(p[0]>0)forward++;else rear++;
   if(cloud.signs[i]>0)positive++;else negative++;
   assert.ok(cloud.weights[i]>0&&cloud.weights[i]<=1);
  }
  assert.ok(inside/HYBRID_PARTICLE_COUNT>.9,key);
  assert.ok(forward>rear*4,key);assert.ok(rear>100,key);
  assert.ok(positive>100&&negative>100,key);
 }
});
test('hybrid nodes remain zeros of the combined 2s and 2p wavefunction',()=>{
 for(const key of Object.keys(CONFIG)){
  const a=Math.sqrt(1/CONFIG[key].count),b=Math.sqrt(1-1/CONFIG[key].count);
  for(const r of [1,2,3,4]){
   const x=-a*(r-2)/b,y=Math.sqrt(r*r-x*x);
   assert.ok(Math.abs(hybridWavefunction(key,[x,y,0]))<1e-12);
  }
  const directions=CONFIG[key].directions;
  for(let i=0;i<directions.length;i++)for(let j=i+1;j<directions.length;j++){
   const dot=directions[i].reduce((sum,v,k)=>sum+v*directions[j][k],0);
   assert.ok(Math.abs(a*a+b*b*dot)<1e-12,'equivalent hybrid wavefunctions must be orthogonal');
  }
 }
});
test('starting distributions reuse the atomic sampler, with no mutation of later atomic selections',()=>{
 for(const i of [0,1,2,3]){
  const key=i===0?'2s':'px',base=probabilitySamples(key,2048),source=hybridSourceSamples(i,2048),after=probabilitySamples(key,2048);
  assert.deepEqual(base.positions,after.positions);
  assert.deepEqual(source.signs,base.signs);assert.deepEqual(source.weights,base.weights);
  const ratio=source.positions[9]/base.positions[9];
  for(let n=0;n<base.positions.length;n++)assert.ok(Math.abs(source.positions[n]-base.positions[n]*ratio)<1e-6);
 }
});
