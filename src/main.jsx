import React, {useState,useRef,useEffect,Suspense,Component} from 'react';
import {createRoot} from 'react-dom/client';
import {Canvas,useFrame,useThree} from '@react-three/fiber';
import {OrbitControls} from '@react-three/drei';
import * as THREE from 'three';
import {Play,Pause,RotateCcw,SkipForward,Volume2,VolumeX,Focus,Atom,Axis3D,SlidersHorizontal,ZoomIn,Gauge,CircleDashed,Cloud,Waves,Network,Table2} from 'lucide-react';
import {PeriodicTable} from './PeriodicTable';
import {CONFIG,TIMING,hybridMotion} from './model.mjs';
import {audio} from './audio';
import {createCameraControl,takeCameraControl,releaseCameraControl,resetCameraControl,restartCameraTimeline,canGuideCamera} from './camera-model.mjs';
import './style.css';
import {OrbitalGlyph,OrbitalName} from './OrbitalGlyph';
import {ATOMIC} from './atomic-model.mjs';
import {AtomicOrbitals} from './AtomicOrbitals';
import {CoordinateAxes} from './CoordinateAxes';
import {HybridDensityOrbital} from './HybridDensityOrbital';
import {HYBRID_DURATION,HYBRID_STAGES,hybridStageAt,hybridReveal} from './presentation-model.mjs';
import {zoomDepth,zoomDistance,dampedZoomDistance} from './zoom-model.mjs';

const V=a=>new THREE.Vector3(...a);

function FrameCadence(){
 const {invalidate}=useThree();
 useEffect(()=>{const tick=()=>{if(!document.hidden)invalidate()};const id=setInterval(tick,1000/30);return()=>clearInterval(id)},[invalidate]);
 return null;
}
function Studio({config,clock,selected,onSelect,labels,stage,resetKey,guided,onInteraction,cameraControl,labelHost,atomic=false,orbital,axes,cutaway,atomicSelected,onAtomicSelect,zoom,motion,zoomProgress,particleStyle,compassHost}){
 const orbit=useRef(),world=useRef(),cameraState=useRef({key:resetKey,guide:guided,reset:2,zoomSerial:0,zoomTarget:null}),timer=useRef(0);
 const {camera,gl}=useThree();
 const beginInteraction=()=>{cameraState.current.reset=0;cameraState.current.zoomTarget=null;if(!atomic)takeCameraControl(cameraControl.current,clock.current.time,performance.now());onInteraction();};
 const endInteraction=()=>{if(!atomic)releaseCameraControl(cameraControl.current,performance.now());};
 useEffect(()=>{gl.setClearColor('#f4f7f3',0)},[gl]);
 useFrame((_,delta)=>{
  const c=clock.current,t=c.time;timer.current+=delta;
  const overviewDistance=({'1s':7.7,'2s':10.3,'3s':13.5}[orbital]??(ATOMIC[orbital]?.family==='p'?9.6:10.5))*Math.max(1,.65/camera.aspect);
  if(c.playing&&!atomic){const prev=t;c.time=Math.min(HYBRID_DURATION,t+delta*c.speed);
    for(const [at,sound] of [[TIMING.atomicHold,'whoosh'],[TIMING.morphEnd,'energy']])if(prev<at&&c.time>=at)audio.sound(sound,c.speed);
    if(c.time===(HYBRID_DURATION))c.playing=false;
  }
  c.impulse=Math.max(0,(c.impulse||0)-delta*3.6);
  if(cameraState.current.key!==resetKey){cameraState.current.key=resetKey;cameraState.current.reset=2;cameraState.current.zoomTarget=null;cameraState.current.zoomSerial=zoom?.current.serial??0;}
  const reset=cameraState.current.reset>0;cameraState.current.reset=Math.max(0,(cameraState.current.reset||0)-delta);
  if(atomic){
    const target=new THREE.Vector3(0,.5,0),state=cameraState.current;
    if(state.zoomSerial!==zoom.current.serial){state.zoomSerial=zoom.current.serial;state.zoomTarget=Math.max(3,zoomDistance(zoom.current.request)*overviewDistance/14.5);state.reset=0;}
    if(state.zoomTarget!==null){const direction=camera.position.clone().sub(orbit.current.target).normalize(),distance=camera.position.distanceTo(orbit.current.target),next=dampedZoomDistance(distance,state.zoomTarget,delta);orbit.current.target.copy(target);camera.position.copy(target).addScaledVector(direction,next);orbit.current.update();if(Math.abs(next-state.zoomTarget)<.001){camera.position.copy(target).addScaledVector(direction,state.zoomTarget);state.zoomTarget=null;}}
    zoom.current.progress=zoomDepth(camera.position.distanceTo(orbit.current.target)*14.5/overviewDistance);
  }
  const follow=atomic?(guided||(reset&&cameraState.current.zoomTarget===null)):canGuideCamera(cameraControl.current,guided,reset);
  if(follow){
    const morph=hybridMotion(c.time).morph,reveal=hybridReveal(c.time);
    const fit=Math.max(1,1/camera.aspect),compact=gl.domElement.clientWidth<560;
    const finalDistance=Math.max(10,3.35*fit/Math.tan(THREE.MathUtils.degToRad(20))*1.08);
    const finalView=V(config.key==='sp3'?[12,5,4]:config.key==='sp2'?[7,5,12]:[4,5,13]).normalize().multiplyScalar(finalDistance);
    const extent=compact&&config.count>2?3.25:(config.count-1)*1.65+1.5;
    const rowDistance=Math.max(12,extent*fit/Math.tan(THREE.MathUtils.degToRad(20))*1.12),atomicDistance=overviewDistance;
    const desired=new THREE.Vector3(0,3.2-morph*.8,rowDistance-morph*(rowDistance-finalDistance)).lerp(finalView,reveal);
    if(reset)desired.copy(!atomic&&stage===3?finalView:!atomic?new THREE.Vector3(0,3.2,rowDistance):new THREE.Vector3(5,2.5,10).normalize().multiplyScalar(atomicDistance).add(new THREE.Vector3(0,.5,0)));
    desired.x+=c.impulse*.075;desired.y+=c.impulse*.052;
    camera.position.lerp(desired,1-Math.exp(-delta*2.1));
    orbit.current.target.lerp(new THREE.Vector3(0,atomic?.5:.25,0),1-Math.exp(-delta*2.5));orbit.current.update();
  }
  if(!atomic){const reveal=hybridReveal(c.time);world.current.rotation.set(.10*reveal,(config.key==='sp'?.62:config.key==='sp2'?.78:.9)*reveal,0);}
  if(timer.current>.08&&compassHost.current){
   timer.current=0;const inverse=camera.quaternion.clone().invert();
   [[1,0,0],[0,1,0],[0,0,1]].forEach((axis,i)=>{
    const p=new THREE.Vector3(...axis);if(atomic)p.set(axis[0],axis[2],-axis[1]);
    p.applyQuaternion(world.current.quaternion).applyQuaternion(inverse);
    const x=36+p.x*23,y=36-p.y*23,group=compassHost.current.children[i];
    group.children[0].setAttribute('x2',x);group.children[0].setAttribute('y2',y);group.children[1].setAttribute('cx',x);group.children[1].setAttribute('cy',y);group.style.opacity=.5+.5*(p.z+1)/2;
   });
  }
 });
 return <>
  <FrameCadence/>
  <ambientLight intensity={.72}/><hemisphereLight args={['#dce9df','#263c38',1.4]}/>
  <directionalLight position={[4,7,6]} color="#fff1db" intensity={2.7}/><directionalLight position={[-6,3,-4]} color="#88beb5" intensity={2.1}/>
  <pointLight position={[0,2,3]} color="#e9b674" intensity={9} distance={13} decay={2}/>
  <group ref={world} position={[0,.5,0]}>
   {atomic?<AtomicOrbitals orbital={orbital} labels={labels} axes={axes} cutaway={cutaway} selected={atomicSelected} onSelect={onAtomicSelect} labelHost={labelHost} zoom={zoom} motion={motion} particleStyle={particleStyle}/>:<>
   {config.directions.map((_,i)=><HybridDensityOrbital key={i} index={i} config={config} clock={clock} selected={selected} onSelect={onSelect} labels={labels} labelHost={labelHost} motion={motion&&clock.current.playing} particleStyle={particleStyle}/>)}
   {axes&&<CoordinateAxes labelHost={labelHost} length={3.5}/>}
   </>}
  </group>
  <OrbitControls ref={orbit} makeDefault enableDamping dampingFactor={.065} enableZoom minDistance={atomic?3:5} maxDistance={45} maxPolarAngle={Math.PI*.78} enablePan={false} enabled enableRotate touches={{ONE:THREE.TOUCH.ROTATE,TWO:THREE.TOUCH.DOLLY_ROTATE}} onStart={beginInteraction} onEnd={endInteraction}/>

 </>
}

function GeometryGlyph({type}){
 const data=type==='sp'?[[12,24],[56,24]]:type==='sp2'?[[34,5],[10,40],[58,40]]:[[34,4],[9,35],[57,35],[36,44]];
 return <svg width="68" height="48" viewBox="0 0 68 48" fill="none" aria-hidden="true">{data.map(([x,y],i)=><g key={i}><path d={`M34 24L${x} ${y}`} stroke="currentColor" strokeWidth="1" strokeDasharray={type==='sp3'&&i===3?'3 3':undefined}/><circle cx={x} cy={y} r="3" fill="currentColor"/></g>)}<circle cx="34" cy="24" r="4.5" fill="currentColor"/></svg>
}
class SceneBoundary extends Component {
 state={error:false};static getDerivedStateFromError(){return {error:true}}
 render(){return this.state.error?<div className="scene-error"><Atom size={40}/><button aria-label="Retry 3D rendering" onClick={()=>location.reload()}><RotateCcw/></button></div>:this.props.children}
}

function App(){
 const [section,setSection]=useState('atomic'),[orbital,setOrbital]=useState('1s'),[axes,setAxes]=useState(false),[cutaway,setCutaway]=useState(false),[atomicSelected,setAtomicSelected]=useState(null);
 const atomic=section==='atomic',periodic=section==='periodic',orbitalConfig=ATOMIC[orbital];
 const cameraControl=useRef(createCameraControl());
 const zoom=useRef({serial:0,request:0,progress:0,}),[zoomProgress,setZoomProgress]=useState(0),[motion,setMotion]=useState(()=>!window.matchMedia('(prefers-reduced-motion: reduce)').matches);
 const requestZoom=value=>{zoom.current.request=value;zoom.current.serial++;};
 useEffect(()=>{const id=setInterval(()=>setZoomProgress(zoom.current.progress),125);return()=>clearInterval(id)},[]);
 const navigate=tab=>{audio.stop();clock.current.playing=false;setPlaying(false);setGuided(false);setSection(tab);setSelected(null);if(tab==='atomic'){requestZoom(0);zoom.current.progress=0;setZoomProgress(0)}else if(tab==='hybrid'&&section!=='hybrid'){clock.current.time=0;setTime(0)}if(tab==='atomic'||section==='atomic'||section==='periodic'){resetCameraControl(cameraControl.current);setReset(r=>r+1)}};
 const chooseOrbital=key=>{setOrbital(key);setAtomicSelected(null);requestZoom(0);setReset(r=>r+1)};
 const [mode,setMode]=useState('sp3'),[playing,setPlaying]=useState(false),[time,setTime]=useState(0),[labels]=useState(false),[sound,setSound]=useState(false),[volume,setVolume]=useState(()=>Math.round(audio.volume*100)),[speed,setSpeed]=useState(1),[selected,setSelected]=useState(null),[settings,setSettings]=useState(false),[particleStyle,setParticleStyle]=useState('drift'),[resetKey,setReset]=useState(0),[guided,setGuided]=useState(false);
 const labelHost=useRef(),compassHost=useRef(); const clock=useRef({time:0,playing:false,speed:1,impulse:0});const config=CONFIG[mode],stage=hybridStageAt(time),total=HYBRID_DURATION,lessonStages=HYBRID_STAGES;
 useEffect(()=>{const id=setInterval(()=>{setTime(clock.current.time);setPlaying(clock.current.playing);if(clock.current.time>=total)setGuided(false)},75);return()=>clearInterval(id)},[total]);
 useEffect(()=>{clock.current.speed=speed},[speed]);
 const choose=key=>{audio.stop();clock.current.time=0;clock.current.playing=false;setMode(key);setTime(clock.current.time);setPlaying(false);setSelected(null);setGuided(false);restartCameraTimeline(cameraControl.current)};
 const play=async()=>{await audio.unlock();if(clock.current.time>=total){clock.current.time=0;setTime(0);restartCameraTimeline(cameraControl.current)}clock.current.playing=!clock.current.playing;setPlaying(clock.current.playing);setGuided(clock.current.playing&&!cameraControl.current.userOwned);if(!clock.current.playing)audio.stop()};
 const replay=async()=>{await audio.unlock();audio.stop();clock.current.time=0;clock.current.playing=true;setTime(0);setPlaying(true);setGuided(!cameraControl.current.userOwned);setSelected(null);restartCameraTimeline(cameraControl.current)};
 const next=()=>{audio.stop();const milestones=[TIMING.atomicHold,TIMING.morphStart,TIMING.morphEnd,total];const target=milestones.find(x=>x>clock.current.time+.15)??total;clock.current.time=target;clock.current.playing=false;setTime(target);setPlaying(false);setGuided(false)};
 const toggleSound=async()=>{await audio.unlock();audio.enabled=!sound;setSound(!sound);if(sound)audio.stop()};
 useEffect(()=>{const handler=e=>{if(e.key==='Escape'){setSettings(false);return}if(['INPUT','SELECT','BUTTON'].includes(e.target.tagName)||atomic||periodic)return;if(e.code==='Space'){e.preventDefault();play()}if(e.key.toLowerCase()==='r')replay();if(e.key==='ArrowRight')next()};window.addEventListener('keydown',handler);return()=>window.removeEventListener('keydown',handler)},[total,playing,atomic,periodic]);

 useEffect(()=>{const handler=()=>{if(document.hidden){clock.current.playing=false;audio.stop();setPlaying(false);setGuided(false)}};document.addEventListener('visibilitychange',handler);return()=>document.removeEventListener('visibilitychange',handler)},[]);
 const seek=e=>{audio.stop();clock.current.time=Number(e.target.value);clock.current.playing=false;setTime(clock.current.time);setPlaying(false);setGuided(false)};
 return <main className={`experience ${atomic?'atomic-experience':''} ${periodic?'periodic-experience':''}`}>
  {!periodic&&<>
  <div className="canvas-wrap"><SceneBoundary><Canvas camera={{position:[3.35,2.18,6.71],fov:40,near:.1,far:100}} frameloop="demand" dpr={[1,1.5]} gl={{antialias:true,alpha:true,powerPreference:'high-performance',toneMapping:THREE.ACESFilmicToneMapping,toneMappingExposure:1.12}}><Suspense fallback={null}><Studio key={atomic?'atomic':'hybrid'} config={config} clock={clock} selected={selected} onSelect={setSelected} labels={labels} stage={stage} resetKey={resetKey} guided={guided} onInteraction={()=>setGuided(false)} cameraControl={cameraControl} labelHost={labelHost} atomic={atomic} orbital={orbital} axes={axes} cutaway={cutaway} atomicSelected={atomicSelected} onAtomicSelect={setAtomicSelected} zoom={zoom} zoomProgress={zoomProgress} motion={motion} particleStyle={particleStyle} compassHost={compassHost}/></Suspense></Canvas></SceneBoundary><div className="scene-label-layer" ref={labelHost}/></div>
  <div className="ambient-vignette"/>
  <div className="orbital-readout" aria-label="Selected orbital">{atomic?<OrbitalName kind={orbital}/>:config.label}</div>
  <div className="phase-indicator" role="img" aria-label="Blue and magenta represent opposite wavefunction phases"><Waves/><span className="phase-chip"><i/><svg viewBox="0 0 12 12" stroke="currentColor"><path d="M2 6H10M6 2V10"/></svg></span><span className="phase-chip"><i/><svg viewBox="0 0 12 12" stroke="currentColor"><path d="M2 6H10"/></svg></span></div>
  <button className="orientation-compass" aria-label="Reset camera orientation" onClick={()=>{resetCameraControl(cameraControl.current);setReset(x=>x+1);setGuided(!atomic&&clock.current.playing)}}><svg viewBox="0 0 72 72"><g ref={compassHost}>{['#986748','#257e6c','#5268a4'].map((color,i)=><g key={i} stroke={color} fill={color}><line x1="36" y1="36" x2={[58,36,19][i]} y2={[36,13,53][i]} strokeWidth="1.3"/><circle cx={[58,36,19][i]} cy={[36,13,53][i]} r="2.5" strokeWidth="0"/></g>)}</g><circle cx="36" cy="36" r="2" fill="#4b625c"/></svg></button>
  </>}
  <nav className="module-nav" aria-label="Learning modules">
   <button aria-label="Periodic table" title="Periodic table" aria-pressed={periodic} onClick={()=>navigate('periodic')}><Table2 size={25}/></button>
   <button aria-label="Atomic orbitals" aria-pressed={atomic} onClick={()=>navigate('atomic')}><OrbitalGlyph kind="pz"/></button>
   <button aria-label="Hybridization" aria-pressed={section==='hybrid'} onClick={()=>navigate('hybrid')}><Network size={25}/></button>
  </nav>
  {periodic?<PeriodicTable/>:<section className={`floating-panel ${atomic?'atomic-dock':'hybrid-dock'}`} aria-label="Orbital controls">
   <div className="selection-row">
    {atomic?<><div className="families" role="group" aria-label="Orbital family">{['s','p','d'].map(f=><button key={f} aria-label={`${f} orbitals`} aria-pressed={orbitalConfig.family===f} onClick={()=>chooseOrbital(f==='s'?'1s':f==='p'?'px':'dxy')}><OrbitalGlyph kind={f==='s'?'1s':f==='p'?'px':'dxy'}/><span className="family-name">{f}</span></button>)}</div>
     <i className="divider"/><div className="variants" role="group" aria-label="Orbital selection">{Object.entries(ATOMIC).filter(([,c])=>c.family===orbitalConfig.family).map(([key,c])=><button key={key} aria-label={c.label} aria-pressed={orbital===key} onClick={()=>chooseOrbital(key)}><OrbitalGlyph kind={key}/><span className="option-name"><OrbitalName kind={key}/></span></button>)}</div></>:
     <div className="hybrids" role="group" aria-label="Hybridization selection">{Object.values(CONFIG).map(c=><button key={c.key} aria-label={c.label} aria-pressed={mode===c.key} onClick={()=>choose(c.key)}><GeometryGlyph type={c.key}/><span className="option-name">{c.label}</span></button>)}</div>}
   </div>
   {settings&&<div className="settings-panel" id="settings">
    <div className="style-options" role="group" aria-label="Particle appearance">
     <button aria-label="Still probability cloud" aria-pressed={particleStyle==='still'} onClick={()=>setParticleStyle('still')}><Cloud size={20}/></button>
     <button aria-label="Smooth internal drift" aria-pressed={particleStyle==='drift'} onClick={()=>setParticleStyle('drift')}><Waves size={20}/></button>
    </div>
    {atomic?<label className="slider-control"><ZoomIn size={18}/><input aria-label="Orbital zoom" type="range" min="0" max=".75" step=".01" value={Math.min(.75,zoomProgress)} onChange={e=>requestZoom(Number(e.target.value))}/></label>:<>
     <label className="slider-control"><Gauge size={18}/><input aria-label="Animation speed" type="range" min=".5" max="2" step=".5" value={speed} onChange={e=>setSpeed(Number(e.target.value))}/></label>
     <label className="slider-control"><Volume2 size={18}/><input aria-label="Sound volume" type="range" min="0" max="100" value={volume} onChange={e=>{const v=Number(e.target.value);setVolume(v);audio.setVolume(v/100)}}/></label>
    </>}
   </div>}
   <div className="tools-row">
    <button className="primary" aria-label={atomic?(motion?'Pause particles':'Animate particles'):(playing?'Pause animation':'Play animation')} onClick={atomic?()=>setMotion(!motion):play}>{(atomic?motion:playing)?<Pause size={19}/>:<Play size={19}/>}</button>
    {!atomic&&<><button aria-label="Replay" onClick={replay}><RotateCcw size={18}/></button><button aria-label="Next step" onClick={next}><SkipForward size={18}/></button></>}
    <button aria-label="Show axes" aria-pressed={axes} onClick={()=>setAxes(!axes)}><Axis3D size={20}/></button>
    {atomic?(orbitalConfig.family==='s'&&orbital!=='1s'&&<button aria-label="Radial cutaway" aria-pressed={cutaway} disabled={orbitalConfig.family!=='s'||orbital==='1s'} onClick={()=>setCutaway(!cutaway)}><CircleDashed size={20}/></button>):<button aria-label="Sound" aria-pressed={sound} onClick={toggleSound}>{sound?<Volume2 size={19}/>:<VolumeX size={19}/>}</button>}
    <button aria-label="Reset camera" onClick={()=>{resetCameraControl(cameraControl.current);setReset(x=>x+1);setGuided(!atomic&&clock.current.playing)}}><Focus size={20}/></button>
    <i className="divider"/>
    <button aria-label="Settings" aria-expanded={settings} aria-controls="settings" onClick={()=>setSettings(!settings)}><SlidersHorizontal size={19}/></button>
   </div>
   {!atomic&&<div className="timeline"><input type="range" aria-label="Animation timeline" min="0" max={total} step=".05" value={time} onChange={seek}/><div className="stage-dots">{lessonStages.map((s,i)=><button key={i} aria-label={s.short} aria-pressed={stage===i} onClick={()=>{audio.stop();const t=[0,TIMING.atomicHold,TIMING.morphStart,TIMING.morphEnd][i];clock.current.time=t;clock.current.playing=false;setTime(t);setPlaying(false);setGuided(false)}}><i/></button>)}</div></div>}
  </section>}
 </main>
}
createRoot(document.getElementById('root')).render(<App/>);
