import React,{useMemo} from 'react';
import {Line} from '@react-three/drei';
import {shellPoint} from './shell-model.mjs';
function ShellRing({n}){
 const points=useMemo(()=>Array.from({length:161},(_,i)=>shellPoint(n,i/160*Math.PI*2)),[n]);
 return <Line name={`schematic-shell-${n}`} points={points} color="#64899d" lineWidth={1.15} transparent opacity={.66} depthWrite={false}/>;
}
export function ShellGuides({shells}){
 return <group name="bohr-shell-guides">{shells.map(s=><ShellRing key={s.n} n={s.n}/>)}</group>;
}
