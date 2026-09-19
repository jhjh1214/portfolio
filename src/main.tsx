import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

console.log(
  '%c(╯°□°）╯︵ ┻━┻\n%cPoking around devtools? Respect. Try the ` key, or the Konami code.',
  'font: 700 22px monospace; color:#db2777',
  'font: 12px monospace; color:#67e8f9',
)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
