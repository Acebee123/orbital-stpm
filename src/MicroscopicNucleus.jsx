import React,{useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import {Html} from '@react-three/drei';
import {NUCLEONS,zoomReveal} from './zoom-model.mjs';
export function MicroscopicNucleus({zoom,motion,labels,labelHost,onSelect}){
 const group=useRef(),shell=useRef(),nucleons=useRef([]),protonLabel=useRef(),neutronLabel=useRef(),motionTime=useRef(0);
 useFrame((_,delta)=>{
  if(motion)motionTime.current+=delta;
  const state=zoomReveal(zoom.current.progress);group.current.scale.setScalar(1+.06*state.magnification);shell.current.scale.setScalar(.5+.5*state.nucleus);shell.current.material.opacity=(1-state.nucleons)*.9;shell.current.visible=shell.current.material.opacity>.005;
  nucleons.current.forEach((mesh,i)=>{if(!mesh)return;mesh.visible=state.nucleons>.005;mesh.material.opacity=state.nucleons;const p=NUCLEONS[i].position;mesh.position.set(...p);mesh.position.multiplyScalar(1+.005*Math.sin(motionTime.current*.85+i*1.7));});
  for(const label of [protonLabel,neutronLabel])if(label.current){label.current.style.opacity=state.nucleons>.75?'1':'0';label.current.style.visibility=state.nucleons>.75?'visible':'hidden'}
 });
 return <group ref={group}>
  <mesh ref={shell}><sphereGeometry args={[.32,44,32]}/><meshPhysicalMaterial color="#c5bca4" metalness={.45} roughness={.22} clearcoat={1} emissive="#463d27" emissiveIntensity={.3} transparent opacity={.9} depthWrite={false}/></mesh>
  {NUCLEONS.map((n,i)=><mesh key={i} ref={el=>nucleons.current[i]=el} position={n.position} onClick={e=>{e.stopPropagation();onSelect(n.type)}} onPointerOver={()=>document.body.style.cursor='pointer'} onPointerOut={()=>document.body.style.cursor='auto'}><sphereGeometry args={[.105,32,24]}/><meshPhysicalMaterial color={n.type==='proton'?'#cf9484':'#92b1c5'} roughness={.28} metalness={.32} clearcoat={.9} emissive={n.type==='proton'?'#5b2920':'#183d52'} emissiveIntensity={.13} transparent opacity={0}/></mesh>)}
  {labels&&<><Html portal={labelHost} position={[.32,.27,0]} center zIndexRange={[5,0]}><span ref={protonLabel} style={{opacity:0,visibility:'hidden'}} className="nucleon-label proton">p⁺</span></Html><Html portal={labelHost} position={[-.3,-.23,0]} center zIndexRange={[5,0]}><span ref={neutronLabel} style={{opacity:0,visibility:'hidden'}} className="nucleon-label neutron">n⁰</span></Html></>}
 </group>
}
