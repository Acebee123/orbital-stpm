import {test} from 'node:test';
import assert from 'node:assert/strict';
import {CONFIG,duration,hydrogenDistance,CONTACT_OFFSET,stageAt,formedAt,bondStart,TIMING,hybridMotion,bondMotion,geometryStart,geometryMotion} from '../src/model.mjs';
test('hybrid directions are unit vectors with scientifically correct mutual angles',()=>{
 for(const c of Object.values(CONFIG))for(let i=0;i<c.count;i++){
   assert.ok(Math.abs(Math.hypot(...c.directions[i])-1)<1e-12);
   for(let j=i+1;j<c.count;j++){const dot=c.directions[i].reduce((n,v,k)=>n+v*c.directions[j][k],0);const angle=Math.acos(dot)*180/Math.PI;assert.ok(Math.abs(angle-parseFloat(c.angle))<.05)}
 }
});
test('contact event matches physical onset of hybrid / hydrogen surface overlap',()=>{
 const d=hydrogenDistance(CONTACT_OFFSET);assert.ok(Math.abs(d-(2.38+.68))<.05);
 assert.equal(hydrogenDistance(-1),9.2);assert.equal(hydrogenDistance(TIMING.overlapEnd),2.8);
});
test('geometry is revealed only after all sequential bonds are complete',()=>{
 for(const c of Object.values(CONFIG)){
  assert.equal(formedAt(0,c),0);assert.equal(stageAt(0,c),0);
  for(let i=0;i<c.count;i++){assert.equal(formedAt(bondStart(i)+TIMING.bondComplete-.01,c),i);assert.equal(formedAt(bondStart(i)+TIMING.bondComplete+.01,c),i+1);assert.equal(stageAt(bondStart(i)+TIMING.bondComplete-.01,c),2)}
  assert.equal(formedAt(duration(c),c),c.count);assert.equal(stageAt(duration(c),c),3);
 }
});

test('hybridisation separates inward movement, a pre-morph hold and a settled post-morph hold',()=>{
 assert.deepEqual(hybridMotion(0),{gather:0,morph:0});
 assert.deepEqual(hybridMotion(TIMING.gatherEnd+.1),{gather:1,morph:0});
 assert.equal(hybridMotion(9).morph,.5);
 for(const t of [12,13,14])assert.deepEqual(hybridMotion(t),{gather:1,morph:1});
 assert.ok(TIMING.morphEnd-TIMING.morphStart>=6);
 assert.ok(TIMING.bondStart-TIMING.morphEnd>=2);
});

test('approach accelerates and brakes, holds contact, builds density before the bond and rests after',()=>{
 let prior=9.2;
 for(let t=0;t<8;t+=.01){const d=hydrogenDistance(t);assert.ok(d<=prior+1e-12&&d>=2.8);prior=d;}
 const travel=t=>9.2-hydrogenDistance(TIMING.approachStart+t);
 assert.ok(travel(.6)-travel(.3)<travel(1.5)-travel(1.2));
 assert.ok(hydrogenDistance(CONTACT_OFFSET-.3)-hydrogenDistance(CONTACT_OFFSET-.1)<hydrogenDistance(CONTACT_OFFSET-1.5)-hydrogenDistance(CONTACT_OFFSET-1.3));
 assert.ok(Math.abs(hydrogenDistance(CONTACT_OFFSET+.2)-hydrogenDistance(CONTACT_OFFSET))<1e-12);
 for(const t of [CONTACT_OFFSET+.9,TIMING.bondAppear]){assert.ok(bondMotion(t).density>=.68-1e-12);assert.equal(bondMotion(t).bond,0);}
 assert.equal(bondMotion(TIMING.bondComplete).bond,1);
 assert.ok(TIMING.bondInterval-TIMING.bondComplete>=.9);
});

test('final rotation preserves geometry and has a real still hold at both ends',()=>{
 for(const c of Object.values(CONFIG)){
  const start=geometryStart(c);
  assert.equal(formedAt(start,c),c.count);
  assert.equal(geometryMotion(start+.5,c),0);
  assert.equal(geometryMotion(start+TIMING.revealHold+TIMING.revealMove,c),1);
  assert.equal(geometryMotion(duration(c)-1,c),1);
  assert.ok(TIMING.finalHold>=2);
 }
});
