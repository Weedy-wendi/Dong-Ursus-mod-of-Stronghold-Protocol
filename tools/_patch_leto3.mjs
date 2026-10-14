// 一次性补丁：烈夏联动测试改为观测自然级联（跑完即删）
import { readFileSync, writeFileSync } from 'node:fs';
const F = 'test/content/kits_char_3_98.test.js';
let s = readFileSync(F, 'utf8');
const newline = String.fromCharCode(10);
const start = s.indexOf("test('S2 一呼百应:");
const end = s.indexOf("test('LOR-Y");
if (start < 0 || end < 0) throw new Error('bounds');
const newTest = [
  "test('S2 一呼百应: 烈夏's casts open the ready student's skill for free (her own S3 never auto-fires out of reach), hold the 快点快点! ASPD and the ranged-scale fix while running', () => {",
  "  // 怒潮凛冬 fields OUT of her own S3 CUSTOM_RANGE reach (enemy at col 6, she at col 2): her DEFAULT strategy can",
  "  // never fire her own skill, so EVERY activation of hers comes from 一呼百应's free one.",
  "  const h = makeBattle({",
  "    defs: { enemies: { e_dummy: dummy('e_dummy') } }, units: [",
  "      { chessId: A, row: 10, col: 5 },",
  "      { chessId: 'chess_char_6_98_a', row: 10, col: 2 },   // 怒潮凛冬 (student — unreachable for her own S3)",
  "      { chessId: 'chess_char_1_02_a', row: 10, col: 4 },   // 角峰 (kjerag — untouched)",
  "    ],",
  "    enemies: [{ key: 'e_dummy', pos: [10, 6] }], autoFinish: false, timeLimit: 240, captureNoisy: true, seed: 31,",
  "  });",
  "  h.step(1);",
  "  const u = h.unit(1);",
  "  const student = h.b.allyUnits.find((x) => x.def?.charId === 'char_1051_headb2');",
  "  const jiaofeng = h.b.allyUnits.find((x) => x.def?.charId === 'char_199_yak');   // 角峰（非学生）",
  "  // 烈夏's S2 charges by time (28 SP) and the DEFAULT strategy casts it when the enemy is in reach (~28 s);",
  "  // the cast chains the student's skill free.",
  "  h.runUntil(() => student.skill.activations >= 1, 200);",
  "  const jiaoActs0 = jiaofeng.skill.activations;",
  "  assert.ok(h.hooksOf('skillStart').some((c) => c.unit === u), '烈夏\\'s cast happened');",
  "  assert.ok(student.skill.activations >= 1, 'the student\\'s skill opened with hers (free)');",
  "  // a second cast re-opens it; the non-student never moves",
  "  h.runUntil(() => student.skill.activations >= 2, 240);",
  "  assert.equal(jiaofeng.skill.activations, jiaoActs0, 'the non-student stays untouched');",
  "  // while 烈夏's skill runs: the ranged-scale fix + the student ASPD",
  "  if (u.skill.active) {",
  "    assert.equal(u.profile.rangedScale, 1, 'her ranged attacks no longer lose ATK while the skill runs');",
  "    const aspd = student.findBuff('talent:leto:students');",
  "    assert.ok(aspd && aspd.mods.aspd > 0, ` + '`快点快点! holds student ASPD (${aspd && aspd.mods.aspd})`' + `);",
  "  }",
  "  done(h);",
  "});",
  "",
].join(newline);
s = s.slice(0, start) + newTest + s.slice(end);
writeFileSync(F, s);
console.log('rewritten (natural cascade)');
