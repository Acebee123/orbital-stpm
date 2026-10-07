import {test} from 'node:test';
import assert from 'node:assert/strict';
import {CONFIG,duration,hydrogenDistance,CONTACT_OFFSET,stageAt,formedAt,bondStart} from '../src/model.mjs';
test('hybrid directions are unit vectors with scientifically correct mutual angles',()=>{
 for(const c of Object.values(CONFIG))for(let i=0;i<c.count;i++){
   assert.ok(Math.abs(Math.hypot(...c.directions[i])-1)<1e-12);
   for(let j=i+1;j<c.count;j++){const dot=c.directions[i].reduce((n,v,k)=>n+v*c.directions[j][k],0);const angle=Math.acos(dot)*180/Math.PI;assert.ok(Math.abs(angle-parseFloat(c.angle))<.05)}
 }
});
test('contact event matches physical onset of hybrid / hydrogen surface overlap',()=>{
 const d=hydrogenDistance(CONTACT_OFFSET);assert.ok(Math.abs(d-(2.38+.68))<.05);
 assert.equal(hydrogenDistance(-1),7);assert.equal(hydrogenDistance(3),2.8);
});
test('geometry is revealed only after all sequential bonds are complete',()=>{
 for(const c of Object.values(CONFIG)){
  assert.equal(formedAt(0,c),0);assert.equal(stageAt(0,c),0);
  for(let i=0;i<c.count;i++){assert.equal(formedAt(bondStart(i)+2.79,c),i);assert.equal(formedAt(bondStart(i)+2.81,c),i+1);assert.equal(stageAt(bondStart(i)+2.79,c),2)}
  assert.equal(formedAt(duration(c),c),c.count);assert.equal(stageAt(duration(c),c),3);
 }
});
