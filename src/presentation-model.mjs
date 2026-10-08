import {TIMING,smooth} from './model.mjs';
export const ATOMIC_PARTICLE_COUNT=56000;
// s selections replace the prior cloud. Fade only the selected distribution in;
// never superimpose different s orbitals, including during rapid selections.
export const atomicCloudVisibility=(key,index,active,fade)=>
 key.endsWith('s')?(index===active?fade:0):(index===active?fade:1-fade);
export const ATOMIC_ROTATION=[-Math.PI/2,0,0];
export const atomicDisplayPoint=([x,y,z])=>[x,z,-y];
export const HYBRID_DURATION=16;
export const hybridRowPosition=(index,count)=>[(index-(count-1)/2)*3.3,0,0];
export function hybridSourcePosition(index,count,compact=false){
 if(!compact||count===2)return hybridRowPosition(index,count);
 if(count===3)return [[0,1.8,0],[-1.8,-1.8,0],[1.8,-1.8,0]][index];
 return [(index%2?1:-1)*1.8,index<2?1.8:-1.8,0];
}
export const hybridStageAt=t=>t<TIMING.atomicHold?0:t<TIMING.morphStart?1:t<TIMING.morphEnd?2:3;
export const hybridReveal=t=>smooth((t-TIMING.morphEnd-.5)/2);
export const HYBRID_STAGES=[
 {title:'Compare the starting orbitals',short:'Starting row',text:'One 2s orbital and the required 2p orbitals line up separately. Inspect their shapes and opposite phases.'},
 {title:'Bring the orbitals together',short:'Gather',text:'The s and p distributions move inward to a shared centre. Their original shapes remain visible before mixing begins.'},
 {title:'Redistribute into equivalents',short:'Hybridise',text:'The s and p wavefunctions combine. Watch the lobes deform and rotate into equivalent sp, sp² or sp³ hybrid orbitals.'},
 {title:'The hybrid arrangement',short:'Final arrangement',text:'Equivalent hybrid orbitals point along the linear, trigonal planar or tetrahedral directions. Rotate to compare the angles.'}
];
