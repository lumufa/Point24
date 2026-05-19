import type { ModeId } from '../core/constants';
import type { Operator } from '../core/fraction';

export type { ModeId, Operator };

export type DealSource = 'random' | 'daily' | 'challenge';

export interface CardMeta {
    rank: number;
    suit: string;
    rankLabel: string;
}

export interface Item {
    id: number;
    num: number;
    den: number;
    originKind: 'card' | 'result';
    card: CardMeta | null;
    historyText: string;
}

export interface RoundStep {
    id: number;
    text: string;
}

export interface RoundSnapshot {
    activeItems: Item[];
    selectedItemId: number | null;
    selectedOperator: Operator | null;
    steps: RoundStep[];
    won: boolean;
}

export interface HintStep {
    leftId: number;
    rightId: number;
    operator: Operator;
    leftLabel: string;
    rightLabel: string;
    resultLabel: string;
}

export interface RoundState {
    initialItems: Item[];
    activeItems: Item[];
    selectedItemId: number | null;
    selectedOperator: Operator | null;
    steps: RoundStep[];
    history: RoundSnapshot[];
    freshItemId: number | null;
    won: boolean;
    repeatWin: boolean;
    answerVisible: boolean;
    answerUsed: boolean;
    hintCount: number;
    hintNextStep: HintStep | null;
}

export interface SessionState {
    round: number;
    modeId: ModeId;
    sessionScore: number;
    streak: number;
    sessionWins: number;
    sessionEnded: boolean;
    roundAwarded: boolean;
    lastRoundPoints: number;
    roundElapsedSeconds: number;
    modeSecondsLeft: number;
}

export interface Settings {
    modeId: ModeId;
    soundEnabled: boolean;
    masterVolume: number;
    effectsVolume: number;
    voiceoverEnabled: boolean;
    voiceoverVolume: number;
}

export interface PersistentStats {
    bestRoundScore: number;
    bestSprintScore: number;
    bestStreak: number;
    fastestWinSeconds: number | null;
    totalWins: number;
}

export interface DailyProgressEntry {
    completed: boolean;
    bestSeconds: number | null;
    firstCompletedAt: number | null;
}

export type DailyProgress = Record<string, DailyProgressEntry>;

export interface Difficulty {
    label: string;
    bonus: number;
}

export interface GameState {
    round: RoundState;
    session: SessionState;
    settings: Settings;
    persistentStats: PersistentStats;
    dailyProgress: DailyProgress;
    dailyChallengeKey: string;
    challengeCode: string;
    dealSource: DealSource;
    difficulty: Difficulty;
    solutions: string[];
    statusText: string;
}

export const DEFAULT_SETTINGS: Settings = {
    modeId: 'classic',
    soundEnabled: true,
    masterVolume: 0.8,
    effectsVolume: 0.9,
    voiceoverEnabled: true,
    voiceoverVolume: 0.8,
};

export const DEFAULT_STATS: PersistentStats = {
    bestRoundScore: 0,
    bestSprintScore: 0,
    bestStreak: 0,
    fastestWinSeconds: null,
    totalWins: 0,
};
