import { type Fraction, type Operator, operateFractions } from './fraction';
import { wrapExpression, trimOuterParentheses, rankLabel, makeValueLabel, OPERATOR_SYMBOLS } from './expression';

export type CardLike = { rank: number };

type SearchNode = { num: number; den: number; expr: string };
type IdNode = SearchNode & { id: string };

export type Item = { id: string; num: number; den: number; expr?: string };

export type HintStep = {
  leftId: string;
  rightId: string;
  operator: Operator;
  leftLabel: string;
  rightLabel: string;
  resultLabel: string;
};

export function sortSolutions(list: ReadonlyArray<string>): string[] {
  return [...list].sort((a, b) => {
    if (a.length === b.length) return a.localeCompare(b, 'zh-CN');
    return a.length - b.length;
  });
}

export function solve24(cards: ReadonlyArray<CardLike>): string[] {
  const initial: SearchNode[] = cards.map((c) => ({
    num: c.rank,
    den: 1,
    expr: rankLabel(c.rank),
  }));

  const solutions = new Set<string>();

  function dfs(nodes: SearchNode[]): void {
    if (nodes.length === 1) {
      if (nodes[0].num === 24 * nodes[0].den) {
        solutions.add(trimOuterParentheses(nodes[0].expr));
      }
      return;
    }

    for (let first = 0; first < nodes.length; first += 1) {
      for (let second = first + 1; second < nodes.length; second += 1) {
        const L = nodes[first];
        const R = nodes[second];
        const rest = nodes.filter((_, i) => i !== first && i !== second);

        const tryOp = (frac: Fraction | null, expr: string) => {
          if (frac) dfs([...rest, { num: frac.num, den: frac.den, expr }]);
        };

        tryOp(operateFractions(L, R, '+'), wrapExpression(`${L.expr} + ${R.expr}`));
        tryOp(operateFractions(L, R, '-'), wrapExpression(`${L.expr} − ${R.expr}`));
        tryOp(operateFractions(R, L, '-'), wrapExpression(`${R.expr} − ${L.expr}`));
        tryOp(operateFractions(L, R, '*'), wrapExpression(`${L.expr} × ${R.expr}`));
        tryOp(operateFractions(L, R, '/'), wrapExpression(`${L.expr} ÷ ${R.expr}`));
        tryOp(operateFractions(R, L, '/'), wrapExpression(`${R.expr} ÷ ${L.expr}`));
      }
    }
  }

  dfs(initial);
  return sortSolutions([...solutions]);
}

export function findSolutionPath(items: ReadonlyArray<Item>): HintStep[] | null {
  const initial: IdNode[] = items.map((it) => ({
    id: it.id,
    num: it.num,
    den: it.den,
    expr: it.expr || makeValueLabel(it.num, it.den),
  }));

  let seed = 1;

  function search(nodes: IdNode[]): HintStep[] | null {
    if (nodes.length === 1) return nodes[0].num === 24 * nodes[0].den ? [] : null;

    for (let first = 0; first < nodes.length; first += 1) {
      for (let second = first + 1; second < nodes.length; second += 1) {
        const L = nodes[first];
        const R = nodes[second];
        const rest = nodes.filter((_, i) => i !== first && i !== second);

        const options: Array<{ op: Operator; l: IdNode; r: IdNode }> = [
          { op: '+', l: L, r: R },
          { op: '-', l: L, r: R },
          { op: '-', l: R, r: L },
          { op: '*', l: L, r: R },
          { op: '/', l: L, r: R },
          { op: '/', l: R, r: L },
        ];

        for (const opt of options) {
          const frac = operateFractions(opt.l, opt.r, opt.op);
          if (!frac) continue;
          const nextNode: IdNode = {
            id: `hint-${seed}`,
            num: frac.num,
            den: frac.den,
            expr: wrapExpression(`${opt.l.expr} ${OPERATOR_SYMBOLS[opt.op]} ${opt.r.expr}`),
          };
          seed += 1;
          const rec = search([...rest, nextNode]);
          if (rec) {
            return [
              {
                leftId: opt.l.id,
                rightId: opt.r.id,
                operator: opt.op,
                leftLabel: makeValueLabel(opt.l.num, opt.l.den),
                rightLabel: makeValueLabel(opt.r.num, opt.r.den),
                resultLabel: makeValueLabel(frac.num, frac.den),
              },
              ...rec,
            ];
          }
        }
      }
    }

    return null;
  }

  return search(initial);
}

export function getDifficultyInfo(solutionCount: number): { label: '轻快' | '进阶' | '刁钻'; bonus: number } {
  if (solutionCount <= 3) return { label: '刁钻', bonus: 90 };
  if (solutionCount <= 8) return { label: '进阶', bonus: 60 };
  return { label: '轻快', bonus: 30 };
}
