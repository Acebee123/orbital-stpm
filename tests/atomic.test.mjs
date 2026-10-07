import test from 'node:test';
import assert from 'node:assert/strict';
import {ATOMIC,atomicSourcePoint,lobeSourcePoint,radialNodes,phaseAt,surfaceSlots} from '../src/atomic-model.mjs';
import {Vector3,Quaternion} from 'three';
test('all eleven orbitals have the correct number of radial bands or angular lobes',()=>{
 assert.equal(Object.keys(ATOMIC).length,11);
 for(const key of ['1s','2s','3s'])assert.equal(surfaceSlots(key).length,ATOMIC[key].n);
 for(const key of ['px','py','pz','dz2'])assert.equal(surfaceSlots(key).length,2);
 for(const key of ['dxy','dxz','dyz','dx2y2'])assert.equal(surfaceSlots(key).length,4);
});
test('s nodes are the roots of the hydrogenic radial functions',()=>{
 assert.deepEqual(radialNodes(1),[]);assert.equal(radialNodes(2)[0],2);
 for(const r of radialNodes(3))assert.ok(Math.abs(1-2*r/3+2*r*r/27)<1e-12);
 assert.equal(phaseAt('2s',[1,0,0]),-1);assert.equal(phaseAt('2s',[3,0,0]),1);
});
test('p and d directions obey their angular phases and nodal planes',()=>{
 for(const key of ['px','py','pz','dxy','dxz','dyz','dx2y2','dz2'])for(const slot of surfaceSlots(key)){
  assert.equal(phaseAt(key,slot.dir),slot.phase);assert.ok(Math.abs(Math.hypot(...slot.dir)-1)<1e-12);
 }
 assert.equal(phaseAt('px',[0,1,1]),0);assert.equal(phaseAt('dxy',[0,1,1]),0);
 assert.equal(phaseAt('dx2y2',[1,1,0]),0);assert.equal(phaseAt('dz2',[1,1,1]),0);
 assert.equal(phaseAt('dz2',[1,0,0]),-1);
});
test('shared s and p source preserves every original hybridisation vertex',()=>{
 for(const [x,y,z] of [[1,0,0],[0,1,0],[-1,0,0],[.3,.4,.5]])for(const negative of [false,true]){
  assert.deepEqual(atomicSourcePoint(0,negative,x,y,z),negative?[0,0,0]:[x*.82,y*.82,z*.82]);
  assert.deepEqual(atomicSourcePoint(1,negative,x,y,z),[(negative?-1:1)*(.91+.91*x),y*.55,z*.55]);
 }
});
test('d probability lobes remain within their correctly signed nodal sectors',()=>{
 for(const key of ['dxy','dxz','dyz','dx2y2','dz2'])for(const slot of surfaceSlots(key)){
  const q=new Quaternion().setFromUnitVectors(new Vector3(1,0,0),new Vector3(...slot.dir));
  for(let i=1;i<30;i++)for(let j=0;j<30;j++){
   const x=Math.cos(Math.PI*i/30),r=Math.sqrt(1-x*x),a=2*Math.PI*j/30;
   const p=new Vector3(...lobeSourcePoint(slot.pinch,x,r*Math.cos(a),r*Math.sin(a))).applyQuaternion(q);
   assert.equal(phaseAt(key,p.toArray()),slot.phase);
  }
 }
});
