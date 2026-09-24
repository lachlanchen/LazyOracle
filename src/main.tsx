import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { watchForServiceWorkerUpdate } from './lib/pwa-updates.ts'
import { restoreNativeArchive } from './lib/native-archive.ts'

if ('serviceWorker' in navigator) watchForServiceWorkerUpdate(navigator.serviceWorker)

void restoreNativeArchive().then(() => createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
))
