// メトロノームの画面（拍ごとの音・クリック/ドラムの独立・3x16 ドラムグリッド・無音小節・テンポの段階上げ）
// 音は渡された audio（synth.js の ctx / snd / audioNow）で鳴らす。設定の保存は渡された settings（get / save / onChange）が行う。
import { $, $$, setSwitch } from './dom.js';
import { SOUNDS, PS, PRESETS, GR, DRUM } from './metronome-data.js';

export function init({ settings, audio, logic }) {
const { ctx, snd, audioNow } = audio;
const { SIGS, BPM_MIN, BPM_MAX, rampBpm, barsToNextStep } = logic;
let M = settings.get();
const saveM = () => settings.save(M);
const nB = () => parseInt(M.sig);
const sound = i => SOUNDS[i] || { label: '', id: null };
const clamp = (v, lo, hi, d) => Math.max(lo, Math.min(hi, Math.round(+v) || d));
$('#sig').innerHTML = SIGS.map(s => `<option>${s}</option>`).join('');

let playing = false, tid = 0, nextT = 0, stp = 0, q = [];
function gridDrum(gi, t) { const v = M.vd; if (M.pat.BD[gi]) snd(DRUM.BD, t, .9 * v); if (M.pat.SD[gi]) snd(DRUM.SD, t, .6 * v); if (M.pat.HH[gi]) snd(DRUM.HH, t, (gi % 4 ? .35 : .6) * v); }

// 16 分音符ごとに先読みして予約する。テンポは小節の頭で段階上げの値に切り替わる（小節の途中では変えない）
function sched() {
  const n = nB();
  while (nextT < audioNow() + .12) {
    const beat = Math.floor(stp / 4) % n, sub = stp % 4, bar = Math.floor(stp / (4 * n)), gi = (stp % (4 * n)) % 16;
    const mu = M.mute, cyc = mu.on ? mu.n + mu.m : 0, pos = cyc ? bar % cyc : 0, aud = !cyc || pos < mu.n;
    const bpm = rampBpm(M.bpm, bar, M.ramp);
    if (aud) { if (M.click && !sub) { const s = sound(M.beats[beat]).id; if (s) snd(s, nextT, (beat ? .75 : 1) * M.vc); } if (M.drum) gridDrum(gi, nextT); }
    q.push({ t: nextT, beat, sub, aud, pos, gi, bpm, next: barsToNextStep(M.bpm, bar, M.ramp) });
    nextT += 60 / bpm / 4; stp++;
  }
  tid = setTimeout(sched, 25);
}
function frame() {
  if (!playing) return;
  while (q.length && q[0].t <= audioNow()) {
    const x = q.shift(); gridCur(x.gi, x.aud); if (x.sub) continue;
    $$('.beat').forEach((e, i) => e.classList.toggle('cur', i === x.beat && x.aud));
    const bb = $('#bigbeat'); bb.textContent = x.beat + 1; bb.style.opacity = x.aud ? 1 : .2;
    const st = $('#mstat'), mu = M.mute;
    if (mu.on) { st.textContent = x.aud ? `♪ 鳴っている区間　${x.pos + 1} / ${mu.n} 小節目` : `— 無音区間　${x.pos - mu.n + 1} / ${mu.m} 小節目`; st.className = x.aud ? 'on' : 'off'; }
    if (M.ramp.on) $('#rstat').textContent = `いま ${x.bpm} BPM　` + (x.next ? `あと ${x.next} 小節で +${M.ramp.m}` : '上限に到達');
  }
  requestAnimationFrame(frame);
}

function renderBeats() { const n = nB(); $('#beats').innerHTML = Array.from({ length: n }, (_, i) => `<button class="beat${sound(M.beats[i]).id ? '' : ' ms'}" data-i="${i}" title="押すと音が変わります"><b class="num">${i + 1}</b>${sound(M.beats[i]).label}</button>`).join(''); }
$('#beats').onclick = e => { const b = e.target.closest('.beat'); if (!b) return; const i = +b.dataset.i; M.beats[i] = (M.beats[i] + 1) % SOUNDS.length; saveM(); renderBeats();
  const s = sound(M.beats[i]).id; if (s) { ctx(); snd(s, audioNow() + .02); } };

const setBpm = v => { M.bpm = clamp(v, BPM_MIN, BPM_MAX, 120); $('#bpm').value = M.bpm; $('#bpmR').value = M.bpm; saveM(); };
$('#bpm').onchange = e => setBpm(e.target.value); $('#bpmR').oninput = e => setBpm(e.target.value);
let taps = []; $('#tap').onclick = () => { const t = performance.now(); if (taps.length && t - taps[taps.length - 1] > 2000) taps = []; taps = taps.concat(t).slice(-8); if (taps.length > 1) setBpm(60000 / ((taps[taps.length - 1] - taps[0]) / (taps.length - 1))); };
$('#sig').onchange = e => { M.sig = e.target.value; stp = 0; q = []; saveM(); renderBeats(); paintGrid(); };

$('#drumBtn').onclick = () => { M.drum = !M.drum; setSwitch($('#drumBtn'), M.drum, 'ドラム'); saveM(); };
$('#clickBtn').onclick = () => { M.click = !M.click; setSwitch($('#clickBtn'), M.click, 'クリック'); $('#beats').classList.toggle('off', !M.click); saveM(); };
$('#vC').oninput = e => { M.vc = e.target.value / 100; saveM(); }; $('#vD').oninput = e => { M.vd = e.target.value / 100; saveM(); };
$('#muteBtn').onclick = () => { M.mute.on = !M.mute.on; setSwitch($('#muteBtn'), M.mute.on, '無音小節'); if (!M.mute.on) $('#mstat').textContent = ''; saveM(); };
$('#mn').onchange = e => { M.mute.n = clamp(e.target.value, 1, 64, 4); e.target.value = M.mute.n; saveM(); };
$('#mm').onchange = e => { M.mute.m = clamp(e.target.value, 1, 64, 2); e.target.value = M.mute.m; saveM(); };

// テンポの段階上げ（n 小節ごとに m BPM 上げ、上限で止める。止めると開始テンポに戻る）
function paintRamp() {
  setSwitch($('#rampBtn'), M.ramp.on, 'テンポ上げ');
  $('#rn').value = M.ramp.n; $('#rm').value = M.ramp.m; $('#rmax').value = M.ramp.max;
  $('#rampBox').classList.toggle('off', !M.ramp.on);
  if (!M.ramp.on || !playing) $('#rstat').textContent = M.ramp.on ? `${M.bpm} → ${Math.max(M.bpm, M.ramp.max)} BPM（${M.ramp.n} 小節ごとに +${M.ramp.m}）` : '';
}
$('#rampBtn').onclick = () => { M.ramp.on = !M.ramp.on; saveM(); paintRamp(); };
$('#rn').onchange = e => { M.ramp.n = clamp(e.target.value, 1, 64, 4); saveM(); paintRamp(); };
$('#rm').onchange = e => { M.ramp.m = clamp(e.target.value, 1, 50, 5); saveM(); paintRamp(); };
$('#rmax').onchange = e => { M.ramp.max = clamp(e.target.value, BPM_MIN, BPM_MAX, 200); saveM(); paintRamp(); };
$('#bpm').addEventListener('change', paintRamp); $('#bpmR').addEventListener('input', paintRamp); $('#tap').addEventListener('click', paintRamp);

function stop() {
  playing = false; clearTimeout(tid); q = []; $$('.beat.cur').forEach(e => e.classList.remove('cur')); gridCur(-1);
  $('#bigbeat').style.opacity = 1; $('#play').classList.remove('on'); $('#play').textContent = '▶ 開始'; paintRamp();
}
$('#play').onclick = () => {
  if (playing) return stop();
  ctx(); playing = true; stp = 0; nextT = audioNow() + .06; sched(); requestAnimationFrame(frame);
  $('#play').classList.add('on'); $('#play').textContent = '■ 停止';
};
document.addEventListener('keydown', e => { if (e.code === 'Space' && !$('.ov.open') && !/INPUT|TEXTAREA|SELECT|BUTTON/.test(e.target.tagName)) { e.preventDefault(); $('#play').click(); } });

$('#preset').innerHTML = '<option value="">— プリセット —</option>' + Object.keys(PRESETS).map(k => `<option>${k}</option>`).join('');
function buildGrid() { let h = '<div></div>' + Array.from({ length: 16 }, (_, i) => `<div class="gb">${i % 4 == 0 ? i / 4 + 1 : ''}</div>`).join('');
  GR.forEach(r => { h += `<div class="lab">${r}</div>`; for (let i = 0; i < 16; i++) h += `<div class="c ${i % 8 < 4 ? 'g4' : ''}" data-r="${r}" data-i="${i}"></div>`; }); $('#grid').innerHTML = h; paintGrid(); }
function paintGrid() { const lim = Math.min(16, nB() * 4); $$('#grid .c').forEach(c => { const i = +c.dataset.i; c.classList.toggle('on', !!M.pat[c.dataset.r][i]); c.classList.toggle('x', i >= lim); }); }
function gridCur(gi, aud) { $$('#grid .c').forEach(c => c.classList.toggle('cur', +c.dataset.i === gi && aud !== false)); }
$('#grid').onclick = e => { const c = e.target.closest('.c'); if (!c) return; M.pat[c.dataset.r][+c.dataset.i] ^= 1; $('#preset').value = ''; paintGrid(); saveM(); };
$('#preset').onchange = e => { const p = PRESETS[e.target.value]; if (!p) return; GR.forEach((r, k) => M.pat[r] = PS(p[k])); paintGrid(); saveM(); };
$('#pClear').onclick = () => { GR.forEach(r => M.pat[r] = Array(16).fill(0)); $('#preset').value = ''; paintGrid(); saveM(); };
buildGrid();

function refresh() {
  setBpm(M.bpm); $('#sig').value = M.sig; $('#mn').value = M.mute.n; $('#mm').value = M.mute.m;
  setSwitch($('#drumBtn'), M.drum, 'ドラム'); setSwitch($('#clickBtn'), M.click, 'クリック'); setSwitch($('#muteBtn'), M.mute.on, '無音小節');
  renderBeats(); paintGrid(); paintRamp(); $('#beats').classList.toggle('off', !M.click); $('#vC').value = M.vc * 100; $('#vD').value = M.vd * 100;
}
refresh();
settings.onChange(() => { M = settings.get(); refresh(); });
}
