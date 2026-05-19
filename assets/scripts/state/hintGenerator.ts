import { findSolutionPath } from '../core/solver';
import type { Item as SolverItem } from '../core/solver';
import type { Item, HintStep } from './types';

export function findNextHint(activeItems: Item[]): HintStep | null {
    if (activeItems.length <= 1) return null;
    const solverItems: SolverItem[] = activeItems.map(it => ({
        id: String(it.id),
        num: it.num,
        den: it.den,
    }));
    const path = findSolutionPath(solverItems);
    if (!path || path.length === 0) return null;
    const first = path[0];
    return {
        leftId: Number(first.leftId),
        rightId: Number(first.rightId),
        operator: first.operator,
        leftLabel: first.leftLabel,
        rightLabel: first.rightLabel,
        resultLabel: first.resultLabel,
    };
}
