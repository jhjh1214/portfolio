import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

console.log(
  '%c(╯°□°）╯︵ ┻━┻\n%cPoking around in devtools? Respect. Press the backtick key, or try the Konami code.',
  'font: 800 22px sans-serif; color:#e8465c',
  'font: 12px monospace; color:#0a7c74',
)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
