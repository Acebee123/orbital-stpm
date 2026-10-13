import React,{useState,useRef,useEffect,useCallback} from 'react';
import {ELEMENTS,BLOCKS} from './periodic-model.mjs';
import {ConfigurationBuilder} from './ConfigurationBuilder';
import {AufbauGuide} from './AufbauGuide';
import {FillingScene} from './FillingScene';
import {validateConfiguration} from './configuration-model.mjs';
export function PeriodicTable(){
 const [selected,setSelected]=useState(null),[active,setActive]=useState(null),[drafts,setDrafts]=useState({}),[origin,setOrigin]=useState(null),[guide,setGuide]=useState(false),[view3D,setView3D]=useState(false);
 const refs=useRef(new Map()),serial=useRef(0);
 const newRow=useCallback((type='')=>({id:++serial.current,n:'',type,electrons:'',spins:null}),[]);
 const close=useCallback(()=>{setActive(null);setView3D(false);setOrigin(null);requestAnimationFrame(()=>refs.current.get(selected)?.focus());},[selected]);
 const closeGuide=useCallback(()=>setGuide(false),[]);
 const complete=active!==null&&validateConfiguration(drafts[active]??[],active).complete;
 const show3D=view3D&&complete;
 const open=(number,rect=null)=>{if(!validateConfiguration(drafts[number]??[],number).complete)setView3D(false);setSelected(number);setOrigin(rect);setDrafts(prev=>prev[number]?prev:{...prev,[number]:[newRow()]});setActive(number);};
 const editRows=rows=>{if(!validateConfiguration(rows,active).complete)setView3D(false);setDrafts(prev=>({...prev,[active]:rows}));};
 const select=(element,event)=>{setSelected(element.number);if(element.number<=20){const r=event.currentTarget.getBoundingClientRect();open(element.number,{x:r.x,y:r.y,width:r.width,height:r.height});}};
 useEffect(()=>{if(!active)return;const key=e=>{if(e.key==='Escape'&&!guide){if(view3D)setView3D(false);else close();}};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key)},[active,guide,view3D,close]);
 const move=(event,e)=>{
  const step={ArrowLeft:-1,ArrowRight:1,ArrowUp:-1,ArrowDown:1}[event.key];if(!step)return;event.preventDefault();
  const horizontal=event.key==='ArrowLeft'||event.key==='ArrowRight',next=horizontal?ELEMENTS.find(x=>x.row===e.row&&x.column===e.column+step):ELEMENTS.find(x=>x.column===e.column&&x.row===e.row+step);
  if(next){setSelected(next.number);refs.current.get(next.number)?.focus();}
 };
 return <section className={`periodic-module ${active?'configuration-active':''} ${show3D?'configuration-3d':''}`} aria-label="Periodic table">
  <button className="aufbau-launcher" onClick={()=>setGuide(true)}>Aufbau Principle</button>
  <div className="periodic-content"><div className="table-scroll" inert={active?true:undefined} tabIndex={0} role="region" aria-label="Element grid; scroll horizontally on small screens"><div className="periodic-grid">
   {Array.from({length:18},(_,i)=><span key={`g${i}`} className="group-number" style={{gridColumn:i+2,gridRow:1}}>{i+1}</span>)}
   {Array.from({length:7},(_,i)=><span key={`p${i}`} className="period-number" style={{gridColumn:1,gridRow:i+2}}>{i+1}</span>)}
   {ELEMENTS.map(e=>{const b=BLOCKS[e.block];return <button key={e.number} ref={el=>{if(el)refs.current.set(e.number,el);else refs.current.delete(e.number)}} className={`element-tile ${selected===e.number?'selected':''}`} style={{gridColumn:e.column,gridRow:e.row,'--block-color':b.color,'--block-tint':b.tint}} aria-label={`${e.name}, ${e.symbol}, atomic number ${e.number}, ${e.block}-block${e.number<=20?', build electron configuration':''}`} aria-pressed={selected===e.number} onClick={event=>select(e,event)} onKeyDown={event=>move(event,e)}><span className="atomic-number">{e.number}</span><strong>{e.symbol}</strong><span className="tile-block">{e.block}</span></button>})}
   <span className="series-label" style={{gridColumn:'1 / 4',gridRow:10}}>4f</span><span className="series-label" style={{gridColumn:'1 / 4',gridRow:11}}>5f</span>
  </div></div></div>
  {active&&!show3D&&<ConfigurationBuilder number={active} rows={drafts[active]} onRows={editRows} newRow={newRow} onElement={number=>open(number)} onClose={close} onAufbau={()=>setGuide(true)} onView3D={()=>{if(complete)setView3D(true)}} origin={origin}/>}
  {active&&show3D&&<FillingScene guideOpen={guide} key={active} number={active} onNumber={number=>open(number)} onBack={()=>setView3D(false)} onAufbau={()=>setGuide(true)}/>}
  {guide&&<AufbauGuide onClose={closeGuide}/>}
 </section>;
}
