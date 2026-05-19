export type Difficulty = { label: '轻快' | '进阶' | '刁钻'; bonus: number };

export function getDifficultyInfo(solutionCount: number): Difficulty {
  if (solutionCount <= 3) return { label: '刁钻', bonus: 90 };
  if (solutionCount <= 8) return { label: '进阶', bonus: 60 };
  return { label: '轻快', bonus: 30 };
}

export type RoundContext = {
  usesCountdown: boolean;
  difficultyBonus: number;
  modeSecondsLeft: number;
  roundElapsedSeconds: number;
  stepCount: number;
  hintCount: number;
  answerUsed: boolean;
};

export function calculateRoundPoints(ctx: RoundContext): number {
  const base = ctx.usesCountdown ? 100 + ctx.difficultyBonus : 180 + ctx.difficultyBonus;
  const timeFactor = ctx.usesCountdown
    ? Math.min(ctx.modeSecondsLeft, 40)
    : Math.max(0, 45 - Math.min(ctx.roundElapsedSeconds, 45));
  const stepPenalty = Math.max(0, ctx.stepCount - 3) * 8;
  const hintPenalty = ctx.hintCount * 20;
  const answerPenalty = ctx.answerUsed ? 50 : 0;
  return Math.max(30, base + timeFactor - stepPenalty - hintPenalty - answerPenalty);
}
