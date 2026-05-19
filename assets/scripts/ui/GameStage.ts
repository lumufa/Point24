import { _decorator, Component, Node, Label } from 'cc';
import { THEME } from './theme';
import { GameStore, nextItemId } from '../state/GameStore';
import type { GameEventPayload } from '../state/GameStore';
import type { Item } from '../state/types';
import type { Operator } from '../core/fraction';
import type { Card } from '../core/deck';
import { makeRandomDeal, buildDailyDeal } from '../core/deal';
import { rankLabel, OPERATOR_SYMBOLS } from '../core/expression';
import { logEnv } from '../platform/tt-env';
import { SoundManager } from '../audio/SoundManager';
import type { SoundName } from '../state/roundReducer';
import { CardView } from './CardView';
import { OperatorPad } from './OperatorPad';
import { ModePad } from './ModePad';
import type { ModeChoice } from './ModePad';
import { attachButtonStyle } from './buttonStyle';

const { ccclass, property } = _decorator;

function cardToItem(card: Card): Item {
    return {
        id: nextItemId(),
        num: card.rank,
        den: 1,
        originKind: 'card',
        card: {
            rank: card.rank,
            suit: card.suit.symbol,
            rankLabel: rankLabel(card.rank),
        },
        historyText: rankLabel(card.rank),
    };
}

@ccclass('GameStage')
export class GameStage extends Component {
    @property([CardView]) cardViews: CardView[] = [];
    @property(OperatorPad) operatorPad: OperatorPad | null = null;
    @property(ModePad) modePad: ModePad | null = null;
    @property(Label) statusLabel: Label | null = null;
    @property(Label) expressionLabel: Label | null = null;
    @property(Label) scoreLabel: Label | null = null;
    @property(Label) streakLabel: Label | null = null;
    @property(Label) timerLabel: Label | null = null;
    @property(Node) btnNewRound: Node | null = null;
    @property(Node) btnUndo: Node | null = null;
    @property(Node) btnReset: Node | null = null;
    @property(Node) btnHint: Node | null = null;
    @property(Node) btnShare: Node | null = null;
    @property(Label) hintLabel: Label | null = null;

    private store: GameStore | null = null;
    private sound: SoundManager = new SoundManager();
    private currentChoice: ModeChoice = 'classic';

    onLoad() {
        console.log('[GameStage] boot, env=' + logEnv());

        this.store = new GameStore();
        const initSettings = this.store.getState().settings;
        this.sound.update({
            enabled: initSettings.soundEnabled,
            volume: initSettings.masterVolume * initSettings.effectsVolume,
        });
        this.store.subscribe((ev: GameEventPayload) => this.onStoreEvent(ev));

        for (const cv of this.cardViews) {
            cv.node.on('card-tap', (id: number) => { this.store?.handleCardClick(id); }, this);
        }
        if (this.operatorPad) {
            this.operatorPad.node.on('op-tap', (op: Operator) => { this.store?.handleOperatorClick(op); }, this);
        }
        if (this.btnNewRound) this.btnNewRound.on(Node.EventType.TOUCH_END, this.nextRound, this);
        if (this.btnUndo) this.btnUndo.on(Node.EventType.TOUCH_END, () => { this.store?.undo(); }, this);
        if (this.btnReset) this.btnReset.on(Node.EventType.TOUCH_END, () => { this.store?.resetBoard(); }, this);
        if (this.btnHint) this.btnHint.on(Node.EventType.TOUCH_END, () => { this.store?.useHint(); }, this);
        if (this.btnShare) this.btnShare.on(Node.EventType.TOUCH_END, () => { this.store?.share(); }, this);

        attachButtonStyle(this.btnNewRound, 'primary');
        attachButtonStyle(this.btnUndo);
        attachButtonStyle(this.btnReset);
        attachButtonStyle(this.btnHint);
        attachButtonStyle(this.btnShare, 'primary');
        if (this.modePad) {
            this.modePad.node.on('mode-tap', (choice: ModeChoice) => { this.onModeChange(choice); }, this);
        }

        this.store.startSession('classic');
        this.nextRound();
    }

    private onModeChange(choice: ModeChoice): void {
        if (!this.store) return;
        if (choice === this.currentChoice) return;
        this.currentChoice = choice;
        const modeId = choice === 'sprint' ? 'sprint' : 'classic';
        this.store.startSession(modeId);
        this.nextRound();
        if (this.modePad) this.modePad.refresh(choice);
    }

    onDestroy() {
        if (this.store) {
            this.store.destroy();
            this.store = null;
        }
    }

    private onStoreEvent(ev: GameEventPayload): void {
        if (ev.type === 'sound') {
            this.sound.play(ev.data as SoundName);
            return;
        }
        if (ev.type === 'round-won') {
            console.log('[GameStage] round-won points =', ev.data);
            this.scheduleAutoNextIfSprint();
        } else if (ev.type === 'session-ended') {
            console.log('[GameStage] session-ended');
        }
        this.repaint();
    }

    private scheduleAutoNextIfSprint(): void {
        if (!this.store) return;
        const s = this.store.getState();
        if (s.session.modeId !== 'sprint') return;
        this.scheduleOnce(() => {
            if (!this.store) return;
            const state = this.store.getState();
            if (state.session.modeId === 'sprint' && !state.session.sessionEnded) {
                this.nextRound();
            }
        }, 0.8);
    }

    private nextRound(): void {
        if (!this.store) return;
        const deal = this.currentChoice === 'daily' ? buildDailyDeal() : makeRandomDeal();
        const items: Item[] = deal.hand.map(cardToItem);
        this.store.startRound({
            initialItems: items,
            dealSource: deal.source,
            challengeCode: deal.challengeCode,
            solutions: deal.solutions,
            dailyKey: deal.dailyKey,
        });
    }

    private formatCountdown(seconds: number): string {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return m + ':' + (s < 10 ? '0' + s : s);
    }

    private repaint(): void {
        if (!this.store) return;
        const s = this.store.getState();
        const r = s.round;

        for (let i = 0; i < this.cardViews.length; i++) {
            const item = r.activeItems[i] ?? null;
            const selected = item !== null && item.id === r.selectedItemId;
            const fresh = item !== null && item.id === r.freshItemId;
            this.cardViews[i].refresh(item, selected, fresh);
        }

        if (this.operatorPad) this.operatorPad.refresh(r.selectedOperator);
        if (this.modePad) this.modePad.refresh(this.currentChoice);

        if (this.statusLabel) {
            this.statusLabel.string = s.statusText;
            this.statusLabel.color = THEME.textMuted;
        }
        if (this.scoreLabel) {
            this.scoreLabel.string = '分数: ' + s.session.sessionScore;
            this.scoreLabel.color = THEME.textDark;
        }
        if (this.streakLabel) {
            this.streakLabel.string = '连胜: ' + s.session.streak;
            this.streakLabel.color = THEME.textDark;
        }
        if (this.timerLabel) {
            if (s.session.modeId === 'sprint') {
                this.timerLabel.node.active = true;
                this.timerLabel.string = '剩余 ' + this.formatCountdown(s.session.modeSecondsLeft);
                this.timerLabel.color = THEME.statusWarn;
            } else {
                this.timerLabel.node.active = false;
            }
        }
        if (this.expressionLabel) {
            const selItem = r.selectedItemId !== null
                ? r.activeItems.find(it => it.id === r.selectedItemId)
                : null;
            const head = selItem ? selItem.historyText : '';
            const op = r.selectedOperator ?? '';
            this.expressionLabel.string = head + (op ? ' ' + op + ' ?' : '');
        }
        if (this.hintLabel) {
            const h = r.hintNextStep;
            if (h) {
                this.hintLabel.node.active = true;
                this.hintLabel.string =
                    '下一步提示: ' + h.leftLabel + ' ' + OPERATOR_SYMBOLS[h.operator] + ' ' + h.rightLabel + ' = ' + h.resultLabel +
                    '\n(本局已用提示 ' + r.hintCount + '/2)';
                this.hintLabel.color = THEME.btnPrimary;
            } else {
                this.hintLabel.node.active = false;
            }
        }

        if (this.expressionLabel) this.expressionLabel.color = THEME.textDark;
    }
}
