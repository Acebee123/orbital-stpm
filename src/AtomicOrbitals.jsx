import React from 'react';
import {Html} from '@react-three/drei';
import {ATOMIC} from './atomic-model.mjs';
import {ProbabilityCloud} from './ProbabilityCloud';
import {ATOMIC_ROTATION} from './presentation-model.mjs';
import {CoordinateAxes} from './CoordinateAxes';
export function AtomicOrbitals({orbital,labels,axes,cutaway,selected,onSelect,labelHost,zoom,motion,particleStyle}){
 // z-up scientific coordinates, applied equally to samples, nodes and axes.
 return <group rotation={ATOMIC_ROTATION}>
  <ProbabilityCloud orbital={orbital} zoom={zoom} motion={motion} particleStyle={particleStyle} cutaway={cutaway} selected={selected} onSelect={onSelect}/>
  {labels&&<Html portal={labelHost} position={[0,0,2.95]} center zIndexRange={[5,0]}><span className="orbital-label">{ATOMIC[orbital].label}</span></Html>}
  {axes&&<CoordinateAxes labelHost={labelHost} length={orbital==='1s'?2:orbital==='2s'?2.9:orbital==='3s'?3.5:3.15}/>}
 </group>
}
