import React,{useMemo,useRef,useEffect} from 'react';
import {useFrame} from '@react-three/fiber';
import {Html,Line} from '@react-three/drei';
import * as THREE from 'three';
import {ATOMIC,atomicSourcePoint,lobeSourcePoint,surfaceSlots} from './atomic-model.mjs';
import {zoomReveal} from './zoom-model.mjs';
import {ProbabilityCloud} from './ProbabilityCloud';
const amber='#d9b77c',teal='#79b8aa',xaxis=new THREE.Vector3(1,0,0);
const vertex=`varying vec3 n;varying vec3 view;varying vec3 local;void main(){local=position;vec4 p=modelViewMatrix*vec4(position,1.);n=normalize(normalMatrix*normal);view=-p.xyz;gl_Position=projectionMatrix*p;}`;
const fragment=`uniform vec3 phase;uniform float opacity;uniform float cutaway;uniform float highlight;uniform float time;varying vec3 n;varying vec3 view;varying vec3 local;void main(){if(cutaway>.5&&local.x>0.&&local.z>0.)discard;float rim=pow(1.-abs(dot(normalize(n),normalize(view))),1.8);float lit=max(dot(normalize(n),normalize(vec3(.5,.8,.7))),0.);float wave=.97+.03*sin(length(local)*3.-time*.65);gl_FragColor=vec4(phase*(.67+.3*lit+.46*rim+highlight*.3),opacity*(.28+.72*rim)*wave);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`;
function makeSurface(){const geometry=new THREE.SphereGeometry(1,44,28),base=geometry.attributes.position.array.slice();geometry.attributes.position.array.fill(0);return {geometry,base,from:null,to:null,color:new THREE.Color(amber),startColor:new THREE.Color(amber),targetColor:new THREE.Color(amber)}}
export function AtomicOrbitals({orbital,labels,axes,cutaway,selected,onSelect,labelHost,zoom,motion}){
 const meshes=useRef([]),torus=useRef(),transition=useRef(2),group=useRef(),motionTime=useRef(0);
 const surfaces=useMemo(()=>Array.from({length:4},makeSurface),[]);
 const torusGeometry=useMemo(()=>new THREE.TorusGeometry(.88,.27,28,72),[]);
 const torusBase=useMemo(()=>torusGeometry.attributes.position.array.slice(),[torusGeometry]);
 const torusMorph=useRef({from:0,to:0,scale:0});
 useEffect(()=>()=>{surfaces.forEach(s=>s.geometry.dispose());torusGeometry.dispose()},[surfaces,torusGeometry]);
 useEffect(()=>{
  const slots=surfaceSlots(orbital),c=ATOMIC[orbital];
  surfaces.forEach((s,i)=>{
   const slot=slots[i],target=new Float32Array(s.base.length);
   const q=slot?.dir?new THREE.Quaternion().setFromUnitVectors(xaxis,new THREE.Vector3(...slot.dir)):new THREE.Quaternion();
   for(let j=0;j<target.length;j+=3){
    const [x,y,z]=s.base.slice(j,j+3);let p=new THREE.Vector3();
    if(slot?.type==='sphere'){
     // The outer 2s shell is exactly the source used by the preserved hybridisation morph.
     const a=atomicSourcePoint(0,false,x,y,z);p.set(...a).multiplyScalar(slot.radius/.82*2.85);
    }else if(slot){p.set(...lobeSourcePoint(slot.pinch,x,y,z)).applyQuaternion(q).multiplyScalar(1.3)}
    p.toArray(target,j);
   }
   s.from=s.geometry.attributes.position.array.slice();s.to=target;s.startColor.copy(s.color);s.targetColor.set(slot?.phase===-1?teal:amber);
  });
  torusMorph.current={from:torusMorph.current.scale,to:orbital==='dz2'?1.3:0,scale:torusMorph.current.scale};transition.current=0;
 },[orbital,surfaces]);
 useFrame((_,delta)=>{
  if(motion)motionTime.current+=delta;
  const reveal=zoomReveal(zoom.current.progress);
  transition.current=Math.min(1,transition.current+delta/1.25);const t=transition.current,tween=t*t*t*(t*(t*6-15)+10);
  surfaces.forEach((s,i)=>{const a=s.geometry.attributes.position;if(s.to&&t<1){for(let j=0;j<a.array.length;j++)a.array[j]=THREE.MathUtils.lerp(s.from[j],s.to[j],tween);a.needsUpdate=true;s.geometry.computeVertexNormals()}else if(s.to&&s.final!==s.to){a.array.set(s.to);a.needsUpdate=true;s.geometry.computeVertexNormals();s.final=s.to}
   s.color.copy(s.startColor).lerp(s.targetColor,tween);const mesh=meshes.current[i],m=mesh?.material;if(m){mesh.visible=reveal.context>.01;m.uniforms.phase.value.copy(s.color);m.uniforms.cutaway.value=cutaway&&ATOMIC[orbital].family==='s'&&orbital!=='1s'?1:0;m.uniforms.highlight.value=selected===i?1:0;m.uniforms.opacity.value=reveal.surfaceOpacity;m.uniforms.time.value=motionTime.current}
  });
  const m=torusMorph.current;m.scale=THREE.MathUtils.lerp(m.from,m.to,tween);torus.current.scale.setScalar(Math.max(.0001,m.scale));torus.current.visible=m.scale>.001&&reveal.context>.01;torus.current.material.uniforms.highlight.value=selected===4?1:0;torus.current.material.uniforms.opacity.value=reveal.surfaceOpacity;torus.current.material.uniforms.time.value=motionTime.current;
 });
 const material=(color=amber)=>({phase:{value:new THREE.Color(color)},opacity:{value:.4},cutaway:{value:0},highlight:{value:0},time:{value:0}});
 const pick=i=>e=>{e.stopPropagation();onSelect(selected===i?null:i)};
 return <group ref={group}>
  <ProbabilityCloud orbital={orbital} zoom={zoom} motion={motion} cutaway={cutaway}/>
  {surfaces.map((s,i)=><mesh key={i} geometry={s.geometry} ref={el=>meshes.current[i]=el} onClick={pick(i)} onPointerOver={()=>document.body.style.cursor='pointer'} onPointerOut={()=>document.body.style.cursor='auto'}><shaderMaterial uniforms={material()} vertexShader={vertex} fragmentShader={fragment} transparent depthWrite={false} side={THREE.DoubleSide}/></mesh>)}
  <mesh ref={torus} geometry={torusGeometry} onClick={pick(4)}><shaderMaterial uniforms={material(teal)} vertexShader={vertex} fragmentShader={fragment} transparent depthWrite={false} side={THREE.DoubleSide}/></mesh>
  {labels&&<Html portal={labelHost} position={[0,2.95,0]} center zIndexRange={[5,0]}><span className="orbital-label">{ATOMIC[orbital].label}</span></Html>}
  {axes&&[[1,0,0],[0,1,0],[0,0,1]].map((d,i)=><group key={i}>
   <Line points={[d.map(v=>v*-3.15),d.map(v=>v*3.15)]} color={['#ad8b72','#87aaa0','#8e9daf'][i]} lineWidth={.8} transparent opacity={.5}/>
   <mesh position={d.map(v=>v*3.15)} quaternion={new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),new THREE.Vector3(...d))}><coneGeometry args={[.045,.16,12]}/><meshBasicMaterial color={['#ad8b72','#87aaa0','#8e9daf'][i]}/></mesh>
   {labels&&<Html portal={labelHost} position={d.map(v=>v*3.45)} center zIndexRange={[4,0]}><span className="axis-label">{['x','y','z'][i]}</span></Html>}
  </group>)}
 </group>
}
