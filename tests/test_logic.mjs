// 設定の検証とテンポの段階上げの計算のテスト（node tests/test_logic.mjs）
import assert from 'node:assert/strict';
import { DEFAULTS, normalize, load, rampBpm, barsToNextStep } from '../js/logic.js';

const R = { on: true, n: 4, m: 5, max: 140 };
// 4 小節ごとに +5、上限 140
assert.equal(rampBpm(120, 0, R), 120);
assert.equal(rampBpm(120, 3, R), 120);
assert.equal(rampBpm(120, 4, R), 125);
assert.equal(rampBpm(120, 15, R), 135);
assert.equal(rampBpm(120, 16, R), 140);
assert.equal(rampBpm(120, 400, R), 140);
// 上限が開始より低いときは開始のまま
assert.equal(rampBpm(160, 40, R), 160);
// オフなら変えない
assert.equal(rampBpm(120, 40, { ...R, on: false }), 120);
// 1 小節ごと
assert.equal(rampBpm(100, 3, { on: true, n: 1, m: 2, max: 300 }), 106);
// 刻みが上限を越えるときは上限で止める
assert.equal(rampBpm(295, 4, { on: true, n: 1, m: 50, max: 300 }), 300);

assert.equal(barsToNextStep(120, 0, R), 4);
assert.equal(barsToNextStep(120, 3, R), 1);
assert.equal(barsToNextStep(120, 4, R), 4);
assert.equal(barsToNextStep(120, 16, R), 0);
assert.equal(barsToNextStep(120, 5, { ...R, on: false }), 0);

// 検証
assert.deepEqual(normalize({}).ramp, DEFAULTS.ramp);
assert.equal(normalize({}, { ramp: { n: 8 } }).ramp.n, 8);
assert.throws(() => normalize({}, { ramp: { m: 0 } }));
assert.throws(() => normalize({}, { ramp: { max: 301 } }));
assert.throws(() => normalize({}, { bpm: 19 }));
// 旧版（ramp なし）の保存値も読める
const old = { bpm: 90, sig: '3/4', beats: Array(12).fill(0), drum: true, click: true, vc: .5, vd: 1, mute: { on: true, n: 2, m: 1 }, pat: DEFAULTS.pat };
const got = load(old);
assert.equal(got.bpm, 90); assert.equal(got.sig, '3/4'); assert.deepEqual(got.ramp, DEFAULTS.ramp);
// 壊れた値は既定値
assert.deepEqual(load({ bpm: 'x' }), DEFAULTS);
assert.deepEqual(load(null), DEFAULTS);

console.log('test_logic: ok');
