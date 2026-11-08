// 効果音の合成（クリック・ウッド・ビープ・ハイハット・スネア・キック）。Web Audio のみに依存。
// 音は id（click / wood / beep / hihat / snare / kick）で指定する。表示名は知らない（画面に出す名前は使う側が持つ）。
let ac=null,nbuf=null;
export const audioNow=()=>ac.currentTime;
export function ctx(){if(!ac){ac=new (window.AudioContext||window.webkitAudioContext)();const n=ac.sampleRate;nbuf=ac.createBuffer(1,n,n);const d=nbuf.getChannelData(0);for(let i=0;i<n;i++)d[i]=Math.random()*2-1}
  if(ac.state==='suspended')ac.resume();return ac}
const env=(g,t,d,v)=>{g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.001,t+d)};
function tone(f,t,d,v,type,f2){const o=ac.createOscillator(),g=ac.createGain();o.type=type||'sine';o.frequency.setValueAtTime(f,t);if(f2)o.frequency.exponentialRampToValueAtTime(f2,t+d*.5);env(g,t,d,v);o.connect(g).connect(ac.destination);o.start(t);o.stop(t+d+.02)}
function noise(t,d,v,hp){const s=ac.createBufferSource();s.buffer=nbuf;const f=ac.createBiquadFilter();f.type='highpass';f.frequency.value=hp;const g=ac.createGain();env(g,t,d,v);s.connect(f).connect(g).connect(ac.destination);s.start(t);s.stop(t+d+.02)}
const VOICES={
  click:(t,v)=>tone(1500,t,.03,.45*v,'square'),
  wood:(t,v)=>tone(900,t,.07,.8*v,'triangle',500),
  beep:(t,v)=>tone(1000,t,.12,.4*v),
  hihat:(t,v)=>noise(t,.06,.5*v,7000),
  snare:(t,v)=>{noise(t,.18,.7*v,1500);tone(190,t,.1,.5*v)},
  kick:(t,v)=>tone(150,t,.3,v,'sine',40),
};
/** 音 id を時刻 t に音量 v（既定 1）で鳴らす。知らない id は鳴らさない */
export function snd(id,t,v){const f=VOICES[id];if(f)f(t,v||1)}
