import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { store } from './store/store';
import { appBase } from './lib/runtime';
import { initUiPath } from './lib/sdk';
import { configureValidationStationWc } from '@uipath/ui-widgets-validation-station';
import { App } from './App';
import '@fontsource/noto-sans/400.css';
import '@fontsource/noto-sans/400-italic.css';
import '@fontsource/noto-sans/500.css';
import '@fontsource/noto-sans/600.css';
import '@fontsource/noto-sans/700.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/400-italic.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/600.css';
import '@fontsource/roboto/700.css';
import '@uipath/apollo-wind/styles.css';
import './styles/tokens.css';

/** Initialise the UiPath SDK BEFORE the first render, WHEN the app has data at all. */
try {
  await initUiPath();
} catch (err) {
  // eslint-disable-next-line no-console
  console.error('[uiapp-convert] UiPath SDK initialisation failed; '
    + 'the UI will render but data operations will not work.', err);
}


/*
 * Registers the Validation Station's custom elements from `<app base>/du-vs-wc`, which
 * scripts/stage-du-wc.mjs copies out of @uipath/du-validation-station-wc before every dev run
 * and build. `includeFonts` pulls in the Material Icons face the component draws its icons
 * with. Fire-and-forget: <UiValidationStation> waits on this itself, and the promise is the
 * only place a load failure surfaces.
 */
configureValidationStationWc({ includeFonts: true }).catch((err: unknown) => {
  // eslint-disable-next-line no-console
  console.error('[uiapp-convert] the Validation Station web component failed to load.', err);
});



createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <BrowserRouter basename={appBase()}>
        <App />
      </BrowserRouter>
    </Provider>
  </StrictMode>,
);
