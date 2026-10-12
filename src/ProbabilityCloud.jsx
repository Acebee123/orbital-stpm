import React,{useMemo,useRef,useEffect,useLayoutEffect} from 'react';
import {useFrame} from '@react-three/fiber';
import * as THREE from 'three';
import {probabilitySamples} from './zoom-model.mjs';
import {ATOMIC} from './atomic-model.mjs';
import {ATOMIC_PARTICLE_COUNT,atomicCloudVisibility} from './presentation-model.mjs';
import {particleDriftGLSL,orbitalMotionType,driftPoint} from './particle-motion.mjs';
const vertex=`attribute float phaseSign;attribute float sampleSeed;attribute float densityWeight;uniform float particleStyle;uniform float time;uniform float detail;uniform float pixelRatio;uniform float focusDistance;uniform float highlight;varying vec3 samplePosition;varying float signValue;varying float shimmer;varying float weight;varying float softness;varying float accent;
uniform float orbitalType;
${particleDriftGLSL}
void main(){samplePosition=driftPoint(position,time*particleStyle,sampleSeed,orbitalType);signValue=phaseSign;weight=densityWeight;shimmer=1.;accent=step(.95,fract(sampleSeed*13.17));vec4 p=modelViewMatrix*vec4(samplePosition,1.);softness=clamp(abs(-p.z-focusDistance)*.12*detail,0.,.65);gl_Position=projectionMatrix*p;gl_PointSize=clamp(mix(19.,30.,accent)*pixelRatio*(1.+softness*.25)/max(.6,-p.z),mix(1.05,1.8,accent)*pixelRatio,5.*pixelRatio);}`;
const fragment=`uniform float visibility;uniform float highlight;uniform float cutaway;varying vec3 samplePosition;varying float signValue;varying float shimmer;varying float weight;varying float softness;varying float accent;void main(){if(cutaway>.5&&samplePosition.x>0.&&samplePosition.z>0.)discard;vec2 uv=gl_PointCoord-.5;float radius=length(uv);if(radius>.5)discard;vec3 color=signValue<0.?vec3(.22,.013,.10):vec3(.012,.042,.24);float edge=1.-smoothstep(.34,.5,radius);float core=exp(-radius*radius*65.);float alpha=exp(-radius*radius*22.)*edge*.38*mix(.55,2.2,accent)*visibility*shimmer*weight/(1.+softness*.4);gl_FragColor=vec4(mix(color,color*.55,core*.20)*(1.-highlight*.16),alpha);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`;
export function ProbabilityCloud({orbital,zoom,motion,cutaway,selected,onSelect,particleStyle}){
 const clouds=useMemo(()=>[new THREE.BufferGeometry(),new THREE.BufferGeometry()],[]),refs=useRef([]),active=useRef(0),blend=useRef(1),last=useRef(null),motionTime=useRef(0),keys=useRef([]);
 // Picking uses a small, spatially representative subset of the same samples.
 // These objects are never rendered: drag need not ray-test all 56,000 points.
 const pickers=useMemo(()=>clouds.map(()=>new THREE.Points(new THREE.BufferGeometry())),[clouds]);
 const uniforms=useMemo(()=>clouds.map(()=>({orbitalType:{value:0},particleStyle:{value:1},time:{value:0},detail:{value:0},visibility:{value:0},pixelRatio:{value:1},cutaway:{value:0},focusDistance:{value:14.5},highlight:{value:0}})),[clouds]);
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
  const picker=pickers[i],hits=[];picker.matrixWorld.copy(cloud.matrixWorld);
  const attribute=picker.geometry.attributes.position,source=clouds[i].attributes.position,seeds=clouds[i].attributes.sampleSeed,stride=Math.ceil(seeds.count/1200);
  for(let j=0;j<attribute.count;j++){const n=j*stride,p=Array.from(source.array.subarray(n*3,n*3+3));attribute.array.set(driftPoint(orbitalMotionType(keys.current[i]),p,particleStyle==='drift'?motionTime.current:0,seeds.array[n]),j*3);}
  attribute.needsUpdate=true;picker.geometry.computeBoundingSphere();picker.raycast(raycaster,hits);
  if(hits.length){const closest=hits.reduce((a,b)=>a.distance<b.distance?a:b);intersections.push({...closest,object:cloud});}
 };
 useFrame(({gl,camera},delta)=>{
  if(motion)motionTime.current+=Math.min(delta,.1);
  blend.current=Math.min(1,blend.current+delta/1.25);const fade=blend.current**2*(3-2*blend.current),distance=camera.position.distanceTo(new THREE.Vector3(0,.5,0));
  uniforms.forEach((_,i)=>{const cloud=refs.current[i],u=cloud?.material.uniforms;if(!u)return;const key=keys.current[i];u.time.value=motionTime.current;u.particleStyle.value=particleStyle==='drift'?1:0;u.orbitalType.value=orbitalMotionType(keys.current[i]);u.detail.value=Math.max(0,Math.min(1,(14.5-distance)/10));u.focusDistance.value=distance;u.highlight.value=selected===0?1:0;u.pixelRatio.value=gl.getPixelRatio();u.cutaway.value=cutaway&&key&&ATOMIC[key].family==='s'&&key!=='1s'?1:0;u.visibility.value=atomicCloudVisibility(orbital,i,active.current,fade);cloud.visible=u.visibility.value>.0001});
 });
 return <>{clouds.map((geometry,i)=><points key={i} ref={el=>refs.current[i]=el} geometry={geometry} raycast={(raycaster,intersections)=>pick(i,raycaster,intersections)} frustumCulled={false} renderOrder={1} onClick={e=>{e.stopPropagation();onSelect(selected===0?null:0)}} onPointerOver={()=>document.body.style.cursor='pointer'} onPointerOut={()=>document.body.style.cursor='auto'}><shaderMaterial uniforms={uniforms[i]} vertexShader={vertex} fragmentShader={fragment} transparent depthWrite={false}/></points>)}</>;
}
