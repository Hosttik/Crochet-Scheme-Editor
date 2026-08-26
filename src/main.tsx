import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'
import './guides.css'
import './selection.css'
import './layers.css'
import './foundation.css'
import './patternAuthoring.css'
import './documentOutput.css'
import './gauge.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
