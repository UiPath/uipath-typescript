import { useState, useCallback, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import Form from './components/Form';
import './App.css';

function App() {
  const [darkTheme, setDarkTheme] = useState(false);

  // Seed from the task theme (Action Center) on first load.
  const handleInitTheme = useCallback((isDark: boolean) => {
    setDarkTheme(isDark);
  }, []);

  // User-driven toggle.
  const toggleTheme = useCallback(() => setDarkTheme((d) => !d), []);

  // Keep <body> in sync whether the change came from the task or the toggle.
  useEffect(() => {
    document.body.className = darkTheme ? 'dark' : 'light';
  }, [darkTheme]);

  return (
    <div className={`app-shell ${darkTheme ? 'dark' : 'light'}`}>
      <Routes>
        <Route
          path="/"
          element={<Form onInitTheme={handleInitTheme} darkTheme={darkTheme} onToggleTheme={toggleTheme} />}
        />
      </Routes>
    </div>
  );
}

export default App;
