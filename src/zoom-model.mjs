import {ATOMIC,surfaceSlots} from './atomic-model.mjs';
const clamp=x=>Math.min(1,Math.max(0,x));
const smooth=x=>{x=clamp(x);return x*x*(3-2*x)};
// Reserve a wide, shallow camera range for observing the whole distribution.
// Nucleus approach occupies its own range and requires renewed input.
const ZOOM_PATH=[[0,14.5],[.35,9],[.7,6.5],[.85,2.5],[1,1.5]];
export function zoomDistance(depth){
 const z=clamp(depth);
 for(let i=1;i<ZOOM_PATH.length;i++){const [end,b]=ZOOM_PATH[i],[start,a]=ZOOM_PATH[i-1];if(z<=end)return a*Math.exp((z-start)/(end-start)*Math.log(b/a));}
 return 1.5;
}
export function zoomDepth(distance){
 const d=Math.max(1.5,Math.min(14.5,distance));
 for(let i=1;i<ZOOM_PATH.length;i++){const [end,b]=ZOOM_PATH[i],[start,a]=ZOOM_PATH[i-1];if(d>=b)return start+(end-start)*Math.log(d/a)/Math.log(b/a);}
 return 1;
}
export const ZOOM_DISTANCE={cloud:14.5,density:zoomDistance(.55),nucleus:zoomDistance(.82),structure:1.5};
export const createZoomIntent=()=>({lastInput:-Infinity,densityObserved:false,deepGesture:false});
export function observeZoom(intent,depth){
 if(depth<.35){intent.densityObserved=false;intent.deepGesture=false;}
 else if(depth>=.5&&depth<.7)intent.densityObserved=true;
}
// Momentum from the gesture that entered density cannot carry into the nucleus.
// A new pinch, discrete control press, or scroll after a pause grants that intent.
export function requestZoomIntent(intent,requested,depth,now,fresh=false){
 observeZoom(intent,depth);
 if(fresh||now-intent.lastInput>400)intent.deepGesture=depth>=.7||(intent.densityObserved&&depth>=.5);
 intent.lastInput=now;
 const target=clamp(requested);
 if(target<.35){intent.densityObserved=false;intent.deepGesture=false;}
 return target>=.7&&depth<.7&&!intent.deepGesture?.69:target;
}
export function dampedZoomDistance(distance,target,delta){
 const depth=zoomDepth(distance);
 const densityBrake=smooth((depth-.28)/.07)*(1-smooth((depth-.7)/.05));
 const rate=4.5-2.8*densityBrake;
 return distance+(target-distance)*(1-Math.exp(-Math.min(delta,.1)*rate));
}
export function zoomReveal(depth){
 const detail=smooth((depth-.35)/.22),context=1-smooth((depth-.7)/.15);
 return {detail,cloud:detail*(.1+.9*context),nucleus:smooth((depth-.7)/.15),
  magnification:smooth((depth-.85)/.15),nucleons:smooth((depth-.85)/.15),context,
  surfaceOpacity:(.4-.2*detail)*context,
  stage:depth<.35?'cloud':depth<.7?'density':depth<.85?'nucleus':'structure'};
}
export const ZOOM_STAGES={
 cloud:{step:1,helper:'Zoom inward to reveal internal probability density'},
 density:{step:2,kicker:'|ψ|² · PROBABILITY PER UNIT VOLUME',title:'Electron probability density',description:'Pause and observe the distribution inside the boundary. Brighter regions indicate greater probability; nodes remain empty. Zoom again when you are ready to approach the nucleus.',helper:'Observe the density · zoom again to move deeper'},
 nucleus:{step:3,kicker:'CLOSE VIEW · NUCLEUS IN FOCUS',title:'The nucleus at the centre',description:'The cloud recedes into a faint context around the positively charged nucleus. Zoom deeper to explore its magnified nuclear structure.',helper:'Faint density for context · zoom deeper for nuclear structure'},
 structure:{step:4,kicker:'EDUCATIONAL MAGNIFICATION · ¹²C',title:'Magnified nuclear structure',description:'Six protons and six neutrons. Nuclear and orbital sizes use independent educational scales, not literal atomic scale.',helper:'Magnified educational view · not literal atomic scale'}
};
export const NUCLEONS=Object.freeze([
 [1,1,0],[1,-1,0],[-1,1,0],[-1,-1,0],
 [1,0,1],[1,0,-1],[-1,0,1],[-1,0,-1],
 [0,1,1],[0,1,-1],[0,-1,1],[0,-1,-1]
].map((p,i)=>({position:p.map(v=>v*.15),type:[0,3,4,7,8,11].includes(i)?'proton':'neutron'})));
export function angularAmplitude(key,[x,y,z]){
 const c=ATOMIC[key];if(c.family==='s')return 1;
 if(c.family==='p')return x*c.axis[0]+y*c.axis[1]+z*c.axis[2];
 if(key==='dxy')return 2*x*y;if(key==='dxz')return 2*x*z;if(key==='dyz')return 2*y*z;
 if(key==='dx2y2')return x*x-y*y;return (2*z*z-x*x-y*y)/2;
}
export function radialAmplitude(key,r){
 const c=ATOMIC[key];
 if(c.family==='p')return r*Math.exp(-r/2);
 if(c.family==='d')return r*r*Math.exp(-r/3);
 if(c.n===1)return Math.exp(-r);
 if(c.n===2)return (r/2-1)*Math.exp(-r/2);
 return (1-2*r/3+2*r*r/27)*Math.exp(-r/3);
}
const envelopes=new Map(Object.keys(ATOMIC).map(key=>[key,surfaceSlots(key)]));
// Exact interior test for the retained displayed meshes. A value <= 1 is
// inside a sphere, ellipsoidal p lobe, pinched d lobe or the dz² torus.
// This display envelope is qualitative; it is not a hard physical boundary.
export function orbitalEnvelope(key,p){
 const radius=Math.hypot(...p),config=ATOMIC[key];
 if(config.family==='s')return radius/2.337;
 let metric=Infinity;
 for(const slot of envelopes.get(key)){
  const along=p.reduce((sum,v,k)=>sum+v*slot.dir[k],0);if(along<=0)continue;
  const a=.91*1.3,b=.55*1.3,transverse=Math.max(0,radius*radius-along*along);
  const pinch=slot.pinch?along/(2*a):1;
  metric=Math.min(metric,Math.sqrt((along/a-1)**2+transverse/(b*pinch)**2));
 }
 if(key==='dz2')metric=Math.min(metric,Math.hypot(Math.hypot(p[0],p[1])-.88*1.3,p[2])/(.27*1.3));
 return metric;
}
export const envelopeWeight=metric=>Math.exp(-((Math.max(0,metric-.88)/.14)**2));
// Sample |ψ|² in volume: r² |R(r)|² dr, multiplied by |Y(direction)|².
// A smooth display-envelope weight keeps the illustrative density inside the
// existing boundary, with a short fading tail. Radial/angular zeros survive.
// Stored samples never follow trajectories: only their soft intensity pulses.
export function probabilitySamples(key,count=4400){
 const c=ATOMIC[key],max=c.family==='s'?[0,4.5,9,16][c.n]:c.family==='p'?9:18;
 const display=c.family==='s'?2.337/[0,3.5,7,12][c.n]:c.family==='p'?.3:.2;
 const steps=1024,cdf=new Float64Array(steps+1);let total=0;
 for(let i=1;i<=steps;i++){const r=max*(i-.5)/steps;total+=r*r*radialAmplitude(key,r)**2;cdf[i]=total}
 for(let i=0;i<=steps;i++)cdf[i]/=total;
 let seed=0x173ab48;for(const ch of key)seed=(Math.imul(seed,31)+ch.charCodeAt(0))>>>0;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
 const positions=new Float32Array(count*3),signs=new Float32Array(count),seeds=new Float32Array(count),weights=new Float32Array(count);
 for(let i=0;i<count;i++){
  let direction,angular,r,p,weight;
  do{
   do{const z=2*random()-1,a=2*Math.PI*random(),rho=Math.sqrt(1-z*z);direction=[rho*Math.cos(a),rho*Math.sin(a),z];angular=angularAmplitude(key,direction)}while(random()>angular*angular);
   const u=random();let low=1,high=steps;while(low<high){const mid=(low+high)>>1;if(cdf[mid]<u)low=mid+1;else high=mid}
   const f=(u-cdf[low-1])/(cdf[low]-cdf[low-1]||1);r=max*(low-1+f)/steps;
   p=direction.map(v=>v*r*display);weight=envelopeWeight(orbitalEnvelope(key,p));
  }while(random()>weight);
  positions.set(p,i*3);signs[i]=Math.sign(angular*radialAmplitude(key,r));seeds[i]=random()*6.28318;weights[i]=weight;
 }
 return {positions,signs,seeds,weights};
}
