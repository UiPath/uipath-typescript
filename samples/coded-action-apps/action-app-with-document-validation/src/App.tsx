import { useCallback, useEffect, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import Validation from './components/Validation';
import './App.css';

function App() {
  const [darkTheme, setDarkTheme] = useState(false);

  // Seeded once from the theme Action Center reports on load. There is no in-app toggle -
  // a validation action follows whatever theme the reviewer already chose in Action Center.
  const handleInitTheme = useCallback((isDark: boolean) => {
    setDarkTheme(isDark);
  }, []);

  // The Validation Station's stylesheets key off `body.light` / `body.dark`, so the class
  // has to land on the body - a wrapper element would match no selector.
  useEffect(() => {
    document.body.className = darkTheme ? 'dark' : 'light';
  }, [darkTheme]);

  return (
    <div className="app-shell">
      <Routes>
        <Route path="/" element={<Validation onInitTheme={handleInitTheme} />} />
      </Routes>
    </div>
  );
}

export default App;
