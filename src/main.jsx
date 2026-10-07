import React, {useState,useRef,useEffect,useCallback,Suspense,Component} from 'react';
import {createRoot} from 'react-dom/client';
import {Canvas,useFrame,useThree} from '@react-three/fiber';
import {OrbitControls,Html,Line,ContactShadows} from '@react-three/drei';
import * as THREE from 'three';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {Play,Pause,RotateCcw,SkipForward,Volume2,VolumeX,Tags,Focus,ArrowUpRight,X,MoveUpRight,MousePointer2,Info,ChevronDown,Check,Atom} from 'lucide-react';
import {CONFIG,clamp,smooth,duration,bondStart,hydrogenDistance,CONTACT_OFFSET,stageAt,formedAt,STAGES} from './model.mjs';
import {audio} from './audio';
import {createCameraControl,takeCameraControl,releaseCameraControl,resetCameraControl,restartCameraTimeline,canGuideCamera,canFrameGeometry,geometryFramingDistance} from './camera-model.mjs';
import './style.css';
import {ATOMIC,atomicSourcePoint} from './atomic-model.mjs';
import {AtomicOrbitals} from './AtomicOrbitals';
import {MicroscopicNucleus} from './MicroscopicNucleus';
import {ZOOM_DISTANCE,ZOOM_STAGES,zoomDepth,zoomDistance,zoomReveal,createZoomIntent,observeZoom,requestZoomIntent,dampedZoomDistance} from './zoom-model.mjs';

const AMBER='#d9b77c',TEAL='#79b8aa';
const XAXIS=new THREE.Vector3(1,0,0);
const axisQuaternion=d=>new THREE.Quaternion().setFromUnitVectors(XAXIS,new THREE.Vector3(...d).normalize());
const V=(a)=>new THREE.Vector3(...a);
const DENSITY_VERTEX=`varying vec3 vNormal; varying vec3 vView; void main(){vec4 p=modelViewMatrix*vec4(position,1.);vNormal=normalize(normalMatrix*normal);vView=-p.xyz;gl_Position=projectionMatrix*p;}`;
const DENSITY_FRAGMENT=`uniform vec3 phaseColor; uniform float densityOpacity; uniform float glow; varying vec3 vNormal; varying vec3 vView; void main(){vec3 n=normalize(vNormal);float rim=pow(1.-abs(dot(n,normalize(vView))),2.1);float light=max(dot(n,normalize(vec3(.5,.8,.7))),0.);vec3 color=phaseColor*(.67+.3*light+.46*rim+glow*.35);gl_FragColor=vec4(color,densityOpacity*(.28+.72*rim));\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}`;
function DensityMaterial({color,opacity=.42}){
 const uniforms=React.useMemo(()=>({phaseColor:{value:new THREE.Color(color)},densityOpacity:{value:opacity},glow:{value:.12}}),[color]);
 return <shaderMaterial uniforms={uniforms} vertexShader={DENSITY_VERTEX} fragmentShader={DENSITY_FRAGMENT} transparent depthWrite={false} side={THREE.FrontSide}/>;
}

// Fixed topology on both ends of every morph. Each source surface is deformed,
// not swapped or cross-faded; phase lobes remain separate across their node.
function makeOrbital(index,negative){
 const geometry=new THREE.SphereGeometry(1,44,28), attribute=geometry.attributes.position;
 const source=new Float32Array(attribute.array.length),target=new Float32Array(attribute.array.length);
 for(let i=0;i<attribute.count;i++){
   const x=attribute.getX(i),y=attribute.getY(i),z=attribute.getZ(i);
   const sign=negative?-1:1;
   source.set(atomicSourcePoint(index,negative,x,y,z),i*3);
   const length=negative?.52:2.38, width=negative?.28:.77;
   target[i*3]=sign*length*(x+1)/2;
   const profile=.85+.15*x;
   target[i*3+1]=y*width*profile;target[i*3+2]=z*width*profile;
 }
 return {geometry,source,target};
}

function Orbital({index,config,clock,selected,onSelect,labels,labelHost}){
 const positive=useRef(),negative=useRef(),group=useRef(),radialCore=useRef();
 const meshes=React.useMemo(()=>[makeOrbital(index,false),makeOrbital(index,true)],[index]);
 useEffect(()=>()=>meshes.forEach(m=>m.geometry.dispose()),[meshes]);
 const initial=axisQuaternion(index===0?[1,0,0]:[[1,0,0],[0,1,0],[0,0,1]][index-1]);
 const final=axisQuaternion(config.directions[index]);
 const sourcePosition=config.count===4?[[-1.65,.4,0],[1.65,.4,0],[0,1.65,0],[0,-1.2,1]][index]:config.count===3?[[-1.65,.1,0],[1.5,.3,0],[0,1.6,0]][index]:[[-1.55,.1,0],[1.55,.1,0]][index];
 useFrame(({clock:real})=>{
   const t=clock.current.time, morph=smooth((t-2)/6.5),settle=smooth((t-1.7)/2.4);
   group.current.position.copy(V(sourcePosition).multiplyScalar(1-settle));
   const float=(1-settle)*.075*Math.sin(real.elapsedTime*.8+index*2);
   group.current.position.y+=float;
   group.current.quaternion.copy(initial).slerp(final,morph);
   if(radialCore.current){radialCore.current.scale.setScalar(Math.max(.0001,1-morph));radialCore.current.material.uniforms.densityOpacity.value=.4*(1-morph);}
   meshes.forEach((m,j)=>{
     const a=m.geometry.attributes.position;
     const stretch=1+.025*Math.sin((t-bondStart(index))*3)*smooth((t-bondStart(index)-CONTACT_OFFSET)/.35)*(1-smooth((t-bondStart(index)-CONTACT_OFFSET-.5)/.5));
     if(m.lastMorph!==morph||m.lastStretch!==stretch){for(let i=0;i<a.array.length;i++)a.array[i]=THREE.MathUtils.lerp(m.source[i],m.target[i],morph)*(i%3===0?stretch:1);a.needsUpdate=true;m.geometry.computeVertexNormals();m.lastMorph=morph;m.lastStretch=stretch;}
     const mat=(j?negative:positive).current.material;
     mat.uniforms.densityOpacity.value=j&&index===0?.4*morph:.48;
     mat.uniforms.glow.value=selected===index?.95:.1+.22*smooth((t-bondStart(index)-CONTACT_OFFSET)/.7);
   });
 });
 const click=e=>{e.stopPropagation();onSelect(selected===index?null:index)};
 return <group ref={group}>
   {index===0&&<mesh ref={radialCore}><sphereGeometry args={[.82*2/7,44,28]}/><DensityMaterial color={TEAL}/></mesh>}
   {meshes.map((m,j)=><mesh key={j} ref={j?negative:positive} geometry={m.geometry} onClick={click} onPointerOver={()=>document.body.style.cursor='pointer'} onPointerOut={()=>document.body.style.cursor='auto'}>
     <DensityMaterial color={j?TEAL:AMBER}/>
   </mesh>)}
   {labels&&<Html portal={labelHost} position={[index===0&&clock.current.time<2?0:1.7,.5,0]} center distanceFactor={11} zIndexRange={[3,0]}><span className={`orbital-label ${selected===index?'highlighted':''}`}>{clock.current.time<2?['2s','2pₓ','2pᵧ','2p𝓏'][index]:clock.current.time<8.5?`mixing · ${index+1}`:`${config.label} · ${index+1}`}</span></Html>}
 </group>
}

function Nucleus({symbol,position=[0,0,0],hydrogen=false,labels=true,labelHost}){
 return <group position={position}><mesh><sphereGeometry args={[hydrogen?.19:.32,36,28]}/><meshPhysicalMaterial color={hydrogen?'#e4e5db':'#d1a66a'} metalness={.48} roughness={.23} clearcoat={1} emissive={hydrogen?'#4b594e':'#332517'} emissiveIntensity={.18}/></mesh>{labels&&<Html portal={labelHost} center distanceFactor={12} zIndexRange={hydrogen?[4,0]:[6,5]}><span className={`nucleus-label ${hydrogen?'hydrogen':''}`}>{symbol}</span></Html>}</group>
}

function Partner({index,config,clock,labels,labelHost}){
 const group=useRef(),shell=useRef(),bridge=useRef(),density=useRef(),pulse=useRef(),burst=useRef();
 const direction=V(config.directions[index]),q=axisQuaternion(config.directions[index]);
 const particleData=React.useMemo(()=>{
   const a=new Float32Array(30*3);for(let i=0;i<30;i++){const k=i*2.39996,y=1-2*(i+.5)/30,r=Math.sqrt(1-y*y);a.set([Math.cos(k)*r,y,Math.sin(k)*r],i*3)}return a;
 },[]);
 useFrame(()=>{
   const local=clock.current.time-bondStart(index),distance=hydrogenDistance(local),contact=smooth((local-CONTACT_OFFSET)/.5),bond=smooth((local-2.1)/.7);
   group.current.position.copy(direction).multiplyScalar(distance);
   shell.current.material.uniforms.densityOpacity.value=.3-.1*bond;
   shell.current.scale.setScalar(1+.055*Math.sin(clock.current.time*1.1+index)*(1-bond));
   bridge.current.visible=bond>0;bridge.current.scale.set(1,bond,bond);bridge.current.material.opacity=.85*bond;
   density.current.visible=contact>0;density.current.material.opacity=.12*contact;density.current.scale.set(1.05+.04*Math.sin(local*2)*(1-bond),.32,.32);
   const p=clamp((local-CONTACT_OFFSET)/.8);pulse.current.visible=p>0&&p<1;pulse.current.scale.setScalar(.2+p*.9);pulse.current.material.opacity=.3*(1-p);
   burst.current.visible=p>0&&p<1;burst.current.scale.setScalar(.08+p*.6);burst.current.material.opacity=.65*(1-p);
 });
 return <>
  <group ref={group}>
   <mesh ref={shell}><sphereGeometry args={[.68,40,30]}/><DensityMaterial color={AMBER} opacity={.3}/></mesh>
   <Nucleus symbol="H" hydrogen labels={labels} labelHost={labelHost}/>
   {labels&&<Html portal={labelHost} position={[0,.95,0]} center zIndexRange={[3,0]}><span className="partner-label">1s</span></Html>}
  </group>
  <group quaternion={q}>
   <mesh ref={bridge} position={[1.4,0,0]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[.065,.065,2.8,16]}/><meshStandardMaterial color="#ddc69e" emissive="#d3ad69" emissiveIntensity={.2} transparent/></mesh>
   <mesh ref={density} position={[1.7,0,0]} scale={[1.05,.36,.36]}><sphereGeometry args={[1,40,30]}/><meshBasicMaterial color="#f4d29b" transparent opacity={.1} depthWrite={false}/></mesh>
   <group position={[2.3,0,0]}>
    <mesh ref={pulse} rotation={[0,Math.PI/2,0]}><ringGeometry args={[.72,.74,64]}/><meshBasicMaterial color="#ead6b0" transparent depthWrite={false} side={THREE.DoubleSide}/></mesh>
    <points ref={burst}><bufferGeometry><bufferAttribute attach="attributes-position" args={[particleData,3]}/></bufferGeometry><pointsMaterial size={.027} color="#e7cea1" transparent depthWrite={false} sizeAttenuation/></points>
   </group>
  </group>
 </>
}

function Angle({config,labelHost}){
 const a=V(config.directions[0]),b=V(config.directions[1]);
 const angle=Math.acos(clamp(a.dot(b),-1,1));
 const ortho=b.clone().addScaledVector(a,-a.dot(b)).normalize();if(config.key==='sp')ortho.set(0,1,0);
 const pts=Array.from({length:65},(_,i)=>a.clone().multiplyScalar(Math.cos(angle*i/64)).addScaledVector(ortho,Math.sin(angle*i/64)).multiplyScalar(1.06));
 const mid=pts[32].clone().multiplyScalar(1.33);
 return <group><Line points={pts} color="#e0c18c" lineWidth={1} transparent opacity={.7}/><Html portal={labelHost} position={mid} center zIndexRange={[4,0]}><span className="angle-label">{config.angle}</span></Html></group>
}

function SoftBloom(){
 const {gl,scene,camera,size}=useThree();
 const composer=React.useMemo(()=>{const c=new EffectComposer(gl);c.addPass(new RenderPass(scene,camera));c.addPass(new UnrealBloomPass(new THREE.Vector2(1,1),.16,.55,.92));c.addPass(new OutputPass());return c},[gl,scene,camera]);
 useEffect(()=>{composer.setSize(size.width,size.height)},[composer,size]);
 useEffect(()=>()=>{composer.passes.forEach(p=>p.dispose?.());composer.dispose()},[composer]);
 useFrame((_,delta)=>composer.render(delta),1);
 return null;
}
function Studio({config,clock,selected,onSelect,labels,stage,resetKey,guided,onInteraction,cameraControl,labelHost,atomic=false,orbital,axes,cutaway,atomicSelected,onAtomicSelect,zoom,motion,zoomProgress}){
 const orbit=useRef(),world=useRef(),cameraState=useRef({key:resetKey,guide:guided,reset:2,zoomSerial:0,zoomTarget:null}),timer=useRef(0);
 const {camera,gl}=useThree();
 const beginInteraction=()=>{cameraState.current.reset=0;cameraState.current.zoomTarget=null;if(!atomic)takeCameraControl(cameraControl.current,clock.current.time,performance.now());onInteraction();};
 const endInteraction=()=>{if(!atomic)releaseCameraControl(cameraControl.current,performance.now());};
 useEffect(()=>{gl.setClearColor('#101b1c',0)},[gl]);
 useEffect(()=>{
  if(!atomic)return;
  const canvas=gl.domElement,touches=new Map();let pinchDistance=0,pinchFresh=false;
  const dolly=(depth,fresh=false)=>{const state=cameraState.current;state.reset=0;state.zoomSerial=zoom.current.serial;state.zoomTarget=zoomDistance(requestZoomIntent(zoom.current.intent,depth,zoom.current.progress,performance.now(),fresh));onInteraction()};
  const distance=()=>cameraState.current.zoomTarget??camera.position.distanceTo(orbit.current.target);
  const wheel=event=>{event.preventDefault();const units=event.deltaMode===1?16:event.deltaMode===2?canvas.clientHeight:1,change=Math.max(-.075,Math.min(.075,-event.deltaY*units*.00025)),current=distance();if(zoomDepth(current)===0&&change<0){const state=cameraState.current;state.reset=0;state.zoomSerial=zoom.current.serial;state.zoomTarget=Math.min(22,current*Math.exp(-change*3));onInteraction();return;}dolly(zoomDepth(current)+change)};
  const separation=()=>{const [a,b]=[...touches.values()];return Math.hypot(a[0]-b[0],a[1]-b[1])};
  const down=event=>{if(event.pointerType!=='touch')return;touches.set(event.pointerId,[event.clientX,event.clientY]);if(touches.size===2){pinchDistance=separation();pinchFresh=true;}};
  const move=event=>{if(!touches.has(event.pointerId))return;touches.set(event.pointerId,[event.clientX,event.clientY]);if(touches.size!==2)return;const next=separation();if(next>0&&pinchDistance>0){dolly(zoomDepth(distance())+Math.max(-.06,Math.min(.06,Math.log(next/pinchDistance)*.23)),pinchFresh);pinchFresh=false;}pinchDistance=next};
  const up=event=>{touches.delete(event.pointerId);pinchDistance=touches.size===2?separation():0};
  canvas.addEventListener('wheel',wheel,{passive:false});canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);
  return()=>{canvas.removeEventListener('wheel',wheel);canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',up)};
 },[atomic,camera,gl]);
 const particles=React.useMemo(()=>{const p=new Float32Array(45*3);for(let i=0;i<45;i++){p.set([Math.sin(i*124.7)*9,Math.cos(i*46.3)*5,Math.sin(i*85.4)*6-3],i*3)}return p},[]);
 const ambience=useRef();
 useFrame(({clock:real},delta)=>{
  const c=clock.current,t=c.time;timer.current+=delta;
  if(c.playing&&!atomic){const prev=t;c.time=Math.min(duration(config),t+delta*c.speed);
    config.directions.forEach((_,i)=>{for(const [offset,sound] of [[.14,'whoosh'],[CONTACT_OFFSET,'impact'],[CONTACT_OFFSET+.13,'energy']]){const at=bondStart(i)+offset;if(prev<at&&c.time>=at){audio.sound(sound);if(sound==='impact')c.impulse=1}}});
    if(c.time===duration(config))c.playing=false;
  }
  ambience.current.rotation.y=real.elapsedTime*.003;
  c.impulse=Math.max(0,(c.impulse||0)-delta*5);
  if(cameraState.current.key!==resetKey){cameraState.current.key=resetKey;cameraState.current.reset=2;cameraState.current.zoomTarget=null;cameraState.current.zoomSerial=zoom?.current.serial??0;if(atomic)zoom.current.intent=createZoomIntent();}
  const reset=cameraState.current.reset>0;cameraState.current.reset=Math.max(0,(cameraState.current.reset||0)-delta);
  if(atomic){
    const target=new THREE.Vector3(0,.5,0),state=cameraState.current;
    if(state.zoomSerial!==zoom.current.serial){state.zoomSerial=zoom.current.serial;state.zoomTarget=zoomDistance(zoom.current.request);state.reset=0;}
    if(state.zoomTarget!==null){const direction=camera.position.clone().sub(orbit.current.target).normalize(),distance=camera.position.distanceTo(orbit.current.target),next=dampedZoomDistance(distance,state.zoomTarget,delta);orbit.current.target.copy(target);camera.position.copy(target).addScaledVector(direction,next);orbit.current.update();if(Math.abs(next-state.zoomTarget)<.001){camera.position.copy(target).addScaledVector(direction,state.zoomTarget);state.zoomTarget=null;}}
    zoom.current.progress=zoomDepth(camera.position.distanceTo(orbit.current.target));observeZoom(zoom.current.intent,zoom.current.progress);
  }
  const follow=atomic?(guided||(reset&&cameraState.current.zoomTarget===null)):canGuideCamera(cameraControl.current,guided,reset);
  if(follow){
    const morph=smooth((c.time-2)/6),reveal=smooth((c.time-(10+config.count*3.3))/3);
    const finalView=config.key==='sp3'?[12,5,4]:config.key==='sp2'?[7,5,12]:[4,5,13];
    let desired=new THREE.Vector3(7.9-morph*.9,4.6-morph*1.1,11.5-morph*2.9).lerp(V(finalView),reveal);
    if(c.time>10&&reveal===0){const index=Math.min(config.count-1,Math.floor((c.time-10)/3.3)),d=V(config.directions[index]);desired.addScaledVector(d,.5);}
    if(reset)desired.copy(!atomic&&stage===3?V(finalView):new THREE.Vector3(8.5,4.3,12));
    desired.x+=c.impulse*.025;desired.y+=c.impulse*.018;
    camera.position.lerp(desired,1-Math.exp(-delta*2.1));
    orbit.current.target.lerp(new THREE.Vector3(atomic?0:camera.aspect<1.1?0:-.55,atomic?.5:.25,0),1-Math.exp(-delta*2.5));orbit.current.update();
  }
  if(!atomic&&canFrameGeometry(cameraControl.current,c.playing,c.time,config.count,performance.now())){
    const target=orbit.current.target,direction=camera.position.clone().sub(target).normalize(),distance=camera.position.distanceTo(target),next=geometryFramingDistance(distance,camera.aspect<1.1?13:10.5,delta);
    if(next>distance){camera.position.copy(target).addScaledVector(direction,next);orbit.current.update();}
  }
  if(!atomic&&cameraControl.current.userOwned&&c.impulse>0){
    const canvas=gl.domElement,ratio=gl.getPixelRatio();camera.setViewOffset(canvas.width,canvas.height,c.impulse*.8*ratio,c.impulse*.6*ratio,canvas.width,canvas.height);cameraState.current.viewImpulse=true;
  }else if(cameraState.current.viewImpulse){camera.clearViewOffset();cameraState.current.viewImpulse=false;}
 });
 return <>

  <ambientLight intensity={.72}/><hemisphereLight args={['#dce9df','#263c38',1.4]}/>
  <directionalLight position={[4,7,6]} color="#fff1db" intensity={2.7}/><directionalLight position={[-6,3,-4]} color="#88beb5" intensity={2.1}/>
  <pointLight position={[0,2,3]} color="#e9b674" intensity={9} distance={13} decay={2}/>
  <group ref={world} position={[0,.5,0]}>
   {atomic?<MicroscopicNucleus zoom={zoom} motion={motion} labels={labels} labelHost={labelHost} onSelect={onAtomicSelect}/>:<Nucleus symbol={config.atom} labels={false}/>}
   {atomic?<AtomicOrbitals orbital={orbital} labels={labels&&zoomProgress<.7} axes={axes&&zoomProgress<.7} cutaway={cutaway} selected={atomicSelected} onSelect={onAtomicSelect} labelHost={labelHost} zoom={zoom} motion={motion}/>:<>
   {config.directions.map((_,i)=><React.Fragment key={i}><Orbital index={i} config={config} clock={clock} selected={selected} onSelect={onSelect} labels={labels} labelHost={labelHost}/><Partner index={i} config={config} clock={clock} labels={labels} labelHost={labelHost}/></React.Fragment>)}
   {stage===3&&labels&&<Angle config={config} labelHost={labelHost}/>}
   {labels&&<Html portal={labelHost} center position={[0,0,.05]} distanceFactor={12} zIndexRange={[6,5]}><span className="nucleus-label">{config.atom}</span></Html>}
   </>}
  </group>
  <group position={[0,-3.15,0]}>
   <mesh rotation={[-Math.PI/2,0,0]}><planeGeometry args={[200,200]}/><meshStandardMaterial color="#142222" roughness={.85} metalness={.16}/></mesh>
   {[3.9,4.8,6.2].map((r,i)=><mesh key={r} rotation={[-Math.PI/2,0,0]} position={[0,.012+i*.002,0]}><ringGeometry args={[r,r+.008,128]}/><meshBasicMaterial color="#344b45" transparent opacity={.3-i*.05} side={THREE.DoubleSide}/></mesh>)}
  </group>
  <ContactShadows position={[0,-3.12,0]} opacity={.3} scale={20} blur={3.5} far={6} resolution={256} color="#030a08" frames={1}/>
  <points ref={ambience}><bufferGeometry><bufferAttribute attach="attributes-position" args={[particles,3]}/></bufferGeometry><pointsMaterial size={.015} color="#92b0a0" transparent opacity={.25} depthWrite={false}/></points>
  <fog attach="fog" args={['#101b1c',17,38]}/>
  <OrbitControls ref={orbit} makeDefault enableDamping dampingFactor={.065} enableZoom={!atomic} minDistance={atomic?1.5:5} maxDistance={22} maxPolarAngle={Math.PI*.78} enablePan={false} enabled enableRotate touches={{ONE:THREE.TOUCH.ROTATE,TWO:THREE.TOUCH.DOLLY_ROTATE}} onStart={beginInteraction} onEnd={endInteraction}/>
  <SoftBloom/>
 </>
}

function GeometryGlyph({type}){
 const data=type==='sp'?[[12,24],[56,24]]:type==='sp2'?[[34,5],[10,40],[58,40]]:[[34,4],[9,35],[57,35],[36,44]];
 return <svg width="68" height="48" viewBox="0 0 68 48" fill="none" aria-hidden="true">{data.map(([x,y],i)=><g key={i}><path d={`M34 24L${x} ${y}`} stroke="currentColor" strokeWidth="1" strokeDasharray={type==='sp3'&&i===3?'3 3':undefined}/><circle cx={x} cy={y} r="3" fill="currentColor"/></g>)}<circle cx="34" cy="24" r="4.5" fill="currentColor"/></svg>
}
class SceneBoundary extends Component {
 state={error:false};static getDerivedStateFromError(){return {error:true}}
 render(){return this.state.error?<div className="scene-error"><Atom size={40}/><h2>Enable WebGL to explore in 3D</h2><p>This experience needs hardware acceleration in your browser.</p><button onClick={()=>location.reload()}>Try again</button></div>:this.props.children}
}

function App(){
 const [section,setSection]=useState('atomic'),[orbital,setOrbital]=useState('1s'),[axes,setAxes]=useState(true),[cutaway,setCutaway]=useState(true),[atomicSelected,setAtomicSelected]=useState(null);
 const atomic=section==='atomic',orbitalConfig=ATOMIC[orbital];
 const cameraControl=useRef(createCameraControl());
 const zoom=useRef({serial:0,request:0,progress:0,intent:createZoomIntent(),sliderDragging:false,sliderFresh:true}),[zoomProgress,setZoomProgress]=useState(0),[motion,setMotion]=useState(()=>!window.matchMedia('(prefers-reduced-motion: reduce)').matches);
 const zoomStage=zoomReveal(zoomProgress).stage,zoomLesson=ZOOM_STAGES[zoomStage];
 const zoomCaption=zoomStage==='cloud'?{...zoomLesson,kicker:orbitalConfig.nodes,title:orbitalConfig.title,description:orbitalConfig.description}:zoomLesson;
 const requestZoom=(value,fresh=true)=>{zoom.current.request=requestZoomIntent(zoom.current.intent,value,zoom.current.progress,performance.now(),fresh);zoom.current.serial++;};
 useEffect(()=>{const id=setInterval(()=>setZoomProgress(zoom.current.progress),125);return()=>clearInterval(id)},[]);
 const navigate=tab=>{audio.stop();clock.current.playing=false;setPlaying(false);setGuided(false);setSection(tab);setSelected(null);if(tab==='atomic'){requestZoom(0);zoom.current.progress=0;setZoomProgress(0)}else if(tab==='bond'){clock.current.time=10;setTime(10)}else if(tab==='hybrid'&&section==='atomic'){clock.current.time=0;setTime(0)}if(tab==='atomic'||section==='atomic'){resetCameraControl(cameraControl.current);setReset(r=>r+1)}};
 const chooseOrbital=key=>{setOrbital(key);setAtomicSelected(null);if(zoom.current.progress>=.7)requestZoom(zoomDepth(ZOOM_DISTANCE.density))};
 const [mode,setMode]=useState('sp3'),[playing,setPlaying]=useState(false),[time,setTime]=useState(0),[labels,setLabels]=useState(true),[sound,setSound]=useState(false),[speed,setSpeed]=useState(1),[selected,setSelected]=useState(null),[info,setInfo]=useState(false),[resetKey,setReset]=useState(0),[guided,setGuided]=useState(false);
 const labelHost=useRef(); const clock=useRef({time:0,playing:false,speed:1,impulse:0});const config=CONFIG[mode],stage=stageAt(time,config),formed=formedAt(time,config),total=duration(config);
 useEffect(()=>{const id=setInterval(()=>{setTime(clock.current.time);setPlaying(clock.current.playing);if(clock.current.time>=total)setGuided(false)},75);return()=>clearInterval(id)},[total]);
 useEffect(()=>{clock.current.speed=speed},[speed]);
 const choose=key=>{setSection('hybrid');audio.stop();clock.current.time=0;clock.current.playing=false;setMode(key);setTime(0);setPlaying(false);setSelected(null);setGuided(false);restartCameraTimeline(cameraControl.current)};
 const play=async()=>{await audio.unlock();if(clock.current.time>=total){clock.current.time=0;setTime(0);restartCameraTimeline(cameraControl.current)}clock.current.playing=!clock.current.playing;setPlaying(clock.current.playing);setGuided(clock.current.playing&&!cameraControl.current.userOwned);if(!clock.current.playing)audio.stop()};
 const replay=async()=>{await audio.unlock();audio.stop();clock.current.time=0;clock.current.playing=true;setTime(0);setPlaying(true);setGuided(!cameraControl.current.userOwned);setSelected(null);restartCameraTimeline(cameraControl.current)};
 const next=()=>{audio.stop();const milestones=[2,8.5,10,...config.directions.map((_,i)=>bondStart(i)+2.9),total];const target=milestones.find(x=>x>clock.current.time+.15)??total;clock.current.time=target;clock.current.playing=false;setTime(target);setPlaying(false);setGuided(false)};
 const toggleSound=async()=>{await audio.unlock();audio.enabled=!sound;setSound(!sound);if(sound)audio.stop()};
 useEffect(()=>{const handler=e=>{if(e.key==='Escape'){setInfo(false);return}if(['INPUT','SELECT','BUTTON'].includes(e.target.tagName)||info||atomic)return;if(e.code==='Space'){e.preventDefault();play()}if(e.key.toLowerCase()==='r')replay();if(e.key==='ArrowRight')next()};window.addEventListener('keydown',handler);return()=>window.removeEventListener('keydown',handler)},[info,total,playing,atomic]);
 useEffect(()=>{if(!info)return;const before=document.activeElement;const trap=e=>{if(e.key!=='Tab')return;const els=Array.from(document.querySelector('.info-dialog').querySelectorAll('button,a[href]'));if(e.shiftKey&&document.activeElement===els[0]){e.preventDefault();els.at(-1).focus()}else if(!e.shiftKey&&document.activeElement===els.at(-1)){e.preventDefault();els[0].focus()}};document.addEventListener('keydown',trap);return()=>{document.removeEventListener('keydown',trap);before?.focus()}},[info]);
 useEffect(()=>{const handler=()=>{if(document.hidden){clock.current.playing=false;audio.stop();setPlaying(false);setGuided(false)}};document.addEventListener('visibilitychange',handler);return()=>document.removeEventListener('visibilitychange',handler)},[]);
 const seek=e=>{audio.stop();clock.current.time=Number(e.target.value);clock.current.playing=false;setTime(clock.current.time);setPlaying(false);setGuided(false)};
 const activeLabel=selected===null?'Click an orbital to inspect':`Orbital ${selected+1} selected · ${time<2?['2s','2pₓ','2pᵧ','2p𝓏'][selected]:config.label}`;
 return <main className={`experience ${atomic?'atomic-experience':''}`}>
  <div className="canvas-wrap"><SceneBoundary><Canvas camera={{position:[8.5,4.3,12],fov:40,near:.1,far:100}} dpr={[1,1.75]} gl={{antialias:true,alpha:true,powerPreference:'high-performance',toneMapping:THREE.ACESFilmicToneMapping,toneMappingExposure:1.12}}><Suspense fallback={null}><Studio key={atomic?'atomic':'formation'} config={config} clock={clock} selected={selected} onSelect={setSelected} labels={labels} stage={stage} resetKey={resetKey} guided={guided} onInteraction={()=>setGuided(false)} cameraControl={cameraControl} labelHost={labelHost} atomic={atomic} orbital={orbital} axes={axes} cutaway={cutaway} atomicSelected={atomicSelected} onAtomicSelect={setAtomicSelected} zoom={zoom} zoomProgress={zoomProgress} motion={motion}/></Suspense></Canvas></SceneBoundary><div className="scene-label-layer" ref={labelHost}/></div>
  <div className="ambient-vignette"/>
  <header className="header"><a className="brand" href="#" onClick={e=>{e.preventDefault();navigate('atomic')}} aria-label="Orbital home"><span className="brand-mark"><i/><i/><i/></span>orbital<span className="brand-dot">.</span></a><div className="course-breadcrumb"><span>STPM CHEMISTRY</span><span className="slash">/</span><span>03 — CHEMICAL BONDING</span></div><button className="about-button" aria-label="About this experience" onClick={()=>setInfo(true)}><Info size={15}/><span>About this experience</span></button></header>
  <nav className="module-nav" aria-label="Learning modules">{[['atomic','Atomic Orbitals'],['hybrid','Hybridisation'],['bond','Bond Formation']].map(([key,label],i)=><button key={key} aria-current={section===key?'page':undefined} className={section===key?'active':''} onClick={()=>navigate(key)}><span>0{i+1}</span>{label}</button>)}</nav>
  {atomic?<><section className="intro"><div className="eyebrow"><span className="tiny-dot"/> THE ATOMIC ORBITAL EXPLORER</div><h1>The shape of<br/><em>possibility.</em></h1><p>Explore electron probability.<br/>Discover the building blocks of bonding.</p><div className="module-tag"><span>01</span> Atomic orbitals</div></section><aside className="hybrid-selector atomic-selector"><div className="selector-heading">EXPLORE AN ORBITAL <ArrowUpRight size={13}/></div><div className="family-tabs">{['s','p','d'].map(f=><button key={f} aria-pressed={orbitalConfig.family===f} className={orbitalConfig.family===f?'active':''} onClick={()=>chooseOrbital(f==='s'?'1s':f==='p'?'px':'dxy')}>{f}<span>orbitals</span></button>)}</div><div className="orbital-options">{Object.entries(ATOMIC).filter(([,c])=>c.family===orbitalConfig.family).map(([key,c])=><button key={key} aria-pressed={orbital===key} className={orbital===key?'active':''} onClick={()=>chooseOrbital(key)}>{c.label}</button>)}</div><div className="selector-foot">{orbitalConfig.family==='p'?'Lowest p shell: n = 2':orbitalConfig.family==='d'?'Lowest d shell: n = 3':'Spherically symmetric'}</div><div className="phase-legend"><span><i className="phase-key amber"/> + phase</span><span><i className="phase-key teal"/> − phase</span><small>Wavefunction sign · not charge</small></div></aside></>:<>
  <section className="intro"><div className="eyebrow"><span className="tiny-dot"/> THE BOND FORMATION EXPERIENCE</div><h1>Where atoms<br/>become <em>bonds.</em></h1><p>Step inside the orbitals.<br/>See how a molecule comes together.</p><div className="module-tag"><span>01</span> Orbital overlap & hybridisation</div></section>
  <aside className="hybrid-selector"><div className="selector-heading">CHOOSE A HYBRIDISATION <ArrowUpRight size={13}/></div><div className="mode-options">{Object.values(CONFIG).map(c=><button key={c.key} onClick={()=>choose(c.key)} className={`mode-button ${mode===c.key?'active':''}`} aria-pressed={mode===c.key}><div className="mode-label">{c.label}<span>{c.geometry}</span></div><GeometryGlyph type={c.key}/></button>)}</div><div className="selector-foot"><span>{config.count} equivalent orbitals</span><span>{stage===3?config.angle:'Geometry after formation'}</span></div></aside>
  </>}
  <div className="scene-meta"><span className="scene-status"><span className={playing?'status-dot playing':'status-dot'}/>{guided?'GUIDED CAMERA':playing?'FORMATION IN PROGRESS':'INTERACTIVE 3D'}</span><span className="model-name">{atomic?zoomStage==='structure'?'¹²C · magnified nuclear structure':zoomStage==='nucleus'?'Nucleus · faint probability context':`${orbitalConfig.label} · ${zoomStage==='cloud'?'probability boundary':'inner density'}`:stage===3?config.name:`${config.atom==='C'?'Carbon':config.atom==='B'?'Boron':'Beryllium'} · atomic orbitals`}</span></div>
  <div className="scene-tools"><button className={atomic?undefined:"reset-view"} title={atomic?"Reset camera":"Reset View · recommended teaching angle"} aria-label={atomic?"Reset camera":"Reset View"} onClick={()=>{resetCameraControl(cameraControl.current);setReset(x=>x+1);setGuided(!atomic&&clock.current.playing)}}><Focus size={19}/>{!atomic&&<span>Reset View</span>}</button><button title="About orbitals" aria-label="About orbitals" onClick={()=>setInfo(true)}><Info size={18}/></button></div>
  <div className="drag-hint"><MousePointer2 size={12}/><span>{atomic?'Drag to rotate · Scroll / pinch to explore deeper':'Drag to rotate · Scroll / pinch to zoom'}</span></div>
  {atomic?<><section className="lesson-caption atomic-caption" aria-live="polite"><div className="step-number">{String(zoomCaption.step).padStart(2,'0')}<span>/ 04</span></div><div><div className="caption-kicker">{zoomCaption.kicker}</div><h2>{zoomCaption.title}</h2><p>{zoomCaption.description}</p></div></section><aside className="composition atomic-composition"><span className="composition-heading">NEXT · HYBRIDISATION</span><div className="atomic-equation">2s + 2p → sp<br/>2s + 2p + 2p → sp²<br/>2s + 2p + 2p + 2p → sp³</div><div className="composition-sub">Only s and p participate in this module.</div></aside><section className="zoom-guide" aria-label="Progressive orbital zoom"><div className="zoom-stops">{[['cloud','Orbital'],['density','Density'],['nucleus','Nucleus'],['structure','Structure']].map(([key,label])=><button key={key} aria-pressed={zoomStage===key} className={zoomStage===key?'active':''} onClick={()=>requestZoom(zoomDepth(ZOOM_DISTANCE[key]))}><span>0{ZOOM_STAGES[key].step}</span>{label}</button>)}</div><label className="zoom-slider"><span>Explore deeper</span><input type="range" aria-label="Microscopic zoom" min="0" max="1" step=".01" value={zoomProgress} onPointerDown={()=>{zoom.current.sliderDragging=true;zoom.current.sliderFresh=true;}} onPointerUp={()=>{zoom.current.sliderDragging=false;}} onPointerCancel={()=>{zoom.current.sliderDragging=false;}} onBlur={()=>{zoom.current.sliderDragging=false;}} onChange={e=>{requestZoom(Number(e.target.value),!zoom.current.sliderDragging||zoom.current.sliderFresh);zoom.current.sliderFresh=false;}}/><span>{Math.round(zoomProgress*100)}%</span></label><small>{zoomCaption.helper}</small></section><div className="transport-area atomic-transport"><div className="transport"><button className={`toggle-button ${labels?'is-on':''}`} aria-label="Labels" aria-pressed={labels} onClick={()=>setLabels(!labels)}><Tags size={16}/><span>Labels</span></button><button className={`toggle-button ${axes?'is-on':''}`} aria-label="Axes" aria-pressed={axes} onClick={()=>setAxes(!axes)}><MoveUpRight size={16}/><span>Axes</span></button><button className={`toggle-button ${cutaway?'is-on':''}`} aria-label="Radial cutaway" aria-pressed={cutaway} disabled={orbitalConfig.family!=='s'||orbital==='1s'} onClick={()=>setCutaway(!cutaway)}><Atom size={16}/><span>Cutaway</span></button><button className={`toggle-button ${motion?'is-on':''}`} aria-label="Probability motion" aria-pressed={motion} onClick={()=>setMotion(!motion)}>{motion?<Pause size={16}/>:<Play size={16}/>}<span>Motion</span></button><span className="control-divider"/><button className="continue-button" onClick={()=>navigate('hybrid')}>Explore hybridisation <ArrowUpRight size={16}/></button></div><div className="learning-flow"><b>Atomic Orbitals</b><span>→</span>Hybridisation<span>→</span>Overlap<span>→</span>Bond Formation<span>→</span>Geometry</div></div></>:<>
  <section className="lesson-caption" aria-live="polite"><div className="step-number">0{stage+1}<span>/ 04</span></div><div><div className="caption-kicker">{stage===2?`FORMING ${config.atom}–H · ${formed} / ${config.count} BONDS`:'THE PROCESS'}</div><h2>{STAGES[stage].title}</h2><p>{STAGES[stage].text}</p></div></section>
  <aside className="composition"><span className="composition-heading">{stage===3?'THE FINAL STRUCTURE':'ORBITAL COMPOSITION'}</span><div className="orbital-equation">{stage===3?<>{config.formula}<span>{config.geometry}</span></>:<>{config.input.split(' + ').map((o,i)=><React.Fragment key={i}>{i>0&&<span className="operator">+</span>}<span className={`equation-orbital ${o==='p'?'p-orbital':''}`}>{o}</span></React.Fragment>)}<span className="operator arrow">→</span><strong>{config.label}</strong></>}</div><div className="composition-sub">{stage===3?<><span className="tiny-dot"/>{config.count} σ bonds · {config.angle}</>:<><span className="phase-key amber"/> s character {config.s}%<span className="phase-key teal"/> p character {100-config.s}%</>}</div></aside>
  <div className="transport-area"><div className="transport"><button className="play-button" onClick={play} aria-label={playing?'Pause animation':'Play animation'}>{playing?<Pause size={18} fill="currentColor"/>:<Play size={18} fill="currentColor"/>}</button><div className="play-copy"><span>{playing?'Pause formation':time>=total?'Play again':'Play formation'}</span><small>{String(Math.floor(time)).padStart(2,'0')} / {Math.round(total)}s</small></div><button className="icon-button" onClick={replay} title="Replay (R)" aria-label="Replay"><RotateCcw size={17}/></button><button className="icon-button" onClick={next} title="Next step (→)" aria-label="Next step"><SkipForward size={17}/></button><span className="control-divider"/><button className={`toggle-button ${sound?'is-on':''}`} onClick={toggleSound} aria-pressed={sound} aria-label={sound?'Turn sound off':'Turn sound on'}>{sound?<Volume2 size={17}/>:<VolumeX size={17}/>}<span>Sound {sound?'on':'off'}</span></button><button className={`toggle-button ${labels?'is-on':''}`} onClick={()=>setLabels(!labels)} aria-pressed={labels} aria-label="Labels"><Tags size={16}/><span>Labels</span></button><span className="control-divider"/><label className="speed-label"><select aria-label="Animation speed" value={speed} onChange={e=>setSpeed(Number(e.target.value))}><option value={.5}>0.5×</option><option value={1}>1×</option><option value={1.5}>1.5×</option><option value={2}>2×</option></select><ChevronDown size={12}/></label></div>
  <div className="timeline"><input type="range" aria-label="Animation timeline" min={0} max={total} step={.05} value={time} onChange={seek} style={{'--progress':`${time/total*100}%`}}/><div className="timeline-stages">{STAGES.map((s,i)=><button key={i} className={stage===i?'current':stage>i?'complete':''} onClick={()=>{audio.stop();const t=[0,2,10,10+config.count*3.3][i];clock.current.time=t;clock.current.playing=false;setTime(t);setPlaying(false);setGuided(false)}}><span>{stage>i?<Check size={9}/>:i+1}</span>{s.short}</button>)}</div></div></div>
  </>}
  <footer className="footer"><span>VISUALISE. UNDERSTAND. REMEMBER.</span><span className="inspect-status">{atomic?(atomicSelected===null?'Click a probability surface or nucleon to inspect':atomicSelected==='proton'?'Proton · charge +1':atomicSelected==='neutron'?'Neutron · charge 0':`${orbitalConfig.label} · surface highlighted`):activeLabel}</span><span>BUILT FOR CURIOSITY <span className="tiny-dot"/></span></footer>
  {info&&<div className="modal-backdrop" onClick={()=>setInfo(false)}><section className="info-dialog" role="dialog" aria-modal="true" aria-labelledby="info-title" onClick={e=>e.stopPropagation()}><button className="modal-close" aria-label="Close information" autoFocus onClick={()=>setInfo(false)}><X size={20}/></button><span className="eyebrow">A CLOSER LOOK</span><h2 id="info-title">Probability, made visible.</h2><p>Orbital surfaces mark regions of high electron probability. Electrons do not travel around these surfaces. Amber and teal indicate opposite wavefunction phases, not electric charges.</p><p>Hybridisation is a mathematical combination of atomic wavefunctions. This continuous morph is a teaching analogy, not a literal time-resolved reaction or a quantum calculation. Orbital scales and formation timings are illustrative.</p><div className="info-fact">{atomic?<><strong>{orbitalConfig.label} · {orbitalConfig.nodes}</strong><span>{orbitalConfig.description} These are qualitative probability boundary diagrams. Radial boundaries show phase regions and nodes; sizes are adjusted for clarity. Transitions between views are visual interpolations, not electron excitation. The cloud uses hydrogen-like |ψ|² density with a smooth display envelope fitted to this boundary, preserving nodes and a faint outer tail; it does not calculate a carbon many-electron wavefunction. Sample shimmer and nucleon vibration are teaching effects. A stationary orbital has time-independent probability density. The example nucleus is carbon-12: six protons and six neutrons. The close view focuses on the nucleus with a faint surrounding density. Deep zoom gradually magnifies nuclear structure, using independent nuclear and orbital display scales rather than literal atomic scale; the real nucleus is much smaller. Nucleons are quantum particles, not a fixed lattice of balls. Orbital shape is shown independently of electron occupancy, including unoccupied carbon d orbitals.</span></>:<><strong>{config.label} · {config.geometry}</strong><span>{config.input} → {config.count} equivalent {config.label} orbitals. {config.note}</span></>}</div><p>Head-on, constructive overlap with hydrogen 1s increases electron density along the internuclear axis and produces a σ bond. The bond angle appears after the final bond forms.</p><a href="https://chem.libretexts.org/Bookshelves/General_Chemistry/Map%3A_Chemistry_-_Atoms_First_%28OpenSTAX%29/05%3A_Advanced_Theories_of_Covalent_Bonding/5.2%3A_Hybrid_Atomic_Orbitals" target="_blank" rel="noreferrer">Explore the theory · Chemistry LibreTexts <ArrowUpRight size={14}/></a><a href="https://openstax.org/books/chemistry/pages/6-3-development-of-quantum-theory" target="_blank" rel="noreferrer">Atomic orbital theory · OpenStax <ArrowUpRight size={14}/></a><a href="https://openstax.org/books/chemistry-2e/pages/21-1-nuclear-structure-and-stability" target="_blank" rel="noreferrer">Nuclear structure · OpenStax <ArrowUpRight size={14}/></a><div className="keyboard-help"><span><kbd>Space</kbd> Play / pause</span><span><kbd>R</kbd> Replay</span><span><kbd>→</kbd> Next step</span></div></section></div>}
 </main>
}
createRoot(document.getElementById('root')).render(<App/>);
