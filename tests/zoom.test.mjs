import test from 'node:test';
import assert from 'node:assert/strict';
import {ZOOM_DISTANCE,zoomDepth,zoomDistance,radialAmplitude,angularAmplitude,probabilitySamples,orbitalEnvelope,envelopeWeight,dampedZoomDistance} from '../src/zoom-model.mjs';
import {ATOMIC,phaseAt,radialNodes,surfaceSlots,lobeSourcePoint} from '../src/atomic-model.mjs';


test('probability amplitude retains all radial and angular nodes',()=>{
 for(const n of [2,3])for(const r of radialNodes(n))assert.ok(Math.abs(radialAmplitude(`${n}s`,r))<1e-12);
 assert.equal(angularAmplitude('px',[0,1,0]),0);assert.equal(angularAmplitude('dxy',[0,1,0]),0);
 assert.equal(angularAmplitude('dx2y2',[Math.SQRT1_2,Math.SQRT1_2,0]),0);
 assert.equal(angularAmplitude('dz2',[1,1,1]),0);
});
test('density samples have correct phase and statistical orientation, without trajectory state',()=>{
 const sample=probabilitySamples('px',5000),m=[0,0,0];
 for(let i=0;i<sample.signs.length;i++){const p=Array.from(sample.positions.slice(i*3,i*3+3));assert.equal(sample.signs[i],phaseAt('px',p));for(let k=0;k<3;k++)m[k]+=p[k]*p[k]}
 // The display-envelope weighting narrows the retained ellipsoidal lobes.
 assert.ok(m[0]>m[1]*5&&m[0]>m[2]*5);assert.ok(Math.abs(m[1]/m[2]-1)<.15);
 for(const key of ['dxy','dxz','dyz','dx2y2','dz2']){const d=probabilitySamples(key,1200);for(let i=0;i<d.signs.length;i++)assert.equal(d.signs[i],phaseAt(key,Array.from(d.positions.slice(i*3,i*3+3))))}
 assert.deepEqual(sample.positions,probabilitySamples('px',5000).positions);
 assert.deepEqual(Object.keys(sample).sort(),['positions','seeds','signs','weights']);
});




test('density braking is slower, frame-rate independent and settles without overshoot',()=>{
 const normal=zoomDistance(.2),density=zoomDistance(.55),dt=1/60;
 const normalFraction=(dampedZoomDistance(normal,normal-1,dt)-normal)/-1;
 const densityFraction=(dampedZoomDistance(density,density-1,dt)-density)/-1;
 assert.ok(densityFraction<normalFraction*.5);
 for(const hz of [30,60,120]){let d=zoomDistance(0),target=ZOOM_DISTANCE.density;for(let i=0;i<hz*10;i++){const next=dampedZoomDistance(d,target,1/hz);assert.ok(next>=target&&next<=d);d=next;}assert.ok(Math.abs(zoomDepth(d)-.55)<1e-6);}
 assert.ok(zoomDistance(.35)>=9-1e-10);assert.ok(zoomDistance(.7)>=6.5-1e-10);
});
test('all eleven clouds sit mainly inside their qualitative orbital envelopes with a faint short tail',()=>{
 for(const key of Object.keys(ATOMIC)){
  const s=probabilitySamples(key),m=[0,0,0];let inside=0,tailWeight=0,tail=0;
  for(let i=0;i<s.signs.length;i++){
   const p=Array.from(s.positions.slice(i*3,i*3+3)),metric=orbitalEnvelope(key,p);
   if(metric<=1)inside++;else{tail++;tailWeight+=s.weights[i]}
   assert.ok(metric<1.4,`${key}: distant outlier`);assert.ok(Math.abs(s.weights[i]-envelopeWeight(metric))<2e-6);
   for(let k=0;k<3;k++)m[k]+=p[k]**2;
  }
  assert.ok(inside/s.signs.length>=.89,`${key}: most samples must be inside`);
  if(tail)assert.ok(tailWeight/tail<.4,`${key}: tail must fade`);
  if(ATOMIC[key].family==='s')assert.ok(Math.max(...m)/Math.min(...m)<1.12,`${key}: spherical symmetry`);
 }
});
test('density envelope agrees with the shared p/d source geometry and dz² torus',()=>{
 for(const key of Object.keys(ATOMIC).filter(key=>ATOMIC[key].family!=='s'))for(const slot of surfaceSlots(key)){
  const d=slot.dir,base=Math.abs(d[1])<.9?[0,1,0]:[1,0,0],dot=d.reduce((s,v,k)=>s+v*base[k],0),normal=base.map((v,k)=>v-dot*d[k]),length=Math.hypot(...normal);normal.forEach((_,k)=>normal[k]/=length);
  for(let i=1;i<30;i++){const x=-1+2*i/30,y=Math.sqrt(1-x*x),p=lobeSourcePoint(slot.pinch,x,y,0),world=d.map((v,k)=>1.3*(v*p[0]+normal[k]*p[1]));assert.ok(orbitalEnvelope(key,world)<=1+1e-8,key)}
 }
 for(let i=0;i<30;i++){const a=i/30*2*Math.PI;assert.ok(orbitalEnvelope('dz2',[(.88+.27*Math.cos(a))*1.3,0,.27*Math.sin(a)*1.3])<=1+1e-8)}
});
