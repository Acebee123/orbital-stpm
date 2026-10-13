import {CONFIG,smooth} from './model.mjs';
import {S_DISPLAY_RADIUS} from './atomic-model.mjs';
import {probabilitySamples} from './zoom-model.mjs';
export const HYBRID_PARTICLE_COUNT=102176;
export const HYBRID_DISPLAY_SCALE=.34;
export const HYBRID_LOBES=Object.freeze({front:{length:2.85,width:1.08},back:{length:.92,width:.30}});
// Common normalisation factors cancel: these are direction-aligned 2s / 2p combinations.
export function hybridWavefunction(key,[x,y,z]){
 const r=Math.hypot(x,y,z),s=1/CONFIG[key].count;
 return (Math.sqrt(s)*(r-2)+Math.sqrt(1-s)*x)*Math.exp(-r/2);
}
// A qualitative, tapered display envelope. Both lobes share the same origin;
// the narrow reverse lobe is an orbital phase region, never a separate atom.
export function hybridLobeRadius(x){
 const lobe=x>=0?HYBRID_LOBES.front:HYBRID_LOBES.back,t=Math.abs(x)/lobe.length;
 return t>0&&t<1?lobe.width*Math.sqrt(4*t*(1-t))*(.52+.48*t):0;
}
export function hybridEnvelope([x,y,z]){
 const radius=hybridLobeRadius(x);
 return radius>0?Math.hypot(y,z)/radius:Infinity;
}
export function hybridDisplayWeight([x,y,z]){
 const lobe=x>=0?HYBRID_LOBES.front:HYBRID_LOBES.back,t=Math.abs(x)/lobe.length,rho=hybridEnvelope([x,y,z]);
 if(rho>=1||t<=0||t>=1)return 0;
 return smooth(t/.16)*smooth((1-t)/.24)*Math.exp(-.65*rho*rho)*(1-rho*rho)**1.15;
}
export function hybridSourceSamples(index,count=HYBRID_PARTICLE_COUNT){
 const key=index===0?'2s':'px',samples=probabilitySamples(key,count);
 const scale=index===0?.82/S_DISPLAY_RADIUS['2s']:1/1.3;
 for(let i=0;i<samples.positions.length;i++)samples.positions[i]*=scale;
 return samples;
}
export function hybridDensitySamples(key,count=HYBRID_PARTICLE_COUNT){
 // Integrate each axial slice of |psi|² times its soft teaching envelope.
 // Stratified slice selection and deterministic sampling avoid visible clumps.
 const steps=1024,tables=[1,-1].map(sign=>{
  const lobe=sign>0?HYBRID_LOBES.front:HYBRID_LOBES.back,cdf=new Float64Array(steps+1),bounds=new Float64Array(steps);let total=0;
  for(let i=0;i<steps;i++){
   const x=sign*lobe.length*(i+.5)/steps,radius=hybridLobeRadius(x);let integral=0,bound=0;
   for(let j=0;j<=32;j++){
    const rho=j/32,p=[x,radius*rho,0],amplitude=hybridWavefunction(key,p.map(v=>v/HYBRID_DISPLAY_SCALE));
    const value=amplitude*amplitude*hybridDisplayWeight(p);
    integral+=value*rho;bound=Math.max(bound,value);
   }
   total+=integral*radius*radius;cdf[i+1]=total;bounds[i]=bound*1.05;
  }
  for(let i=0;i<=steps;i++)cdf[i]/=total;
  return {sign,lobe,cdf,bounds};
 });
 let seed=0x137ac94+CONFIG[key].count;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const positions=new Float32Array(count*3),signs=new Float32Array(count),seeds=new Float32Array(count),weights=new Float32Array(count);
 // Rear-lobe visibility is adjusted for teaching, not a quantitative population.
 const backCount=Math.round(count*.045),frontCount=count-backCount;
 for(let i=0;i<count;i++){
  const back=i>=frontCount,table=tables[back?1:0],ordinal=back?i-frontCount:i,n=back?backCount:frontCount;
  const u=(ordinal+random())/n;let low=1,high=steps;
  while(low<high){const mid=(low+high)>>1;if(table.cdf[mid]<u)low=mid+1;else high=mid;}
  // Fix the slice at its midpoint so the rejection bound matches its integration.
  const x=table.sign*table.lobe.length*(low-.5)/steps,radius=hybridLobeRadius(x);
  let p,amplitude,weight;
  do{
   const rho=Math.sqrt(random()),angle=2*Math.PI*random();
   p=[x,radius*rho*Math.cos(angle),radius*rho*Math.sin(angle)];
   amplitude=hybridWavefunction(key,p.map(v=>v/HYBRID_DISPLAY_SCALE));weight=hybridDisplayWeight(p);
  }while(random()*table.bounds[low-1]>amplitude*amplitude*weight);
  // Jitter within the tiny slice to avoid axial bands, retaining the lobe profile.
  const nextX=x+table.sign*table.lobe.length*(random()-.5)/steps,nextRadius=hybridLobeRadius(nextX);
  p[1]*=nextRadius/radius;p[2]*=nextRadius/radius;p[0]=nextX;
  amplitude=hybridWavefunction(key,p.map(v=>v/HYBRID_DISPLAY_SCALE));
  positions.set(p,i*3);signs[i]=Math.sign(amplitude);seeds[i]=random()*Math.PI*2;
  weights[i]=hybridDisplayWeight(p)*(back?.55:1);
 }
 return {positions,signs,seeds,weights};
}
