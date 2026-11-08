// 組み立て: 端末内の保存（localStorage のみ。同期なし）・音・画面をつなぐ
import * as logic from './logic.js';
import * as synth from './synth.js';
import * as metronome from './metronome.js';

const KEY = 'metro';
function createSettings() {
  const read = () => { try { return logic.load(JSON.parse(localStorage.getItem(KEY) || 'null')); } catch { return logic.load(null); } };
  let cur = read();
  return {
    get: () => structuredClone(cur),
    save: (v) => { cur = logic.load(v); try { localStorage.setItem(KEY, JSON.stringify(cur)); } catch {} },
    // 別のタブ・ウィンドウで変えたときに読み直す
    onChange: (fn) => addEventListener('storage', (e) => { if (e.key === KEY) { cur = read(); fn(); } }),
  };
}

metronome.init({ settings: createSettings(), audio: synth, logic });

// 設定シートの開け閉め
document.addEventListener('click', (e) => {
  const op = e.target.closest('[data-sheet]'); if (op) { document.querySelector(op.dataset.sheet).classList.add('open'); return; }
  if (e.target.closest('[data-close]') || e.target.classList.contains('ov')) e.target.closest('.ov')?.classList.remove('open');
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') document.querySelector('.ov.open')?.classList.remove('open'); });

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
