import React from 'react';
export function OrbitalName({kind}){
 if(kind.endsWith('s'))return kind;
 if(kind.startsWith('p'))return <>2p<sub>{kind.slice(1)}</sub></>;
 if(kind==='dx2y2')return <>3d<sub>x<sup>2</sup>−y<sup>2</sup></sub></>;
 if(kind==='dz2')return <>3d<sub>z<sup>2</sup></sub></>;
 return <>3d<sub>{kind.slice(1)}</sub></>;
}
export function OrbitalGlyph({kind='1s'}){
 const s=kind.endsWith('s'),p=kind.startsWith('p');
 const rotation={px:0,py:135,pz:90,dxy:45,dxz:25,dyz:65,dx2y2:0}[kind]??0;
 return <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
  {s?<>{Array.from({length:parseInt(kind)||1},(_,i)=><circle key={i} cx="24" cy="24" r={15-i*5} stroke="currentColor" strokeWidth="1.5" opacity={1-i*.2}/>)}<circle cx="24" cy="24" r="2" fill="currentColor"/></>:
  <g transform={`rotate(${rotation} 24 24)`}>
   {kind==='dz2'?<><ellipse cx="24" cy="13" rx="5" ry="9" stroke="currentColor"/><ellipse cx="24" cy="35" rx="5" ry="9" stroke="currentColor"/><ellipse cx="24" cy="24" rx="14" ry="4" stroke="currentColor"/></>:
   <>{[0,...(p?[180]:[90,180,270])].map((a,i)=><ellipse key={a} cx="35" cy="24" rx="9" ry={p?6:5} transform={`rotate(${a} 24 24)`} stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity={i%2?.04:.18}/>)}<circle cx="24" cy="24" r="1.5" fill="currentColor"/></>}
   <path d="M3 24H45M24 3V45" stroke="currentColor" strokeWidth=".6" opacity=".25"/>
  </g>}
 </svg>;
}
