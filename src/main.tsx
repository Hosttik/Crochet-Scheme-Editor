import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import packageJson from '../package.json'
import App from './App'
import './ui/design-tokens.css'
import './ui/primitives.css'
import './styles.css'
import './guides.css'
import './selection.css'
import './layers.css'
import './foundation.css'
import './patternAuthoring.css'
import './documentOutput.css'
import './gauge.css'
import './ui/workbench-v2.css'
import './ui/workbench-structure.css'

const rootElement = document.getElementById('root')!
rootElement.style.setProperty('--app-version-label', `"v${packageJson.version}"`)

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
