import { useAuth } from '../context/AuthContext';

export function LoginPage() {
  const { login } = useAuth();

  return (
    <div className="page-center">
      <h1>UiPath Service Integration</h1>
      <p>Sign in with your UiPath account to continue.</p>
      <button onClick={login} className="btn-primary">
        Login with UiPath
      </button>
    </div>
  );
}
