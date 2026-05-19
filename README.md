# GameStage_24

> [English](./README.en.md) | 简体中文

> 用 Cocos Creator + TypeScript 写的抖音小游戏，把"24 点"做到零浮点误差、全网同题、广告失败也不卡用户。

![平台](https://img.shields.io/badge/platform-%E6%8A%96%E9%9F%B3%E5%B0%8F%E6%B8%B8%E6%88%8F-black)
![引擎](https://img.shields.io/badge/Cocos%20Creator-3.8.8-blue)
![语言](https://img.shields.io/badge/TypeScript-strict%20core-3178c6)

<!-- TODO(hero-gif): 录制 5-8 秒玩法演示 GIF：发牌 → 选牌 → 选运算符 → 通关动画 → 下一题。放到 docs/hero.gif 后替换下行。 -->
<!-- ![玩法演示](docs/hero.gif) -->

---

## 为什么做这个

24 点在中文世界基本是国民级玩法，但市面上的小游戏版本普遍有两个隐疾：

1. **求解器用浮点数**，遇到 `(3 ÷ 7) × 7 × 4 = 24` 这类题会判为"无解"，于是出题环节只能用一份手写题库，长期玩下来反复见到老面孔。
2. **每日挑战要么没有，要么依赖服务端**，独立开发者上线一个不需要后端的小游戏，每日同题这件事经常被砍掉。

GameStage_24 想证明：这两件事在客户端就能干净地做掉，而且代码量不大。整个项目核心算法 + 状态机 + 抖音适配，不到 30 个 TS 文件。

---

## 玩法（一句话版）

抽 4 张扑克（A=1, J/Q/K=11/12/13），用 + − × ÷ 和括号凑出 24，所有牌都得用上、每张只能用一次。提供经典模式（无限出题）、限时冲刺（90 秒）和每日挑战三种模式。

---

## 技术架构：核心逻辑 0 平台依赖

整个项目按依赖方向严格分四层，约束写在 `assets/scripts/README.md:11`：

```
ui  ───▶  state  ───▶  core
                  ───▶  platform  ───▶  抖音 tt.*  /  浏览器 localStorage  /  内存兜底
```

- `core/`：分数运算、DFS 求解器、出题、随机种子、计分 —— **纯 TypeScript，不 import 任何 `cc.*` 或 `tt.*`**。
- `state/`：reducer + Store 状态机，输入 action、输出 state + effects，引擎也不感知。
- `platform/`：抖音 SDK 的薄适配层，每个能力都做了"无 SDK 时降级"分支。
- `ui/`：才允许引用 Cocos Creator 节点 API。

这条约束带来的直接收益：

- **求解器可以在 Node 里跑单元测试**，不用启动编辑器。
- **同一份逻辑可以同时跑在抖音运行时、Cocos 编辑器预览、纯浏览器调试页**。`tt-env.ts:1` 用 `globalThis.tt` 的存在性做运行时探测，下游模块据此走不同分支。
- **换平台成本低**：要适配微信/快手小游戏，理论上只换 `platform/` 这一层。

---

## 技术亮点

### 1. DFS 回溯求解器 + 自定义 Fraction 分数类（核心）

**问题**：24 点出题要保证每道题有解，于是必须有一个 100% 准确的求解器去过滤"无解牌组"。最朴素的写法是把每张牌当成 `number`，DFS 枚举所有运算组合，看最后能不能等于 24。但浮点数在这件事上是个陷阱：

```
(3 ÷ 7) × 7 × 4
浮点：0.42857142857142855 × 7 × 4 = 11.999999999999998
比较：Math.abs(11.999... - 24) > 任何合理 ε ？看你 ε 怎么选。
```

`ε` 调大就可能误报漏报，调小就可能因为累积误差判错。对一个出题器来说，这种 flaky 行为意味着题库里偶尔会混进"用户算对了系统判错"或"系统说无解但其实有解"的牌。

**方案 1 — Fraction 类**：把所有中间运算用 `{num, den}` 的整数分数表示，每次操作后用 gcd 化简。加减乘除四则全部用整数算术，完全规避浮点。见 `assets/scripts/core/fraction.ts:6-38`：

```ts
export function operateFractions(left, right, op) {
  if (op === '+') return normalizeFraction(left.num * right.den + right.num * left.den, left.den * right.den);
  if (op === '*') return normalizeFraction(left.num * right.num, left.den * right.den);
  if (op === '/') {
    if (right.num === 0) return null;  // 除零安全，返回 null 让上层 DFS 自动剪枝
    return normalizeFraction(left.num * right.den, left.den * right.num);
  }
  // ...
}
```

判定是否等于 24 也不再做浮点比较，而是直接 `nodes[0].num === 24 * nodes[0].den`（求解器 `solver.ts:38`）—— 严格整数判等，零误报。

**方案 2 — DFS**：手里的 N 个分数，每次任取两个 (L, R) 做一种运算，把结果塞回去，问题规模 N→N-1，递归到 N=1 时判定。注意非交换运算（`-` 和 `/`）要同时尝试 `L op R` 和 `R op L`，所以每对牌实际有 6 种合并方式。见 `assets/scripts/core/solver.ts:36-66`：

```ts
function dfs(nodes: SearchNode[]): void {
  if (nodes.length === 1) {
    if (nodes[0].num === 24 * nodes[0].den) solutions.add(trimOuterParentheses(nodes[0].expr));
    return;
  }
  for (let first = 0; first < nodes.length; first++) {
    for (let second = first + 1; second < nodes.length; second++) {
      // 6 种组合：L+R, L−R, R−L, L×R, L÷R, R÷L
      tryOp(operateFractions(L, R, '+'), ...);
      tryOp(operateFractions(L, R, '-'), ...);
      tryOp(operateFractions(R, L, '-'), ...);
      // ...
    }
  }
}
```

**示意**：输入 `[3, 3, 7, 7]`（一道经典刁钻题，列在 `constants.ts:20` 的进阶题池里）：

```
DFS 路径之一：
  pick (3, 7) → 3 ÷ 7 = {num: 3, den: 7}      剩 [{3/7}, 3, 7]
  pick ({3/7}, 3) → 3/7 + 3 = {num: 24, den: 7} 剩 [{24/7}, 7]
  pick ({24/7}, 7) → 24/7 × 7 = {num: 168, den: 7} = {num: 24, den: 1}
                                       └─ 24 === 24 × 1  命中

解析式：(3 + 3 ÷ 7) × 7 = 24    （浮点求解器会算出 23.999... 判为无解）
```

这一组数字浮点法会漏掉，分数法稳稳找到。`solver.ts:130` 还顺带利用解的数量做难度分级（≤3 个解判"刁钻" +90 分，≤8 判"进阶" +60，否则"轻快" +30）—— 求解器在客户端，所以这个难度标签是题目实际给定的，不是猜的。

同一份求解器，`findSolutionPath()`（`solver.ts:68`）多带了一份 `id` 字段，用来生成"下一步该选哪两张牌怎么算"的提示，给到 reducer 用（见亮点 3 的降级处理）。

---

### 2. 哈希种子驱动的"每日挑战"——服务端零参与

**问题**：所有玩家今天打开应用，要看到同一道题；明天换一道新的。常规做法是服务端维护一份题库每天推一道。但小游戏体量上后端，运维成本不划算。

**方案**：把"日期"当成种子，用确定性算法在本地生成同一道题。

`seed.ts:8` 用 FNV-1a 把当天日期字符串（`YYYY-MM-DD`）哈希成 32-bit 整数：

```ts
export function createSeedFromText(text: string): number {
  let seed = 2166136261;            // FNV offset basis
  for (let i = 0; i < text.length; i++) {
    seed ^= text.charCodeAt(i);
    seed = Math.imul(seed, 16777619); // FNV prime
  }
  return seed >>> 0;
}
```

然后 `seed.ts:17` 拿这个种子初始化一个 mulberry32 风格的可复现 PRNG：

```ts
export function createSeededRandom(seed: number): () => number { /* mulberry32 */ }
```

最后 `deal.ts:83` 把"日期 → 种子 → PRNG → 洗牌 → 取前 4 张 → 求解器过滤"串起来：

```ts
const rand = createSeededRandom(createSeedFromText(`24-daily-${dateKey}`));
for (let attempts = 0; attempts < 2000; attempts++) {
  const hand = shuffleWithRandom(deck, rand).slice(0, 4);
  const solutions = solve24(hand);
  if (solutions.length > 0) return { dateKey, ranks: hand.map(c => c.rank), solutions };
}
```

只要全网玩家系统时钟没歪到隔天，今天看到的牌一定一样。**而且这套生成逻辑反过来证明了亮点 1 的求解器必须可靠**：如果求解器误判"无解"，PRNG 会被一直跳过去取下一组，今天和明天的题就不一致了。

**取舍**（这点我自己想了挺久）：

| | 种子选题（本地） | 服务端推题 |
|---|---|---|
| 后端成本 | 0 | 需要 API + 题库表 + 部署 |
| 题目可控性 | 受 PRNG 摆布，没法手工塞节日特题 | 完全可控 |
| 客户端时钟攻击 | 改本地时间可提前看到明天题 | 抗时钟攻击 |
| 题目 A/B / 热更 | 没法做 | 随时可做 |

对一个独立开发的休闲小游戏，每日题的"控制权"价值不高，没人会为提前一天玩 24 点改系统时间。所以选了种子方案。如果业务方向变成竞技/赛事，这里换成服务端推题，调用点只有 `deal.ts:103` 一处。

---

### 3. 抖音平台适配层 + 激励视频降级

**设计原则**：`platform/` 里的每个模块都是同一套接口在三个环境下的三套实现 —— 抖音运行时、浏览器、内存兜底。运行时探测见 `tt-env.ts:3`：

```ts
export function getTT(): any | null {
  const t = globalThis.tt;
  return t && typeof t === 'object' ? t : null;
}
```

业务层调 `getJSON('records', defaults)`、`showRewardedAd('hint')`、`shareAppMessage(...)`，**完全不关心当前在哪个宿主**。以存储为例，`tt-storage.ts:5`：

```ts
export function getItem(key: string): string | null {
  const tt = getTT();
  if (tt) return tt.getStorageSync(key);   // 抖音
  if (isWeb()) return localStorage.getItem(key);  // 浏览器调试
  return memoryStore.get(key) ?? null;     // 兜底：编辑器、SSR、跑测试
}
```

**激励视频的降级处理**（重点）：抖音的 `tt.createRewardedVideoAd` 在真机上拉取失败、用户中途关闭、SDK 不可用都是常态。`tt-rewarded-ad.ts:39` 把所有失败情况收敛成一个 4 值的枚举：

```ts
export type AdResult = 'reward' | 'cancel' | 'error' | 'no-sdk' | 'not-ready';
```

调用方 `GameStore.useHint()`（`GameStore.ts:191-215`）拿到这个结果后做差异化文案，**完全不阻断游戏**：

```ts
const result = await showRewardedAd('hint');
if (result !== 'reward') {
  this.state.statusText = result === 'cancel'
    ? '广告未完成观看，未解锁新提示。'
    : '广告加载失败，请稍后再试。';
  return;  // 游戏继续，玩家自己想下一步
}
this.dispatch({ type: 'USE_HINT' });
```

这里有两个细节值得说：

- **首次提示免费、第二次才看广告**：`GameStore.ts:201` 用 `count >= 1 && isDouyin()` 做双重判定。如果在编辑器/浏览器调试，永远不会去拉广告（也拉不到），提示功能正常工作 —— 这就是亮点 1 提到的"核心逻辑跨环境跑"在实际开发体验上的回报。
- **提示内容不是固定文案，是 DFS 算出来的当前局面下一步真实最优解**（`findSolutionPath` 在 `hintGenerator.ts` 包了一层，喂给 reducer 的 `USE_HINT` 分支，见 `roundReducer.ts:281`）。所以广告失败的成本不是"用户看了广告看了个鬼"，而是"用户没看广告所以拿不到一条来自求解器的下一步建议"——这是个公平的交易。

---

## 开发指南

环境：
- Node 16+
- Cocos Creator 3.8.8（`package.json:5`）
- TypeScript（`tsconfig.json` 继承 Cocos 生成的 `temp/tsconfig.cocos.json`）

本地跑：
1. 用 Cocos Creator 3.8.8 打开本目录
2. 直接预览到浏览器（`isWeb()` 分支生效，存储走 `localStorage`，无广告）
3. 构建抖音小游戏：菜单 → 项目 → 构建发布 → 平台选 `bytedance-mini-game`

目录速查：

```
assets/scripts/
├── core/         纯 TS 算法层（fraction / solver / seed / deck / deal / scoring）
├── state/        reducer + Store（roundReducer / GameStore / hintGenerator / timer）
├── platform/     抖音 tt.* 适配层（tt-env / tt-storage / tt-rewarded-ad / tt-share / tt-audio / tt-banner）
├── ui/           Cocos 组件（GameStage / CardView / OperatorPad / ModePad / theme）
└── audio/        SoundManager
```

<!-- TODO(screenshot): 每日挑战入口截图，放 docs/daily.png -->
<!-- TODO(diagram): 求解器示意图。用 mermaid 画 [3,3,7,7] 的 DFS 解析树，或贴一张 ASCII art。 -->
