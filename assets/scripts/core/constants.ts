export const TARGET_RESULT = 24;
export const SOLVER_EPSILON = 1e-9;

export type ModeId = 'classic' | 'sprint';

export type GameMode = {
  id: ModeId;
  label: string;
  shortLabel: string;
  usesCountdown: boolean;
  sessionSeconds: number;
};

export const GAME_MODES: Record<ModeId, GameMode> = {
  classic: { id: 'classic', label: '经典模式', shortLabel: '经典', usesCountdown: false, sessionSeconds: 0 },
  sprint:  { id: 'sprint',  label: '限时冲分', shortLabel: '冲刺', usesCountdown: true,  sessionSeconds: 90 },
};

export const ADVANCED_DEAL_POOL: ReadonlyArray<readonly [number, number, number, number]> = Object.freeze([
  [3, 3, 7, 7],
  [1, 3, 4, 6],
  [1, 5, 5, 5],
  [1, 6, 6, 8],
  [3, 8, 8, 9],
  [4, 7, 8, 8],
]);

export const STORAGE_KEYS = {
  records: 'game24_douyin_records_v1',
  settings: 'game24_douyin_settings_v1',
  dailyProgress: 'game24_douyin_daily_progress_v1',
} as const;
