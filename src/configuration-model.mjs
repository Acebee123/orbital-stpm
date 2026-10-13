import {ELEMENTS} from './periodic-model.mjs';
export const CAPACITY=Object.freeze({s:2,p:6,d:10});
export const ORBITAL_COUNT=Object.freeze({s:1,p:3,d:5});
export const FILL_ORDER=Object.freeze(['1s','2s','2p','3s','3p','4s','3d','4p','5s','4d','5p','6s','4f','5d','6p','7s']);
export const FILL_SECONDS=1.4;
export function groundConfiguration(number){
 if(!Number.isInteger(number)||number<1||number>20)throw new RangeError('This exercise covers neutral elements 1–20.');
 let remaining=number;
 return FILL_ORDER.slice(0,6).flatMap(key=>{if(!remaining)return [];const n=Number(key[0]),type=key[1],electrons=Math.min(remaining,CAPACITY[type]);remaining-=electrons;return [{n,type,electrons,key}];});
}
export const CONFIGURATION_ELEMENTS=Object.freeze(ELEMENTS.slice(0,20).map(e=>Object.freeze({...e,electronCount:e.number,configuration:Object.freeze(groundConfiguration(e.number).map(Object.freeze))})));
export const configurationText=rows=>rows.map(r=>`${r.n}${r.type}${r.electrons}`).join(' ');
export function spinBoxes(type,electrons){
 const count=ORBITAL_COUNT[type]??0,boxes=Array.from({length:count},()=>[]);
 for(let i=0;i<Math.min(Number(electrons)||0,count*2);i++)boxes[i%count].push(i<count?'up':'down');
 return boxes;
}
export function validateSpins(type,electrons,boxes){
 if(!Array.isArray(boxes)||boxes.length!==ORBITAL_COUNT[type])return 'Choose a valid orbital arrangement.';
 if(boxes.some(b=>!Array.isArray(b)||b.length>2||b.some(s=>!['up','down'].includes(s))||b.length===2&&b[0]===b[1]))return 'Pauli: at most two electrons per orbital, with opposite spins.';
 if(boxes.reduce((sum,b)=>sum+b.length,0)!==electrons)return 'The spin boxes must contain the selected electron number.';
 if(electrons<=boxes.length&&boxes.some(b=>b.length>1)||electrons>boxes.length&&boxes.some(b=>b.length===0))return 'Hund: occupy equal-energy orbitals singly before pairing.';
 const singles=boxes.filter(b=>b.length===1).map(b=>b[0]);
 if(new Set(singles).size>1)return 'Hund: singly occupied equal-energy orbitals have parallel spins.';
 return '';
}
export function validateEntry(row,index,number){
 const missing=row.n===''||row.n==null||!row.type||row.electrons===''||row.electrons==null;
 if(missing)return {state:'neutral',message:'Choose an energy level, subshell and electron number.'};
 const n=Number(row.n),electrons=Number(row.electrons),type=row.type;
 if(!Number.isInteger(n)||n<1||n>4||!CAPACITY[type])return {state:'incorrect',message:'Use n = 1–4 and an s, p or d subshell.'};
 if(n<({s:1,p:2,d:3}[type]))return {state:'incorrect',message:`${n}${type} is not an allowed subshell.`};
 if(!Number.isInteger(electrons)||electrons<1||electrons>CAPACITY[type])return {state:'incorrect',message:`${type} holds at most ${CAPACITY[type]} electrons (${ORBITAL_COUNT[type]} orbitals, two each).`};
 const spinError=validateSpins(type,electrons,row.spins??spinBoxes(type,electrons));
 if(spinError)return {state:'incorrect',message:spinError};
 const expected=groundConfiguration(number)[index];
 if(!expected)return {state:'incorrect',message:'This entry adds an extra subshell to this neutral atom.'};
 if(expected.n!==n||expected.type!==type)return {state:'incorrect',message:'Check the Aufbau filling order. For H–Ca, 4s fills before 3d.'};
 if(expected.electrons!==electrons)return {state:'incorrect',message:'Check the electron number in this subshell for the selected neutral atom.'};
 return {state:'correct',message:'Correct subshell, electron number and spin arrangement.'};
}
export function validateConfiguration(rows,number){
 const entries=rows.map((r,i)=>validateEntry(r,i,number)),expected=groundConfiguration(number);
 return {entries,complete:rows.length===expected.length&&entries.every(e=>e.state==='correct'),electrons:rows.reduce((s,r)=>s+(Number(r.electrons)||0),0),correct:entries.filter(e=>e.state==='correct').length};
}
export function moveEntry(rows,from,to){
 if(from<0||from>=rows.length||to<0||to>=rows.length)return rows;
 const next=[...rows],item=next.splice(from,1)[0];next.splice(to,0,item);return next;
}
const clamp=x=>Math.max(0,Math.min(1,x));
export function fillingState(number,time){
 const config=groundConfiguration(number),duration=number*FILL_SECONDS,t=Math.max(0,Math.min(duration,time)),done=t>=duration?number:Math.min(number,Math.floor(t/FILL_SECONDS));
 const raw=done===number?0:clamp((t/FILL_SECONDS-done-.10)/.75),fraction=raw*raw*(3-2*raw),nextElectron=Math.min(number,done+1);
 let prefix=0,index=config.findIndex(r=>{if(prefix+r.electrons>=nextElectron)return true;prefix+=r.electrons;return false;});
 const current=config[index],inSubshell=Math.min(current.electrons,done-prefix+fraction),count=ORBITAL_COUNT[current.type],axis=(Math.max(1,Math.ceil(inSubshell))-1)%count;
 const occupations=Array.from({length:count},()=>0),whole=Math.floor(inSubshell);
 for(let i=0;i<whole;i++)occupations[i%count]++;
 if(whole<current.electrons)occupations[whole%count]+=inSubshell-whole;
 return {duration,time:t,done,fraction,complete:done===number,electronsPlaced:done+fraction,current,subshellIndex:index,inSubshell,axis,occupations,orbitalPopulation:occupations[axis],orbitalKey:`${current.n}${current.type}${current.type==='p'?['x','y','z'][axis]:''}`};
}

