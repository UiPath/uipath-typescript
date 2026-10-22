import { useEffect, useState } from 'react';
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { DEEP_LINKS, ROUTE_ELEMENTS, START_PATH } from './routes';
import { setNavigator } from './lib/rules';
import { isConfigured } from './lib/sdk';
import { AppOverlays } from './lib/overlays';

/** App shell: routes, plus the bridge that lets imperative rules navigate. */
export function App() {
  const navigate = useNavigate();
  useEffect(() => { setNavigator(navigate); }, [navigate]);

  /*
   * A cold start lands on the start page (see DEEP_LINKS in routes.tsx). Decided once, from
   * the FIRST location: navigating inside the app is not a cold start. The inner page is
   * not mounted before the redirect, so its load rules never run against empty state.
   */
  const location = useLocation();
  const [ready, setReady] = useState(() => DEEP_LINKS || location.pathname === START_PATH);
  useEffect(() => {
    if (ready) return;
    navigate(START_PATH, { replace: true });
    setReady(true);
  }, [ready, navigate]);

  return (
    <>
      {isConfigured() ? null : (

        <div
          role="status"
          style={{
            padding: '8px 12px', font: '13px system-ui', background: '#fff4e5',
            borderBottom: '1px solid #f0c36d', color: '#7a4b00',
          }}
        >
          UiPath is not configured — the UI renders, but data sources stay empty and
          backend rules will fail. Copy <code>.env.example</code> to{' '}
          <code>.env.local</code> and fill it in.
        </div>
      )}
      <div className="uiapp-page-host">
        {ready ? (
          <Routes>
            {ROUTE_ELEMENTS.map((r) => (
              <Route key={r.path} path={r.path} element={r.element} />
            ))}
          </Routes>
        ) : null}
      </div>
      <AppOverlays />
    </>
  );
}
