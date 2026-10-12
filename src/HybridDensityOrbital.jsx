import React,{useMemo,useRef,useEffect} from 'react';
import {useFrame} from '@react-three/fiber';
import {Html} from '@react-three/drei';
import * as THREE from 'three';
import {hybridMotion,TIMING} from './model.mjs';
import {hybridSourcePosition} from './presentation-model.mjs';
import {hybridSourceSamples,hybridDensitySamples} from './hybrid-density.mjs';
import {particleDriftGLSL} from './particle-motion.mjs';
const targets=new Map(),sources=new Map(),xaxis=new THREE.Vector3(1,0,0);
const direction=d=>new THREE.Quaternion().setFromUnitVectors(xaxis,new THREE.Vector3(...d));
const vertex=`attribute vec3 targetPosition;attribute float sourcePhase;attribute float targetPhase;attribute float sampleSeed;attribute float sourceWeight;attribute float targetWeight;
uniform float particleStyle;uniform float morph;uniform float stretch;uniform float time;uniform float pixelRatio;varying vec3 phaseColor;varying float alphaWeight;varying float brightness;
vec3 phase(float value){return value<0.?vec3(.22,.013,.10):vec3(.012,.042,.24);}
${particleDriftGLSL}
void main(){vec3 densityPoint=driftPoint(mix(position,targetPosition,morph),time*particleStyle,sampleSeed,9.);densityPoint.x*=stretch;vec4 p=modelViewMatrix*vec4(densityPoint,1.);float weight=mix(sourceWeight,targetWeight,morph);phaseColor=mix(phase(sourcePhase),phase(targetPhase),morph);float shimmer=1.;float accent=step(.95,fract(sampleSeed*1.618));alphaWeight=weight*shimmer*mix(.55,1.8,accent);brightness=.62+.38*sqrt(weight);gl_Position=projectionMatrix*p;float pointSize=mix(14.,23.,accent)*pixelRatio*(.68+.32*sqrt(weight))*(.86+.14*sin(sampleSeed*2.))/max(.6,-p.z);gl_PointSize=clamp(pointSize,mix(.65,1.35,accent)*pixelRatio,mix(2.,3.3,accent)*pixelRatio);}`;
const fragment=`uniform float intensity;uniform float highlight;uniform float morph;varying vec3 phaseColor;varying float alphaWeight;varying float brightness;void main(){vec2 uv=gl_PointCoord-.5;float r=length(uv);if(r>.5)discard;float softPoint=exp(-r*r*24.)*(1.-smoothstep(.38,.5,r));float core=exp(-r*r*65.);vec3 color=mix(phaseColor,phaseColor*.55,core*.20)*brightness*(1.-highlight*.16);gl_FragColor=vec4(color,softPoint*mix(.48,.78,morph)*alphaWeight*intensity);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`;
export function HybridDensityOrbital({index,config,clock,selected,onSelect,labels,labelHost,motion,particleStyle}){
 const group=useRef(),points=useRef(),label=useRef(),motionTime=useRef(0);
 const data=useMemo(()=>{
  const sourceKey=index===0?'s':'p';
  if(!sources.has(sourceKey))sources.set(sourceKey,hybridSourceSamples(index));
  if(!targets.has(config.key))targets.set(config.key,hybridDensitySamples(config.key));
  const source=sources.get(sourceKey),target=targets.get(config.key),geometry=new THREE.BufferGeometry();
  for(const [name,array,size] of [['position',source.positions,3],['targetPosition',target.positions,3],['sourcePhase',source.signs,1],['targetPhase',target.signs,1],['sampleSeed',source.seeds,1],['sourceWeight',source.weights,1],['targetWeight',target.weights,1]])geometry.setAttribute(name,new THREE.BufferAttribute(array,size));
  const picker=new THREE.Points(new THREE.BufferGeometry()),stride=Math.ceil(source.signs.length/1000),indices=Array.from({length:Math.ceil(source.signs.length/stride)},(_,i)=>i*stride);
  picker.geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(indices.length*3),3));
  return {source,target,geometry,picker,indices,lastMorph:-1,lastStretch:-1};
 },[index,config.key]);
 const uniforms=useMemo(()=>({particleStyle:{value:0},morph:{value:0},stretch:{value:1},time:{value:0},pixelRatio:{value:1},intensity:{value:1},highlight:{value:0}}),[]);
 useEffect(()=>()=>{data.geometry.dispose();data.picker.geometry.dispose();data.picker.material.dispose()},[data]);
 const initial=direction(index===0?[1,0,0]:[[1,0,0],[0,1,0],[0,0,1]][index-1]),final=direction(config.directions[index]);
 const row=new THREE.Vector3();
 useFrame(({gl},delta)=>{
  if(motion)motionTime.current+=Math.min(delta,.1);
  const t=clock.current.time,{gather,morph}=hybridMotion(t),stretch=1;
  row.set(...hybridSourcePosition(index,config.count,gl.domElement.clientWidth<560));
  group.current.position.copy(row).multiplyScalar(1-gather);group.current.scale.setScalar(.68+.32*gather);
  group.current.quaternion.copy(initial).slerp(final,morph).premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),.58*Math.sin(Math.PI*morph)));
  const u=points.current.material.uniforms;
  u.morph.value=morph;u.stretch.value=stretch;u.time.value=motionTime.current;u.particleStyle.value=particleStyle==='drift'?1:0;u.pixelRatio.value=gl.getPixelRatio();u.intensity.value=1;u.highlight.value=selected===index?1:0;
  if(label.current){label.current.position.copy(group.current.position);if(t<TIMING.morphStart)label.current.position.y+=1.65;else label.current.position.addScaledVector(new THREE.Vector3(...config.directions[index]),3.28);}
  if(data.lastMorph!==morph||data.lastStretch!==stretch){
   const position=data.picker.geometry.attributes.position;
   data.indices.forEach((sample,i)=>{for(let k=0;k<3;k++)position.array[i*3+k]=THREE.MathUtils.lerp(data.source.positions[sample*3+k],data.target.positions[sample*3+k],morph)*(k===0?stretch:1);});
   position.needsUpdate=true;data.picker.geometry.computeBoundingSphere();data.lastMorph=morph;data.lastStretch=stretch;
  }
 });
 const raycast=(raycaster,intersections)=>{
  if(!points.current)return;data.picker.matrixWorld.copy(points.current.matrixWorld);const hits=[];data.picker.raycast(raycaster,hits);
  if(hits.length)intersections.push({...hits.reduce((a,b)=>a.distance<b.distance?a:b),object:points.current});
 };
 return <><group ref={group}><points ref={points} geometry={data.geometry} frustumCulled={false} raycast={raycast} onClick={e=>{e.stopPropagation();onSelect(selected===index?null:index)}} onPointerOver={()=>document.body.style.cursor='pointer'} onPointerOut={()=>document.body.style.cursor='auto'}>
  <shaderMaterial uniforms={uniforms} vertexShader={vertex} fragmentShader={fragment} transparent depthWrite={false}/>
 </points></group><group ref={label}>{labels&&<Html portal={labelHost} center distanceFactor={14} zIndexRange={[3,0]}><span className={`orbital-label hybrid-label ${selected===index?'highlighted':''}`}>{clock.current.time<TIMING.atomicHold?['2s','2pₓ','2pᵧ','2p𝓏'][index]:clock.current.time<TIMING.morphEnd?`mixing · ${index+1}`:`${config.label} · ${index+1}`}</span></Html>}</group></>;
}
