import React,{useState,useRef} from 'react';
import {Search,ArrowUpRight,X} from 'lucide-react';
import {ELEMENTS,BLOCKS,matchesElement} from './periodic-model.mjs';
import {OrbitalGlyph} from './OrbitalGlyph';
export function PeriodicTable({onExplore}){
 const [selected,setSelected]=useState(6),[filter,setFilter]=useState('all'),[query,setQuery]=useState('');
 const refs=useRef(new Map()),element=ELEMENTS[selected-1],info=BLOCKS[element.block];
 const count=ELEMENTS.filter(e=>matchesElement(e,query,filter)).length;
 const select=e=>{setSelected(e.number)};
 const move=(event,e)=>{
  const step={ArrowLeft:-1,ArrowRight:1,ArrowUp:-1,ArrowDown:1}[event.key];
  if(!step)return;
  event.preventDefault();
  const horizontal=event.key==='ArrowLeft'||event.key==='ArrowRight';
  const next=horizontal?ELEMENTS.find(x=>x.row===e.row&&x.column===e.column+step):ELEMENTS.find(x=>x.column===e.column&&x.row===e.row+step);
  if(next){select(next);refs.current.get(next.number)?.focus();}
 };
 return <section className="periodic-module" aria-label="Periodic table">
  <div className="periodic-content">
   <header className="periodic-header"><div><span className="periodic-eyebrow">THE ELEMENTS / ORBITAL BLOCKS</span><h1>Periodic table<span>.</span></h1><p>A map of the subshells. Select an element to explore its block.</p></div>
    <div className="element-inspector" aria-live="polite" style={{'--block-color':info.color,'--block-tint':info.tint}}>
     <div className="element-identity"><span>{element.number}</span><strong>{element.symbol}</strong></div>
     <div className="element-description"><h2>{element.name} <span>{element.block}-block</span></h2><p>Period {element.period} · {element.group?`Group ${element.group}`:(element.period===6?'Lanthanide series':'Actinide series')}</p>
      <div className="subshell-capacity">{info.orbitals} {element.block} {info.orbitals===1?'orbital':'orbitals'} · subshell capacity {info.capacity} e⁻</div>
      {info.orbital?<button className="explore-orbitals" onClick={()=>onExplore(info.orbital)}>Explore {element.block} orbital shapes <ArrowUpRight size={15}/></button>:<span className="f-context">f orbital models are outside this module.</span>}
     </div>
    </div>
   </header>
   <div className="periodic-toolbar">
    <div className="block-filters" role="group" aria-label="Filter orbital blocks"><button aria-pressed={filter==='all'} onClick={()=>setFilter('all')}>All blocks</button>{Object.entries(BLOCKS).map(([block,b])=><button key={block} aria-pressed={filter===block} onClick={()=>setFilter(filter===block?'all':block)} style={{'--block-color':b.color,'--block-tint':b.tint}}><i/>{block}<span>-block</span></button>)}</div>
    <label className="element-search"><Search size={16}/><input aria-label="Search elements" placeholder="Name, symbol or number" value={query} onChange={e=>setQuery(e.target.value)}/>{query&&<button aria-label="Clear element search" onClick={()=>setQuery('')}><X size={15}/></button>}</label>
   </div>
   <div className="table-scroll" tabIndex={0} role="region" aria-label="Element grid; scroll horizontally on small screens">
    <div className="periodic-grid">
     {Array.from({length:18},(_,i)=><span key={`g${i}`} className="group-number" style={{gridColumn:i+2,gridRow:1}}>{i+1}</span>)}
     {Array.from({length:7},(_,i)=><span key={`p${i}`} className="period-number" style={{gridColumn:1,gridRow:i+2}}>{i+1}</span>)}
     <div className="block-explanation" style={{gridColumn:'4 / 12',gridRow:'2 / 4'}}><div className="block-preview"><OrbitalGlyph kind={info.orbital??'dxy'}/><span>{element.block}<small>BLOCK</small></span></div><p>{element.number===2?'Helium has 1s² electrons: an s-block element in group 18.':info.description}</p></div>
     {ELEMENTS.map(e=>{const b=BLOCKS[e.block],match=matchesElement(e,query,filter);return <button key={e.number} ref={el=>{if(el)refs.current.set(e.number,el);else refs.current.delete(e.number)}} className={`element-tile ${match?'':'dimmed'} ${selected===e.number?'selected':''}`} style={{gridColumn:e.column,gridRow:e.row,'--block-color':b.color,'--block-tint':b.tint}} aria-label={`${e.name}, ${e.symbol}, atomic number ${e.number}, ${e.block}-block`} aria-pressed={selected===e.number} onClick={()=>select(e)} onKeyDown={event=>move(event,e)} title={`${e.name} · ${e.block}-block`}><span className="atomic-number">{e.number}</span><strong>{e.symbol}</strong><span className="tile-block">{e.block}</span></button>})}
     <span className="series-label" style={{gridColumn:'1 / 4',gridRow:10}}>Period 6 <small>4f series</small></span><span className="series-label" style={{gridColumn:'1 / 4',gridRow:11}}>Period 7 <small>5f series</small></span>
     <div className="series-link" style={{gridColumn:'4 / 12',gridRow:9}}>↳ f-block rows continue periods 6 and 7</div>
    </div>
   </div>
   <footer className="periodic-notes"><span role="status">{count===118?'118 elements':`${count} matching ${count===1?'element':'elements'}`}{count===0?' · Try another name, symbol or number.':''}</span><p>Colours identify blocks, not orbital phases. La/Ac occupy group 3 in this layout; Lu/Lr layouts also exist. <a href="https://periodic-table.rsc.org/" target="_blank" rel="noreferrer">RSC reference ↗</a></p></footer>
  </div>
 </section>;
}
