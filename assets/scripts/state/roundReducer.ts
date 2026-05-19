import { operateFractions } from '../core/fraction';
import { OPERATOR_SYMBOLS, makeValueLabel } from '../core/expression';
import type { Operator } from '../core/fraction';
import type { Item, RoundState, RoundSnapshot, RoundStep } from './types';
import { findNextHint } from './hintGenerator';

export type RoundAction =
    | { type: 'RESET_BOARD'; initialItems: Item[] }
    | { type: 'SELECT_CARD'; itemId: number }
    | { type: 'SELECT_OPERATOR'; operator: Operator }
    | { type: 'APPLY_OPERATION'; firstId: number; secondId: number; operator: Operator; nextId: number }
    | { type: 'UNDO' }
    | { type: 'TOGGLE_ANSWER' }
    | { type: 'USE_HINT' };

export type SoundName = 'select' | 'merge' | 'error' | 'win';

export type RoundEffect =
    | { kind: 'sound'; name: SoundName }
    | { kind: 'status'; text: string }
    | { kind: 'win-detected' }
    | { kind: 'invalid' };

export interface ReduceResult {
    state: RoundState;
    effects: RoundEffect[];
}

function cloneItem(it: Item): Item {
    return {
        id: it.id,
        num: it.num,
        den: it.den,
        originKind: it.originKind,
        card: it.card ? { ...it.card } : null,
        historyText: it.historyText,
    };
}
function cloneItems(items: Item[]): Item[] {
    return items.map(cloneItem);
}
function cloneSteps(steps: RoundStep[]): RoundStep[] {
    return steps.map(s => ({ id: s.id, text: s.text }));
}

function snapshotOf(state: RoundState): RoundSnapshot {
    return {
        activeItems: cloneItems(state.activeItems),
        selectedItemId: state.selectedItemId,
        selectedOperator: state.selectedOperator,
        steps: cloneSteps(state.steps),
        won: state.won,
    };
}

export function createInitialRoundState(): RoundState {
    return {
        initialItems: [],
        activeItems: [],
        selectedItemId: null,
        selectedOperator: null,
        steps: [],
        history: [],
        freshItemId: null,
        won: false,
        repeatWin: false,
        answerVisible: false,
        answerUsed: false,
        hintCount: 0,
        hintNextStep: null,
    };
}

export function reduceRound(state: RoundState, action: RoundAction): ReduceResult {
    switch (action.type) {
        case 'RESET_BOARD': {
            const initial = cloneItems(action.initialItems);
            return {
                state: {
                    initialItems: initial,
                    activeItems: cloneItems(initial),
                    selectedItemId: null,
                    selectedOperator: null,
                    steps: [],
                    history: [],
                    freshItemId: null,
                    won: false,
                    repeatWin: false,
                    answerVisible: false,
                    answerUsed: false,
                    hintCount: 0,
                    hintNextStep: null,
                },
                effects: [],
            };
        }

        case 'SELECT_CARD': {
            if (state.won || state.activeItems.length <= 1) return { state, effects: [] };
            if (state.selectedItemId === null) {
                const nextStatus = state.selectedOperator
                    ? '已选中首卡，再点一张牌完成运算。'
                    : '已选中第一张牌，请继续选择运算符。';
                return {
                    state: { ...state, selectedItemId: action.itemId },
                    effects: [
                        { kind: 'sound', name: 'select' },
                        { kind: 'status', text: nextStatus },
                    ],
                };
            }
            if (state.selectedItemId === action.itemId) {
                if (state.selectedOperator) {
                    return {
                        state: { ...state, selectedOperator: null },
                        effects: [
                            { kind: 'sound', name: 'select' },
                            { kind: 'status', text: '已取消当前运算符，请重新选择。' },
                        ],
                    };
                }
                return {
                    state: { ...state, selectedItemId: null },
                    effects: [
                        { kind: 'sound', name: 'select' },
                        { kind: 'status', text: '已取消当前选牌。' },
                    ],
                };
            }
            if (!state.selectedOperator) {
                return {
                    state: { ...state, selectedItemId: action.itemId },
                    effects: [
                        { kind: 'sound', name: 'select' },
                        { kind: 'status', text: '已切换第一张牌，请继续选择运算符。' },
                    ],
                };
            }
            return { state, effects: [] };
        }

        case 'SELECT_OPERATOR': {
            if (state.won) return { state, effects: [] };
            if (state.selectedOperator === action.operator) {
                return {
                    state: { ...state, selectedOperator: null },
                    effects: [
                        { kind: 'sound', name: 'select' },
                        { kind: 'status', text: '已取消当前运算符。' },
                    ],
                };
            }
            const effects: RoundEffect[] = [{ kind: 'sound', name: 'select' }];
            if (state.selectedItemId === null) {
                effects.push({
                    kind: 'status',
                    text: '已选中 ' + OPERATOR_SYMBOLS[action.operator] + '，请选择两张牌。',
                });
            }
            return {
                state: { ...state, selectedOperator: action.operator },
                effects,
            };
        }

        case 'APPLY_OPERATION': {
            const { firstId, secondId, operator, nextId } = action;
            const left = state.activeItems.find(it => it.id === firstId);
            const right = state.activeItems.find(it => it.id === secondId);
            if (!left || !right) return { state, effects: [{ kind: 'invalid' }] };

            const result = operateFractions(
                { num: left.num, den: left.den },
                { num: right.num, den: right.den },
                operator,
            );
            if (!result) {
                return {
                    state,
                    effects: [
                        { kind: 'sound', name: 'error' },
                        { kind: 'status', text: '该步无法执行，不能除以 0。' },
                    ],
                };
            }

            const snap = snapshotOf(state);
            const firstIndex = state.activeItems.findIndex(it => it.id === firstId);
            const secondIndex = state.activeItems.findIndex(it => it.id === secondId);
            const insertAt = Math.min(firstIndex, secondIndex);
            const resultLabel = makeValueLabel(result.num, result.den);
            const resultItem: Item = {
                id: nextId,
                num: result.num,
                den: result.den,
                originKind: 'result',
                card: null,
                historyText: resultLabel,
            };
            const filtered = state.activeItems.filter(it => it.id !== firstId && it.id !== secondId);
            filtered.splice(insertAt, 0, resultItem);

            const stepText =
                makeValueLabel(left.num, left.den) +
                ' ' + OPERATOR_SYMBOLS[operator] + ' ' +
                makeValueLabel(right.num, right.den) +
                ' = ' + resultLabel;
            const nextSteps = state.steps.concat({ id: nextId, text: stepText });

            const isTarget = filtered.length === 1 && resultItem.num === 24 * resultItem.den;

            const nextState: RoundState = {
                ...state,
                activeItems: filtered,
                selectedItemId: null,
                selectedOperator: null,
                freshItemId: resultItem.id,
                steps: nextSteps,
                history: state.history.concat(snap),
                won: isTarget,
                hintNextStep: null,
            };

            const effects: RoundEffect[] = [{ kind: 'sound', name: 'merge' }];
            if (isTarget) {
                effects.push({ kind: 'win-detected' });
            } else if (filtered.length === 1) {
                effects.push({
                    kind: 'status',
                    text: '最后结果是 ' + resultLabel + '，还不是 24。可以撤销、重置，或查看答案。',
                });
            } else {
                effects.push({
                    kind: 'status',
                    text: '已得到新结果 ' + resultLabel + '，继续选择下一步。',
                });
            }
            return { state: nextState, effects };
        }

        case 'UNDO': {
            if (state.history.length === 0) {
                return {
                    state,
                    effects: [{ kind: 'status', text: '现在还没有可以撤销的步骤。' }],
                };
            }
            const last = state.history[state.history.length - 1];
            return {
                state: {
                    ...state,
                    activeItems: cloneItems(last.activeItems),
                    selectedItemId: last.selectedItemId,
                    selectedOperator: last.selectedOperator,
                    steps: cloneSteps(last.steps),
                    won: last.won,
                    repeatWin: false,
                    freshItemId: null,
                    history: state.history.slice(0, -1),
                    hintNextStep: null,
                },
                effects: [
                    { kind: 'sound', name: 'select' },
                    { kind: 'status', text: '已撤销上一步，你可以重新选择运算。' },
                ],
            };
        }

        case 'TOGGLE_ANSWER': {
            const next = !state.answerVisible;
            return {
                state: {
                    ...state,
                    answerVisible: next,
                    answerUsed: state.answerUsed || next,
                },
                effects: [],
            };
        }

        case 'USE_HINT': {
            if (state.won || state.activeItems.length <= 1) return { state, effects: [] };
            const hint = findNextHint(state.activeItems);
            if (!hint) {
                return {
                    state,
                    effects: [
                        { kind: 'sound', name: 'error' },
                        { kind: 'status', text: '当前局面无法凑出 24，建议撤销或重置。' },
                    ],
                };
            }
            return {
                state: {
                    ...state,
                    hintCount: state.hintCount + 1,
                    hintNextStep: hint,
                },
                effects: [
                    { kind: 'sound', name: 'select' },
                    { kind: 'status', text: '已解锁一条提示，详见下方提示栏。' },
                ],
            };
        }

        default:
            return { state, effects: [] };
    }
}
