import { COPIES_API } from './config';

export interface Folder {
  key: string;
  displayName: string;
  fullyQualifiedName: string;
}

export interface DeployRequest {
  templateId: string;
  version?: string;
  folderKey: string;
  routingName: string;
  packageName?: string;
  clientId: string;
  tenantName: string;
  title?: string;
  inputs?: Record<string, string>;
}

export interface DeployResponse {
  packageName: string;
  packageVersion: string;
  systemName: string;
  deployVersion: number;
  deploymentId: string;
  routingName: string;
  url: string | null;
  upload: 'uploaded' | 'exists';
  registered: 'new' | 'reused';
  warnings: string[];
}

async function call<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${COPIES_API}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(init?.headers ?? {}) },
  });
  const body = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) {
    const reason = body.error ?? `HTTP ${res.status}`;
    throw new Error(res.status >= 500 ? `The request failed (${reason}).` : reason);
  }
  return body;
}

/** Folders the signed-in user can deploy into, in the current tenant. */
export function loadFolders(token: string): Promise<{ tenantName: string; folders: Folder[] }> {
  return call('/folders', token);
}

/** Pack, publish and deploy the template's stored build into a folder, as the signed-in user. */
export function deployTemplate(request: DeployRequest, token: string): Promise<DeployResponse> {
  return call('/deployments', token, { method: 'POST', body: JSON.stringify(request) });
}
