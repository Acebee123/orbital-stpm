// Consistent educational length scale: each successive s shell is larger.
// These are illustrative display radii, not hard physical boundaries.
export const S_DISPLAY_RADIUS=Object.freeze({'1s':1.35,'2s':2.15,'3s':3.05});
// Boundary diagrams, with exact angular orientation and hydrogenic radial nodes.
// Display scales are adjusted for legibility; colours encode wavefunction sign.
export const ATOMIC = {
 '1s':{family:'s',label:'1s',n:1,title:'Spherical symmetry',description:'The probability is the same in every direction. There are no radial or angular nodes.',nodes:'0 radial · 0 angular nodes'},
 '2s':{family:'s',label:'2s',n:2,title:'One radial node',description:'A spherical node separates two radial regions with opposite phases. Open the cutaway to see inside.',nodes:'1 radial · 0 angular nodes'},
 '3s':{family:'s',label:'3s',n:3,title:'Two radial nodes',description:'Three concentric radial regions alternate in phase, separated by two spherical nodes.',nodes:'2 radial · 0 angular nodes'},
 px:{family:'p',label:'2pₓ',axis:[1,0,0],title:'Along the x axis',description:'Two opposite-phase lobes point along x. The yz plane through the nucleus is a node.',nodes:'0 radial · 1 angular node'},
 py:{family:'p',label:'2pᵧ',axis:[0,1,0],title:'Along the y axis',description:'Two opposite-phase lobes point along y. The xz plane through the nucleus is a node.',nodes:'0 radial · 1 angular node'},
 pz:{family:'p',label:'2p𝓏',axis:[0,0,1],title:'Along the z axis',description:'Two opposite-phase lobes point along z. The xy plane through the nucleus is a node.',nodes:'0 radial · 1 angular node'},
 dxy:{family:'d',label:'3dₓᵧ',plane:'xy',title:'Between x and y',description:'Four lobes lie between the x and y axes. The xz and yz planes are nodes.',nodes:'0 radial · 2 angular nodes'},
 dxz:{family:'d',label:'3dₓ𝓏',plane:'xz',title:'Between x and z',description:'Four lobes lie between the x and z axes. The xy and yz planes are nodes.',nodes:'0 radial · 2 angular nodes'},
 dyz:{family:'d',label:'3dᵧ𝓏',plane:'yz',title:'Between y and z',description:'Four lobes lie between the y and z axes. The xy and xz planes are nodes.',nodes:'0 radial · 2 angular nodes'},
 dx2y2:{family:'d',label:'3dₓ²−ᵧ²',title:'On the x and y axes',description:'Four lobes point along x and y. The two diagonal planes x = ±y are nodes.',nodes:'0 radial · 2 angular nodes'},
 dz2:{family:'d',label:'3d𝓏²',title:'Axial lobes & an equatorial ring',description:'Two lobes point along z; the ring lies in the xy plane with opposite phase. Two cones, 2z² = x² + y², are nodes.',nodes:'0 radial · 2 angular nodes'}
};
export function atomicSourcePoint(index,negative,x,y,z){
 if(index===0)return negative?[0,0,0]:[x*.82,y*.82,z*.82];
 return [(negative?-1:1)*(.91+.91*x),y*.55,z*.55];
}
export function lobeSourcePoint(pinch,x,y,z){
 const p=atomicSourcePoint(1,false,x,y,z);
 // d lobes narrow at the nucleus to stay inside their angular nodal sectors.
 if(pinch){p[1]*=(1+x)/2;p[2]*=(1+x)/2}return p;
}
export const radialNodes=n=>n===1?[]:n===2?[2]:[1.5*(3-Math.sqrt(3)),1.5*(3+Math.sqrt(3))];
export function phaseAt(key,[x,y,z]){
 if(key==='px')return Math.sign(x);if(key==='py')return Math.sign(y);if(key==='pz')return Math.sign(z);
 if(key==='dxy')return Math.sign(x*y);if(key==='dxz')return Math.sign(x*z);if(key==='dyz')return Math.sign(y*z);
 if(key==='dx2y2')return Math.sign(x*x-y*y);if(key==='dz2')return Math.sign(2*z*z-x*x-y*y);
 const n=ATOMIC[key].n,r=Math.hypot(x,y,z),nodes=radialNodes(n);return (-1)**nodes.filter(a=>r<a).length;
}
export function surfaceSlots(key){
 const c=ATOMIC[key],lobe=(dir,phase)=>({type:'lobe',dir,phase,pinch:c.family==='d'});
 if(c.family==='s'){
  // Radial bands bounded by their exact nodes, with an illustrative outer envelope.
  const outer=c.n===1?3.5:c.n===2?7:12;
  const radii=[...radialNodes(c.n),outer].map(r=>r/outer*.82);
  return radii.map((radius,i)=>({type:'sphere',radius,phase:(-1)**(radii.length-1-i)}));
 }
 if(c.family==='p')return [lobe(c.axis,1),lobe(c.axis.map(x=>-x),-1)];
 if(key==='dz2')return [lobe([0,0,1],1),lobe([0,0,-1],1)];
 if(key==='dx2y2')return [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0]].map(d=>lobe(d,phaseAt(key,d)));
 const q=Math.SQRT1_2,indices={xy:[0,1],xz:[0,2],yz:[1,2]}[c.plane];
 return [[q,q],[q,-q],[-q,q],[-q,-q]].map(a=>{const d=[0,0,0];d[indices[0]]=a[0];d[indices[1]]=a[1];return lobe(d,phaseAt(key,d))});
}
