# scripts/ 目录约定

```
scripts/
├── core/        平台无关算法: 分数运算、出题、求解器、计分、随机种子
├── state/       游戏状态机: 一轮流程 / 经典 & 冲刺 & 每日 模式控制(B3)
├── ui/          Cocos 组件: 牌面节点、HUD、Panel、Banner(B3)
├── platform/    抖音小游戏 tt.* 适配: 存储 / 音频 / 分享 / 激励视频 / Banner(B4)
```

**依赖方向**: `ui` → `state` → `core` / `platform`。core 禁止依赖任何 UI 或平台 API。
