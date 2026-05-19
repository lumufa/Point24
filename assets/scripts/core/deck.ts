export type SuitColor = 'black' | 'red';
export type Suit = { symbol: string; color: SuitColor; name: string };
export type Card = { id: string; suit: Suit; rank: number };

export const SUITS: ReadonlyArray<Suit> = [
  { symbol: '♠', color: 'black', name: 'spade' },
  { symbol: '♥', color: 'red',   name: 'heart' },
  { symbol: '♣', color: 'black', name: 'club' },
  { symbol: '♦', color: 'red',   name: 'diamond' },
];

export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (let rank = 1; rank <= 13; rank += 1) {
      deck.push({ id: `card-${suit.name}-${rank}`, suit, rank });
    }
  }
  return deck;
}

export function shuffle<T>(list: ReadonlyArray<T>): T[] {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function shuffleWithRandom<T>(list: ReadonlyArray<T>, rand: () => number): T[] {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
