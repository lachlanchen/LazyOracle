import { useEffect, useState } from 'react'
import { ArrowLeft, BookOpen, CalendarDays, Compass, Hand, Hexagon, MessagesSquare, Moon, ScanFace, Settings2, Sparkles, Star } from 'lucide-react'
import './App.css'
import { AlmanacScreen } from './components/AlmanacScreen'
import { TodayStrip } from './components/TodayStrip'
import { AnswersScreen } from './components/AnswersScreen'
import { ChatDock } from './components/ChatDock'
import { ChatScreen } from './components/ChatScreen'
import { AstrologyScreen } from './components/AstrologyScreen'
import { BaziScreen } from './components/BaziScreen'
import { FaceScreen } from './components/FaceScreen'
import { FengShuiScreen } from './components/FengShuiScreen'
import { IChingScreen } from './components/IChingScreen'
import { PalmScreen } from './components/PalmScreen'
import { Settings } from './components/Settings'
import { TarotScreen } from './components/TarotScreen'
import { initialLanguage, rememberLanguage, uiCopy } from './i18n'
import type { Practice, ReadingLanguage } from './types'

type View = 'home' | 'settings' | Practice

const PRACTICES: { id: Practice; icon: typeof Sparkles }[] = [
  { id: 'tarot', icon: Sparkles },
  { id: 'bazi', icon: Hexagon },
  { id: 'iching', icon: Moon },
  { id: 'astrology', icon: Star },
  { id: 'fengshui', icon: Compass },
  { id: 'palm', icon: Hand },
  { id: 'face', icon: ScanFace },
  { id: 'almanac', icon: CalendarDays },
  { id: 'answers', icon: BookOpen },
  { id: 'chat', icon: MessagesSquare },
]

function App() {
  const [language, setLanguage] = useState<ReadingLanguage>(initialLanguage)
  const [view, setView] = useState<View>('home')
  const copy = uiCopy(language)

  const [pendingQuestion, setPendingQuestion] = useState('')

  useEffect(() => {
    // How much of the window the on-screen keyboard covers, so the ask bar
    // can sit above it instead of behind it. Safari reports this through the
    // visual viewport; browsers without one simply get zero.
    const viewport = window.visualViewport
    if (!viewport) return undefined
    const measure = () => {
      const overlap = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop)
      document.documentElement.style.setProperty('--keyboard-inset', `${Math.round(overlap)}px`)
    }
    measure()
    viewport.addEventListener('resize', measure)
    viewport.addEventListener('scroll', measure)
    return () => {
      viewport.removeEventListener('resize', measure)
      viewport.removeEventListener('scroll', measure)
    }
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
    face: () => <FaceScreen key={language} copy={copy} language={language} />,
    almanac: () => <AlmanacScreen key={language} copy={copy} language={language} />,
    answers: () => <AnswersScreen key={language} copy={copy} language={language} />,
    chat: () => (
      <ChatScreen key={language} copy={copy} language={language} pending={pendingQuestion} onPendingConsumed={() => setPendingQuestion('')} />
    ),
  }

  return (
    <div className="app">
      <div className="sky" aria-hidden="true" />
      <header
        className="topbar"
        ref={(node) => {
          // The chat screen fills the window below this bar, so its height
          // has to be a real measurement rather than a guess.
          if (node) document.documentElement.style.setProperty('--topbar-h', `${Math.round(node.getBoundingClientRect().height)}px`)
        }}
      >
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
          <TodayStrip copy={copy} language={language} onOpen={() => setView('almanac')} />
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
      {view === 'settings' && (
        <Settings
          copy={copy}
          language={language}
          onLanguage={chooseLanguage}
        />
      )}

      {(view === 'home' || view === 'settings') && (
        <ChatDock
          copy={copy}
          onAsk={(question) => {
            setPendingQuestion(question)
            setView('chat')
          }}
        />
      )}
    </div>
  )
}

export default App
