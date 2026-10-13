import React,{useRef,useMemo,useLayoutEffect,useEffect,useState,Component} from 'react';
import {Canvas,useFrame,useThree} from '@react-three/fiber';
import {OrbitControls} from '@react-three/drei';
import * as THREE from 'three';
import {Play,Pause,RotateCcw,ArrowLeft,Focus} from 'lucide-react';
import {FillingDensity} from './FillingDensity';
import {ShellGuides} from './ShellGuides';
import {shellView,shellElectronPosition} from './shell-model.mjs';
import {ATOMIC_ROTATION} from './presentation-model.mjs';
import {CONFIGURATION_ELEMENTS,fillingState,FILL_SECONDS} from './configuration-model.mjs';
import {electronView,electronPosition} from './electron-view.mjs';
import {SpinDiagram} from './ConfigurationBuilder';
const electronVertex=`attribute float appearance;uniform float pixelRatio;varying float alpha;void main(){alpha=appearance;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_PointSize=13.*pixelRatio;}`;
const electronFragment=`varying float alpha;void main(){vec2 p=(gl_PointCoord-.5)*2.;float rr=dot(p,p);if(rr>1.)discard;float z=sqrt(1.-rr);float light=clamp(dot(normalize(vec3(p.x,-p.y,z)),normalize(vec3(-.4,.6,1.))),0.,1.);vec3 colour=mix(vec3(.28,.12,.025),vec3(.96,.69,.23),.3+.7*light);float highlight=pow(max(0.,dot(normalize(vec3(p.x,-p.y,z)),normalize(vec3(-.35,.5,1.)))),20.);colour=mix(colour,vec3(1.,.97,.83),highlight*.75);gl_FragColor=vec4(colour,(1.-smoothstep(.82,1.,rr))*alpha);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}
`;
function ElectronMarkers({records,clock,mode}){
 const points=useRef(),geometry=useMemo(()=>new THREE.BufferGeometry(),[]),signature=records.map(e=>e.id).join(','),uniforms=useMemo(()=>({pixelRatio:{value:1}}),[]);
 useLayoutEffect(()=>{geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(records.length*3),3));geometry.setAttribute('appearance',new THREE.BufferAttribute(new Float32Array(records.length),1));geometry.setDrawRange(0,records.length);},[signature,geometry]);
 useEffect(()=>()=>geometry.dispose(),[geometry]);
 useFrame(({gl})=>{
  if(!points.current)return;const p=geometry.getAttribute('position'),a=geometry.getAttribute('appearance');
  records.forEach((e,i)=>{p.setXYZ(i,...(mode==='shell'?shellElectronPosition(e,clock.current.motionTime):electronPosition(e,clock.current.motionTime)));a.setX(i,e.opacity);});p.needsUpdate=true;a.needsUpdate=true;points.current.material.uniforms.pixelRatio.value=gl.getPixelRatio();
 });
 // Exactly one vertex / one glyph per electron: no trails or cloned particles.
 return <points name="counted-electrons" ref={points} geometry={geometry} renderOrder={3} raycast={()=>null} frustumCulled={false}><shaderMaterial uniforms={uniforms} vertexShader={electronVertex} fragmentShader={electronFragment} transparent depthWrite={false} depthTest={false}/></points>;
}
function FillingStudio({clock,number,view,mode,resetSerial,onSnapshot}){
 const orbit=useRef(),ownership=useRef(false),guide=useRef({key:'',distance:8,reset:false}),timer=useRef(0),{camera,invalidate}=useThree();
 useEffect(()=>{const id=setInterval(()=>{if(!document.hidden)invalidate()},1000/30);return()=>clearInterval(id)},[invalidate]);
 useEffect(()=>{if(resetSerial){ownership.current=false;guide.current.reset=true}},[resetSerial]);
 const shell=CONFIGURATION_ELEMENTS[number-1].configuration.find(r=>r.key===view.key),n=view.key==='atom'?CONFIGURATION_ELEMENTS[number-1].configuration.at(-1).n:shell.n;
 useFrame((_,delta)=>{
  const dt=Math.min(delta,.1);
  if(clock.current.playing){clock.current.time=Math.min(number*FILL_SECONDS,clock.current.time+dt);clock.current.motionTime+=dt*1.10;}
  if(guide.current.key!==`${n}:${camera.aspect}`){guide.current.key=`${n}:${camera.aspect}`;guide.current.distance=({1:7.2,2:9.6,3:11.8,4:14}[n])*Math.max(1,.75/camera.aspect);}
  if(!ownership.current&&orbit.current){
   const target=orbit.current.target,offset=camera.position.clone().sub(target),direction=guide.current.reset?new THREE.Vector3(5,2.5,9).normalize():offset.clone().normalize(),desired=target.clone().addScaledVector(direction,guide.current.distance);
   camera.position.lerp(desired,1-Math.exp(-dt*2));if(camera.position.distanceTo(desired)<.01)guide.current.reset=false;orbit.current.update();
  }
  timer.current+=dt;if(timer.current>.07){timer.current=0;onSnapshot(fillingState(number,clock.current.time));}
 },-.5);
 return <><ambientLight intensity={.72}/><hemisphereLight args={['#dce9df','#263c38',1.4]}/><directionalLight position={[4,7,6]} color="#fff1db" intensity={2.7}/><group rotation={ATOMIC_ROTATION}>{mode==='shell'?<ShellGuides shells={view.shells}/>:<FillingDensity clouds={view.clouds} whole={view.key==='atom'}/>}<mesh name="atomic-nucleus" renderOrder={2}><sphereGeometry args={[.12,40,28]}/><meshPhysicalMaterial color="#bb5c45" roughness={.3} metalness={.24} clearcoat={.65} transparent opacity={1}/></mesh><ElectronMarkers records={view.records} clock={clock} mode={mode}/></group><OrbitControls ref={orbit} makeDefault enableDamping dampingFactor={.065} enablePan={false} minDistance={3} maxDistance={35} onStart={()=>{ownership.current=true;guide.current.reset=false}}/></>;
}
class FillingBoundary extends Component{
 state={error:false};static getDerivedStateFromError(){return {error:true}}
 render(){return this.state.error?<div className="filling-error">3D rendering is unavailable on this device. The configuration exercise remains available.</div>:this.props.children}
}
export function FillingScene({number,onNumber,onBack,onAufbau,guideOpen=false}){
 const guidePause=useRef(false),clock=useRef({time:number*FILL_SECONDS,motionTime:0,playing:true}),[snapshot,setSnapshot]=useState(()=>fillingState(number,number*FILL_SECONDS)),[mode,setMode]=useState('shell'),[playing,setPlaying]=useState(true),[selection,setSelection]=useState('follow'),[inspection,setInspection]=useState(null),[resetSerial,setReset]=useState(0),element=CONFIGURATION_ELEMENTS[number-1];
 const view=useMemo(()=>mode==='shell'?shellView(number,snapshot.time):electronView(number,snapshot.time,selection,inspection),[mode,number,snapshot.time,selection,inspection]),shell=element.configuration.find(r=>r.key===view.key),label=view.key==='atom'?'Complete atom':view.key;
 useEffect(()=>{if(guideOpen){guidePause.current=clock.current.playing;clock.current.playing=false;setPlaying(false)}else if(guidePause.current){clock.current.playing=true;setPlaying(true);guidePause.current=false}},[guideOpen]);
 useEffect(()=>{setInspection(null)},[view.key]);
 useEffect(()=>{const fn=()=>{if(document.hidden){clock.current.playing=false;setPlaying(false)}};document.addEventListener('visibilitychange',fn);return()=>document.removeEventListener('visibilitychange',fn)},[]);
 const tick=state=>{setSnapshot(state);setPlaying(clock.current.playing)};
 const restart=()=>{clock.current.time=0;clock.current.motionTime=0;clock.current.playing=true;setPlaying(true);setSnapshot(fillingState(number,0));setInspection(null)};
 const choose=value=>{setSelection(value);setInspection(null)};
 return <div className="filling-overlay"><aside className="filling-sidebar"><span className="configuration-kicker">NEUTRAL ATOM · GROUND STATE</span><h2>{element.symbol}<span>{element.name}</span></h2><label className="element-switch">Element<select aria-label="Choose 3D element" value={number} onChange={e=>onNumber(Number(e.target.value))}>{CONFIGURATION_ELEMENTS.map(e=><option key={e.number} value={e.number}>{e.symbol} · {e.name}</option>)}</select></label><p className="filling-electron-total">{view.totalCount} / {number} {number===1?'electron':'electrons'}</p>
  <div className="filling-model-options" role="group" aria-label="Atomic model"><button aria-pressed={mode==='shell'} onClick={()=>setMode('shell')}>Bohr shells</button><button aria-pressed={mode==='quantum'} onClick={()=>setMode('quantum')}>Quantum orbitals</button></div>
  {mode==='quantum'&&<><div className="filling-view-options" role="group" aria-label="Electron view"><button aria-pressed={selection==='follow'} onClick={()=>choose('follow')}>Follow filling</button><button aria-pressed={selection==='atom'} onClick={()=>choose('atom')}>Complete atom</button></div>
  <ol className="filling-subshell-list">{element.configuration.map(r=>{const count=electronView(number,snapshot.time,r.key).visibleCount;return <li key={r.key} className={view.key===r.key?'current':count===r.electrons?'filled':''}><button aria-label={`View ${r.key} subshell`} aria-pressed={selection===r.key} onClick={()=>choose(r.key)}><span>{r.n}{r.type}<sup>{count}</sup></span><SpinDiagram type={r.type} electrons={count} readOnly/></button></li>})}</ol></>}
  {mode==='shell'&&<ol className="shell-populations" aria-label="Electron shell distribution">{view.shells.map(s=><li key={s.n}><span>n = {s.n}<small>{['K','L','M','N'][s.n-1]} shell</small></span><strong>{s.count} e⁻</strong></li>)}</ol>}
  <p className="filling-science-note">{mode==='shell'?'A simplified shell-counting model. Rings and moving dots are schematic, not literal electron trajectories. Shell spacing is illustrative, not atomic size.':'The cloud shows probability density, not extra electrons. Each gold marker counts one electron and illustrates possible positions, not a literal trajectory.'} The coral centre is the nucleus, enlarged for visibility.</p><button className="return-table" onClick={onBack}><ArrowLeft size={15}/> Back to builder</button><button className="filling-aufbau" onClick={onAufbau}>Aufbau Principle</button>
 </aside><section className="filling-viewport" aria-label={`${element.name} ${mode==='shell'?'Bohr shell model':'quantum orbital filling'}`} data-atomic-model={mode} data-visible-electrons={view.visibleCount}><header className="filling-heading"><div><span className="configuration-kicker">{mode==='shell'?'SCHEMATIC BOHR MODEL':'QUANTUM ORBITAL FILLING'}</span><h3>{mode==='shell'?view.distribution.join(' · '):label}{shell?.type==='p'&&inspection!==null&&<sub>{['x','y','z'][inspection]}</sub>}{mode==='quantum'&&shell&&<sup>{view.visibleCount}</sup>}<span>{snapshot.complete?'Ground state complete':'Filling in Aufbau order'}</span></h3></div><button aria-label="Reset filling camera" onClick={()=>setReset(x=>x+1)}><Focus size={19}/></button></header>
  <div className="filling-density-caption"><strong role="status" aria-label="Visible electron count">{view.visibleCount} {view.visibleCount===1?'electron marker':'electron markers'}</strong><span className="density-meaning" role="note" aria-label="Cloud interpretation">{mode==='shell'?'Schematic shell orbits — not literal electron trajectories.':number===1?'The entire blue cloud is the probability density of ONE electron.':'Cloud = orbital probability density, not extra electrons.'}</span><div className="filling-science-key">{mode==='quantum'?<span><i className="cloud-key"/>Probability cloud</span>:<span><i className="shell-key"/>Shell guide</span>}<span><i className="electron-key"/>1 marker = 1 electron</span><span><i className="nucleus-key"/>{number===1?'¹H nucleus · 1 proton':'Nucleus · +'+number+'e'}</span></div><small>{mode==='shell'?'Illustrative spacing · nucleus enlarged':'Nucleus enlarged · marker motion illustrates possible positions'}</small></div><div className="filling-canvas" data-model={mode}><FillingBoundary><Canvas camera={{position:[5,2.5,9],fov:40,near:.1,far:100}} frameloop="demand" dpr={[1,1.5]} gl={{antialias:true,alpha:true,toneMapping:THREE.ACESFilmicToneMapping,toneMappingExposure:1.12}}><FillingStudio clock={clock} number={number} view={view} mode={mode} resetSerial={resetSerial} onSnapshot={tick}/></Canvas></FillingBoundary></div>
  {mode==='quantum'&&shell?.type==='p'&&<div className="p-inspection" role="group" aria-label="Inspect p orbital"><button aria-pressed={inspection===null} onClick={()=>setInspection(null)}>All p orbitals</button>{['x','y','z'].map((a,i)=><button key={a} aria-label={`Inspect p${a} orbital`} aria-pressed={inspection===i} onClick={()=>setInspection(i)}>p<sub>{a}</sub><small>{electronView(number,snapshot.time,view.key,i).visibleCount} e⁻</small></button>)}</div>}
  <div className="filling-controls"><button className="filling-play" aria-label={playing?'Pause filling':'Play filling'} onClick={()=>{clock.current.playing=!clock.current.playing;setPlaying(clock.current.playing)}}>{playing?<Pause size={19}/>:<Play size={19}/>}</button><button aria-label="Restart filling" onClick={restart}><RotateCcw size={18}/></button><input aria-label="Filling progress" type="range" min="0" max={number} step=".01" value={snapshot.time/FILL_SECONDS} onChange={e=>{clock.current.time=Number(e.target.value)*FILL_SECONDS;clock.current.playing=false;setPlaying(false);setSnapshot(fillingState(number,clock.current.time));}}/><span>{snapshot.complete?'Complete':`${view.totalCount} / ${number}`}</span><button aria-label="Back to configuration builder" onClick={onBack}><ArrowLeft size={18}/></button></div>
 </section></div>;
}

