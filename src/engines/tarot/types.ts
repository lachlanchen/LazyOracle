export type Arcana = 'major' | 'minor'
export type Suit = 'wands' | 'cups' | 'swords' | 'pentacles'
export type Rank = 'ace' | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 'page' | 'knight' | 'queen' | 'king'

export interface CardText {
  /** Card name. */
  name: string
  /** Short keywords for the upright card. */
  upright: string[]
  /** Short keywords for the reversed card. */
  reversed: string[]
}

export interface TarotCard {
  /** Stable id, e.g. `major-00`, `wands-07`, `cups-queen`. */
  id: string
  arcana: Arcana
  /** 0–21 for the major arcana. */
  number?: number
  suit?: Suit
  rank?: Rank
  /** Roman numeral or rank label shown on the face. */
  label: string
  /** Element the card belongs to (majors have a traditional attribution). */
  element: 'fire' | 'water' | 'air' | 'earth' | 'spirit'
  text: { en: CardText; zh: CardText }
}

export type Orientation = 'upright' | 'reversed'

export interface SpreadPosition {
  id: string
  /** Position label in English and Chinese. */
  name: { en: string; zh: string }
  /** What this position asks of the card. */
  question: { en: string; zh: string }
  /** Layout hint for the visual, in a 0–1 grid; `rotate` marks the crossing card. */
  layout: { x: number; y: number; rotate?: boolean }
}

export interface Spread {
  id: 'one' | 'three' | 'celtic'
  name: { en: string; zh: string }
  positions: SpreadPosition[]
}

export interface DrawnCard {
  position: SpreadPosition
  card: TarotCard
  orientation: Orientation
}

export interface TarotDraw {
  spread: Spread
  /** Seed the draw was made from, so it can be reproduced. */
  seed: number
  cards: DrawnCard[]
  question: string
  drawnAt: string
}
