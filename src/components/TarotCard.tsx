import type { TarotCard as Card, Orientation } from '../engines/tarot/types'

interface TarotCardProps {
  card: Card
  orientation: Orientation
  revealed: boolean
  language: 'en' | 'zh'
  /** Position label under the card. */
  label?: string
  onReveal?: () => void
  size?: 'small' | 'large'
  /** The crossing card in a Celtic cross lies on its side. */
  crossed?: boolean
  testId?: string
}

function SuitGlyph({ suit }: { suit: NonNullable<Card['suit']> }) {
  switch (suit) {
    case 'wands':
      return (
        <g stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round">
          <path d="M20 44 L44 20" />
          <path d="M40 16 c4 -2 8 -2 10 2 c-2 4 -6 6 -10 4 c-1 -2 -1 -4 0 -6z" fill="currentColor" stroke="none" />
          <path d="M23 47 c-2 2 -4 2 -6 0 c2 -2 4 -2 6 0z" fill="currentColor" stroke="none" />
        </g>
      )
    case 'cups':
      return (
        <g stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round">
          <path d="M18 20 h28 c0 12 -6 18 -14 18 c-8 0 -14 -6 -14 -18z" />
          <path d="M32 38 v8 M22 48 h20" />
          <path d="M24 26 h16" strokeWidth="1.2" opacity=".6" />
        </g>
      )
    case 'swords':
      return (
        <g stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round">
          <path d="M32 12 v34" />
          <path d="M32 12 l-3 6 h6z" fill="currentColor" stroke="none" />
          <path d="M22 40 h20" />
          <path d="M32 46 v6" strokeWidth="3.5" />
        </g>
      )
    case 'pentacles':
      return (
        <g stroke="currentColor" strokeWidth="2" fill="none" strokeLinejoin="round">
          <circle cx="32" cy="32" r="16" />
          <path d="M32 18 L36.3 27.5 L46.6 28.4 L38.8 35.2 L41.1 45.3 L32 40 L22.9 45.3 L25.2 35.2 L17.4 28.4 L27.7 27.5 Z" />
        </g>
      )
  }
}

function MajorSigil({ element }: { element: Card['element'] }) {
  // One restrained emblem per element so the majors read as a family.
  switch (element) {
    case 'fire':
      return (
        <g stroke="currentColor" strokeWidth="2" fill="none" strokeLinejoin="round">
          <path d="M32 12 L44 32 L32 52 L20 32 Z" />
          <circle cx="32" cy="32" r="6" />
        </g>
      )
    case 'water':
      return (
        <g stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round">
          <path d="M42 24 a12 12 0 1 0 0 16" />
          <circle cx="44" cy="32" r="2.5" fill="currentColor" stroke="none" />
        </g>
      )
    case 'air':
      return (
        <g stroke="currentColor" strokeWidth="2" fill="none" strokeLinejoin="round">
          <path d="M32 14 L36.5 27 L50 27 L39 35 L43 48 L32 40 L21 48 L25 35 L14 27 L27.5 27 Z" />
        </g>
      )
    case 'earth':
      return (
        <g stroke="currentColor" strokeWidth="2" fill="none">
          <circle cx="32" cy="32" r="17" />
          <path d="M15 32 h34 M32 15 v34" />
        </g>
      )
    default:
      return <circle cx="32" cy="32" r="14" stroke="currentColor" strokeWidth="2" fill="none" />
  }
}

export function TarotCard({ card, orientation, revealed, language, label, onReveal, size = 'large', crossed, testId }: TarotCardProps) {
  const text = card.text[language]
  const name = text.name
  const classes = ['tarot-card', size, revealed ? 'revealed' : 'hidden', orientation, crossed ? 'crossed' : ''].filter(Boolean).join(' ')
  return (
    <figure className={classes} data-testid={testId}>
      <button
        type="button"
        className="tarot-card-flip"
        aria-label={revealed ? `${name}, ${orientation}` : 'Turn card'}
        aria-pressed={revealed}
        onClick={onReveal}
      >
        <span className="tarot-card-back" aria-hidden="true">
          <span className="back-frame" />
          <svg viewBox="0 0 64 96" className="back-emblem">
            <circle cx="32" cy="48" r="17" fill="none" stroke="currentColor" strokeWidth="1.4" />
            <path d="M32 31 a17 17 0 1 0 0 34 a12 12 0 1 1 0 -34z" fill="currentColor" opacity=".9" />
            <circle cx="46" cy="30" r="1.6" fill="currentColor" />
            <circle cx="16" cy="66" r="1.2" fill="currentColor" />
            <circle cx="50" cy="70" r="1" fill="currentColor" />
          </svg>
        </span>
        <span className="tarot-card-face">
          <span className="face-frame" />
          <span className="face-label top">{card.label}</span>
          <svg viewBox="0 0 64 64" className="face-glyph" aria-hidden="true">
            {card.arcana === 'major' ? <MajorSigil element={card.element} /> : <SuitGlyph suit={card.suit!} />}
          </svg>
          <span className="face-name">{name}</span>
          <span className="face-label bottom">{card.label}</span>
        </span>
      </button>
      {label && <figcaption>{label}</figcaption>}
    </figure>
  )
}
