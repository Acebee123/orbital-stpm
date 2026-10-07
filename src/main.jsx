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
import {CONFIG,clamp,TIMING,hybridMotion} from './model.mjs';
import {audio} from './audio';
import {createCameraControl,takeCameraControl,releaseCameraControl,resetCameraControl,restartCameraTimeline,canGuideCamera} from './camera-model.mjs';
import './style.css';
import {ATOMIC} from './atomic-model.mjs';
import {AtomicOrbitals} from './AtomicOrbitals';
import {HybridDensityOrbital} from './HybridDensityOrbital';
import {HYBRID_DURATION,HYBRID_STAGES,hybridStageAt,hybridReveal} from './presentation-model.mjs';
import {zoomDepth,zoomDistance,dampedZoomDistance} from './zoom-model.mjs';

const V=a=>new THREE.Vector3(...a);

function Angle({config,labelHost}){
 const a=V(config.directions[0]),b=V(config.directions[1]);
 const angle=Math.acos(clamp(a.dot(b),-1,1));
 const ortho=b.clone().addScaledVector(a,-a.dot(b)).normalize();if(config.key==='sp')ortho.set(0,1,0);
 const pts=Array.from({length:65},(_,i)=>a.clone().multiplyScalar(Math.cos(angle*i/64)).addScaledVector(ortho,Math.sin(angle*i/64)).multiplyScalar(1.06));
 const mid=pts[32].clone().multiplyScalar(1.33);
 return <group><Line points={pts} color="#e0c18c" lineWidth={.65} transparent opacity={.36}/><Html portal={labelHost} position={mid} center zIndexRange={[4,0]}><span className="angle-label">{config.angle}</span></Html></group>
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
 const particles=React.useMemo(()=>{const p=new Float32Array(45*3);for(let i=0;i<45;i++){p.set([Math.sin(i*124.7)*9,Math.cos(i*46.3)*5,Math.sin(i*85.4)*6-3],i*3)}return p},[]);
 const ambience=useRef();
 useFrame(({clock:real},delta)=>{
  const c=clock.current,t=c.time;timer.current+=delta;
  if(c.playing&&!atomic){const prev=t;c.time=Math.min(HYBRID_DURATION,t+delta*c.speed);
    for(const [at,sound] of [[TIMING.atomicHold,'whoosh'],[TIMING.morphEnd,'energy']])if(prev<at&&c.time>=at)audio.sound(sound,c.speed);
    if(c.time===(HYBRID_DURATION))c.playing=false;
  }
  ambience.current.rotation.y=real.elapsedTime*.003;
  c.impulse=Math.max(0,(c.impulse||0)-delta*3.6);
  if(cameraState.current.key!==resetKey){cameraState.current.key=resetKey;cameraState.current.reset=2;cameraState.current.zoomTarget=null;cameraState.current.zoomSerial=zoom?.current.serial??0;}
  const reset=cameraState.current.reset>0;cameraState.current.reset=Math.max(0,(cameraState.current.reset||0)-delta);
  if(atomic){
    const target=new THREE.Vector3(0,.5,0),state=cameraState.current;
    if(state.zoomSerial!==zoom.current.serial){state.zoomSerial=zoom.current.serial;state.zoomTarget=zoomDistance(zoom.current.request);state.reset=0;}
    if(state.zoomTarget!==null){const direction=camera.position.clone().sub(orbit.current.target).normalize(),distance=camera.position.distanceTo(orbit.current.target),next=dampedZoomDistance(distance,state.zoomTarget,delta);orbit.current.target.copy(target);camera.position.copy(target).addScaledVector(direction,next);orbit.current.update();if(Math.abs(next-state.zoomTarget)<.001){camera.position.copy(target).addScaledVector(direction,state.zoomTarget);state.zoomTarget=null;}}
    zoom.current.progress=zoomDepth(camera.position.distanceTo(orbit.current.target));
  }
  const follow=atomic?(guided||(reset&&cameraState.current.zoomTarget===null)):canGuideCamera(cameraControl.current,guided,reset);
  if(follow){
    const morph=hybridMotion(c.time).morph,reveal=hybridReveal(c.time);
    const finalView=config.key==='sp3'?[12,5,4]:config.key==='sp2'?[7,5,12]:[4,5,13];
    const rowDistance=gl.domElement.clientWidth<700?20:16;
    const desired=new THREE.Vector3(0,3.2-morph*.8,rowDistance-morph*(rowDistance-11)).lerp(V(finalView),reveal);
    if(reset)desired.copy(!atomic&&stage===3?V(finalView):!atomic?new THREE.Vector3(0,3.2,rowDistance):new THREE.Vector3(8.5,4.3,12));
    desired.x+=c.impulse*.075;desired.y+=c.impulse*.052;
    camera.position.lerp(desired,1-Math.exp(-delta*2.1));
    orbit.current.target.lerp(new THREE.Vector3(atomic||gl.domElement.clientWidth<700?0:camera.aspect<1.1?0:-.55,atomic?.5:.25,0),1-Math.exp(-delta*2.5));orbit.current.update();
  }
  if(!atomic){const reveal=hybridReveal(c.time);world.current.rotation.set(.10*reveal,(config.key==='sp'?.62:config.key==='sp2'?.78:.9)*reveal,0);}
 });
 return <>

  <ambientLight intensity={.72}/><hemisphereLight args={['#dce9df','#263c38',1.4]}/>
  <directionalLight position={[4,7,6]} color="#fff1db" intensity={2.7}/><directionalLight position={[-6,3,-4]} color="#88beb5" intensity={2.1}/>
  <pointLight position={[0,2,3]} color="#e9b674" intensity={9} distance={13} decay={2}/>
  <group ref={world} position={[0,.5,0]}>
   {atomic?<AtomicOrbitals orbital={orbital} labels={labels} axes={axes} cutaway={cutaway} selected={atomicSelected} onSelect={onAtomicSelect} labelHost={labelHost} zoom={zoom} motion={motion}/>:<>
   {config.directions.map((_,i)=><HybridDensityOrbital key={i} index={i} config={config} clock={clock} selected={selected} onSelect={onSelect} labels={labels} labelHost={labelHost}/>)}
   {stage===3&&labels&&<Angle config={config} labelHost={labelHost}/>}
   </>}
  </group>
  <group position={[0,-3.15,0]}>
   <mesh rotation={[-Math.PI/2,0,0]}><planeGeometry args={[200,200]}/><meshStandardMaterial color="#142222" roughness={.85} metalness={.16}/></mesh>
   {[3.9,4.8,6.2].map((r,i)=><mesh key={r} rotation={[-Math.PI/2,0,0]} position={[0,.012+i*.002,0]}><ringGeometry args={[r,r+.008,128]}/><meshBasicMaterial color="#344b45" transparent opacity={.3-i*.05} side={THREE.DoubleSide}/></mesh>)}
  </group>
  <ContactShadows position={[0,-3.12,0]} opacity={.3} scale={20} blur={3.5} far={6} resolution={256} color="#030a08" frames={1}/>
  <points ref={ambience}><bufferGeometry><bufferAttribute attach="attributes-position" args={[particles,3]}/></bufferGeometry><pointsMaterial size={.015} color="#92b0a0" transparent opacity={.25} depthWrite={false}/></points>
  <fog attach="fog" args={['#101b1c',17,38]}/>
  <OrbitControls ref={orbit} makeDefault enableDamping dampingFactor={.065} enableZoom minDistance={atomic?3:5} maxDistance={22} maxPolarAngle={Math.PI*.78} enablePan={false} enabled enableRotate touches={{ONE:THREE.TOUCH.ROTATE,TWO:THREE.TOUCH.DOLLY_ROTATE}} onStart={beginInteraction} onEnd={endInteraction}/>
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
 const [section,setSection]=useState('atomic'),[orbital,setOrbital]=useState('1s'),[axes,setAxes]=useState(true),[cutaway,setCutaway]=useState(false),[atomicSelected,setAtomicSelected]=useState(null);
 const atomic=section==='atomic',orbitalConfig=ATOMIC[orbital];
 const cameraControl=useRef(createCameraControl());
 const zoom=useRef({serial:0,request:0,progress:0,}),[zoomProgress,setZoomProgress]=useState(0),[motion,setMotion]=useState(()=>!window.matchMedia('(prefers-reduced-motion: reduce)').matches);
 const requestZoom=value=>{zoom.current.request=value;zoom.current.serial++;};
 useEffect(()=>{const id=setInterval(()=>setZoomProgress(zoom.current.progress),125);return()=>clearInterval(id)},[]);
 const navigate=tab=>{audio.stop();clock.current.playing=false;setPlaying(false);setGuided(false);setSection(tab);setSelected(null);if(tab==='atomic'){requestZoom(0);zoom.current.progress=0;setZoomProgress(0)}else if(tab==='hybrid'&&section!=='hybrid'){clock.current.time=0;setTime(0)}if(tab==='atomic'||section==='atomic'){resetCameraControl(cameraControl.current);setReset(r=>r+1)}};
 const chooseOrbital=key=>{setOrbital(key);setAtomicSelected(null)};
 const [mode,setMode]=useState('sp3'),[playing,setPlaying]=useState(false),[time,setTime]=useState(0),[labels,setLabels]=useState(true),[sound,setSound]=useState(false),[volume,setVolume]=useState(()=>Math.round(audio.volume*100)),[speed,setSpeed]=useState(1),[selected,setSelected]=useState(null),[info,setInfo]=useState(false),[resetKey,setReset]=useState(0),[guided,setGuided]=useState(false);
 const labelHost=useRef(); const clock=useRef({time:0,playing:false,speed:1,impulse:0});const config=CONFIG[mode],stage=hybridStageAt(time),total=HYBRID_DURATION,lessonStages=HYBRID_STAGES;
 useEffect(()=>{const id=setInterval(()=>{setTime(clock.current.time);setPlaying(clock.current.playing);if(clock.current.time>=total)setGuided(false)},75);return()=>clearInterval(id)},[total]);
 useEffect(()=>{clock.current.speed=speed},[speed]);
 const choose=key=>{audio.stop();clock.current.time=0;clock.current.playing=false;setMode(key);setTime(clock.current.time);setPlaying(false);setSelected(null);setGuided(false);restartCameraTimeline(cameraControl.current)};
 const play=async()=>{await audio.unlock();if(clock.current.time>=total){clock.current.time=0;setTime(0);restartCameraTimeline(cameraControl.current)}clock.current.playing=!clock.current.playing;setPlaying(clock.current.playing);setGuided(clock.current.playing&&!cameraControl.current.userOwned);if(!clock.current.playing)audio.stop()};
 const replay=async()=>{await audio.unlock();audio.stop();clock.current.time=0;clock.current.playing=true;setTime(0);setPlaying(true);setGuided(!cameraControl.current.userOwned);setSelected(null);restartCameraTimeline(cameraControl.current)};
 const next=()=>{audio.stop();const milestones=[TIMING.atomicHold,TIMING.morphStart,TIMING.morphEnd,total];const target=milestones.find(x=>x>clock.current.time+.15)??total;clock.current.time=target;clock.current.playing=false;setTime(target);setPlaying(false);setGuided(false)};
 const toggleSound=async()=>{await audio.unlock();audio.enabled=!sound;setSound(!sound);if(sound)audio.stop()};
 useEffect(()=>{const handler=e=>{if(e.key==='Escape'){setInfo(false);return}if(['INPUT','SELECT','BUTTON'].includes(e.target.tagName)||info||atomic)return;if(e.code==='Space'){e.preventDefault();play()}if(e.key.toLowerCase()==='r')replay();if(e.key==='ArrowRight')next()};window.addEventListener('keydown',handler);return()=>window.removeEventListener('keydown',handler)},[info,total,playing,atomic]);
 useEffect(()=>{if(!info)return;const before=document.activeElement;const trap=e=>{if(e.key!=='Tab')return;const els=Array.from(document.querySelector('.info-dialog').querySelectorAll('button,a[href]'));if(e.shiftKey&&document.activeElement===els[0]){e.preventDefault();els.at(-1).focus()}else if(!e.shiftKey&&document.activeElement===els.at(-1)){e.preventDefault();els[0].focus()}};document.addEventListener('keydown',trap);return()=>{document.removeEventListener('keydown',trap);before?.focus()}},[info]);
 useEffect(()=>{const handler=()=>{if(document.hidden){clock.current.playing=false;audio.stop();setPlaying(false);setGuided(false)}};document.addEventListener('visibilitychange',handler);return()=>document.removeEventListener('visibilitychange',handler)},[]);
 const seek=e=>{audio.stop();clock.current.time=Number(e.target.value);clock.current.playing=false;setTime(clock.current.time);setPlaying(false);setGuided(false)};
 const activeLabel=selected===null?'Click an orbital to inspect':`Orbital ${selected+1} selected · ${time<2?['2s','2pₓ','2pᵧ','2p𝓏'][selected]:config.label}`;
 return <main className={`experience ${atomic?'atomic-experience':''}`}>
  <div className="canvas-wrap"><SceneBoundary><Canvas camera={{position:[8.5,4.3,12],fov:40,near:.1,far:100}} dpr={[1,1.75]} gl={{antialias:true,alpha:true,powerPreference:'high-performance',toneMapping:THREE.ACESFilmicToneMapping,toneMappingExposure:1.12}}><Suspense fallback={null}><Studio key={atomic?'atomic':'hybrid'} config={config} clock={clock} selected={selected} onSelect={setSelected} labels={labels} stage={stage} resetKey={resetKey} guided={guided} onInteraction={()=>setGuided(false)} cameraControl={cameraControl} labelHost={labelHost} atomic={atomic} orbital={orbital} axes={axes} cutaway={cutaway} atomicSelected={atomicSelected} onAtomicSelect={setAtomicSelected} zoom={zoom} zoomProgress={zoomProgress} motion={motion}/></Suspense></Canvas></SceneBoundary><div className="scene-label-layer" ref={labelHost}/></div>
  <div className="ambient-vignette"/>
  <header className="header"><a className="brand" href="#" onClick={e=>{e.preventDefault();navigate('atomic')}} aria-label="Orbital home"><span className="brand-mark"><i/><i/><i/></span>orbital<span className="brand-dot">.</span></a><div className="course-breadcrumb"><span>STPM CHEMISTRY</span><span className="slash">/</span><span>03 — CHEMICAL BONDING</span></div><button className="about-button" aria-label="About this experience" onClick={()=>setInfo(true)}><Info size={15}/><span>About this experience</span></button></header>
  <nav className="module-nav" aria-label="Learning modules">{[['atomic','Atomic Orbitals'],['hybrid','Hybridisation']].map(([key,label],i)=><button key={key} aria-current={section===key?'page':undefined} className={section===key?'active':''} onClick={()=>navigate(key)}><span>0{i+1}</span>{label}</button>)}</nav>
  {atomic?<><section className="intro"><div className="eyebrow"><span className="tiny-dot"/> THE ATOMIC ORBITAL EXPLORER</div><h1>The shape of<br/><em>possibility.</em></h1><p>Explore electron probability.<br/>Discover the building blocks of bonding.</p><div className="module-tag"><span>01</span> Atomic orbitals</div></section><aside className="hybrid-selector atomic-selector"><div className="selector-heading">EXPLORE AN ORBITAL <ArrowUpRight size={13}/></div><div className="family-tabs">{['s','p','d'].map(f=><button key={f} aria-pressed={orbitalConfig.family===f} className={orbitalConfig.family===f?'active':''} onClick={()=>chooseOrbital(f==='s'?'1s':f==='p'?'px':'dxy')}>{f}<span>orbitals</span></button>)}</div><div className="orbital-options">{Object.entries(ATOMIC).filter(([,c])=>c.family===orbitalConfig.family).map(([key,c])=><button key={key} aria-pressed={orbital===key} className={orbital===key?'active':''} onClick={()=>chooseOrbital(key)}>{c.label}</button>)}</div><div className="selector-foot">{orbitalConfig.family==='p'?'Lowest p shell: n = 2':orbitalConfig.family==='d'?'Lowest d shell: n = 3':'Spherically symmetric'}</div><div className="phase-legend"><span><i className="phase-key amber"/> + phase</span><span><i className="phase-key teal"/> − phase</span><small>Wavefunction sign · not charge</small></div></aside></>:<>
  <section className="intro"><div className="eyebrow"><span className="tiny-dot"/> THE HYBRIDISATION EXPERIENCE</div><h1><>From atomic<br/>to <em>hybrid.</em></></h1><p><>Compare. Combine. Reorient.<br/>Explore equivalent orbital shapes.</></p><div className="module-tag"><span>02</span> Atomic to hybrid orbitals</div></section>
  <aside className="hybrid-selector"><div className="selector-heading">CHOOSE A HYBRIDISATION <ArrowUpRight size={13}/></div><div className="mode-options">{Object.values(CONFIG).map(c=><button key={c.key} onClick={()=>choose(c.key)} className={`mode-button ${mode===c.key?'active':''}`} aria-pressed={mode===c.key}><div className="mode-label">{c.label}<span>{c.geometry}</span></div><GeometryGlyph type={c.key}/></button>)}</div><div className="selector-foot"><span>{config.count} equivalent orbitals</span><span>{stage===3?config.angle:'Geometry after hybridisation'}</span></div></aside>
  </>}
  <div className="scene-meta"><span className="scene-status"><span className={playing?'status-dot playing':'status-dot'}/>{guided?'GUIDED CAMERA':playing?'HYBRIDISATION IN PROGRESS':'INTERACTIVE 3D'}</span><span className="model-name">{atomic?`${orbitalConfig.label} · probability samples`:stage===3?`${config.count} equivalent ${config.label} orbitals`:`${config.input} → ${config.label}`}</span></div>
  <div className="scene-tools"><button className={atomic?undefined:"reset-view"} title={atomic?"Reset camera":"Reset View · recommended teaching angle"} aria-label={atomic?"Reset camera":"Reset View"} onClick={()=>{resetCameraControl(cameraControl.current);setReset(x=>x+1);setGuided(!atomic&&clock.current.playing)}}><Focus size={19}/>{!atomic&&<span>Reset View</span>}</button><button title="About orbitals" aria-label="About orbitals" onClick={()=>setInfo(true)}><Info size={18}/></button></div>
  <div className="drag-hint"><MousePointer2 size={12}/><span>{atomic?'Drag to rotate · Scroll / pinch to zoom':'Drag to rotate · Scroll / pinch to zoom'}</span></div>
  {atomic?<><section className="lesson-caption atomic-caption" aria-live="polite"><div className="step-number">01<span>/ 01</span></div><div><div className="caption-kicker">{orbitalConfig.nodes}</div><h2>{orbitalConfig.title}</h2><p>{orbitalConfig.description}</p></div></section><aside className="composition atomic-composition"><span className="composition-heading">NEXT · HYBRIDISATION</span><div className="atomic-equation">2s + 2p → sp<br/>2s + 2p + 2p → sp²<br/>2s + 2p + 2p + 2p → sp³</div><div className="composition-sub">Only s and p participate in this module.</div></aside><section className="zoom-guide" aria-label="Orbital zoom"><div className="zoom-stops">{[['Overview',0],['Closer',.55]].map(([label,value])=><button key={label} onClick={()=>requestZoom(value)}>{label}</button>)}</div><label className="zoom-slider"><span>Inspect density</span><input type="range" aria-label="Orbital zoom" min="0" max=".75" step=".01" value={Math.min(.75,zoomProgress)} onChange={e=>requestZoom(Number(e.target.value))}/><span>{Math.round(zoomProgress*100)}%</span></label><small>Probability samples · not individual electrons or trajectories</small></section><div className="transport-area atomic-transport"><div className="transport"><button className={`toggle-button ${labels?'is-on':''}`} aria-label="Labels" aria-pressed={labels} onClick={()=>setLabels(!labels)}><Tags size={16}/><span>Labels</span></button><button className={`toggle-button ${axes?'is-on':''}`} aria-label="Axes" aria-pressed={axes} onClick={()=>setAxes(!axes)}><MoveUpRight size={16}/><span>Axes</span></button><button className={`toggle-button ${cutaway?'is-on':''}`} aria-label="Radial cutaway" aria-pressed={cutaway} disabled={orbitalConfig.family!=='s'||orbital==='1s'} onClick={()=>setCutaway(!cutaway)}><Atom size={16}/><span>Cutaway</span></button><button className={`toggle-button ${motion?'is-on':''}`} aria-label="Probability motion" aria-pressed={motion} onClick={()=>setMotion(!motion)}>{motion?<Pause size={16}/>:<Play size={16}/>}<span>Motion</span></button><span className="control-divider"/><button className="continue-button" onClick={()=>navigate('hybrid')}>Explore hybridisation <ArrowUpRight size={16}/></button></div><div className="learning-flow"><b>Atomic Orbitals</b><span>→</span>Hybridisation<span>→</span>Hybrid orbital arrangement</div></div></>:<>
  <section className="lesson-caption" aria-live="polite"><div className="step-number">0{stage+1}<span>/ 04</span></div><div><div className="caption-kicker">THE PROCESS</div><h2>{lessonStages[stage].title}</h2><p>{lessonStages[stage].text}</p></div></section>
  <aside className="composition"><span className="composition-heading">{stage===3?'HYBRID ORBITAL ARRANGEMENT':'ORBITAL COMPOSITION'}</span><div className="orbital-equation"><>{config.input.split(' + ').map((o,i)=><React.Fragment key={i}>{i>0&&<span className="operator">+</span>}<span className={`equation-orbital ${o==='p'?'p-orbital':''}`}>{o}</span></React.Fragment>)}<span className="operator arrow">→</span><strong>{config.label}</strong></></div><div className="composition-sub">{stage===3?<><span className="tiny-dot"/>{config.count} equivalent orbitals · {config.angle}</>:<><span className="phase-key amber"/> s character {config.s}%<span className="phase-key teal"/> p character {100-config.s}%</>}</div></aside>
  <div className="transport-area"><div className="transport"><button className="play-button" onClick={play} aria-label={playing?'Pause animation':'Play animation'}>{playing?<Pause size={18} fill="currentColor"/>:<Play size={18} fill="currentColor"/>}</button><div className="play-copy"><span>{playing?'Pause hybridisation':time>=total?'Play again':'Play hybridisation'}</span><small>{String(Math.floor(time)).padStart(2,'0')} / {Math.round(total)}s</small></div><button className="icon-button" onClick={replay} title="Replay (R)" aria-label="Replay"><RotateCcw size={17}/></button><button className="icon-button" onClick={next} title="Next step (→)" aria-label="Next step"><SkipForward size={17}/></button><span className="control-divider"/><button className={`toggle-button ${sound?'is-on':''}`} onClick={toggleSound} aria-pressed={sound} aria-label={sound?'Turn sound off':'Turn sound on'}>{sound?<Volume2 size={17}/>:<VolumeX size={17}/>}<span>Sound {sound?'on':'off'}</span></button><label className="sound-volume"><span>Sound Volume</span><input type="range" aria-label="Sound Volume" min="0" max="100" step="1" value={volume} onChange={e=>{const value=Number(e.target.value);setVolume(value);audio.setVolume(value/100)}}/><output>{volume}%</output></label><button className={`toggle-button ${labels?'is-on':''}`} onClick={()=>setLabels(!labels)} aria-pressed={labels} aria-label="Labels"><Tags size={16}/><span>Labels</span></button><span className="control-divider"/><label className="speed-label"><select aria-label="Animation speed" value={speed} onChange={e=>setSpeed(Number(e.target.value))}><option value={.5}>0.5×</option><option value={1}>1×</option><option value={1.5}>1.5×</option><option value={2}>2×</option></select><ChevronDown size={12}/></label></div>
  <div className="timeline"><input type="range" aria-label="Animation timeline" min={0} max={total} step={.05} value={time} onChange={seek} style={{'--progress':`${time/total*100}%`}}/><div className="timeline-stages">{lessonStages.map((s,i)=><button key={i} className={stage===i?'current':stage>i?'complete':''} onClick={()=>{audio.stop();const t=[0,TIMING.atomicHold,TIMING.morphStart,TIMING.morphEnd][i];clock.current.time=t;clock.current.playing=false;setTime(t);setPlaying(false);setGuided(false)}}><span>{stage>i?<Check size={9}/>:i+1}</span>{s.short}</button>)}</div></div></div>
  </>}
  <footer className="footer"><span>VISUALISE. UNDERSTAND. REMEMBER.</span><span className="inspect-status">{atomic?(atomicSelected===null?'Click the probability cloud to highlight':`${orbitalConfig.label} · probability cloud highlighted`):activeLabel}</span><span>BUILT FOR CURIOSITY <span className="tiny-dot"/></span></footer>
  {info&&<div className="modal-backdrop" onClick={()=>setInfo(false)}><section className="info-dialog" role="dialog" aria-modal="true" aria-labelledby="info-title" onClick={e=>e.stopPropagation()}><button className="modal-close" aria-label="Close information" autoFocus onClick={()=>setInfo(false)}><X size={20}/></button><span className="eyebrow">A CLOSER LOOK</span><h2 id="info-title">Probability, made visible.</h2><p>Probability samples indicate where an electron may be found. Points are samples of the distribution, not separate electrons or trajectories. Amber and teal indicate opposite wavefunction phases, not electric charges.</p><p>Hybridisation is a mathematical combination of atomic wavefunctions. This continuous morph is a teaching analogy, not a literal time-resolved reaction or a quantum calculation. Orbital scales and transformation timings are illustrative.</p><div className="info-fact">{atomic?<><strong>{orbitalConfig.label} · {orbitalConfig.nodes}</strong><span>{orbitalConfig.description} Dense samples follow hydrogen-like |ψ|² with a qualitative shape envelope and faint outer tail. Radial and angular nodes remain empty; sizes are adjusted for clarity. Opposite phases are shown with amber and teal. The same z-up coordinate frame is used for the cloud and axes: dz² has vertical z lobes and an xy ring. Sample positions remain fixed; gentle shimmer is an illustrative cue. A stationary orbital has time-independent probability density. No nuclear structure is displayed.</span></>:<><strong>{config.label} · {config.geometry}</strong><span>{config.input} → {config.count} equivalent {config.label} orbitals.</span></>}</div><a href="https://chem.libretexts.org/Bookshelves/General_Chemistry/Map%3A_Chemistry_-_Atoms_First_%28OpenSTAX%29/05%3A_Advanced_Theories_of_Covalent_Bonding/5.2%3A_Hybrid_Atomic_Orbitals" target="_blank" rel="noreferrer">Explore the theory · Chemistry LibreTexts <ArrowUpRight size={14}/></a><a href="https://openstax.org/books/chemistry/pages/6-3-development-of-quantum-theory" target="_blank" rel="noreferrer">Atomic orbital theory · OpenStax <ArrowUpRight size={14}/></a><div className="keyboard-help"><span><kbd>Space</kbd> Play / pause</span><span><kbd>R</kbd> Replay</span><span><kbd>→</kbd> Next step</span></div></section></div>}
 </main>
}
createRoot(document.getElementById('root')).render(<App/>);
