# ui/ — Cocos 组件与 UI (B3)

本目录存放 Cocos 组件 (`@ccclass` 装饰的 Component),还原 H5 版《24 点挑战》的视觉与交互。

计划组件:

- `GameStage.ts` — 主舞台(4 张牌 + 运算符 + 表达式 HUD + 操作按钮)
- `CardView.ts` — 单张牌的展示/选中/禁用状态
- `OperatorPad.ts` — 四个运算符按钮
- `HudBar.ts` — 计时 / 难度 / 积分 / 连胜
- `RoundBanner.ts` — 胜利 / 结束弹层
- `DailyPanel.ts` — 每日挑战侧栏
- `ModeSwitch.ts` — 经典 / 冲刺 切换
- `SettingsDrawer.ts` — 音效 / 音量 / 分享

主题色板与圆角规范从 H5 版 `C:\projects\24_Game\styles.css` 里的 CSS 变量迁来,以 `ui/theme.ts` 形式暴露。

UI 层只发信号、拿数据,不直接做运算或读写存储 — 那是 `state` 与 `core` / `platform` 的事。
