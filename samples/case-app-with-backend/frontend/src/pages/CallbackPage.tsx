import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { sendCallback } from '../services/authService';
import { useAuth } from '../context/AuthContext';

export function CallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setAuthenticated } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (!code) {
      setError('No authorization code received');
      return;
    }

    sendCallback(code, state || '')
      .then((result) => {
        if (result.authenticated) {
          setAuthenticated(true);
          navigate('/dashboard', { replace: true });
        } else {
          setError('Authentication failed');
        }
      })
      .catch((err) => {
        setError(err.message || 'Token exchange failed');
      });
  }, [searchParams, navigate, setAuthenticated]);

  if (error) {
    return (
      <div className="page-center">
        <h2>Authentication Error</h2>
        <p style={{ color: '#e74c3c' }}>{error}</p>
        <a href="/">Back to Login</a>
      </div>
    );
  }

  return (
    <div className="page-center">
      <h2>Authenticating...</h2>
      <p>Exchanging authorization code for access token...</p>
    </div>
  );
}
