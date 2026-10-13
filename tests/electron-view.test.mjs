import test from 'node:test';
import assert from 'node:assert/strict';
import {FILL_SECONDS,groundConfiguration,ORBITAL_COUNT} from '../src/configuration-model.mjs';
import {electronRoster,electronView,electronPosition,electronMotionPlan,densityCell,displayedRadialNodes} from '../src/electron-view.mjs';

test('all 20 complete atoms have exactly Z unique one-electron marker records',()=>{
 for(let z=1;z<=20;z++){
  const view=electronView(z,z*FILL_SECONDS,'atom');assert.equal(view.visibleCount,z);assert.equal(view.records.length,z);assert.equal(new Set(view.records.map(e=>e.id)).size,z);assert.equal(view.clouds.reduce((sum,c)=>sum+c.population,0),z);
  for(const shell of groundConfiguration(z)){
   const selected=electronView(z,z*FILL_SECONDS,shell.key);assert.equal(selected.visibleCount,shell.electrons);assert.ok(selected.records.every(e=>e.key===shell.key));assert.ok(selected.clouds.filter(c=>c.population).every(c=>c.key===shell.key));
   for(let axis=0;axis<ORBITAL_COUNT[shell.type];axis++){const inAxis=selected.records.filter(e=>e.axis===axis);assert.ok(inAxis.length<=2);if(inAxis.length===2)assert.deepEqual(inAxis.map(e=>e.spin),['up','down']);}
  }
  assert.ok(view.records.every(e=>e.type!=='d'));
 }
});
test('filling introduces exactly one marker per event, with no fractional/duplicate electrons',()=>{
 for(let z=1;z<=20;z++){
  assert.equal(electronRoster(z,0).length,0);
  for(let e=0;e<z;e++){
   const before=electronRoster(z,(e+.05)*FILL_SECONDS),arriving=electronRoster(z,(e+.5)*FILL_SECONDS),held=electronRoster(z,(e+.99)*FILL_SECONDS);
   assert.equal(before.length,e);assert.equal(arriving.length,e+1);assert.equal(held.length,e+1);assert.ok(arriving.every(r=>r.opacity>0&&r.opacity<=1));
  }
  assert.equal(electronRoster(z,0).length,0);
 }
});
test('Hund p1/p3/p6 counts, selected axes, and whole-atom O/Ca counts stay distinct',()=>{
 assert.equal(electronView(5,7,'2p').visibleCount,1);
 const p3=electronView(7,9.8,'2p');assert.deepEqual(p3.records.map(e=>[e.axis,e.spin]),[[0,'up'],[1,'up'],[2,'up']]);
 const p6=electronView(10,14,'2p');assert.equal(p6.visibleCount,6);for(let a=0;a<3;a++)assert.equal(electronView(10,14,'2p',a).visibleCount,2);
 assert.equal(electronView(8,11.2,'atom').visibleCount,8);assert.equal(electronView(8,11.2,'2p').visibleCount,4);assert.equal(electronView(20,28,'atom').visibleCount,20);assert.equal(electronView(20,28,'4s').visibleCount,2);
});
test('independent smooth sampled positions preserve radial nodes and p nodal planes',()=>{
 for(const e of electronRoster(20,28)){
  const plan=electronMotionPlan(e);let previous=null;
  for(let t=0;t<14;t+=.08){const p=electronPosition(e,t),r=Math.hypot(...p);assert.equal(densityCell(e,p),plan.cell);assert.ok(p.every(Number.isFinite));assert.ok(r>.17&&r<5);if(e.type==='p')assert.ok(Math.abs(p[e.axis])/r>.44);assert.ok(displayedRadialNodes(e.n,e.type).every(node=>Math.abs(r-node)>.04));if(previous)assert.ok(Math.hypot(...p.map((v,i)=>v-previous[i]))<.4);previous=p;}
 }
 const [a,b]=electronRoster(2,2.8);assert.notDeepEqual(electronPosition(a,4),electronPosition(b,4));assert.notDeepEqual(electronPosition(a,0),electronPosition(a,4));assert.deepEqual(electronPosition(a,4),electronPosition(a,4));
});
