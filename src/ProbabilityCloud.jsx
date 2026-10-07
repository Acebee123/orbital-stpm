import React,{useMemo,useRef,useEffect,useLayoutEffect} from 'react';
import {useFrame} from '@react-three/fiber';
import * as THREE from 'three';
import {probabilitySamples} from './zoom-model.mjs';
import {ATOMIC} from './atomic-model.mjs';
import {ATOMIC_PARTICLE_COUNT,atomicCloudVisibility} from './presentation-model.mjs';
const vertex=`attribute float phaseSign;attribute float sampleSeed;attribute float densityWeight;uniform float time;uniform float detail;uniform float pixelRatio;uniform float focusDistance;uniform float highlight;varying vec3 samplePosition;varying float signValue;varying float shimmer;varying float weight;varying float softness;void main(){samplePosition=position;signValue=phaseSign;weight=densityWeight;shimmer=(.65+.35*sin(time*.45+sampleSeed))*(.96+.04*sin(time*.6-length(position)*2.6+sampleSeed));vec4 p=modelViewMatrix*vec4(position,1.);softness=clamp(abs(-p.z-focusDistance)*.25*detail,0.,1.);gl_Position=projectionMatrix*p;gl_PointSize=clamp((24.+detail*3.)*(1.+softness*.3)*pixelRatio/max(.6,-p.z),1.2,6.0);}`;
const fragment=`uniform float visibility;uniform float highlight;uniform float cutaway;varying vec3 samplePosition;varying float signValue;varying float shimmer;varying float weight;varying float softness;void main(){if(cutaway>.5&&samplePosition.x>0.&&samplePosition.z>0.)discard;vec2 uv=gl_PointCoord-.5;float radius=length(uv);if(radius>.5)discard;vec3 color=signValue<0.?vec3(.47,.72,.67):vec3(.85,.72,.49);float alpha=exp(-radius*radius*(14.+softness*4.))*.29*visibility*shimmer*weight/(1.+softness*.6);gl_FragColor=vec4(color*(1.+highlight*.35),alpha);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`;
export function ProbabilityCloud({orbital,zoom,motion,cutaway,selected,onSelect}){
 const clouds=useMemo(()=>[new THREE.BufferGeometry(),new THREE.BufferGeometry()],[]),refs=useRef([]),active=useRef(0),blend=useRef(1),last=useRef(null),motionTime=useRef(0),keys=useRef([]);
 // Picking uses a small, spatially representative subset of the same samples.
 // These objects are never rendered: drag need not ray-test all 56,000 points.
 const pickers=useMemo(()=>clouds.map(()=>new THREE.Points(new THREE.BufferGeometry())),[clouds]);
 const uniforms=useMemo(()=>clouds.map(()=>({time:{value:0},detail:{value:0},visibility:{value:0},pixelRatio:{value:1},cutaway:{value:0},focusDistance:{value:14.5},highlight:{value:0}})),[clouds]);
 useLayoutEffect(()=>{
  const slot=last.current===null?0:1-active.current,samples=probabilitySamples(orbital,ATOMIC_PARTICLE_COUNT);
  clouds[slot].setAttribute('position',new THREE.BufferAttribute(samples.positions,3));clouds[slot].setAttribute('phaseSign',new THREE.BufferAttribute(samples.signs,1));clouds[slot].setAttribute('sampleSeed',new THREE.BufferAttribute(samples.seeds,1));clouds[slot].setAttribute('densityWeight',new THREE.BufferAttribute(samples.weights,1));clouds[slot].computeBoundingSphere();keys.current[slot]=orbital;
  const stride=Math.ceil(samples.signs.length/1200),count=Math.ceil(samples.signs.length/stride),positions=new Float32Array(count*3);
  for(let j=0;j<count;j++)positions.set(samples.positions.subarray(j*stride*3,j*stride*3+3),j*3);
  pickers[slot].geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));pickers[slot].geometry.computeBoundingSphere();
  active.current=slot;blend.current=last.current===null?1:0;last.current=orbital;
  if(ATOMIC[orbital].family==='s'){
   // Remove outgoing geometry before paint, even if a previous fade is unfinished.
   const other=1-slot;uniforms[other].visibility.value=0;
   if(refs.current[other])refs.current[other].visible=false;
  }
  uniforms[slot].visibility.value=blend.current;
 },[orbital,clouds,pickers]);
 useEffect(()=>()=>{clouds.forEach(g=>g.dispose());pickers.forEach(p=>{p.geometry.dispose();p.material.dispose()})},[clouds,pickers]);
 const pick=(i,raycaster,intersections)=>{
  const cloud=refs.current[i];if(!cloud?.visible||cloud.material.uniforms.visibility.value<.08)return;
  const picker=pickers[i],hits=[];picker.matrixWorld.copy(cloud.matrixWorld);picker.raycast(raycaster,hits);
  if(hits.length){const closest=hits.reduce((a,b)=>a.distance<b.distance?a:b);intersections.push({...closest,object:cloud});}
 };
 useFrame(({gl,camera},delta)=>{
  if(motion)motionTime.current+=delta;
  blend.current=Math.min(1,blend.current+delta/1.25);const fade=blend.current**2*(3-2*blend.current),distance=camera.position.distanceTo(new THREE.Vector3(0,.5,0));
  uniforms.forEach((_,i)=>{const cloud=refs.current[i],u=cloud?.material.uniforms;if(!u)return;const key=keys.current[i];u.time.value=motionTime.current;u.detail.value=Math.max(0,Math.min(1,(14.5-distance)/10));u.focusDistance.value=distance;u.highlight.value=selected===0?1:0;u.pixelRatio.value=gl.getPixelRatio();u.cutaway.value=cutaway&&key&&ATOMIC[key].family==='s'&&key!=='1s'?1:0;u.visibility.value=atomicCloudVisibility(orbital,i,active.current,fade);cloud.visible=u.visibility.value>.0001});
 });
 return <>{clouds.map((geometry,i)=><points key={i} ref={el=>refs.current[i]=el} geometry={geometry} raycast={(raycaster,intersections)=>pick(i,raycaster,intersections)} frustumCulled={false} renderOrder={1} onClick={e=>{e.stopPropagation();onSelect(selected===0?null:0)}} onPointerOver={()=>document.body.style.cursor='pointer'} onPointerOut={()=>document.body.style.cursor='auto'}><shaderMaterial uniforms={uniforms[i]} vertexShader={vertex} fragmentShader={fragment} transparent depthWrite={false}/></points>)}</>;
}
