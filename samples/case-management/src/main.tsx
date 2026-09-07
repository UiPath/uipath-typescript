import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { getAppBase } from '@uipath/uipath-typescript';
import App from '@/App';
import { AppThemeProvider } from '@/components/Theme';
import '@/index.css';

createRoot(document.getElementById('root')!).render(
  <AppThemeProvider>
    <BrowserRouter basename={getAppBase()}>
      <App />
    </BrowserRouter>
  </AppThemeProvider>,
);
