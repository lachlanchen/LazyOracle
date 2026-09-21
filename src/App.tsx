import { useEffect, useState } from 'react'
import { ArrowLeft, BookOpen, Compass, Hand, Hexagon, Moon, Settings2, Sparkles, Star } from 'lucide-react'
import './App.css'
import { AnswersScreen } from './components/AnswersScreen'
import { AstrologyScreen } from './components/AstrologyScreen'
import { BaziScreen } from './components/BaziScreen'
import { FengShuiScreen } from './components/FengShuiScreen'
import { IChingScreen } from './components/IChingScreen'
import { PalmScreen } from './components/PalmScreen'
import { Settings } from './components/Settings'
import { TarotScreen } from './components/TarotScreen'
import { initialLanguage, rememberLanguage, uiCopy } from './i18n'
import { loadDeviceModel, selectedDeviceModel } from './lib/device-model'
import type { Practice, ReadingLanguage } from './types'

type View = 'home' | 'settings' | Practice

const PRACTICES: { id: Practice; icon: typeof Sparkles }[] = [
  { id: 'tarot', icon: Sparkles },
  { id: 'bazi', icon: Hexagon },
  { id: 'iching', icon: Moon },
  { id: 'astrology', icon: Star },
  { id: 'fengshui', icon: Compass },
  { id: 'palm', icon: Hand },
  { id: 'answers', icon: BookOpen },
]

function App() {
  const [language, setLanguage] = useState<ReadingLanguage>(initialLanguage)
  const [view, setView] = useState<View>('home')
  const copy = uiCopy(language)

  useEffect(() => {
    // Warm the chosen on-device model in the background so the first reading does not wait.
    const chosen = selectedDeviceModel()
    if (chosen) loadDeviceModel(chosen).catch((error: unknown) => console.warn('device model warm-up failed', error))
  }, [])

  const chooseLanguage = (next: ReadingLanguage) => {
    setLanguage(next)
    rememberLanguage(next)
  }

  const screens: Record<Practice, () => React.JSX.Element> = {
    tarot: () => <TarotScreen key={language} copy={copy} language={language} />,
    bazi: () => <BaziScreen key={language} copy={copy} language={language} />,
    iching: () => <IChingScreen key={language} copy={copy} language={language} />,
    astrology: () => <AstrologyScreen key={language} copy={copy} language={language} />,
    fengshui: () => <FengShuiScreen key={language} copy={copy} language={language} />,
    palm: () => <PalmScreen key={language} copy={copy} language={language} />,
    answers: () => <AnswersScreen key={language} copy={copy} language={language} />,
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
            {PRACTICES.map(({ id, icon: Icon }) => (
              <button key={id} type="button" className={`practice-tile ${id}`} onClick={() => setView(id)} data-testid={`practice-${id}`}>
                <span className="tile-icon"><Icon size={22} /></span>
                <span className="tile-name">{copy.practices[id].name}</span>
                <span className="tile-blurb">{copy.practices[id].blurb}</span>
              </button>
            ))}
          </div>
          <p className="privacy-line">{copy.home.privacy}</p>
        </main>
      )}

      {view !== 'home' && view !== 'settings' && screens[view]()}
      {view === 'settings' && <Settings copy={copy} language={language} onLanguage={chooseLanguage} />}
    </div>
  )
}

export default App
