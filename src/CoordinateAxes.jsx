import React from 'react';
import {Html,Line} from '@react-three/drei';
import * as THREE from 'three';

const directions=[[1,0,0],[0,1,0],[0,0,1]];
const colors=['#c9a18a','#98bfb2','#a7b7d1'];
export function CoordinateAxes({labelHost,length=3.15}){
 return <group>{directions.map((direction,i)=><group key={i}>
  <Line points={[direction.map(v=>-v*length),direction.map(v=>v*length)]} color={colors[i]} lineWidth={.8} transparent opacity={.5}/>
  <mesh position={direction.map(v=>v*length)} quaternion={new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),new THREE.Vector3(...direction))}>
   <coneGeometry args={[.045,.16,12]}/><meshBasicMaterial color={colors[i]}/>
  </mesh>
  <Html portal={labelHost} position={direction.map(v=>v*Math.min(length*.86,2.45))} center zIndexRange={[4,0]}>
   <span className="axis-label" style={{color:colors[i]}}>{['x','y','z'][i]}</span>
  </Html>
 </group>)}</group>;
}
