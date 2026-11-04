import { COPIES_API } from './config';

export interface CatalogEntry {
  id: string;
  live: string;
  versions: string[];
}

export interface TemplateManifest {
  id: string;
  name: string;
  description: string;
  version: string;
  requiresTenant?: boolean;
  tags?: string[];
  inputs?: { properties?: Record<string, { title?: string }> };
}

export interface Template {
  entry: CatalogEntry;
  manifest: TemplateManifest;
  releaseNotes: string;
}

interface TemplatesResponse {
  templates: Array<{ id: string; live: string; versions: string[]; manifest: TemplateManifest; releaseNotes: string }>;
}

/** The catalog, from the backend (the doc's GET /system-apps), never from storage directly. */
export async function loadTemplates(): Promise<Template[]> {
  const res = await fetch(`${COPIES_API}/templates`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  const body = (await res.json()) as TemplatesResponse;
  return body.templates.map((t) => ({
    entry: { id: t.id, live: t.live, versions: t.versions },
    manifest: { ...t.manifest, id: t.manifest.id ?? t.id, name: t.manifest.name ?? t.id, description: t.manifest.description ?? '', version: t.manifest.version ?? t.live },
    releaseNotes: t.releaseNotes,
  }));
}
