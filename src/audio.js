class BondAudio {
  enabled=false; context=null; voices=new Set();
  async unlock(){if(!this.context)this.context=new (window.AudioContext||window.webkitAudioContext)();if(this.context.state==='suspended')await this.context.resume()}
  stop(){for(const v of this.voices){try{v.stop()}catch{}}this.voices.clear()}
  sound(type,speed=1){
    if(!this.enabled||!this.context||this.context.state!=='running')return;
    const c=this.context, now=c.currentTime, length=(type==='whoosh'?2.2:type==='impact'?.14:.95)/(type==='impact'?1:speed);
    const gain=c.createGain();gain.connect(c.destination);gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(type==='impact'?.13:.065,now+.025);gain.gain.exponentialRampToValueAtTime(.0001,now+length);
    let src;
    if(type==='whoosh'){
      const buffer=c.createBuffer(1,c.sampleRate*length,c.sampleRate), data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
      src=c.createBufferSource();src.buffer=buffer;const filter=c.createBiquadFilter();filter.type='bandpass';filter.Q.value=.65;filter.frequency.setValueAtTime(250,now);filter.frequency.exponentialRampToValueAtTime(1700,now+length*.7);src.connect(filter);filter.connect(gain);
    }else{src=c.createOscillator();src.type='sine';src.frequency.setValueAtTime(type==='impact'?620:290,now);src.frequency.exponentialRampToValueAtTime(type==='impact'?160:440,now+length);src.connect(gain)}
    this.voices.add(src);src.onended=()=>{this.voices.delete(src);gain.disconnect()};src.start(now);src.stop(now+length+.02);
  }
}
export const audio=new BondAudio();
