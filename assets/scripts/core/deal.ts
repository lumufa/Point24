import { type Card, SUITS, createDeck, shuffle, shuffleWithRandom } from './deck';
import { createSeedFromText, createSeededRandom, getTodayChallengeKey } from './seed';
import { solve24 } from './solver';

export type DealSource = 'random' | 'daily' | 'challenge';

export type Deal = {
  hand: Card[];
  solutions: string[];
  source: DealSource;
  challengeCode: string;
  dailyKey?: string;
};

export type DailyTemplate = {
  dateKey: string;
  ranks: number[];
  solutions: string[];
};

export function encodeChallengeCode(ranks: ReadonlyArray<number>): string {
  return `24-${ranks.join('-')}`;
}

export function normalizeChallengeCodeText(raw: string): string {
  return String(raw || '')
    .trim()
    .replace(/[，,\s/]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^24点-?/i, '24-')
    .replace(/^24POINT-?/i, '24-');
}

export type ParseResult =
  | { ok: true; ranks: number[]; code: string }
  | { ok: false; error: string };

export function parseChallengeCode(raw: string): ParseResult {
  const normalized = normalizeChallengeCodeText(raw);
  if (!normalized) return { ok: false, error: '请输入挑战码。' };

  let parts = normalized.split('-').filter(Boolean);
  if (parts[0] === '24') parts = parts.slice(1);
  if (parts.length !== 4) return { ok: false, error: '挑战码需要正好包含 4 个数字。' };

  const ranks = parts.map((p) => Number(p));
  if (ranks.some((r) => !Number.isInteger(r) || r < 1 || r > 13)) {
    return { ok: false, error: '挑战码中的数字必须都在 1 到 13 之间。' };
  }

  return { ok: true, ranks, code: encodeChallengeCode(ranks) };
}

export function createHandFromRanks(ranks: ReadonlyArray<number>): Card[] {
  return ranks.map((rank, index) => ({
    id: `challenge-${Date.now()}-${index}-${rank}`,
    rank,
    suit: SUITS[index % SUITS.length],
  }));
}

export function generateSolvableDeal(): { hand: Card[]; solutions: string[] } {
  for (let attempts = 0; attempts < 2000; attempts += 1) {
    const hand = shuffle(createDeck()).slice(0, 4);
    const solutions = solve24(hand);
    if (solutions.length > 0) return { hand, solutions };
  }
  throw new Error('未能生成可解题目，请稍后重试。');
}

export function makeRandomDeal(): Deal {
  const { hand, solutions } = generateSolvableDeal();
  return {
    hand,
    solutions,
    source: 'random',
    challengeCode: encodeChallengeCode(hand.map((c) => c.rank)),
  };
}

const dailyCache = new Map<string, DailyTemplate>();

export function getDailyChallengeTemplate(dateKey: string = getTodayChallengeKey()): DailyTemplate {
  const cached = dailyCache.get(dateKey);
  if (cached) return cached;

  const rand = createSeededRandom(createSeedFromText(`24-daily-${dateKey}`));
  const deck = createDeck();

  for (let attempts = 0; attempts < 2000; attempts += 1) {
    const hand = shuffleWithRandom(deck, rand).slice(0, 4);
    const solutions = solve24(hand);
    if (solutions.length > 0) {
      const tpl: DailyTemplate = { dateKey, ranks: hand.map((c) => c.rank), solutions };
      dailyCache.set(dateKey, tpl);
      return tpl;
    }
  }

  throw new Error('未能生成今日挑战，请稍后重试。');
}

export function buildDailyDeal(dateKey: string = getTodayChallengeKey()): Deal {
  const tpl = getDailyChallengeTemplate(dateKey);
  return {
    hand: createHandFromRanks(tpl.ranks),
    solutions: [...tpl.solutions],
    source: 'daily',
    challengeCode: encodeChallengeCode(tpl.ranks),
    dailyKey: tpl.dateKey,
  };
}

export function buildDealFromHand(
  hand: ReadonlyArray<Card>,
  source: DealSource = 'random',
  challengeCode: string | null = null,
): Deal {
  const solutions = solve24(hand);
  if (solutions.length === 0) throw new Error('这组挑战码无解，已拒绝载入。');
  const ranks = hand.map((c) => c.rank);
  return {
    hand: [...hand],
    solutions,
    source,
    challengeCode: challengeCode ?? encodeChallengeCode(ranks),
  };
}
