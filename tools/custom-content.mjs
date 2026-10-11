// tools/custom-content.mjs — 自定义内容（官方 act2autochess 赛季数据里没有的棋子 / 盟约）。
//
// 为什么需要它：本项目没有给「自创干员 / 自创盟约」留扩展点 —— 内容包（packs/）目前只支持 `lang` 类型，
// `data` 类型在 docs/PACKS.md 里是 "planned"（不会加载）。所以自制内容只能**在构建前注入官方数据表**，
// 让 tools/build-data.mjs 的既有管线照常生成它：属性 / 技能 / 天赋 / 模组 / 盟约阈值全部由官方代码推导，
// 这里一个数值都不手写。
//
// 注入清单（chess → effect → bond，顺序无关，都在 main() 的构建之前）：
//   棋子    act.charChessDataDict / chessNormalIdLookupDict / charShopChessDatas
//   盟约    act.bondInfoDict + ac.bondInfoDict（autoChessData）
//   效果    act.effectInfoDataDict + act.effectBuffInfoDataDict（盟约黑board，buildBonds 会读它推阈值）
//
// 加内容时同步改下面这些常量（validateAll 与 test/data.test.js、test/backups.test.js 里是硬断言）：
export const CUSTOM_VISIBLE_CHESS = 1;   // 新增「可见、非 DIY」棋子数  （112 + N）
export const CUSTOM_BASE_CHESS = 1;      // 新增基础棋子数（PRESET）  （133 + N）
export const CUSTOM_CHESS_RECORDS = 2;   // 新增 chess 记录数（普通 + 精英）（266 + N）
export const CUSTOM_BOND_COUNT = 1;      // 新增盟约数                （23  + N）
export const CUSTOM_CORE_BOND_COUNT = 1; // 新增「核心」盟约数        （8   + N）

/** 自制棋子。key = 基础 chessId（不带 `_a`）。 */
const CHESS = {
  'chess_char_2_99': {
    charId: 'char_289_gyuki',           // 缠丸：4★ 近卫 / 无畏者(fearless) / nationId higashi（东国）
    tier: 2,                            // 商店等级：tier 2 → price 3（4★ 在数据里落在 tier 1/2/3）
    identifier: 9001,                   // 自定义段，避开官方编号
    shopSortId: 900,
    defaultSkillIndex: 1,               // 默认技能 = 第 2 个（恶鬼之力）；kit 里两个技能都写了 spec
    moduleId: 'uniequip_002_gyuki',     // DRE-Y 断竹插花作品
    bondIds: ['dongShip', 'indomShip'], // 【东】【不屈】
    garrisonIds: [],
  },
};

/**
 * 自制盟约（当前只登记数据，**不实现效果** —— 决定 2026-10-11：先只加干员）。
 *
 * 【东】= 自定义核心盟约，**效果为占位符**：
 *   「部署时给【东】+4/+8 层、本场上限 12/24」是**缠丸自己的干员效果**，写在她的 kit 里
 *   （server/sim/content/kits/ops/chess_char_2_99-gyuki.js），**不是**盟约效果。
 *   所以这里 desc 用占位文案、bb 留空；server/sim/content/bonds/ 下不需要写任何实现。
 */
const BONDS = {
  dongShip: {
    name: '东',
    identifier: 900,
    isCore: true,                        // 势力盟约 → 与其它 8 个 core bond 同级
    powerIdList: ['higashi'],            // 官方 nationId（东国）
    activeCount: 3,
    thresholds: [3, 6],
    members: ['chess_char_2_99_a'],
    effectId: 'bondeffect_dong',
    buffKey: 'act2autochess_bond_eff_dong',
    desc: '（占位）本盟约暂无效果',        // 占位符：盟约本身不带效果
    bb: {},                              // 占位符：不注入任何效果参数
  },
};

/** `evolvePhase/charLevel/skillLevel/equipLevel` 的模板取自 `shopCharChessInfoData[tier]`，不手写等级。 */
const statusOf = (row) => ({
  evolvePhase: row.evolvePhase, charLevel: row.charLevel, skillLevel: row.skillLevel, favorPoint: 0, equipLevel: row.equipLevel,
});

/**
 * 把自制内容注入官方赛季数据（**必须在 buildChess / buildEffects / buildBonds 之前**）。
 * 抛错即中止构建 —— 宁可构建失败，也不要静默产出半成品。
 * @param {{ act: object, ac: object }} ctx `act` = activity.AUTOCHESS_SEASON.act2autochess；`ac` = activity.autoChessData
 */
export function injectCustomContent(ctx) {
  const { act, ac } = ctx;
  if (!act || !ac) throw new Error('[custom] build context lacks act / ac');

  // ---- 棋子 ----
  for (const [base, c] of Object.entries(CHESS)) {
    const a = `${base}_a`;
    const b = `${base}_b`;
    if (act.charChessDataDict[a] || act.charChessDataDict[b]) throw new Error(`[custom] chess ${base} collides with the official season`);
    const rows = act.shopCharChessInfoData[String(c.tier)] || [];
    const normal = rows.find((r) => !r.isGolden);
    const golden = rows.find((r) => !!r.isGolden);
    if (!normal || !golden) throw new Error(`[custom] chess ${base}: shopCharChessInfoData has no tier ${c.tier} rows`);

    act.charChessDataDict[a] = {
      chessId: a, identifier: c.identifier, isGolden: false, status: statusOf(normal),
      upgradeChessId: b, upgradeNum: 3, bondIds: [...c.bondIds], garrisonIds: [...c.garrisonIds],
    };
    act.charChessDataDict[b] = {
      chessId: b, identifier: c.identifier + 1, isGolden: true, status: statusOf(golden),
      upgradeChessId: null, upgradeNum: 0, bondIds: [...c.bondIds], garrisonIds: [...c.garrisonIds],
    };
    act.chessNormalIdLookupDict[a] = a;
    act.chessNormalIdLookupDict[b] = a;
    // 商店行按 baseId 建键（buildChess: charShopChessDatas[chessNormalIdLookupDict[chessId]]）。
    // backup* 指向自己：玩家「未持有」时不会被别的原型干员替换（与官方棋子的自指写法一致；buildBackups 会跳过它）。
    act.charShopChessDatas[a] = {
      chessId: a, goldenChessId: b, chessLevel: c.tier, shopLevelSortId: c.shopSortId, chessType: 'PRESET',
      charId: c.charId, tmplId: null,
      defaultSkillIndex: c.defaultSkillIndex, defaultUniEquipId: c.moduleId,
      backupCharId: c.charId, backupTmplId: null,
      backupCharSkillIndex: c.defaultSkillIndex, backupCharUniEquipId: c.moduleId, backupCharPotRank: 0,
      isHidden: false,
    };

    // 官方盟约的成员表也要登记：test/data.test.js 断言「棋子的 bonds 与盟约的 members 互为镜像」
    for (const bondId of c.bondIds) {
      const off = act.bondInfoDict[bondId];
      if (off && Array.isArray(off.chessIdList) && !off.chessIdList.includes(a)) off.chessIdList.push(a);
    }
  }

  // ---- 盟约 + 效果 ----
  for (const [bondId, cfg] of Object.entries(BONDS)) {
    if (act.bondInfoDict[bondId]) throw new Error(`[custom] bond ${bondId} collides with the official season`);
    for (const m of cfg.members) if (!act.charChessDataDict[m]) throw new Error(`[custom] bond ${bondId}: member ${m} not injected`);

    // 效果黑board：buildBonds 由它推导 bb / bbStr / thresholds（BOND_COUNT_KEYS: power_bond_char_cnt / ex_bond_char_cnt）
    const bbList = [
      ...Object.entries(cfg.bb).map(([key, value]) => ({ key, value, valueStr: null })),
      { key: 'power_bond_char_cnt', value: cfg.thresholds[0], valueStr: null },
      { key: 'ex_bond_char_cnt', value: cfg.thresholds[1], valueStr: null },
      { key: 'key', value: 0, valueStr: cfg.buffKey },   // 内部 buff key（与官方 bond 效果同形）
    ];
    act.effectInfoDataDict[cfg.effectId] = {
      effectType: 'BOND', effectName: cfg.name, effectDesc: cfg.desc,
      effectCounterType: 'NONE', continuedRound: -1, effectDecoIconId: null, enemyPrice: 0,
    };
    act.effectBuffInfoDataDict[cfg.effectId] = [{ key: 'env_gbuff_new', countType: 'NONE', blackboard: bbList }];

    act.bondInfoDict[bondId] = {
      bondId, name: cfg.name, identifier: cfg.identifier,
      desc: cfg.desc, iconId: `icon_${bondId}`,
      activeCount: cfg.activeCount, activeCondition: 'BOARD', activeConditionTemplate: 'count_threshold_upward',
      activeParamList: cfg.thresholds.map(String),
      effectId: cfg.effectId, activeType: 'BATTLE', weight: 1,
      isActiveInDeck: false, maxInactiveBondCount: -1, noStack: false,
      descParamBaseList: [], descParamPerStackList: [], chessIdList: [...cfg.members],
    };
    // autoChessData 侧：isPower → isCore，powerIdList = 势力。
    // `bondId` 必须带上：buildBackups 的 faction→bond 规则用 `Object.values(ac.bondInfoDict)…map(b => b.bondId)`
    // 推导每个自选干员的 bonds，缺了它该干员的 bonds 会变成 [undefined]（validateAll 报 "bond undefined missing"）。
    ac.bondInfoDict = ac.bondInfoDict || {};
    ac.bondInfoDict[bondId] = {
      ...(ac.bondInfoDict[bondId] || {}),
      bondId, isPower: cfg.isCore, bondType: 'SEASON', bondOrder: cfg.identifier,
      name: cfg.name, powerIdList: [...cfg.powerIdList], icon: `icon_${bondId}`,
    };
  }
}
