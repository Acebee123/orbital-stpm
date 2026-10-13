import React,{useEffect,useRef} from 'react';
import {X} from 'lucide-react';
import {FILL_ORDER} from './configuration-model.mjs';
export function AufbauGuide({onClose}){
 const close=useRef();
 useEffect(()=>{const previous=document.activeElement;close.current?.focus();const key=e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();onClose();}if(e.key==='Tab'){e.preventDefault();close.current?.focus();}};document.addEventListener('keydown',key);return()=>{document.removeEventListener('keydown',key);previous?.focus();};},[onClose]);
 const cells=[];for(let n=1;n<=4;n++)for(let l=0;l<n;l++)cells.push({n,l,x:64+l*73,y:35+(n-1)*48,label:`${n}${'spdf'[l]}`});
 return <div className="aufbau-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><section className="aufbau-dialog" role="dialog" aria-modal="true" aria-labelledby="aufbau-title">
  <button ref={close} className="dialog-close" aria-label="Close Aufbau guide" onClick={onClose}><X size={18}/></button><span className="configuration-kicker">FILLING ORDER</span><h2 id="aufbau-title">Aufbau principle</h2>
  <p>Fill lower-energy subshells first. Read each diagonal from upper-right to lower-left.</p>
  <svg className="aufbau-diagram" viewBox="0 0 360 220" role="img" aria-label="Diagonal filling order: 1s, 2s, 2p, 3s, 3p, 4s before 3d"><defs><marker id="aufbau-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0 0L6 3L0 6" fill="#a37838"/></marker></defs>
   {Array.from({length:7},(_,sum)=>{const diagonal=cells.filter(c=>c.n-1+c.l===sum).sort((a,b)=>a.n-b.n);if(!diagonal.length)return null;const a=diagonal[0],b=diagonal.at(-1);return <path key={sum} d={`M${a.x+23} ${a.y-15} L${b.x-24} ${b.y+16}`} stroke="#a37838" strokeWidth="1.3" opacity=".65" markerEnd="url(#aufbau-arrow)"/>;})}
   {cells.map(c=><g key={c.label}><rect x={c.x-18} y={c.y-12} width="36" height="24" rx="6" fill={c.label==='4s'?'#f5e2ba':'#eef4ef'}/><text x={c.x} y={c.y+5} textAnchor="middle" fill={c.label==='4s'?'#926319':'#355b4e'} fontSize="14">{c.label}</text></g>)}
  </svg>
  <div className="aufbau-capacities"><span>s<sup>2</sup><small>1 orbital</small></span><span>p<sup>6</sup><small>3 orbitals</small></span><span>d<sup>10</sup><small>5 orbitals</small></span></div>
  <div className="aufbau-sequence">{FILL_ORDER.slice(0,7).map((key,i)=><React.Fragment key={key}>{i>0&&<i>→</i>}<b className={key==='4s'?'emphasized':''}>{key}</b></React.Fragment>)}</div>
  <p><strong>Why 4s before 3d?</strong> For neutral K and Ca, the penetrating 4s orbital is lower in energy than the vacant 3d orbitals. In the diagonal rule, 4s has n + ℓ = 4; 3d has n + ℓ = 5. Energy ordering changes in many transition-metal atoms and ions.</p>
  <div className="aufbau-laws"><p><strong>Pauli</strong> · At most two electrons per orbital, with opposite spins.</p><p><strong>Hund</strong> · Occupy equal-energy orbitals singly with parallel spins before pairing.</p></div>
 </section></div>;
}
