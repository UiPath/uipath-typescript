// GET /templates: the catalog for the gallery, read from template storage server side.
// This is the doc's `GET /system-apps`: every live template with its manifest and release notes,
// answered from index.json so the browser never talks to storage directly.

import { defineFunction, defineSchema, FunctionError } from './_sdk-shim.ts';

interface Input {}

interface TemplateSummary {
  id: string;
  live: string;
  versions: string[];
  manifest: Record<string, unknown>;
  releaseNotes: string;
}

interface Output {
  templates: TemplateSummary[];
}

const STORAGE_BASE = (process.env.TEMPLATES_STORAGE_BASE ?? '').replace(/\/+$/, '');

interface Catalog {
  templates: Array<{ id: string; live: string; versions: string[] }>;
}

export default defineFunction({
  name: 'templates',
  method: 'GET',
  path: '/templates',
  input: defineSchema<Input>(),
  output: defineSchema<Output>(),
  handler: async (_input, ctx): Promise<Output> => {
    if (!STORAGE_BASE) throw new FunctionError('TEMPLATES_STORAGE_BASE is not configured', 500);
    const res = await fetch(`${STORAGE_BASE}/index.json`, { signal: AbortSignal.timeout(8_000) });
    if (!res.ok) throw new FunctionError('Template catalog unavailable', 502);
    const catalog = (await res.json()) as Catalog;

    const templates = await Promise.all(
      catalog.templates.map(async (entry): Promise<TemplateSummary> => {
        const base = `${STORAGE_BASE}/${entry.id}/${entry.live}`;
        const [manifestRes, notesRes] = await Promise.all([
          fetch(`${base}/template.json`, { signal: AbortSignal.timeout(8_000) }),
          fetch(`${base}/release-notes.md`, { signal: AbortSignal.timeout(8_000) }),
        ]);
        const manifest = manifestRes.ok ? ((await manifestRes.json()) as Record<string, unknown>) : { id: entry.id };
        const releaseNotes = notesRes.ok ? await notesRes.text() : '';
        return { id: entry.id, live: entry.live, versions: entry.versions, manifest, releaseNotes };
      }),
    );
    ctx.logger.info(`templates: ${templates.length} live template(s)`);
    return { templates };
  },
});
