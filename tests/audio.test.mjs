import test from 'node:test';
import assert from 'node:assert/strict';
import {BondAudio,SOUND_MIX} from '../src/audio.js';
function context(){
 const nodes=[],sources=[];
 const param=()=>({value:0,events:[],setValueAtTime(value,time){this.value=value;this.events.push(['set',value,time]);},exponentialRampToValueAtTime(value,time){this.events.push(['ramp',value,time]);},cancelScheduledValues(time){this.events.push(['cancel',time]);},setTargetAtTime(value,time,rate){this.value=value;this.events.push(['target',value,time,rate]);}});
 const node=kind=>{const n={kind,outputs:[],connect(to){this.outputs.push(to);},disconnect(){this.disconnected=true;}};nodes.push(n);return n;};
 const source=kind=>{const n=node(kind);n.frequency=param();n.start=time=>{n.started=time;};n.stop=time=>{n.stopped=time;};sources.push(n);return n;};
 return {nodes,sources,currentTime:10,sampleRate:1000,state:'suspended',destination:node('destination'),async resume(){this.state='running';},createGain(){return Object.assign(node('gain'),{gain:param()});},createDynamicsCompressor(){const n=node('compressor');for(const key of ['threshold','knee','ratio','attack','release'])n[key]=param();return n;},createBiquadFilter(){return Object.assign(node('filter'),{Q:param(),frequency:param()});},createOscillator(){return source('oscillator');},createBufferSource(){return source('buffer');},createBuffer(channels,length){const data=new Float32Array(length);return {getChannelData:()=>data};}};
}
test('native effect gains route through one reusable master and compressor',async()=>{
 const c=context(),audio=new BondAudio(()=>c);await audio.unlock();const count=c.nodes.length;await audio.unlock();assert.equal(c.nodes.length,count);
 for(const type of ['whoosh','impact','energy'])assert.deepEqual(audio.effects[type].outputs,[audio.master]);
 assert.deepEqual(audio.master.outputs,[audio.compressor]);assert.deepEqual(audio.compressor.outputs,[c.destination]);
 assert.equal(audio.compressor.threshold.value,-10);assert.equal(audio.compressor.ratio.value,4);assert.equal(c.state,'running');
});
test('volume clamps, works before unlock, ramps without clicks, and mute suppresses voices',async()=>{
 const c=context(),audio=new BondAudio(()=>c);audio.setVolume(2);assert.equal(audio.volume,1);await audio.unlock();audio.enabled=true;
 audio.setVolume(.3);assert.ok(Math.abs(audio.master.gain.value-.45)<1e-12);assert.deepEqual(audio.master.gain.events.at(-1),['target',SOUND_MIX.master*.3,10,.015]);
 audio.setVolume(-1);audio.sound('impact');assert.equal(c.sources.length,0);audio.setVolume(NaN);assert.equal(audio.volume,0);
 audio.setVolume(.8);audio.enabled=false;audio.sound('impact');assert.equal(c.sources.length,0);
});
test('existing sources, frequency sweeps and contact timing remain, while whoosh builds',async()=>{
 const c=context(),audio=new BondAudio(()=>c);await audio.unlock();audio.enabled=true;
 audio.sound('impact');audio.sound('energy',2);audio.sound('whoosh',2);
 assert.equal(c.sources[0].type,'sine');assert.deepEqual(c.sources[0].frequency.events,[['set',620,10],['ramp',160,10.14]]);
 assert.deepEqual(c.sources[1].frequency.events,[['set',290,10],['ramp',440,10.475]]);
 const filter=c.nodes.find(n=>n.kind==='filter');assert.equal(filter.type,'bandpass');assert.equal(filter.Q.value,.65);
 const envelope=filter.outputs[0];assert.equal(envelope.outputs[0],audio.effects.whoosh);
 assert.deepEqual(envelope.gain.events.slice(1,3),[['ramp',.025,10.06],['ramp',.065,10+1.1*.68]]);
 assert.equal(c.sources[2].started,10);assert.ok(c.sources[2].buffer.getChannelData(0).every(x=>x>=-1&&x<=1));
 c.sources.forEach(s=>s.onended());assert.equal(audio.voices.size,0);assert.equal(filter.disconnected,true);
});
test('collision dominates the unchanged source envelopes, with conservative gain headroom',()=>{
 const collision=.13*SOUND_MIX.impact*SOUND_MIX.master,bond=.065*SOUND_MIX.energy*SOUND_MIX.master,whoosh=.065*SOUND_MIX.whoosh*SOUND_MIX.master;
 assert.ok(collision>bond&&bond>whoosh);assert.ok(collision/.13>=4);
 assert.ok(collision+bond+whoosh<1); // Compressor additionally controls filter/overlap peaks.
});
