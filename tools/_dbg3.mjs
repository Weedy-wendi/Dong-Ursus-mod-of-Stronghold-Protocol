// 一次性调试补丁 3（跑完即删）
import { readFileSync, writeFileSync } from 'node:fs';
const F = 'test/content/ursus_bond.test.js';
let s = readFileSync(F, 'utf8');
const anchor = "const attacker = h.b.allyUnits.find((x) => x.def?.charId === 'char_197_poca');";
if (!s.includes(anchor)) throw new Error('anchor missing');
s = s.replace(anchor,
  anchor + "\n    console.error('[dbg2] deployed=', attacker && attacker.deployed, 'hp=', attacker && Math.round(attacker.hp), 'atk=', attacker && Math.round(attacker.s.atk), 'range=', attacker && attacker.rangeKeys.length, 'pos=', attacker && (attacker.x + ',' + attacker.y), 'enemy=', e && (e.x + ',' + e.y), 'allies=', h.b.allyUnits.length, 'enemies=', h.b.enemies.length);");
writeFileSync(F, s);
console.log('dbg3 added');
