import { useState } from 'react'
import { ArrowLeft, Compass, Hand, Hexagon, Moon, Settings2, Sparkles, Star, BookOpen } from 'lucide-react'
import './App.css'
import { Settings } from './components/Settings'
import { TarotScreen } from './components/TarotScreen'
import { initialLanguage, rememberLanguage, uiCopy } from './i18n'
import type { Practice, ReadingLanguage } from './types'

type View = 'home' | 'settings' | Practice

const PRACTICES: { id: Practice; icon: typeof Sparkles; ready: boolean }[] = [
  { id: 'tarot', icon: Sparkles, ready: true },
  { id: 'bazi', icon: Hexagon, ready: false },
  { id: 'iching', icon: Moon, ready: false },
  { id: 'astrology', icon: Star, ready: false },
  { id: 'fengshui', icon: Compass, ready: false },
  { id: 'palm', icon: Hand, ready: false },
  { id: 'answers', icon: BookOpen, ready: false },
]

function App() {
  const [language, setLanguage] = useState<ReadingLanguage>(initialLanguage)
  const [view, setView] = useState<View>('home')
  const copy = uiCopy(language)

  const chooseLanguage = (next: ReadingLanguage) => {
    setLanguage(next)
    rememberLanguage(next)
  }

  return (
    <div className="app">
      <div className="sky" aria-hidden="true" />
      <header className="topbar">
        {view === 'home' ? (
          <button type="button" className="brand" onClick={() => setView('home')}>
            <span className="brand-mark" aria-hidden="true" />
            {copy.appName}
          </button>
        ) : (
          <button type="button" className="back-button" onClick={() => setView('home')} data-testid="back">
            <ArrowLeft size={18} /> {copy.nav.back}
          </button>
        )}
        <button type="button" className="icon-button" aria-label={copy.nav.settings} onClick={() => setView(view === 'settings' ? 'home' : 'settings')} data-testid="open-settings">
          <Settings2 size={20} />
        </button>
      </header>

      {view === 'home' && (
        <main className="screen home-screen">
          <header className="screen-heading hero">
            <span className="eyebrow">{copy.home.eyebrow}</span>
            <h1>{copy.home.title}</h1>
            <p className="tagline">{copy.tagline}</p>
          </header>
          <div className="practice-grid">
            {PRACTICES.map(({ id, icon: Icon, ready }) => (
              <button
                key={id}
                type="button"
                className={`practice-tile ${id} ${ready ? '' : 'soon'}`}
                disabled={!ready}
                onClick={() => setView(id)}
                data-testid={`practice-${id}`}
              >
                <span className="tile-icon"><Icon size={22} /></span>
                <span className="tile-name">{copy.practices[id].name}</span>
                <span className="tile-blurb">{copy.practices[id].blurb}</span>
                {!ready && <span className="tile-soon">{copy.comingSoon}</span>}
              </button>
            ))}
          </div>
          <p className="privacy-line">{copy.home.privacy}</p>
        </main>
      )}

      {view === 'tarot' && <TarotScreen key={language} copy={copy} language={language} />}
      {view === 'settings' && <Settings copy={copy} language={language} onLanguage={chooseLanguage} />}
    </div>
  )
}

export default App
