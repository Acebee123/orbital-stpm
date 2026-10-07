import test from 'node:test';
import assert from 'node:assert/strict';
import {NUCLEONS,ZOOM_DISTANCE,ZOOM_STAGES,zoomDepth,zoomDistance,zoomReveal,radialAmplitude,angularAmplitude,probabilitySamples,orbitalEnvelope,envelopeWeight} from '../src/zoom-model.mjs';
import {ATOMIC,phaseAt,radialNodes,surfaceSlots,lobeSourcePoint} from '../src/atomic-model.mjs';
test('zoom is reversible and reveals cloud, density, nucleus and nucleons progressively',()=>{
 for(let z=0;z<=1;z+=.05)assert.ok(Math.abs(zoomDepth(zoomDistance(z))-z)<1e-12);
 for(const [stage,d] of Object.entries(ZOOM_DISTANCE))assert.equal(zoomReveal(zoomDepth(d)).stage,stage);
 assert.equal(zoomReveal(0).nucleus,0);assert.equal(zoomReveal(.6).nucleons,0);
 assert.equal(zoomReveal(1).nucleons,1);assert.equal(zoomReveal(1).context,0);
 assert.equal(zoomDepth(100),0);assert.equal(zoomDepth(.1),1);
});
test('carbon-12 schematic has six protons and six neutrons in a centered nonintersecting cluster',()=>{
 assert.equal(NUCLEONS.filter(n=>n.type==='proton').length,6);assert.equal(NUCLEONS.filter(n=>n.type==='neutron').length,6);
 for(let k=0;k<3;k++)assert.ok(Math.abs(NUCLEONS.reduce((sum,n)=>sum+n.position[k],0))<1e-12);
 for(let i=0;i<NUCLEONS.length;i++)for(let j=0;j<i;j++)assert.ok(Math.hypot(...NUCLEONS[i].position.map((v,k)=>v-NUCLEONS[j].position[k]))>=.21);
});
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
test('normal distance has zero inner cloud, and zoom-out restores the surface exactly',()=>{
 for(const depth of [0,.04,.079]){assert.equal(zoomReveal(depth).cloud,0);assert.equal(zoomReveal(depth).surfaceOpacity,.4);assert.equal(zoomReveal(depth).nucleons,0)}
 let previous=0;for(let depth=.18;depth<.5;depth+=.01){const state=zoomReveal(depth);assert.ok(state.cloud>=previous);assert.ok(state.surfaceOpacity<=.4);previous=state.cloud}
 for(let depth=0;depth<=1;depth+=.01){const roundtrip=zoomReveal(zoomDepth(zoomDistance(depth))),expected=zoomReveal(depth);for(const key of ['cloud','detail','nucleus','nucleons','magnification','context','surfaceOpacity'])assert.ok(Math.abs(roundtrip[key]-expected[key])<1e-12);if(![.08,.27,.65,.82].some(edge=>Math.abs(depth-edge)<1e-12))assert.equal(roundtrip.stage,expected.stage)}
});
test('five stages preserve the close nucleus before entering labelled educational magnification',()=>{
 const stages=[];for(let depth=0;depth<=1;depth+=.002){const state=zoomReveal(depth);if(stages.at(-1)!==state.stage)stages.push(state.stage);if(depth<.27)assert.equal(state.cloud,0);if(depth<.82){assert.equal(state.magnification,0);assert.equal(state.nucleons,0)}for(const value of Object.values(state).filter(v=>typeof v==='number'))assert.ok(Number.isFinite(value)&&value>=0&&value<=1)}
 assert.deepEqual(stages,['cloud','approach','density','nucleus','structure']);assert.deepEqual(stages.map(s=>ZOOM_STAGES[s].step),[1,2,3,4,5]);
 const approach=zoomReveal(.2),mid=zoomReveal(.46),close=zoomReveal(zoomDepth(ZOOM_DISTANCE.nucleus)),deep=zoomReveal(1);
 assert.ok(approach.surfaceOpacity>0&&approach.surfaceOpacity<.4);assert.equal(approach.cloud,0);
 assert.equal(mid.detail,1);assert.ok(mid.surfaceOpacity>0);
 assert.equal(close.nucleus,1);assert.equal(close.nucleons,0);assert.ok(close.cloud>0&&close.cloud<mid.cloud*.2);
 assert.equal(deep.nucleons,1);assert.equal(deep.magnification,1);assert.ok(deep.cloud>0);assert.match(ZOOM_STAGES.structure.helper,/not literal atomic scale/);
});
test('all eleven clouds sit mainly inside their retained orbital boundaries with a faint short tail',()=>{
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
test('density envelope agrees with the actual p/d surface vertices and dz² torus',()=>{
 for(const key of Object.keys(ATOMIC).filter(key=>ATOMIC[key].family!=='s'))for(const slot of surfaceSlots(key)){
  const d=slot.dir,base=Math.abs(d[1])<.9?[0,1,0]:[1,0,0],dot=d.reduce((s,v,k)=>s+v*base[k],0),normal=base.map((v,k)=>v-dot*d[k]),length=Math.hypot(...normal);normal.forEach((_,k)=>normal[k]/=length);
  for(let i=1;i<30;i++){const x=-1+2*i/30,y=Math.sqrt(1-x*x),p=lobeSourcePoint(slot.pinch,x,y,0),world=d.map((v,k)=>1.3*(v*p[0]+normal[k]*p[1]));assert.ok(orbitalEnvelope(key,world)<=1+1e-8,key)}
 }
 for(let i=0;i<30;i++){const a=i/30*2*Math.PI;assert.ok(orbitalEnvelope('dz2',[(.88+.27*Math.cos(a))*1.3,0,.27*Math.sin(a)*1.3])<=1+1e-8)}
});
