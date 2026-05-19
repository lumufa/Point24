# state/ — 游戏状态机 (B3)

从 H5 版 `script.js` 中剥离出的状态机部分,去掉所有 DOM 操作,只保留:

- 一局的生命周期:`startNewRound` / `applyOperation` / `undoLastStep` / `handleCardClick` / `handleOperatorClick` / `finishWin`
- 模式会话:`startModeSession` / `finishSprintSession` / 冲刺计时 tick
- 每日挑战:`markDailyChallengeComplete`
- 设置 & 持久化:读写通过 `platform/tt-storage`

规划文件:

- `GameStore.ts` — 全局状态 + 事件总线 (简单 EventTarget 即可,不引入 redux/pinia)
- `roundReducer.ts` — 纯函数:`reduce(state, action)` 返回新 state
- `timer.ts` — 计时器 (Cocos 侧用 `schedule` 或原生 `setInterval`)

UI 层订阅 `GameStore` 的状态变更重绘,而非直接修改。
