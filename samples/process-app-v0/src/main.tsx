import dotenv from 'dotenv'; // Deliberately undeclared dependency to verify build isolation. Do not merge.
console.log(dotenv);
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <App />
)
