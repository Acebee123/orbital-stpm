import React,{useMemo,useRef,useEffect} from 'react';
import {useFrame} from '@react-three/fiber';
import * as THREE from 'three';
import {hybridMotion,smooth} from './model.mjs';
import {HYBRID_LOBES} from './hybrid-density.mjs';
const vertex=`varying vec3 localPosition;void main(){localPosition=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const fragment=`
precision highp float;
varying vec3 localPosition;
uniform vec3 localCamera;uniform vec3 localLight;uniform vec4 dimensions;
uniform float morph;uniform float sourceS;uniform float opacity;uniform float highlight;uniform float time;
float lobe(vec3 p){
 bool forward=p.x>=0.;float lobeLength=mix(1.40,forward?dimensions.x:dimensions.z,morph);float width=mix(.55,forward?dimensions.y:dimensions.w,morph);
 float t=abs(p.x)/lobeLength;if(t>=1.)return 0.;
 float radius=max(mix(.025,.065,morph),width*sqrt(max(0.,4.*t*(1.-t)))*(.52+.48*t));
 float rho=length(p.yz)/radius;
 float body=exp(-1.7*rho*rho)*(1.-smoothstep(.65,1.18,rho));
 float tip=1.-smoothstep(.76,1.,t);
 return body*tip*(forward?1.:mix(1.,.62,morph));
}
vec2 field(vec3 p){
 float r=length(p),radial=r/.117142857;float wave=(radial*.5-1.)*exp(-radial*.5);
 float sphere=wave*wave*3.4*(1.-smoothstep(.76,1.,r));
 float source=sourceS*sphere+(1.-sourceS)*lobe(p);
 float density=mix(source,lobe(p),morph);
 float originalPhase=sourceS*step(.2342857,r)+(1.-sourceS)*smoothstep(-.015,.015,p.x);
 float phase=mix(originalPhase,smoothstep(-.045,.16,p.x),morph);
 return vec2(density,phase);
}
void main(){
 vec3 ray=normalize(localPosition-localCamera),inverseRay=1./ray;
 vec3 a=(vec3(-1.2,-1.4,-1.4)-localCamera)*inverseRay,b=(vec3(3.35,1.4,1.4)-localCamera)*inverseRay;
 vec3 nearT=min(a,b),farT=max(a,b);
 float enter=max(max(nearT.x,nearT.y),nearT.z),leave=min(min(farT.x,farT.y),farT.z);
 enter=max(enter,0.);if(leave<=enter||opacity<.001)discard;
 float stepSize=(leave-enter)/88.;vec3 accumulated=vec3(0.);float alpha=0.;
 for(int i=0;i<88;i++){
  vec3 p=localCamera+ray*(enter+(float(i)+.5)*stepSize);vec2 value=field(p);
  if(value.x>.001){
   float lengthL=p.x>=0.?dimensions.x:dimensions.z;
   float t=clamp(abs(p.x)/lengthL,.015,.985);
   float widthL=p.x>=0.?dimensions.y:dimensions.w;
   float radius=max(.065,widthL*sqrt(4.*t*(1.-t))*(.52+.48*t));
   float slope=radius*((1.-2.*t)/(2.*t*(1.-t))+.48/(.52+.48*t))/lengthL;
   vec3 normal=normalize(vec3(-length(p.yz)/radius*slope*sign(p.x),p.y/radius,p.z/radius)+vec3(.00001));
   float shadow=0.;
   for(int j=1;j<=4;j++)shadow+=field(p+localLight*(float(j)*.26)).x*.26;
   float transmission=exp(-shadow*1.55);
   float light=.38+.65*max(dot(normal,localLight),0.);
   vec3 phaseColor=mix(vec3(.20,.49,.45),vec3(.77,.54,.25),value.y);
   vec3 color=phaseColor*(light*(.42+.58*transmission)+.15*transmission)*(1.+highlight*.12);
   float extinction=1.-exp(-value.x*stepSize*5.6);
   accumulated+=(1.-alpha)*extinction*color;alpha+=(1.-alpha)*extinction;
   if(alpha>.985)break;
  }
 }
 if(alpha<.002)discard;
 gl_FragColor=vec4(accumulated/max(alpha,.0001),alpha*opacity*(.994+.006*sin(time*.28)));
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
}`;
// The box is an invisible ray-integration region, never an orbital surface.
// Deterministic volume integration removes particle noise instead of blurring it.
export function HybridDensityVolume({clock,index,selected}){
 const mesh=useRef(),inverse=useMemo(()=>new THREE.Matrix4(),[]);
 const geometry=useMemo(()=>new THREE.BoxGeometry(4.55,2.8,2.8).translate(1.075,0,0),[]);
 const uniforms=useMemo(()=>({localCamera:{value:new THREE.Vector3()},localLight:{value:new THREE.Vector3()},dimensions:{value:new THREE.Vector4(HYBRID_LOBES.front.length,HYBRID_LOBES.front.width,HYBRID_LOBES.back.length,HYBRID_LOBES.back.width)},morph:{value:0},sourceS:{value:index===0?1:0},opacity:{value:0},highlight:{value:0},time:{value:0}}),[index]);
 useEffect(()=>()=>geometry.dispose(),[geometry]);
 useFrame(({camera,clock:real})=>{
  const {morph}=hybridMotion(clock.current.time),u=mesh.current.material.uniforms;
  mesh.current.updateWorldMatrix(true,false);inverse.copy(mesh.current.matrixWorld).invert();
  u.localCamera.value.copy(camera.position).applyMatrix4(inverse);
  u.localLight.value.set(-3,7,8).transformDirection(inverse);
  u.morph.value=morph;u.opacity.value=smooth((morph-.025)/.30);u.highlight.value=selected===index?1:0;u.time.value=real.elapsedTime;
  mesh.current.visible=u.opacity.value>.001;
 });
 return <mesh ref={mesh} geometry={geometry} raycast={()=>null} frustumCulled={false}><shaderMaterial uniforms={uniforms} vertexShader={vertex} fragmentShader={fragment} transparent depthWrite={false} side={THREE.BackSide}/></mesh>;
}
