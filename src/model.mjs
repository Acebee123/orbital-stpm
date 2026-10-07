export const CONFIG = {
  sp: { key:'sp', label:'sp', count:2, atom:'Be', name:'Beryllium hydride', formula:'BeH₂', geometry:'Linear', angle:'180°', s:50, input:'s + p', note:'Gas-phase BeH₂; the solid has a polymeric structure.', directions:[[1,0,0],[-1,0,0]] },
  sp2: { key:'sp2', label:'sp²', count:3, atom:'B', name:'Borane', formula:'BH₃', geometry:'Trigonal planar', angle:'120°', s:33.3, input:'s + p + p', note:'Isolated BH₃ is shown; borane commonly dimerises to B₂H₆.', directions:[[0,1,0],[Math.sqrt(3)/2,-.5,0],[-Math.sqrt(3)/2,-.5,0]] },
  sp3: { key:'sp3', label:'sp³', count:4, atom:'C', name:'Methane', formula:'CH₄', geometry:'Tetrahedral', angle:'109.5°', s:25, input:'s + p + p + p', note:'Four equivalent C–H σ bonds point toward the vertices of a tetrahedron.', directions:[[0,1,0],[Math.sqrt(8/9),-1/3,0],[-Math.sqrt(2/9),-1/3,Math.sqrt(2/3)],[-Math.sqrt(2/9),-1/3,-Math.sqrt(2/3)]] }
};
export const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
export const smooth=x=>{x=clamp(x);return x*x*(3-2*x)};
export const duration=c=>10+c.count*3.3+4;
export const bondStart=i=>10+i*3.3;
export const approach=t=>smooth(t/2.15);
export const hydrogenDistance=t=>7-4.2*approach(t);
export const CONTACT_OFFSET=1.8243;
export function stageAt(t,c){return t<2?0:t<8.5?1:t<10+c.count*3.3?2:3}
export function formedAt(t,c){return c.directions.filter((_,i)=>t>=bondStart(i)+2.8).length}
export const STAGES=[
 {title:'Meet the atomic orbitals',short:'Atomic orbitals',text:'A spherical s orbital and directional p orbitals begin as distinct probability distributions.'},
 {title:'From atomic to equivalent',short:'Hybridisation',text:'The s and p orbitals mix into equivalent hybrid orbitals, oriented to minimise electron-pair repulsion.'},
 {title:'A bond begins with overlap',short:'Bond formation',text:'A hydrogen 1s orbital approaches a hybrid lobe head-on. Electron density increases between the nuclei, forming a σ bond.'},
 {title:'Geometry, revealed',short:'Molecular geometry',text:'Equivalent σ bonds establish the final geometry. Rotate the molecule to explore its three-dimensional arrangement.'}
];
