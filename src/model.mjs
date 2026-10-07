export const CONFIG = {
  sp: { key:'sp', label:'sp', count:2, atom:'Be', name:'Beryllium hydride', formula:'BeH₂', geometry:'Linear', angle:'180°', s:50, input:'s + p', note:'Gas-phase BeH₂; the solid has a polymeric structure.', directions:[[1,0,0],[-1,0,0]] },
  sp2: { key:'sp2', label:'sp²', count:3, atom:'B', name:'Borane', formula:'BH₃', geometry:'Trigonal planar', angle:'120°', s:33.3, input:'s + p + p', note:'Isolated BH₃ is shown; borane commonly dimerises to B₂H₆.', directions:[[0,1,0],[Math.sqrt(3)/2,-.5,0],[-Math.sqrt(3)/2,-.5,0]] },
  sp3: { key:'sp3', label:'sp³', count:4, atom:'C', name:'Methane', formula:'CH₄', geometry:'Tetrahedral', angle:'109.5°', s:25, input:'s + p + p + p', note:'Four equivalent C–H σ bonds point toward the vertices of a tetrahedron.', directions:[[0,1,0],[Math.sqrt(8/9),-1/3,0],[-Math.sqrt(2/9),-1/3,Math.sqrt(2/3)],[-Math.sqrt(2/9),-1/3,-Math.sqrt(2/3)]] }
};
export const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
export const smooth=x=>{x=clamp(x);return x*x*(3-2*x)};
// Every event has an observable hold, shared by geometry, UI, camera and sound.
export const TIMING={atomicHold:3,gatherEnd:5.5,morphStart:6,morphEnd:12,bondStart:14,bondInterval:7.3,approachStart:.65,contact:3.8,contactHold:.4,overlapEnd:5.05,bondAppear:5.4,bondComplete:6.35,revealHold:.8,revealMove:3.6,finalHold:2.6};
export const geometryStart=c=>TIMING.bondStart+c.count*TIMING.bondInterval;
export const duration=c=>geometryStart(c)+TIMING.revealHold+TIMING.revealMove+TIMING.finalHold;
export const bondStart=i=>TIMING.bondStart+i*TIMING.bondInterval;
export const CONTACT_OFFSET=TIMING.contact;
export const ease=x=>{x=clamp(x);return x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2};
export const approach=t=>ease((t-TIMING.approachStart)/(TIMING.contact-TIMING.approachStart));
export function hydrogenDistance(t){
 if(t<=CONTACT_OFFSET)return 9.2-(9.2-3.06)*approach(t);
 return 3.06-.26*smooth((t-CONTACT_OFFSET-TIMING.contactHold)/(TIMING.overlapEnd-CONTACT_OFFSET-TIMING.contactHold));
}
export const hybridMotion=t=>({gather:smooth((t-TIMING.atomicHold)/(TIMING.gatherEnd-TIMING.atomicHold)),morph:smooth((t-TIMING.morphStart)/(TIMING.morphEnd-TIMING.morphStart))});
export const geometryMotion=(t,c)=>smooth((t-geometryStart(c)-TIMING.revealHold)/TIMING.revealMove);
export function bondMotion(t){
 const contact=smooth((t-CONTACT_OFFSET)/.65),bond=smooth((t-TIMING.bondAppear)/(TIMING.bondComplete-TIMING.bondAppear));
 const pulse=clamp((t-CONTACT_OFFSET)/1.1),compression=Math.sin(Math.PI*clamp((t-CONTACT_OFFSET)/.9));
 return {contact,bond,pulse,compression,density:contact*(.68+.32*bond)};
}
export function stageAt(t,c){return t<TIMING.atomicHold?0:t<TIMING.bondStart?1:t<geometryStart(c)?2:3}
export function formedAt(t,c){return c.directions.filter((_,i)=>t>=bondStart(i)+TIMING.bondComplete).length}
export const STAGES=[
 {title:'Meet the atomic orbitals',short:'Atomic orbitals',text:'A spherical s orbital and directional p orbitals begin as distinct probability distributions.'},
 {title:'From atomic to equivalent',short:'Hybridisation',text:'The s and p orbitals mix into equivalent hybrid orbitals, oriented to minimise electron-pair repulsion.'},
 {title:'A bond begins with overlap',short:'Bond formation',text:'A hydrogen 1s orbital approaches a hybrid lobe head-on. Electron density increases between the nuclei, forming a σ bond.'},
 {title:'Geometry, revealed',short:'Molecular geometry',text:'Equivalent σ bonds establish the final geometry. Rotate the molecule to explore its three-dimensional arrangement.'}
];
