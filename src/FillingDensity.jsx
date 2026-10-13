import React,{useMemo,useRef,useEffect} from 'react';
import {useFrame,useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {ATOMIC_ROTATION} from './presentation-model.mjs';

// Continuous stationary probability field; only the counted gold markers move.
const vertex=`varying vec3 exitPoint;void main(){exitPoint=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const fragment=`precision highp float;
varying vec3 exitPoint;uniform vec3 localCamera;uniform vec4 sPopulation;uniform vec3 p2Population;uniform vec3 p3Population;uniform float fieldOpacity;uniform float fieldRadius;
float envelope(float metric){return exp(-pow(max(0.,metric-.88)/.14,2.));}
vec4 density(vec3 p){
 float r=length(p);vec3 direction=p/max(r,.0001);vec4 sum=vec4(0.);float x,a,d,q;
 if(sPopulation.x>.001&&r<1.75){x=r/(1.35/3.5);a=exp(-x);d=sPopulation.x*a*a*2.4*envelope(r/1.35);sum+=vec4(vec3(.075,.24,.68)*d,d);}
 if(sPopulation.y>.001&&r<2.8){x=r/(2.15/7.);a=(x*.5-1.)*exp(-x*.5);d=sPopulation.y*a*a*3.7*envelope(r/2.15);sum+=vec4((a<0.?vec3(.49,.075,.32):vec3(.075,.24,.68))*d,d);}
 if(sPopulation.z>.001&&r<4.){x=r/(3.05/12.);a=(1.-2.*x/3.+2.*x*x/27.)*exp(-x/3.);d=sPopulation.z*a*a*4.8*envelope(r/3.05);sum+=vec4((a<0.?vec3(.49,.075,.32):vec3(.075,.24,.68))*d,d);}
 if(sPopulation.w>.001){x=r/(3.95/26.);q=x*.5;a=(4.-6.*q+2.*q*q-q*q*q/6.)*exp(-x*.25);d=sPopulation.w*a*a*.45*envelope(r/3.95);sum+=vec4((a<0.?vec3(.49,.075,.32):vec3(.075,.24,.68))*d,d);}
 for(int axis=0;axis<3;axis++){
  float along=abs(p[axis]),transverse=max(0.,r*r-along*along);
  if(p2Population[axis]>.001&&r<2.9){float metric=sqrt(pow(along/1.183-1.,2.)+transverse/(.715*.715));x=r/.3;a=x*exp(-x*.5)*direction[axis];d=p2Population[axis]*a*a*1.4*envelope(metric);sum+=vec4((a<0.?vec3(.49,.075,.32):vec3(.075,.24,.68))*d,d);}
  if(p3Population[axis]>.001){float metric=sqrt(pow(along/(1.183*1.42)-1.,2.)+transverse/pow(.715*1.42,2.));x=r/.28;q=2.*x/3.;a=q*(4.-q)*exp(-x/3.)*direction[axis];d=p3Population[axis]*a*a*.55*envelope(metric);sum+=vec4((a<0.?vec3(.49,.075,.32):vec3(.075,.24,.68))*d,d);}
 }
 return sum;
}
void main(){
 vec3 ray=normalize(exitPoint-localCamera);float b=dot(localCamera,ray),c=dot(localCamera,localCamera)-fieldRadius*fieldRadius,disc=b*b-c;
 if(disc<0.)discard;float root=sqrt(disc),start=max(0.,-b-root),end=-b+root;
 if(end<=start)discard;float stepSize=(end-start)/64.;vec4 result=vec4(0.);
 for(int i=0;i<64;i++){
  vec3 p=localCamera+ray*(start+(float(i)+.5)*stepSize);vec4 field=density(p);
  float alpha=1.-exp(-field.a*stepSize*fieldOpacity*1.7);
  vec3 colour=field.rgb/max(field.a,.00001);result.rgb+=(1.-result.a)*alpha*colour;result.a+=(1.-result.a)*alpha;
  if(result.a>.96)break;
 }
 if(result.a<.001)discard;gl_FragColor=vec4(result.rgb/max(result.a,.00001),result.a);
}`;
const screenVertex=`varying vec2 uvCoord;void main(){uvCoord=uv;gl_Position=vec4(position.xy,0.,1.);}`;
const screenFragment=`uniform sampler2D densityMap;varying vec2 uvCoord;void main(){gl_FragColor=texture2D(densityMap,uvCoord);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`;
export function FillingDensity({clouds,whole}){
 const {size}=useThree(),inverse=useMemo(()=>new THREE.Matrix4(),[]),clearColour=useMemo(()=>new THREE.Color(),[]);
 const field=useMemo(()=>{
  const uniforms={localCamera:{value:new THREE.Vector3()},sPopulation:{value:new THREE.Vector4()},p2Population:{value:new THREE.Vector3()},p3Population:{value:new THREE.Vector3()},fieldOpacity:{value:.75},fieldRadius:{value:1.75}};
  const geometry=new THREE.BoxGeometry(10,10,10),material=new THREE.ShaderMaterial({uniforms,vertexShader:vertex,fragmentShader:fragment,side:THREE.BackSide,blending:THREE.NoBlending,depthWrite:false,depthTest:false}),volume=new THREE.Mesh(geometry,material),scene=new THREE.Scene();
  volume.rotation.set(...ATOMIC_ROTATION);scene.add(volume);scene.updateMatrixWorld(true);
  const target=new THREE.WebGLRenderTarget(1,1,{minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,depthBuffer:false});
  return {uniforms,geometry,material,volume,scene,target};
 },[]);
 const screenUniforms=useMemo(()=>({densityMap:{value:field.target.texture}}),[field]);
 // Soft density is composited from a reduced-resolution target. The nucleus,
 // electron glyphs and UI retain the main canvas's antialiasing and resolution.
 useEffect(()=>{field.target.setSize(Math.max(1,Math.round(size.width*.38)),Math.max(1,Math.round(size.height*.38)))},[size.width,size.height,field]);
 useEffect(()=>()=>{field.target.dispose();field.geometry.dispose();field.material.dispose()},[field]);
 useFrame(({gl,camera},delta)=>{
  const u=field.uniforms;inverse.copy(field.volume.matrixWorld).invert();u.localCamera.value.copy(camera.position).applyMatrix4(inverse);
  const s=[0,0,0,0],p2=[0,0,0],p3=[0,0,0];for(const c of clouds){if(c.type==='s')s[c.n-1]=c.population;else(c.n===2?p2:p3)[c.axis]=c.population;}
  const blend=1-Math.exp(-Math.min(delta,.1)*5);u.sPopulation.value.lerp(new THREE.Vector4(...s),blend);u.p2Population.value.lerp(new THREE.Vector3(...p2),blend);u.p3Population.value.lerp(new THREE.Vector3(...p3),blend);u.fieldOpacity.value=whole?.58:1.15;
  const radius=Math.max(1.75,...clouds.filter(c=>c.population>0).map(c=>c.type==='s'?[0,1.75,2.8,4,4.95][c.n]:c.n===2?2.9:4.15));u.fieldRadius.value=THREE.MathUtils.lerp(u.fieldRadius.value,radius,blend);
  const previous=gl.getRenderTarget(),alpha=gl.getClearAlpha();gl.getClearColor(clearColour);
  gl.setRenderTarget(field.target);gl.setClearColor(0x000000,0);gl.clear();gl.render(field.scene,camera);gl.setRenderTarget(previous);gl.setClearColor(clearColour,alpha);
 });
 return <mesh name="stationary-probability-density" renderOrder={1} frustumCulled={false} raycast={()=>null}><planeGeometry args={[2,2]}/><shaderMaterial uniforms={screenUniforms} vertexShader={screenVertex} fragmentShader={screenFragment} transparent depthWrite={false} depthTest={false}/></mesh>;
}

