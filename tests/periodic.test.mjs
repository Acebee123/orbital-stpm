import test from 'node:test';
import assert from 'node:assert/strict';
import {ELEMENTS,BLOCKS,matchesElement} from '../src/periodic-model.mjs';
test('all 118 elements have unique numbers, symbols and table positions',()=>{
 assert.equal(ELEMENTS.length,118);assert.equal(new Set(ELEMENTS.map(e=>e.symbol)).size,118);
 assert.equal(new Set(ELEMENTS.map(e=>`${e.row}:${e.column}`)).size,118);
 ELEMENTS.forEach((e,i)=>{assert.equal(e.number,i+1);assert.ok(BLOCKS[e.block]);assert.ok(e.period>=1&&e.period<=7);});
});
test('helium uses s colour in group 18; period and block boundaries remain correct',()=>{
 for(const [z,symbol,period,group,block] of [[2,'He',1,18,'s'],[6,'C',2,14,'p'],[26,'Fe',4,8,'d'],[57,'La',6,3,'d'],[58,'Ce',6,null,'f'],[71,'Lu',6,null,'f'],[89,'Ac',7,3,'d'],[90,'Th',7,null,'f'],[103,'Lr',7,null,'f'],[104,'Rf',7,4,'d'],[118,'Og',7,18,'p']]){
  const e=ELEMENTS[z-1];assert.deepEqual([e.symbol,e.period,e.group,e.block],[symbol,period,group,block]);
 }
 assert.deepEqual(Object.fromEntries(Object.keys(BLOCKS).map(b=>[b,ELEMENTS.filter(e=>e.block===b).length])),{s:14,p:36,d:40,f:28});
});
test('search and block filters intersect without confusing numbers or symbols',()=>{
 assert.equal(ELEMENTS.filter(e=>matchesElement(e,'fe','d')).length,1);
 assert.equal(ELEMENTS.filter(e=>matchesElement(e,'6')).length,1);
 assert.equal(ELEMENTS.find(e=>matchesElement(e,' HELIUM ')).number,2);
 assert.equal(ELEMENTS.filter(e=>matchesElement(e,'carbon','s')).length,0);
 assert.equal(ELEMENTS.filter(e=>matchesElement(e,'not-an-element')).length,0);
});
