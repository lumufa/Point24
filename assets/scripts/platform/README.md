# platform/ — 抖音小游戏适配层 (B4)

本目录存放对 `tt.*` API 的薄封装,让 state 与 ui 层无感知平台。规划文件:

- `tt-storage.ts` — 包 `tt.getStorageSync` / `setStorageSync`,提供与旧版 `localStorage` 同名方法签名
- `tt-audio.ts` — 包 `tt.createInnerAudioContext`,暴露与原 `<audio>` 兼容的 play/pause/volume
- `tt-share.ts` — `tt.shareAppMessage`,入参:标题、题面参数
- `tt-rewarded-ad.ts` — `tt.createRewardedVideoAd`,按「场景 key」预加载,用于「看提示不扣分」「跳过难题」「冲刺复活」
- `tt-banner.ts` — `tt.createBannerAd`,挂在结算页底部
- `tt-env.ts` — 统一的 `isDouyin() / isDevTool()` 环境判断,允许在编辑器里 mock 走本地存储

待 B2(已完成)和 B3 完成后再填,此时只占位以固化目录结构。
