import { createRoot } from 'react-dom/client'
import './index.css'
// Compatibility shim — must run before any widget code touches the SDK.
// See widgetCompat.ts for the why.
import './lib/widgetCompat'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(<App />)
