import {groundConfiguration,fillingState,ORBITAL_COUNT} from './configuration-model.mjs';
import {fillingSamples} from './filling-samples.mjs';
import {radialNodes,S_DISPLAY_RADIUS} from './atomic-model.mjs';

// Discrete markers are separate from the static, many-sample density backdrop.
// Every record owns exactly one rendered marker; the arriving electron fades in.
export function electronRoster(number,time){
 const state=fillingState(number,time),count=state.done+(state.fraction>0?1:0),records=[];
 for(const shell of groundConfiguration(number)){
  for(let j=0;j<shell.electrons&&records.length<count;j++){
   records.push({id:records.length,n:shell.n,type:shell.type,key:shell.key,axis:j%ORBITAL_COUNT[shell.type],spin:j<ORBITAL_COUNT[shell.type]?'up':'down',opacity:records.length<state.done?1:.3+.7*state.fraction});
  }
 }
 return records;
}
export function electronView(number,time,selection='follow',axis=null){
 const state=fillingState(number,time),all=electronRoster(number,time),key=selection==='follow'?state.current.key:selection;
 const records=all.filter(e=>selection==='atom'||e.key===key&&(axis===null||e.type!=='p'||e.axis===axis));
 const clouds=groundConfiguration(number).flatMap(shell=>Array.from({length:ORBITAL_COUNT[shell.type]},(_,a)=>({n:shell.n,type:shell.type,key:shell.key,axis:a,population:records.filter(e=>e.key===shell.key&&e.axis===a).length})));
 return {state,records,clouds,key,visibleCount:records.length,totalCount:all.length};
}
export function displayedRadialNodes(n,type){
 if(type==='p')return n===3?[6*.28]:[];
 if(n===4)return [1.871644455,6.61081458,15.51754097].map(r=>r*3.95/26);
 return radialNodes(n).map(r=>r*S_DISPLAY_RADIUS[`${n}s`]/[0,3.5,7,12][n]);
}
export function densityCell(e,p){
 const r=Math.hypot(...p),band=displayedRadialNodes(e.n,e.type).filter(node=>r>node).length;
 return `${band}:${e.type==='p'?Math.sign(p[e.axis]):0}`;
}
const plans=new Map();
export function electronMotionPlan(e){
 const key=`${e.id}:${e.key}:${e.axis}`;if(plans.has(key))return plans.get(key);
 const samples=fillingSamples(e.n,e.type,e.axis,3072),valid=[];
 for(let i=0;i<samples.signs.length;i++){
  const p=Array.from(samples.positions.subarray(i*3,i*3+3)),r=Math.hypot(...p);
  if(samples.weights[i]>.98&&r>.18&&(e.type==='s'||Math.abs(p[e.axis])/r>.45)&&displayedRadialNodes(e.n,e.type).every(node=>Math.abs(r-node)>.045))valid.push(p);
 }
 let seed=(Math.imul(e.id+1,2654435761)+e.n*71+e.axis*103)>>>0;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
 const first=valid[Math.floor(random()*valid.length)],cell=densityCell(e,first),pool=valid.filter(p=>densityCell(e,p)===cell);
 const dot=(a,b)=>a.reduce((sum,v,i)=>sum+v*b[i],0)/(Math.hypot(...a)*Math.hypot(...b));
 const anchors=[first];
 for(let i=1;i<24;i++){
  const nearby=pool.filter(p=>dot(anchors.at(-1),p)>.25&&(i!==23||dot(first,p)>.25));
  anchors.push(nearby.length?nearby[Math.floor(random()*nearby.length)]:first);
 }
 const plan={anchors,period:3.2+random()*2,offset:random()*20,cell};plans.set(key,plan);return plan;
}
// Guided sample positions, not a physical trajectory. Interpolating radius and
// direction within one nodal cell keeps radial nodes and p nodal planes empty.
// Irregular anchors vary radius and direction; there are no circular paths.
export function electronPosition(e,time){
 const plan=electronMotionPlan(e),phase=(Math.max(0,time)+plan.offset)/plan.period,index=Math.floor(phase)%plan.anchors.length,f=phase-Math.floor(phase),u=f*f*(3-2*f);
 const a=plan.anchors[index],b=plan.anchors[(index+1)%plan.anchors.length],ra=Math.hypot(...a),rb=Math.hypot(...b);
 const direction=a.map((v,i)=>v/ra*(1-u)+b[i]/rb*u),length=Math.hypot(...direction),r=ra*(1-u)+rb*u;
 return direction.map(v=>v/length*r);
}
