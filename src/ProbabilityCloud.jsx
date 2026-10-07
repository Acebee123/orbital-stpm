import React,{useMemo,useRef,useEffect} from 'react';
import {useFrame} from '@react-three/fiber';
import * as THREE from 'three';
import {probabilitySamples,zoomReveal,zoomDistance} from './zoom-model.mjs';
import {ATOMIC} from './atomic-model.mjs';
const vertex=`attribute float phaseSign;attribute float sampleSeed;attribute float densityWeight;uniform float time;uniform float detail;uniform float pixelRatio;uniform float focusDistance;varying vec3 samplePosition;varying float signValue;varying float shimmer;varying float weight;varying float softness;void main(){samplePosition=position;signValue=phaseSign;weight=densityWeight;shimmer=(.5+.5*sin(time*.45+sampleSeed))*(.9+.1*sin(time*.6-length(position)*2.6+sampleSeed));vec4 p=modelViewMatrix*vec4(position,1.);softness=clamp(abs(-p.z-focusDistance)*.25*detail,0.,1.);gl_Position=projectionMatrix*p;gl_PointSize=clamp((45.+detail*8.)*(1.+softness*.6)*pixelRatio/max(.6,-p.z),2.5,11.0);}`;
const fragment=`uniform float visibility;uniform float cutaway;varying vec3 samplePosition;varying float signValue;varying float shimmer;varying float weight;varying float softness;void main(){if(cutaway>.5&&samplePosition.x>0.&&samplePosition.z>0.)discard;vec2 uv=gl_PointCoord-.5;float radius=length(uv);if(radius>.5)discard;vec3 color=signValue<0.?vec3(.47,.72,.67):vec3(.85,.72,.49);float alpha=exp(-radius*radius*(14.+softness*4.))*.29*visibility*shimmer*weight/(1.+softness*.6);gl_FragColor=vec4(color,alpha);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`;
export function ProbabilityCloud({orbital,zoom,motion,cutaway}){
 const clouds=useMemo(()=>[new THREE.BufferGeometry(),new THREE.BufferGeometry()],[]),refs=useRef([]),active=useRef(0),blend=useRef(1),last=useRef(null),motionTime=useRef(0),keys=useRef([]);
 const uniforms=useMemo(()=>clouds.map(()=>({time:{value:0},detail:{value:0},visibility:{value:0},pixelRatio:{value:1},cutaway:{value:0},focusDistance:{value:14.5}})),[clouds]);
 useEffect(()=>{
  const slot=last.current===null?0:1-active.current,samples=probabilitySamples(orbital);
  clouds[slot].setAttribute('position',new THREE.BufferAttribute(samples.positions,3));clouds[slot].setAttribute('phaseSign',new THREE.BufferAttribute(samples.signs,1));clouds[slot].setAttribute('sampleSeed',new THREE.BufferAttribute(samples.seeds,1));clouds[slot].setAttribute('densityWeight',new THREE.BufferAttribute(samples.weights,1));clouds[slot].computeBoundingSphere();keys.current[slot]=orbital;
  active.current=slot;blend.current=last.current===null?1:0;last.current=orbital;
 },[orbital,clouds]);
 useEffect(()=>()=>clouds.forEach(g=>g.dispose()),[clouds]);
 useFrame(({gl},delta)=>{
  if(motion)motionTime.current+=delta;
  blend.current=Math.min(1,blend.current+delta/1.25);const fade=blend.current**2*(3-2*blend.current),state=zoomReveal(zoom.current.progress);
  uniforms.forEach((_,i)=>{const cloud=refs.current[i],u=cloud?.material.uniforms;if(!u)return;const key=keys.current[i];u.time.value=motionTime.current;u.detail.value=state.detail;u.focusDistance.value=zoomDistance(zoom.current.progress);u.pixelRatio.value=gl.getPixelRatio();u.cutaway.value=cutaway&&key&&ATOMIC[key].family==='s'&&key!=='1s'?1:0;u.visibility.value=(i===active.current?fade:1-fade)*state.cloud;cloud.visible=u.visibility.value>.0001});
 });
 return <>{clouds.map((geometry,i)=><points key={i} ref={el=>refs.current[i]=el} geometry={geometry} frustumCulled={false} renderOrder={1}><shaderMaterial uniforms={uniforms[i]} vertexShader={vertex} fragmentShader={fragment} transparent depthWrite={false}/></points>)}</>;
}
