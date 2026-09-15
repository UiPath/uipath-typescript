import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { getAppBase } from '@uipath/uipath-typescript';
import { configureValidationStationWc } from '@uipath/ui-widgets-validation-station';
import './index.css';
import App from './App';

// Registers the Validation Station's custom elements from `<app base>/du-vs-wc`, staged by
// scripts/stage-du-wc.mjs. `includeFonts` pulls in the Apollo and Material Icons faces: this
// app renders in an iframe, which inherits no fonts from the page around it, so without them
// the widget's icons come out blank.
// Fire-and-forget - <ValidationStation> waits on this itself, and the promise is the only
// place a load failure surfaces.
configureValidationStationWc({ includeFonts: true }).catch((err: unknown) => {
  console.error('Failed to load the Validation Station web component.', err);
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

createRoot(rootElement).render(
  <StrictMode>
    <BrowserRouter basename={getAppBase()}>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
