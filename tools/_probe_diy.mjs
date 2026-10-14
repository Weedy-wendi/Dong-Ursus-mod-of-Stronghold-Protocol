// 一次性探针：找 diy 覆盖场景可用种子（fields 5_diy1_a→char_112_siege；跑完即删）
import { diyScenarios, runScenario, computeDigests } from './golden.mjs';

// 复制 golden.mjs 里 diy 场景的构建参数（human.diy 同款）
const MATCH_DIY = Object.freeze({
  chess_char_5_diy1_a: { charId: 'char_112_siege', skillIndex: 2, uniEquipId: 'uniequip_002_siege' },
  chess_char_5_diy2_a: { charId: 'char_609_acguad' },
  chess_char_6_diy1_a: { charId: 'char_609_acguad' },
  chess_char_6_diy2_a: { charId: 'char_617_sharp2' },
});

const good = [];
for (let seed = 41; seed <= 80; seed++) {
  const sc = { id: `coop2-NORMAL-${seed}-probe-diy`, mode: 'coop', difficulty: 'NORMAL', bots: 1, seed, human: { diy: MATCH_DIY, shopLevel: 5 } };
  try {
    const d = await runScenario(sc);
    const rounds = d?.diy?.rounds || [];
    const fielded = rounds.filter(([, , f]) => f).flatMap(([r, , f]) => f.split(' '));
    if (fielded.some((x) => x === '5_diy1_a→char_112_siege')) {
      const errs = d.errors ? JSON.stringify(d.errors) : '(no errors field)';
      good.push({ seed, fielded: fielded.slice(0, 6), errs });
      if (good.length >= 3) break;
    }
  } catch (e) { /* skip */ }
}
console.log(JSON.stringify(good, null, 1));
