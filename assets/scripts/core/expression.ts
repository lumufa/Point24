export const OPERATOR_SYMBOLS: Record<string, string> = {
  '+': '+',
  '-': '−',
  '*': '×',
  '/': '÷',
};

export function wrapExpression(expr: string): string {
  return `(${expr})`;
}

export function trimOuterParentheses(expr: string): string {
  let cur = expr.trim();
  while (cur.startsWith('(') && cur.endsWith(')')) {
    let depth = 0;
    let balanced = true;
    for (let i = 0; i < cur.length; i += 1) {
      const c = cur[i];
      if (c === '(') depth += 1;
      else if (c === ')') depth -= 1;
      if (depth === 0 && i < cur.length - 1) {
        balanced = false;
        break;
      }
    }
    if (!balanced) break;
    cur = cur.slice(1, -1).trim();
  }
  return cur;
}

export function rankLabel(rank: number): string {
  if (rank === 1) return 'A';
  if (rank === 11) return 'J';
  if (rank === 12) return 'Q';
  if (rank === 13) return 'K';
  return String(rank);
}

export function makeValueLabel(num: number, den: number): string {
  if (den === 1) return String(num);
  return `${num}/${den}`;
}

export function formatDuration(totalSeconds: number | null | undefined): string {
  if (totalSeconds === null || totalSeconds === undefined) return '--:--';
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
