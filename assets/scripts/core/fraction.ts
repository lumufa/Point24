import { TARGET_RESULT, SOLVER_EPSILON } from './constants';

export type Fraction = { num: number; den: number };
export type Operator = '+' | '-' | '*' | '/';

export function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const t = x % y;
    x = y;
    y = t;
  }
  return x || 1;
}

export function normalizeFraction(num: number, den: number): Fraction | null {
  if (den === 0) return null;
  let n = num;
  let d = den;
  if (d < 0) {
    n = -n;
    d = -d;
  }
  const g = gcd(n, d);
  return { num: n / g, den: d / g };
}

export function operateFractions(left: Fraction, right: Fraction, op: Operator): Fraction | null {
  if (op === '+') return normalizeFraction(left.num * right.den + right.num * left.den, left.den * right.den);
  if (op === '-') return normalizeFraction(left.num * right.den - right.num * left.den, left.den * right.den);
  if (op === '*') return normalizeFraction(left.num * right.num, left.den * right.den);
  if (op === '/') {
    if (right.num === 0) return null;
    return normalizeFraction(left.num * right.den, left.den * right.num);
  }
  return null;
}

export function approximateFractionValue(v: Fraction | null | undefined): number {
  if (!v || !Number.isFinite(v.num) || !Number.isFinite(v.den) || v.den === 0) return Number.NaN;
  return v.num / v.den;
}

export function isTargetValue(v: Fraction | null | undefined): boolean {
  return Math.abs(approximateFractionValue(v) - TARGET_RESULT) <= SOLVER_EPSILON;
}
