export class AudioEngine {
  constructor(){
    this.ctx=null; this.master=null; this.traction=null; this.rail=null; this.wind=null; this.brake=null; this.ready=false;
  }
  async start(){
    if(this.ready) return;
    const AC=window.AudioContext||window.webkitAudioContext; if(!AC) return;
    this.ctx=new AC();
    this.master=this.ctx.createGain(); this.master.gain.value=.25; this.master.connect(this.ctx.destination);
    const makeTone=(type='sine')=>{const o=this.ctx.createOscillator();const g=this.ctx.createGain();o.type=type;g.gain.value=0;o.connect(g).connect(this.master);o.start();return{o,g}};
    this.traction=makeTone('sine'); this.traction.o.frequency.value=65;
    this.rail=makeTone('triangle'); this.rail.o.frequency.value=42;
    this.brake=makeTone('sawtooth'); this.brake.o.frequency.value=95;
    const buffer=this.ctx.createBuffer(1,this.ctx.sampleRate*2,this.ctx.sampleRate); const d=buffer.getChannelData(0); for(let i=0;i<d.length;i++) d[i]=(Math.random()*2-1)*.45;
    const src=this.ctx.createBufferSource();src.buffer=buffer;src.loop=true;const filter=this.ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=900;const g=this.ctx.createGain();g.gain.value=0;src.connect(filter).connect(g).connect(this.master);src.start();this.wind={src,filter,g};
    this.ready=true;
  }
  update(speed, traction, braking, tunnel=false){
    if(!this.ready) return; const t=this.ctx.currentTime; const k=Math.min(1,speed/140);
    this.traction.o.frequency.setTargetAtTime(55+speed*2.5,t,.08);this.traction.g.gain.setTargetAtTime((traction/4)*(.035+.04*k),t,.08);
    this.rail.o.frequency.setTargetAtTime(35+speed*.9,t,.08);this.rail.g.gain.setTargetAtTime(speed>7?.012+.025*k:0,t,.08);
    this.wind.g.gain.setTargetAtTime(speed>15?.01+.055*k*k:0,t,.1);this.wind.filter.frequency.setTargetAtTime(600+speed*18,t,.1);
    this.brake.g.gain.setTargetAtTime(braking>0&&speed>3?.008+.012*braking:0,t,.08);
    this.master.gain.setTargetAtTime(tunnel?.34:.25,t,.15);
  }
  horn(){
    if(!this.ready)return; const t=this.ctx.currentTime; for(const [freq,level] of [[370,.12],[440,.1]]){const o=this.ctx.createOscillator();const g=this.ctx.createGain();o.type='sawtooth';o.frequency.value=freq;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(level,t+.04);g.gain.setValueAtTime(level,t+.55);g.gain.exponentialRampToValueAtTime(.0001,t+.9);o.connect(g).connect(this.master);o.start(t);o.stop(t+1);}
  }
  doorChime(){
    if(!this.ready)return; const t=this.ctx.currentTime; [740,590,740].forEach((f,i)=>{const o=this.ctx.createOscillator();const g=this.ctx.createGain();o.frequency.value=f;o.type='sine';const st=t+i*.18;g.gain.setValueAtTime(.0001,st);g.gain.exponentialRampToValueAtTime(.07,st+.02);g.gain.exponentialRampToValueAtTime(.0001,st+.14);o.connect(g).connect(this.master);o.start(st);o.stop(st+.16);});
  }
  vigilance(){
    if(!this.ready)return; const t=this.ctx.currentTime; const o=this.ctx.createOscillator();const g=this.ctx.createGain();o.type='square';o.frequency.value=980;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.05,t+.01);g.gain.exponentialRampToValueAtTime(.0001,t+.18);o.connect(g).connect(this.master);o.start();o.stop(t+.2);
  }
}
