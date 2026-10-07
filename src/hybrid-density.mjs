import {CONFIG} from './model.mjs';
import {S_DISPLAY_RADIUS} from './atomic-model.mjs';
import {probabilitySamples,envelopeWeight} from './zoom-model.mjs';
export const HYBRID_PARTICLE_COUNT=56000;
export const HYBRID_DISPLAY_SCALE=.34;
// Normalised hydrogen-like 2s / 2p functions share a common prefactor.
// The arbitrary 2s phase is chosen so the large forward hybrid lobe is positive.
export function hybridWavefunction(key,[x,y,z]){
 const r=Math.hypot(x,y,z),s=1/CONFIG[key].count;
 return (Math.sqrt(s)*(r-2)+Math.sqrt(1-s)*x)*Math.exp(-r/2);
}
export function hybridEnvelope([x,y,z]){
 const length=x>=0?2.38:.52,width=x>=0?.77:.28,along=Math.abs(x),a=length/2;
 const profile=.7+.3*along/length;
 return Math.sqrt((along/a-1)**2+(y*y+z*z)/(width*profile)**2);
}
export function hybridSourceSamples(index,count=HYBRID_PARTICLE_COUNT){
 const key=index===0?'2s':'px',samples=probabilitySamples(key,count);
 const scale=index===0?.82/S_DISPLAY_RADIUS['2s']:1/1.3;
 for(let i=0;i<samples.positions.length;i++)samples.positions[i]*=scale;
 return samples;
}
export function hybridDensitySamples(key,count=HYBRID_PARTICLE_COUNT){
 const s=1/CONFIG[key].count,a=Math.sqrt(s),b=Math.sqrt(1-s),max=10,steps=1024,cdf=new Float64Array(steps+1);let total=0;
 // A radial rejection bound times the volume Jacobian; angular acceptance
 // recovers |a·2s + b·2p_x|². The display envelope adds only a qualitative fit.
 for(let i=1;i<=steps;i++){const r=max*(i-.5)/steps;total+=r*r*(Math.abs(a*(r-2))+b*r)**2*Math.exp(-r);cdf[i]=total;}
 for(let i=0;i<=steps;i++)cdf[i]/=total;
 let seed=0x137ac94+CONFIG[key].count;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const positions=new Float32Array(count*3),signs=new Float32Array(count),seeds=new Float32Array(count),weights=new Float32Array(count);
 for(let i=0;i<count;i++){
  let p,amplitude,weight;
  do{
   p=null;weight=0;
   const u=random();let low=1,high=steps;
   while(low<high){const mid=(low+high)>>1;if(cdf[mid]<u)low=mid+1;else high=mid;}
   const f=(u-cdf[low-1])/(cdf[low]-cdf[low-1]||1),r=max*(low-1+f)/steps;
   const x=2*random()-1,angle=2*Math.PI*random(),rho=Math.sqrt(1-x*x);
   amplitude=a*(r-2)+b*r*x;
   if(random()>(amplitude/(Math.abs(a*(r-2))+b*r))**2)continue;
   p=[r*x,r*rho*Math.cos(angle),r*rho*Math.sin(angle)].map(v=>v*HYBRID_DISPLAY_SCALE);
   weight=envelopeWeight(hybridEnvelope(p))*Math.min(1,(Math.abs(p[0])/(p[0]>=0?.85:.18))**4);
  }while(!p||random()>weight);
  positions.set(p,i*3);signs[i]=Math.sign(amplitude);seeds[i]=random()*Math.PI*2;weights[i]=weight;
 }
 return {positions,signs,seeds,weights};
}
