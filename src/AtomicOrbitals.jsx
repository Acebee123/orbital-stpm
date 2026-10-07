import React from 'react';
import {Html,Line} from '@react-three/drei';
import * as THREE from 'three';
import {ATOMIC} from './atomic-model.mjs';
import {ProbabilityCloud} from './ProbabilityCloud';
import {ATOMIC_ROTATION} from './presentation-model.mjs';
export function AtomicOrbitals({orbital,labels,axes,cutaway,selected,onSelect,labelHost,zoom,motion}){
 // z-up scientific coordinates, applied equally to samples, nodes and axes.
 return <group rotation={ATOMIC_ROTATION}>
  <ProbabilityCloud orbital={orbital} zoom={zoom} motion={motion} cutaway={cutaway} selected={selected} onSelect={onSelect}/>
  {labels&&<Html portal={labelHost} position={[0,0,2.95]} center zIndexRange={[5,0]}><span className="orbital-label">{ATOMIC[orbital].label}</span></Html>}
  {axes&&[[1,0,0],[0,1,0],[0,0,1]].map((d,i)=><group key={i}>
   <Line points={[d.map(v=>v*-3.15),d.map(v=>v*3.15)]} color={['#ad8b72','#87aaa0','#8e9daf'][i]} lineWidth={.8} transparent opacity={.5}/>
   <mesh position={d.map(v=>v*3.15)} quaternion={new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),new THREE.Vector3(...d))}><coneGeometry args={[.045,.16,12]}/><meshBasicMaterial color={['#ad8b72','#87aaa0','#8e9daf'][i]}/></mesh>
   {labels&&<Html portal={labelHost} position={d.map(v=>v*3.45)} center zIndexRange={[4,0]}><span className="axis-label">{['x','y','z'][i]}</span></Html>}
  </group>)}
 </group>
}
