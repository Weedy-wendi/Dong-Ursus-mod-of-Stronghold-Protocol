// server/sim/content/kits/ops/chess_char_2_99-gyuki.js — 缠丸 (char_289_gyuki) kit, tier 2.
// Conventions of the tier-2 kits: ../shared/tier2.js; kit contract and rules: ../README.md.
//
// 2_99(自定义) 缠丸 — 无畏者 (fearless)。数值全部来自官方数据表的 blackboard，此处不写死：
//   恶鬼体质 (精英 2)：防御力-20%，但最大生命值 +20%（潜能 5 起 +23% → talentBb(chess,0).max_hp）
//   生命回复·β型 S1 (skcom_heal_self[2])：立即恢复最大生命的 30%(Lv4) / 40%(Lv7) — bb.hp_ratio
//   恶鬼之力   S2 (skchr_gyuki_2)：防御力降至 0、攻击力 +90%(Lv4) / +105%(Lv7) — bb.atk
//   DRE-Y 断竹插花作品 (模组)：生命+270 攻击+35 由数据承载；特性追加 —— 被击倒时不撤退且回复所有生命，
//     但生命上限 -60%、攻击速度 +30（单次部署只触发 1 次）[ASSUMED: 模组 1 级]
//   干员自身效果：本干员部署时，令所属玩家【东】层数 +4（普通形态）/ +8（精锐形态），本场累计上限 12 / 24。
//     ⚠️ 这是**缠丸自己的干员效果**，**不是【东】的盟约效果**（【东】的数据里效果是占位符，
//        tools/custom-content.mjs；server/sim/content/bonds/ 下没有任何【东】的实现）。
//     口径 [ASSUMED]：按形态分档（普通 4/12、精锐 8/24）；【东】未激活也生效。
//
// 注：无畏者的分支特性「可以且优先攻击自身阻挡的单位」由职业/索敌层承担（server/sim/professions.js fearless），
// 本 kit 不重复实现。
// 注：kit 文件禁止 import 任何 `index.js`（kits_layout.test.js：那会与 content/index.js 形成 import 循环），
// 所以这里直接用引擎的 `battle.addLayers`，本场上限自己记在 unit.mem 里 —— 不引 support/index.js。

import { num, talentBb, moduleOn, skillBbOf } from '../shared/tier1.js';

const S1 = 'skcom_heal_self[2]';   // 生命回复·β型（非默认技能）
const S2 = 'skchr_gyuki_2';        // 恶鬼之力（默认技能，见 chess.json defaultSkillIndex 1）

/** 模组：免死后生命上限 -60%、攻击速度 +30（需求单口径，与官方 DRE-Y 1 级特性一致）。 */
const MOD_HP_CAP = -0.6;
const MOD_ASPD = 30;
/** 「单次部署只触发 1 次」的标记（跨战斗状态放 unit.mem，不用模块级变量）。 */
const MOD_FIRED = 'gyuki:moduleFired';
/** 干员自身效果：本场已给【东】的层数（用来实现「本场累计上限」）。 */
const DONG_USED = 'gyuki:dongLayers';

/** 干员自身效果：部署时给【东】的层数 / 本场累计上限（普通形态 / 精锐形态）。 */
const DONG = 'dongShip';
const DONG_NORMAL = { per: 4, cap: 12 };
const DONG_ELITE = { per: 8, cap: 24 };

export default {
  chess_char_2_99_a: (bb, chess) => {
    // 天赋：恶鬼体质（**精英 2 起才解锁** —— 普通形态的 record.talents 为空，绝不能套用默认值）。
    // 数值从天赋 blackboard 读，潜能提升自动跟随。
    const hasTrait = Array.isArray(chess?.talents) && chess.talents.length > 0;
    const talent = talentBb(chess, 0);
    const traitMods = hasTrait ? { defPct: num(talent.def, -0.2), hpPct: num(talent.max_hp, 0.2) } : null;
    const modOn = moduleOn(chess);
    // 同一个 builder 服务普通 / 精锐两个形态，由 chess 记录区分：精锐 = isGolden。
    const dongGain = chess?.isGolden ? DONG_ELITE : DONG_NORMAL;

    // 两个技能各自的 blackboard（选中的那个是 bb；另一个用 skillBbOf 取）。
    const s1B = skillBbOf(chess, S1);
    const s2B = skillBbOf(chess, S2);
    const s1HealRatio = () => num(s1B.hp_ratio, 0.4);
    const s2AtkPct = () => num(s2B.atk, 1.05);

    const s1Spec = {
      kind: 'instant', heal: true,
      onStart({ battle, unit }) {
        if (unit.alive) battle.heal(unit, unit, unit.s.maxHp * s1HealRatio(), { self: true, tags: ['skill'] });
      },
    };
    // 防御力降至 0 = defPct -1（units.js: def × (1 + defPct)）
    const s2Spec = { kind: 'duration', mods: { defPct: -1, atkPct: s2AtkPct() } };

    return {
      // 默认技能放顶层 `skill`（content/index.js selectSkillSpec: 默认技能必须只在这里，
      // 一旦同时进 `skills` 映射，skillSource 会变成 'skills' —— kits_alt_t2.test.js 会报错）。
      skill: s2Spec,                                  // 默认技能 = 恶鬼之力（数据 defaultSkillIndex 1）
      skills: { [S1]: s1Spec },                       // 只列**非默认**技能；每个可选技能都要手写，否则退到通用兜底
      talents: [{
        install(battle, unit) {
          unit.mem = unit.mem || {};
          // allowDead: the kit installs its buffs at battle setup, before the unit is deployed (`addBuff` refuses an
          // un-alive unit otherwise — the engine's own setup-time buffs pass it too, battle/players.js).
          if (traitMods) battle.addBuff(unit, { key: 'gyuki:trait', persist: true, visible: true, allowDead: true, mods: traitMods });

          // ---- 干员自身效果：部署时给【东】加层（与模组无关，必须在 !modOn 的提前返回之前注册）----
          // **不筛 isMember**：这是她自己的效果，只认触发者是不是她 —— 筛成员就变成「所有【东】成员部署都加层」，
          // 那是盟约效果的行为。`reason: 'op'`（干员效果）而不是 'bond'，避免统计里被算成盟约效果。
          // 本场累计上限自己记：unit.mem[DONG_USED]（unit 是每个战斗的单位对象，天然是「本场」作用域）。
          battle.on('deploy', (ctx) => {
            if (ctx.unit !== unit || unit.ownerId == null) return;
            const used = num(unit.mem[DONG_USED], 0);
            const n = Math.min(dongGain.per, Math.max(0, dongGain.cap - used));
            if (!(n > 0)) return;
            const added = battle.addLayers(unit.ownerId, DONG, n, 'op', { source: unit });
            if (added > 0) unit.mem[DONG_USED] = used + added;
          }, { owner: unit });

          if (!modOn) return;

          // 模组特性追加（免死）：被击倒时不撤退、回复所有生命，但生命上限 -60%、攻速 +30，单次部署仅 1 次。
          // 引擎在 HP 归零时先 emit('fatal')（damage.js），prevented = true 即免死；随后引擎只把 HP 兜到 >=1，
          // 因此这里要自己把 HP 补到「属性变化后」的生命上限。
          battle.on('fatal', (ctx) => {
            if (ctx.unit !== unit || ctx.prevented || unit.mem[MOD_FIRED]) return;
            unit.mem[MOD_FIRED] = true;
            ctx.prevented = true;
            battle.addBuff(unit, { key: 'gyuki:module', persist: true, visible: true, allowDead: true, mods: { hpPct: MOD_HP_CAP, aspd: MOD_ASPD } });
            unit.markDirty?.();                       // 让 unit.s 重新聚合（生命上限已变）
            unit.hp = unit.s.maxHp;                   // 按变化后的生命上限 100% 复原
          }, { owner: unit, priority: 10 });

          // 每次（重新）部署都恢复一次触发机会 —— 「单次部署只触发 1 次」
          battle.on('deploy', (ctx) => { if (ctx.unit === unit) unit.mem[MOD_FIRED] = false; }, { owner: unit });
        },
      }],
    };
  },
};
