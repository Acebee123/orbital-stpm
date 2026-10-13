export const SOUND_MIX=Object.freeze({master:1.5,whoosh:2.1,impact:2.8,energy:2.3});
export class BondAudio {
  enabled=false; context=null; voices=new Set(); volume=.85; effects={}; master=null; compressor=null;
  constructor(contextFactory=()=>new (window.AudioContext||window.webkitAudioContext)()){this.contextFactory=contextFactory;}
  async unlock(){
    if(!this.context){
      const c=this.context=this.contextFactory();
      this.master=c.createGain();this.master.gain.setValueAtTime(SOUND_MIX.master*this.volume,c.currentTime);
      this.compressor=c.createDynamicsCompressor();
      for(const [key,value] of Object.entries({threshold:-10,knee:6,ratio:4,attack:.003,release:.12}))this.compressor[key].setValueAtTime(value,c.currentTime);
      this.master.connect(this.compressor);this.compressor.connect(c.destination);
      for(const type of ['whoosh','impact','energy']){const node=c.createGain();node.gain.setValueAtTime(SOUND_MIX[type],c.currentTime);node.connect(this.master);this.effects[type]=node;}
    }
    if(this.context.state==='suspended')await this.context.resume();
  }
  setVolume(value){
    if(!Number.isFinite(value))return;
    this.volume=Math.max(0,Math.min(1,value));
    if(this.master){const p=this.master.gain,now=this.context.currentTime;p.cancelScheduledValues(now);p.setTargetAtTime(SOUND_MIX.master*this.volume,now,.015);}
  }
  stop(){for(const v of this.voices){try{v.stop()}catch{}}this.voices.clear();}
  sound(type,speed=1){
    if(!this.enabled||!this.context||this.context.state!=='running'||!this.effects[type]||this.volume===0)return;
    const c=this.context,now=c.currentTime,length=(type==='whoosh'?2.2:type==='impact'?.14:.95)/(type==='impact'?1:speed);
    const gain=c.createGain();gain.connect(this.effects[type]);gain.gain.setValueAtTime(.0001,now);
    if(type==='whoosh'){
      gain.gain.exponentialRampToValueAtTime(.025,now+.06);
      gain.gain.exponentialRampToValueAtTime(.065,now+length*.68);
    }else gain.gain.exponentialRampToValueAtTime(type==='impact'?.13:.065,now+.025);
    gain.gain.exponentialRampToValueAtTime(.0001,now+length);
    let src,filter;
    if(type==='whoosh'){
      const buffer=c.createBuffer(1,c.sampleRate*length,c.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
      src=c.createBufferSource();src.buffer=buffer;filter=c.createBiquadFilter();filter.type='bandpass';filter.Q.value=.65;filter.frequency.setValueAtTime(250,now);filter.frequency.exponentialRampToValueAtTime(1700,now+length*.7);src.connect(filter);filter.connect(gain);
    }else{src=c.createOscillator();src.type='sine';src.frequency.setValueAtTime(type==='impact'?620:290,now);src.frequency.exponentialRampToValueAtTime(type==='impact'?160:440,now+length);src.connect(gain);}
    this.voices.add(src);src.onended=()=>{this.voices.delete(src);src.disconnect();filter?.disconnect();gain.disconnect();};src.start(now);src.stop(now+length+.02);
  }
}
export const audio=new BondAudio();
