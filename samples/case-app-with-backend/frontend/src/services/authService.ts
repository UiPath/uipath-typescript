import { config } from '../config';
import type { AuthStatus, LoginUrlResponse } from '../types/auth';

const BASE = config.apiBaseUrl;

export async function getLoginUrl(): Promise<LoginUrlResponse> {
  const res = await fetch(`${BASE}/api/auth/login-url`, {
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to get login URL');
  return res.json();
}

export async function sendCallback(code: string, state: string): Promise<AuthStatus> {
  const res = await fetch(`${BASE}/api/auth/callback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ code, state }),
  });
  if (!res.ok) throw new Error('Callback failed');
  return res.json();
}

export async function getAuthStatus(): Promise<AuthStatus> {
  const res = await fetch(`${BASE}/api/auth/status`, {
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Status check failed');
  return res.json();
}

export async function logout(): Promise<void> {
  await fetch(`${BASE}/api/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  });
}
