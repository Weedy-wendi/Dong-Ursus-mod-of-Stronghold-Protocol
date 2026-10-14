// 一次性补丁：点题测试替换为 S3 锐笔速写的正前方倍率（跑完即删）
import { readFileSync, writeFileSync } from 'node:fs';
const F = 'test/content/kits_char_4_99.test.js';
let s = readFileSync(F, 'utf8');
const start = s.indexOf("test('S2 点题:");
const end = s.lastIndexOf('});');
if (start < 0) throw new Error('点题 test not found');
// 保留文件结尾（最后一个 }); 属于点题 test）
const nl = String.fromCharCode(10);
const newTest = [
  "test('S3 锐笔速写 (default, auto): while it runs the 正前方3格 hits take the atk_up scale instead of the skill scale', () => {",
  "  // S3 is her default skill with a DEFAULT strategy — it auto-fires at full SP; the front 3 (her tile + 3 ahead)",
  "  // take the atk_up scale, so the hits on the enemy sitting there jump by s3Front / s3Scale once it starts.",
  "  const h = makeBattle({",
  "    defs: { enemies: { e_dummy: dummy('e_dummy') } }, units: [{ chessId: A, row: 10, col: 5 }],",
  "    enemies: [{ key: 'e_dummy', pos: [10, 7] }], autoFinish: false, timeLimit: 120, captureNoisy: true, seed: 27,",
  "  });",
  "  h.step(1);",
  "  const u = h.unit(1);",
  "  const e = h.enemies()[0];",
  "  const amounts = () => hitsBy(h, u).filter((c) => c.target === e && c.dmg.isAttack).map((c) => c.dmg.amount);",
  "  h.runUntil(() => amounts().length >= 2, 40);              // normal attacks first (ARC-Y ×1.05 included)",
  "  const pre = amounts()[0];",
  "  h.runUntil(() => u.skill.active, 90);                     // S3 auto-fires at full SP",
  "  h.runUntil(() => amounts().length >= 4, 30);",
  "  const during = amounts().slice(-1)[0];",
  "  const s3 = (chess) => { const rec = chess.skills.find((x) => x.skillId === 'skchr_bgsnow_3'); return rec.bb; };",
  "  const bb = s3(u.def);",
  "  const ratio = during / pre;",
  "  const want = (bb['bgsnow_s_3[atk_up].atk_scale'] ?? bb.atk_scale) / (bb.atk_scale ?? 1);",
  "  assert.ok(Math.abs(ratio - want) < 0.03, ` + '`S3 front scale: ${during} / ${pre} = ${ratio.toFixed(3)} vs ${want.toFixed(3)}`' + `);",
  "  done(h);",
  "});",
].join(nl);
s = s.slice(0, start) + newTest + nl + s.slice(end);
writeFileSync(F, s);
console.log('点题 test replaced with S3 front-scale test');
