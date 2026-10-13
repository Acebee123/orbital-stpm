import {probabilitySamples,envelopeWeight} from './zoom-model.mjs';
import {ATOMIC_PARTICLE_COUNT} from './presentation-model.mjs';
export function laguerre(k,a,x){
 if(k===0)return 1;if(k===1)return 1+a-x;
 let previous=1,current=1+a-x;
 for(let j=2;j<=k;j++){const next=((2*j-1+a-x)*current-(j-1+a)*previous)/j;previous=current;current=next;}return current;
}
export function fillingRadial(n,l,r){const x=2*r/n;return Math.exp(-r/n)*x**l*laguerre(n-l-1,2*l+1,x);}
export function fillingAngular(type,axis,d){return type==='s'?1:d[axis];}
const cache=new Map();
export function fillingSamples(n,type,axis=0,count=ATOMIC_PARTICLE_COUNT){
 const key=`${n}${type}${type==='p'?['x','y','z'][axis]:''}:${count}`;
 if(cache.has(key))return cache.get(key);
 if(type==='s'&&n<=3||type==='p'&&n===2){const result=probabilitySamples(type==='s'?`${n}s`:['px','py','pz'][axis],count);cache.set(key,result);return result;}
 if(!(type==='s'&&n===4||type==='p'&&n===3))throw new RangeError('Only occupied H–Ca s/p orbitals are shown.');
 const l=type==='s'?0:1,max=4*n*n,scale=type==='s'?3.95/26:.28,steps=1536,cdf=new Float64Array(steps+1);let total=0;
 for(let i=1;i<=steps;i++){const r=max*(i-.5)/steps;total+=r*r*fillingRadial(n,l,r)**2;cdf[i]=total;}for(let i=0;i<=steps;i++)cdf[i]/=total;
 let seed=0x153adb19+n*103+axis*29;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const positions=new Float32Array(count*3),signs=new Float32Array(count),seeds=new Float32Array(count),weights=new Float32Array(count);
 for(let i=0;i<count;i++){
  let d,angular,r,p,weight;
  do{
   do{const z=2*random()-1,a=2*Math.PI*random(),rho=Math.sqrt(1-z*z);d=[rho*Math.cos(a),rho*Math.sin(a),z];angular=fillingAngular(type,axis,d);}while(random()>angular*angular);
   const u=random();let low=1,high=steps;while(low<high){const mid=(low+high)>>1;if(cdf[mid]<u)low=mid+1;else high=mid;}
   const f=(u-cdf[low-1])/(cdf[low]-cdf[low-1]||1);r=max*(low-1+f)/steps;p=d.map(v=>v*r*scale);
   let metric;
   if(type==='s')metric=Math.hypot(...p)/3.95;
   else{const along=Math.abs(p[axis]),a=1.183*1.42,b=.715*1.42,transverse=Math.max(0,p.reduce((s,v)=>s+v*v,0)-along*along);metric=Math.sqrt((along/a-1)**2+transverse/(b*b));}
   weight=envelopeWeight(metric);
  }while(random()>weight);
  positions.set(p,i*3);signs[i]=Math.sign(angular*fillingRadial(n,l,r));seeds[i]=random()*Math.PI*2;weights[i]=weight;
 }
 const result={positions,signs,seeds,weights};cache.set(key,result);return result;
}
