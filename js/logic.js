// メトロノームの設定と入力検証・テンポの段階上げの計算（画面・保存なし）。
export const SIGS = ['2/4', '3/4', '4/4', '5/4', '6/8', '7/8', '9/8', '12/8'];
export const BPM_MIN = 20, BPM_MAX = 300;
const pattern = s => [...s].map(Number);
export const DEFAULTS = { bpm: 120, sig: '4/4', beats: [1,0,0,0,0,0,0,0,0,0,0,0], drum: false, click: true, vc: 1, vd: 1,
  mute: { on: false, n: 4, m: 2 },
  // テンポの段階上げ: n 小節ごとに m BPM 上げ、max で止める
  ramp: { on: false, n: 4, m: 5, max: 200 },
  pat: { HH: pattern('1010101010101010'), SD: pattern('0000100000001000'), BD: pattern('1000001010100000') } };

const number = (v, min, max, integer = false) => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max && (!integer || Number.isInteger(v));
const GROUPS = {
  mute: { on: v => typeof v === 'boolean', n: v => number(v,1,64,true), m: v => number(v,1,64,true) },
  ramp: { on: v => typeof v === 'boolean', n: v => number(v,1,64,true), m: v => number(v,1,50,true), max: v => number(v,BPM_MIN,BPM_MAX,true) },
  pat: Object.fromEntries(['HH','SD','BD'].map(k => [k, v => Array.isArray(v) && v.length === 16 && v.every(x => x === 0 || x === 1)])),
};
const RULES = { bpm: v => number(v,BPM_MIN,BPM_MAX,true), sig: v => SIGS.includes(v), beats: v => Array.isArray(v) && v.length === 12 && v.every(x => number(x,0,6,true)),
  drum: v => typeof v === 'boolean', click: v => typeof v === 'boolean', vc: v => number(v,0,1), vd: v => number(v,0,1) };

/** 既定値に raw を重ね、patch の項目を検証して反映した設定を返す（範囲外は例外） */
export function normalize(raw = {}, patch = raw) {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) throw new Error('メトロノームの設定はオブジェクトにしてください。');
  const out = { ...structuredClone(DEFAULTS), ...structuredClone(raw || {}) };
  for (const g of Object.keys(GROUPS)) out[g] = { ...structuredClone(DEFAULTS[g]), ...out[g] };
  for (const [k, check] of Object.entries(RULES)) if (Object.hasOwn(patch,k)) {
    if (!check(patch[k])) throw new Error(`メトロノームの ${k} が入力範囲外です。`);
    out[k] = structuredClone(patch[k]);
  }
  for (const [group, checks] of Object.entries(GROUPS)) {
    if (!Object.hasOwn(patch,group)) continue;
    if (!patch[group] || typeof patch[group] !== 'object' || Array.isArray(patch[group])) throw new Error(`${group} は設定のオブジェクトにしてください。`);
    for (const [k, check] of Object.entries(checks)) if (Object.hasOwn(patch[group],k)) {
      if (!check(patch[group][k])) throw new Error(`メトロノームの ${group}.${k} が入力範囲外です。`);
      out[group][k] = structuredClone(patch[group][k]);
    }
  }
  return out;
}

/** 保存値を読む。壊れていたら既定値に戻す（保存値の一部だけが壊れていても全体を既定にする） */
export function load(raw) {
  try { return normalize(DEFAULTS, raw && typeof raw === 'object' ? raw : {}); } catch { return structuredClone(DEFAULTS); }
}

/**
 * 段階上げのときの、bar 小節目（0 始まり）のテンポ。
 * 開始テンポ start から n 小節ごとに m 上げ、上限 max（start より低ければ start）で止める。
 */
export function rampBpm(start, bar, ramp) {
  if (!ramp?.on) return start;
  const top = Math.max(start, Math.min(BPM_MAX, ramp.max));
  return Math.min(top, start + Math.floor(Math.max(0, bar) / ramp.n) * ramp.m);
}

/** 次にテンポが上がるまでの小節数（上限に着いていれば 0） */
export function barsToNextStep(start, bar, ramp) {
  if (!ramp?.on || rampBpm(start, bar, ramp) >= Math.max(start, Math.min(BPM_MAX, ramp.max))) return 0;
  return ramp.n - (Math.max(0, bar) % ramp.n);
}
