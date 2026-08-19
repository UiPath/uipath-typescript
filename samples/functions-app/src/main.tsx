import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@uipath/apollo-wind/components/ui/sonner';
import { App } from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Apollo's tokens ship light and dark variants; next-themes toggles the
        `dark` class they key off. */}
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <App />
      <Toaster position="bottom-right" />
    </ThemeProvider>
  </StrictMode>,
);
