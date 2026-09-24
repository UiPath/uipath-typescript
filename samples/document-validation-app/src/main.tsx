import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { configureValidationStationWc } from '@uipath/ui-widgets-validation-station'
import './index.css'
import App from './App.tsx'

// Registers the Validation Station's custom elements from `<app base>/du-vs-wc`, staged by
// scripts/stage-du-wc.mjs. `includeFonts` pulls in the Apollo and Material Icons faces, which
// nothing else on the page declares - without them the widget's icons come out blank.
// Fire-and-forget - the widgets wait on this themselves, and the promise is the only place a
// load failure surfaces.
configureValidationStationWc({ includeFonts: true }).catch((err: unknown) => {
  console.error('Failed to load the Validation Station web component.', err)
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
