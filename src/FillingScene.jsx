import React,{useRef,useMemo,useLayoutEffect,useEffect,useState,Component} from 'react';
import {Canvas,useFrame,useThree} from '@react-three/fiber';
import {OrbitControls} from '@react-three/drei';
import * as THREE from 'three';
import {Play,Pause,RotateCcw,ArrowLeft,Focus} from 'lucide-react';
import {probabilityVertexShader,probabilityFragmentShader} from './ProbabilityCloud';
import {ATOMIC_ROTATION} from './presentation-model.mjs';
import {CONFIGURATION_ELEMENTS,fillingState,FILL_SECONDS} from './configuration-model.mjs';
import {fillingSamples} from './filling-samples.mjs';
import {electronView,electronPosition} from './electron-view.mjs';
import {SpinDiagram} from './ConfigurationBuilder';
function DensityField({n,type,axis,population,whole}){
 const mesh=useRef(),geometry=useMemo(()=>{
  const data=fillingSamples(n,type,axis,18000),g=new THREE.BufferGeometry();
  for(const [name,array,size] of [['position',data.positions,3],['phaseSign',data.signs,1],['sampleSeed',data.seeds,1],['densityWeight',data.weights,1]])g.setAttribute(name,new THREE.BufferAttribute(array,size));
  g.computeBoundingSphere();return g;
 },[n,type,axis]);
 const uniforms=useMemo(()=>({orbitalType:{value:type==='s'?0:axis+1},particleStyle:{value:0},time:{value:0},detail:{value:0},visibility:{value:0},pixelRatio:{value:1},cutaway:{value:0},focusDistance:{value:10},highlight:{value:0}}),[type,axis]);
 useEffect(()=>()=>geometry.dispose(),[geometry]);
 useFrame(({gl,camera},delta)=>{
  if(!mesh.current)return;const u=mesh.current.material.uniforms,target=population>0?(whole?.32:.8)*Math.min(1,population/2):0;
  u.visibility.value=THREE.MathUtils.lerp(u.visibility.value,target,1-Math.exp(-Math.min(delta,.1)*5));u.pixelRatio.value=gl.getPixelRatio();u.focusDistance.value=camera.position.length();mesh.current.visible=u.visibility.value>.001;
 });
 // Static backdrop samples never move. Only ElectronMarkers encode electron count.
 return <points ref={mesh} geometry={geometry} renderOrder={1} raycast={()=>null} frustumCulled={false}><shaderMaterial uniforms={uniforms} vertexShader={probabilityVertexShader} fragmentShader={probabilityFragmentShader} transparent depthWrite={false}/></points>;
}
const electronVertex=`attribute float appearance;uniform float pixelRatio;varying float alpha;void main(){alpha=appearance;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_PointSize=13.*pixelRatio;}`;
const electronFragment=`varying float alpha;void main(){vec2 p=(gl_PointCoord-.5)*2.;float rr=dot(p,p);if(rr>1.)discard;float z=sqrt(1.-rr);float light=clamp(dot(normalize(vec3(p.x,-p.y,z)),normalize(vec3(-.4,.6,1.))),0.,1.);vec3 colour=mix(vec3(.28,.12,.025),vec3(.96,.69,.23),.3+.7*light);float highlight=pow(max(0.,dot(normalize(vec3(p.x,-p.y,z)),normalize(vec3(-.35,.5,1.)))),20.);colour=mix(colour,vec3(1.,.97,.83),highlight*.75);gl_FragColor=vec4(colour,(1.-smoothstep(.82,1.,rr))*alpha);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}
`;
function ElectronMarkers({records,clock}){
 const points=useRef(),geometry=useMemo(()=>new THREE.BufferGeometry(),[]),signature=records.map(e=>e.id).join(','),uniforms=useMemo(()=>({pixelRatio:{value:1}}),[]);
 useLayoutEffect(()=>{geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(records.length*3),3));geometry.setAttribute('appearance',new THREE.BufferAttribute(new Float32Array(records.length),1));geometry.setDrawRange(0,records.length);},[signature,geometry]);
 useEffect(()=>()=>geometry.dispose(),[geometry]);
 useFrame(({gl})=>{
  if(!points.current)return;const p=geometry.getAttribute('position'),a=geometry.getAttribute('appearance');
  records.forEach((e,i)=>{p.setXYZ(i,...electronPosition(e,clock.current.motionTime));a.setX(i,e.opacity);});p.needsUpdate=true;a.needsUpdate=true;points.current.material.uniforms.pixelRatio.value=gl.getPixelRatio();
 });
 // Exactly one vertex / one glyph per electron: no trails or cloned particles.
 return <points name="counted-electrons" ref={points} geometry={geometry} renderOrder={3} raycast={()=>null} frustumCulled={false}><shaderMaterial uniforms={uniforms} vertexShader={electronVertex} fragmentShader={electronFragment} transparent depthWrite={false}/></points>;
}
function FillingStudio({clock,number,view,resetSerial,onSnapshot}){
 const orbit=useRef(),ownership=useRef(false),guide=useRef({key:'',distance:8,reset:false}),timer=useRef(0),{camera,invalidate}=useThree();
 useEffect(()=>{const id=setInterval(()=>{if(!document.hidden)invalidate()},1000/30);return()=>clearInterval(id)},[invalidate]);
 useEffect(()=>{if(resetSerial){ownership.current=false;guide.current.reset=true}},[resetSerial]);
 const shell=CONFIGURATION_ELEMENTS[number-1].configuration.find(r=>r.key===view.key),n=view.key==='atom'?CONFIGURATION_ELEMENTS[number-1].configuration.at(-1).n:shell.n;
 useFrame((_,delta)=>{
  const dt=Math.min(delta,.1);
  if(clock.current.playing){clock.current.time=Math.min(number*FILL_SECONDS,clock.current.time+dt);clock.current.motionTime+=dt;}
  if(guide.current.key!==`${n}:${camera.aspect}`){guide.current.key=`${n}:${camera.aspect}`;guide.current.distance=({1:7.2,2:9.6,3:11.8,4:14}[n])*Math.max(1,.75/camera.aspect);}
  if(!ownership.current&&orbit.current){
   const target=orbit.current.target,offset=camera.position.clone().sub(target),direction=guide.current.reset?new THREE.Vector3(5,2.5,9).normalize():offset.clone().normalize(),desired=target.clone().addScaledVector(direction,guide.current.distance);
   camera.position.lerp(desired,1-Math.exp(-dt*2));if(camera.position.distanceTo(desired)<.01)guide.current.reset=false;orbit.current.update();
  }
  timer.current+=dt;if(timer.current>.07){timer.current=0;onSnapshot(fillingState(number,clock.current.time));}
 });
 return <><ambientLight intensity={.72}/><hemisphereLight args={['#dce9df','#263c38',1.4]}/><directionalLight position={[4,7,6]} color="#fff1db" intensity={2.7}/><group rotation={ATOMIC_ROTATION}>{view.clouds.map(c=><DensityField key={`${c.key}:${c.axis}`} {...c} whole={view.key==='atom'}/>)}<ElectronMarkers records={view.records} clock={clock}/></group><OrbitControls ref={orbit} makeDefault enableDamping dampingFactor={.065} enablePan={false} minDistance={3} maxDistance={35} onStart={()=>{ownership.current=true;guide.current.reset=false}}/></>;
}
class FillingBoundary extends Component{
 state={error:false};static getDerivedStateFromError(){return {error:true}}
 render(){return this.state.error?<div className="filling-error">3D rendering is unavailable on this device. The configuration exercise remains available.</div>:this.props.children}
}
export function FillingScene({number,onNumber,onBack,onAufbau,guideOpen=false}){
 const guidePause=useRef(false),clock=useRef({time:0,motionTime:0,playing:true}),[snapshot,setSnapshot]=useState(()=>fillingState(number,0)),[playing,setPlaying]=useState(true),[selection,setSelection]=useState('follow'),[inspection,setInspection]=useState(null),[resetSerial,setReset]=useState(0),element=CONFIGURATION_ELEMENTS[number-1];
 const view=useMemo(()=>electronView(number,snapshot.time,selection,inspection),[number,snapshot.time,selection,inspection]),shell=element.configuration.find(r=>r.key===view.key),label=view.key==='atom'?'Complete atom':view.key;
 useEffect(()=>{if(guideOpen){guidePause.current=clock.current.playing;clock.current.playing=false;setPlaying(false)}else if(guidePause.current){clock.current.playing=true;setPlaying(true);guidePause.current=false}},[guideOpen]);
 useEffect(()=>{setInspection(null)},[view.key]);
 useEffect(()=>{const fn=()=>{if(document.hidden){clock.current.playing=false;setPlaying(false)}};document.addEventListener('visibilitychange',fn);return()=>document.removeEventListener('visibilitychange',fn)},[]);
 const tick=state=>{setSnapshot(state);setPlaying(clock.current.playing)};
 const restart=()=>{clock.current.time=0;clock.current.motionTime=0;clock.current.playing=true;setPlaying(true);setSnapshot(fillingState(number,0));setInspection(null)};
 const choose=value=>{setSelection(value);setInspection(null)};
 return <div className="filling-overlay"><aside className="filling-sidebar"><span className="configuration-kicker">NEUTRAL ATOM · GROUND STATE</span><h2>{element.symbol}<span>{element.name}</span></h2><label className="element-switch">Element<select aria-label="Choose 3D element" value={number} onChange={e=>onNumber(Number(e.target.value))}>{CONFIGURATION_ELEMENTS.map(e=><option key={e.number} value={e.number}>{e.number} · {e.symbol} · {e.name}</option>)}</select></label><p className="filling-electron-total">{view.totalCount} / {number} electrons</p>
  <div className="filling-view-options" role="group" aria-label="Electron view"><button aria-pressed={selection==='follow'} onClick={()=>choose('follow')}>Follow filling</button><button aria-pressed={selection==='atom'} onClick={()=>choose('atom')}>Complete atom</button></div>
  <ol className="filling-subshell-list">{element.configuration.map(r=>{const count=electronView(number,snapshot.time,r.key).visibleCount;return <li key={r.key} className={view.key===r.key?'current':count===r.electrons?'filled':''}><button aria-label={`View ${r.key} subshell`} aria-pressed={selection===r.key} onClick={()=>choose(r.key)}><span>{r.n}{r.type}<sup>{count}</sup></span><SpinDiagram type={r.type} electrons={count} readOnly/></button></li>})}</ol>
  <p className="filling-science-note">Gold markers: one per electron. The stationary blue/magenta cloud shows probability density and wavefunction phase. Marker motion illustrates sampled positions, not literal trajectories. Shapes and sizes are illustrative.</p><button className="return-table" onClick={onBack}><ArrowLeft size={15}/> Back to builder</button><button className="filling-aufbau" onClick={onAufbau}>Aufbau Principle</button>
 </aside><section className="filling-viewport" aria-label={`${element.name} progressive 3D orbital filling`} data-visible-electrons={view.visibleCount}><header className="filling-heading"><div><span className="configuration-kicker">ATOMIC ORBITAL FILLING</span><h3>{label}{shell?.type==='p'&&inspection!==null&&<sub>{['x','y','z'][inspection]}</sub>}<span>{snapshot.complete?'Ground state complete':'Filling in Aufbau order'}</span></h3></div><button aria-label="Reset filling camera" onClick={()=>setReset(x=>x+1)}><Focus size={19}/></button></header>
  <div className="filling-density-caption"><strong role="status" aria-label="Visible electron count">{view.visibleCount} visible {view.visibleCount===1?'electron':'electrons'}</strong><span>1 gold marker = 1 electron · static cloud = probability density</span></div><div className="filling-canvas"><FillingBoundary><Canvas camera={{position:[5,2.5,9],fov:40,near:.1,far:100}} frameloop="demand" dpr={[1,1.5]} gl={{antialias:true,alpha:true,toneMapping:THREE.ACESFilmicToneMapping,toneMappingExposure:1.12}}><FillingStudio clock={clock} number={number} view={view} resetSerial={resetSerial} onSnapshot={tick}/></Canvas></FillingBoundary></div>
  {shell?.type==='p'&&<div className="p-inspection" role="group" aria-label="Inspect p orbital"><button aria-pressed={inspection===null} onClick={()=>setInspection(null)}>All p orbitals</button>{['x','y','z'].map((a,i)=><button key={a} aria-label={`Inspect p${a} orbital`} aria-pressed={inspection===i} onClick={()=>setInspection(i)}>p<sub>{a}</sub><small>{electronView(number,snapshot.time,view.key,i).visibleCount} e⁻</small></button>)}</div>}
  <div className="filling-controls"><button className="filling-play" aria-label={playing?'Pause filling':'Play filling'} onClick={()=>{clock.current.playing=!clock.current.playing;setPlaying(clock.current.playing)}}>{playing?<Pause size={19}/>:<Play size={19}/>}</button><button aria-label="Restart filling" onClick={restart}><RotateCcw size={18}/></button><input aria-label="Filling progress" type="range" min="0" max={number} step=".01" value={snapshot.time/FILL_SECONDS} onChange={e=>{clock.current.time=Number(e.target.value)*FILL_SECONDS;clock.current.playing=false;setPlaying(false);setSnapshot(fillingState(number,clock.current.time));}}/><span>{snapshot.complete?'Complete':`${view.totalCount} / ${number}`}</span><button aria-label="Back to configuration builder" onClick={onBack}><ArrowLeft size={18}/></button></div>
 </section></div>;
}

