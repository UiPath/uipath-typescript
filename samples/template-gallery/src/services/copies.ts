import { COPIES_API } from './config';

export interface CopyRequest {
  templateId: string;
  version?: string;
  solutionName?: string;
}

export interface CopyResponse {
  projectId: string;
  solutionId: string | null;
  designerUrl: string;
  templateId: string;
  version: string;
  filesUploaded: number;
}

/** POST /copies with the user's token. Non-2xx bodies are `{ error }` (function contract). */
export async function createCopy(request: CopyRequest, token: string): Promise<CopyResponse> {
  const res = await fetch(`${COPIES_API}/copies`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(request),
  });
  const body = (await res.json().catch(() => ({}))) as Partial<CopyResponse> & { error?: string };
  if (!res.ok) {
    const reason = body.error ?? `HTTP ${res.status}`;
    throw new Error(res.status >= 500 ? `The copy could not be created (${reason}).` : reason);
  }
  return body as CopyResponse;
}
