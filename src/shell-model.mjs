import {groundConfiguration,FILL_SECONDS} from './configuration-model.mjs';
import {electronRoster} from './electron-view.mjs';

// Shell populations come from actual ground-state subshells, not 2n² filling.
// In particular K/Ca occupy 4s while their third shell still contains eight.
export function shellDistribution(number){
 const counts=[];
 for(const row of groundConfiguration(number))counts[row.n-1]=(counts[row.n-1]??0)+row.electrons;
 return counts;
}
// Illustrative spacing only: these radii are not atomic sizes or Bohr radii.
export const shellRadius=n=>.45+.8*n;
export function shellView(number,time=number*FILL_SECONDS){
 const distribution=shellDistribution(number),indices=new Map();
 const records=electronRoster(number,time).map(e=>{
  const index=indices.get(e.n)??0;indices.set(e.n,index+1);
  return {...e,shellIndex:index,shellCount:distribution[e.n-1]};
 });
 return {key:'atom',records,clouds:[],visibleCount:records.length,totalCount:records.length,
  shells:distribution.map((capacity,i)=>({n:i+1,capacity,count:records.filter(e=>e.n===i+1).length})),distribution};
}
export function shellPoint(n,angle){
 const r=shellRadius(n),s=Math.sin(angle);
 return [r*Math.cos(angle),r*s*Math.sin(.24),r*s*Math.cos(.24)];
}
export function shellElectronPosition(e,time){
 // Equal spacing and a shared speed in each shell prevent markers colliding.
 // These circular paths belong ONLY to the explicitly schematic Bohr view.
 return shellPoint(e.n,e.shellIndex*2*Math.PI/e.shellCount+e.n*.63+Math.max(0,time)*(.30-.035*e.n));
}
