import { STORAGE_KEYS, GAME_MODES } from '../core/constants';
import { getTodayChallengeKey } from '../core/seed';
import { calculateRoundPoints, getDifficultyInfo } from '../core/scoring';
import type { Operator } from '../core/fraction';
import { getJSON, setJSON } from '../platform/tt-storage';
import { isDouyin } from '../platform/tt-env';
import { showRewardedAd } from '../platform/tt-rewarded-ad';
import { shareAppMessage } from '../platform/tt-share';
import { reduceRound, createInitialRoundState } from './roundReducer';
import type { RoundAction, RoundEffect, SoundName } from './roundReducer';
import { DEFAULT_SETTINGS, DEFAULT_STATS } from './types';
import type {
    GameState,
    Item,
    ModeId,
    DealSource,
    Difficulty,
    Settings,
    PersistentStats,
    DailyProgress,
    SessionState,
} from './types';
import { SecondTicker } from './timer';

export type GameEventName =
    | 'state-changed'
    | 'status-changed'
    | 'sound'
    | 'round-won'
    | 'session-ended'
    | 'round-started';

export interface GameEventPayload {
    type: GameEventName;
    data?: unknown;
}

export type Listener = (ev: GameEventPayload) => void;

let itemIdSeed = 0;
export function nextItemId(): number {
    itemIdSeed += 1;
    return itemIdSeed;
}

export interface StartRoundInput {
    initialItems: Item[];
    dealSource: DealSource;
    challengeCode: string;
    solutions: string[];
    difficulty?: Difficulty;
    dailyKey?: string;
}

export class GameStore {
    private state: GameState;
    private listeners: Set<Listener> = new Set();
    private ticker: SecondTicker;

    constructor() {
        const settings = getJSON<Settings>(STORAGE_KEYS.settings, DEFAULT_SETTINGS);
        const persistentStats = getJSON<PersistentStats>(STORAGE_KEYS.records, DEFAULT_STATS);
        const dailyProgress = getJSON<DailyProgress>(STORAGE_KEYS.dailyProgress, {});

        this.state = {
            round: createInitialRoundState(),
            session: {
                round: 0,
                modeId: settings.modeId,
                sessionScore: 0,
                streak: 0,
                sessionWins: 0,
                sessionEnded: false,
                roundAwarded: false,
                lastRoundPoints: 0,
                roundElapsedSeconds: 0,
                modeSecondsLeft: 0,
            },
            settings,
            persistentStats,
            dailyProgress,
            dailyChallengeKey: getTodayChallengeKey(),
            challengeCode: '24-0-0-0-0',
            dealSource: 'random',
            difficulty: { label: '轻快', bonus: 30 },
            solutions: [],
            statusText: '题目已准备好，开始挑战吧。',
        };

        this.ticker = new SecondTicker(() => this.tickSecond());
    }

    getState(): GameState {
        return this.state;
    }

    subscribe(listener: Listener): () => void {
        this.listeners.add(listener);
        return () => { this.listeners.delete(listener); };
    }

    private emit(ev: GameEventPayload): void {
        this.listeners.forEach(l => {
            try { l(ev); } catch (e) { console.error('[GameStore] listener error', e); }
        });
    }

    dispatch(action: RoundAction): void {
        const before = this.state.round;
        const result = reduceRound(before, action);
        if (result.state !== before) {
            this.state = { ...this.state, round: result.state };
        }
        for (const eff of result.effects) {
            this.applyEffect(eff);
        }
        this.emit({ type: 'state-changed' });
    }

    private applyEffect(eff: RoundEffect): void {
        switch (eff.kind) {
            case 'sound':
                this.emit({ type: 'sound', data: eff.name });
                break;
            case 'status':
                this.state = { ...this.state, statusText: eff.text };
                this.emit({ type: 'status-changed', data: eff.text });
                break;
            case 'win-detected':
                this.finishWin();
                break;
            case 'invalid':
                break;
        }
    }

    handleCardClick(itemId: number): void {
        const r = this.state.round;
        if (this.state.session.sessionEnded) return;
        if (r.selectedItemId !== null && r.selectedOperator !== null && r.selectedItemId !== itemId) {
            this.dispatch({
                type: 'APPLY_OPERATION',
                firstId: r.selectedItemId,
                secondId: itemId,
                operator: r.selectedOperator,
                nextId: nextItemId(),
            });
            return;
        }
        this.dispatch({ type: 'SELECT_CARD', itemId });
    }

    handleOperatorClick(operator: Operator): void {
        if (this.state.session.sessionEnded) return;
        this.dispatch({ type: 'SELECT_OPERATOR', operator });
    }

    undo(): void {
        this.dispatch({ type: 'UNDO' });
    }

    resetBoard(): void {
        this.dispatch({ type: 'RESET_BOARD', initialItems: this.state.round.initialItems });
        this.state = { ...this.state, statusText: '已恢复到本局初始状态。' };
        this.emit({ type: 'status-changed', data: this.state.statusText });
    }

    toggleAnswer(): void {
        this.dispatch({ type: 'TOGGLE_ANSWER' });
    }

    async share(): Promise<void> {
        const s = this.state;
        const handText = s.round.initialItems
            .map(it => (it.card ? it.card.rankLabel : it.historyText))
            .join(' ');
        const title = s.round.won
            ? '我用 ' + s.round.steps.length + ' 步解出 ' + handText + '，你来挑战！'
            : '来玩 24 点：' + handText;
        const ok = await shareAppMessage({
            title,
            query: { challenge: s.challengeCode },
        });
        this.state = {
            ...this.state,
            statusText: ok ? '已发起分享，等好友来挑战。' : '分享未完成。',
        };
        this.emit({ type: 'status-changed', data: this.state.statusText });
    }

    async useHint(): Promise<void> {
        const s = this.state;
        if (s.round.won || s.session.sessionEnded) return;
        if (s.round.activeItems.length <= 1) return;
        const count = s.round.hintCount;
        if (count >= 2) {
            this.state = { ...this.state, statusText: '本局提示已达上限（2 次），最后一步自己试试。' };
            this.emit({ type: 'status-changed', data: this.state.statusText });
            return;
        }
        if (count >= 1 && isDouyin()) {
            this.state = { ...this.state, statusText: '正在加载激励视频…' };
            this.emit({ type: 'status-changed', data: this.state.statusText });
            const result = await showRewardedAd('hint');
            if (result !== 'reward') {
                this.state = {
                    ...this.state,
                    statusText: result === 'cancel' ? '广告未完成观看，未解锁新提示。' : '广告加载失败，请稍后再试。',
                };
                this.emit({ type: 'status-changed', data: this.state.statusText });
                return;
            }
        }
        this.dispatch({ type: 'USE_HINT' });
    }

    startRound(input: StartRoundInput): void {
        const difficulty = input.difficulty ?? getDifficultyInfo(input.solutions.length);
        this.dispatch({ type: 'RESET_BOARD', initialItems: input.initialItems });
        this.state = {
            ...this.state,
            session: {
                ...this.state.session,
                round: this.state.session.round + 1,
                roundAwarded: false,
                lastRoundPoints: 0,
                roundElapsedSeconds: 0,
            },
            dealSource: input.dealSource,
            challengeCode: input.challengeCode,
            solutions: input.solutions,
            difficulty,
            dailyChallengeKey: input.dailyKey ?? this.state.dailyChallengeKey,
            statusText: '新题已准备好，本局为' + difficulty.label + '题。点牌和运算符的顺序任意。',
        };
        const mode = GAME_MODES[this.state.session.modeId];
        if (mode.usesCountdown) {
            if (this.state.session.modeSecondsLeft === 0) {
                this.state = {
                    ...this.state,
                    session: { ...this.state.session, modeSecondsLeft: mode.sessionSeconds },
                };
            }
        }
        this.ticker.start();
        this.emit({ type: 'round-started' });
        this.emit({ type: 'state-changed' });
    }

    startSession(modeId: ModeId): void {
        const mode = GAME_MODES[modeId];
        this.state = {
            ...this.state,
            session: {
                round: 0,
                modeId,
                sessionScore: 0,
                streak: 0,
                sessionWins: 0,
                sessionEnded: false,
                roundAwarded: false,
                lastRoundPoints: 0,
                roundElapsedSeconds: 0,
                modeSecondsLeft: mode.usesCountdown ? mode.sessionSeconds : 0,
            },
            settings: { ...this.state.settings, modeId },
        };
        this.persistSettings();
        this.emit({ type: 'state-changed' });
    }

    tickSecond(): void {
        const s = this.state.session;
        if (s.sessionEnded || this.state.round.won) return;
        const mode = GAME_MODES[s.modeId];
        const nextElapsed = s.roundElapsedSeconds + 1;
        if (mode.usesCountdown) {
            const nextLeft = Math.max(0, s.modeSecondsLeft - 1);
            this.state = {
                ...this.state,
                session: { ...s, roundElapsedSeconds: nextElapsed, modeSecondsLeft: nextLeft },
            };
            if (nextLeft === 0) {
                this.finishSprint();
                return;
            }
        } else {
            this.state = {
                ...this.state,
                session: { ...s, roundElapsedSeconds: nextElapsed },
            };
        }
        this.emit({ type: 'state-changed' });
    }

    private finishWin(): void {
        const s = this.state.session;
        if (s.roundAwarded) {
            this.state = {
                ...this.state,
                round: { ...this.state.round, repeatWin: true },
                statusText: '你再次完成了这道题。本局积分和连胜已在首次通关时计入。',
            };
            this.emit({ type: 'state-changed' });
            return;
        }

        const mode = GAME_MODES[s.modeId];
        const roundPoints = calculateRoundPoints({
            usesCountdown: mode.usesCountdown,
            difficultyBonus: this.state.difficulty.bonus,
            modeSecondsLeft: s.modeSecondsLeft,
            roundElapsedSeconds: s.roundElapsedSeconds,
            stepCount: this.state.round.steps.length,
            hintCount: this.state.round.hintCount,
            answerUsed: this.state.round.answerUsed,
        });

        const nextSession: SessionState = {
            ...s,
            roundAwarded: true,
            lastRoundPoints: roundPoints,
            sessionScore: s.sessionScore + roundPoints,
            streak: s.streak + 1,
            sessionWins: s.sessionWins + 1,
        };

        const stats = this.state.persistentStats;
        const nextStats: PersistentStats = {
            bestRoundScore: Math.max(stats.bestRoundScore, roundPoints),
            bestSprintScore: mode.usesCountdown
                ? Math.max(stats.bestSprintScore, nextSession.sessionScore)
                : stats.bestSprintScore,
            bestStreak: Math.max(stats.bestStreak, nextSession.streak),
            fastestWinSeconds:
                stats.fastestWinSeconds === null || s.roundElapsedSeconds < stats.fastestWinSeconds
                    ? s.roundElapsedSeconds
                    : stats.fastestWinSeconds,
            totalWins: stats.totalWins + 1,
        };

        let nextDaily = this.state.dailyProgress;
        if (this.state.dealSource === 'daily') {
            const key = this.state.dailyChallengeKey;
            const prev = nextDaily[key];
            const prevBest = prev && prev.bestSeconds !== null ? prev.bestSeconds : null;
            nextDaily = {
                ...nextDaily,
                [key]: {
                    completed: true,
                    bestSeconds: prevBest === null ? s.roundElapsedSeconds : Math.min(prevBest, s.roundElapsedSeconds),
                    firstCompletedAt: prev && prev.firstCompletedAt ? prev.firstCompletedAt : Date.now(),
                },
            };
        }

        this.state = {
            ...this.state,
            session: nextSession,
            persistentStats: nextStats,
            dailyProgress: nextDaily,
            statusText: mode.usesCountdown
                ? '通关成功，本题获得 ' + roundPoints + ' 分。总分 ' + nextSession.sessionScore + '。'
                : '恭喜，结果正好是 24。本局获得 ' + roundPoints + ' 分，连胜 ' + nextSession.streak + '。',
        };

        if (!mode.usesCountdown) this.ticker.stop();
        this.persistStats();
        if (this.state.dealSource === 'daily') this.persistDaily();

        this.emit({ type: 'sound', data: 'win' as SoundName });
        this.emit({ type: 'round-won', data: roundPoints });
        this.emit({ type: 'state-changed' });
    }

    private finishSprint(): void {
        if (this.state.session.sessionEnded) return;
        this.state = {
            ...this.state,
            session: { ...this.state.session, sessionEnded: true, modeSecondsLeft: 0 },
            round: { ...this.state.round, selectedItemId: null, selectedOperator: null },
            statusText:
                '限时结束，本轮共完成 ' + this.state.session.sessionWins +
                ' 题，累计 ' + this.state.session.sessionScore + ' 分。',
        };
        this.ticker.stop();
        this.emit({ type: 'session-ended' });
        this.emit({ type: 'state-changed' });
    }

    updateSettings(patch: Partial<Settings>): void {
        this.state = { ...this.state, settings: { ...this.state.settings, ...patch } };
        this.persistSettings();
        this.emit({ type: 'state-changed' });
    }

    destroy(): void {
        this.ticker.stop();
        this.listeners.clear();
    }

    private persistSettings(): void {
        setJSON(STORAGE_KEYS.settings, this.state.settings);
    }
    private persistStats(): void {
        setJSON(STORAGE_KEYS.records, this.state.persistentStats);
    }
    private persistDaily(): void {
        setJSON(STORAGE_KEYS.dailyProgress, this.state.dailyProgress);
    }
}
