import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { loadTemplates, type Template } from '../services/templates';
import { createCopy } from '../services/copies';
import { TemplateCard } from './TemplateCard';

export function Gallery() {
  const { sdk, logout } = useAuth();
  const [templates, setTemplates] = useState<Template[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    loadTemplates()
      .then(setTemplates)
      .catch(() => setLoadError('The template catalog could not be loaded.'));
  }, []);

  const visible = useMemo(() => {
    if (!templates) return [];
    const q = query.trim().toLowerCase();
    if (!q) return templates;
    return templates.filter(({ manifest }) =>
      [manifest.name, manifest.description, ...(manifest.tags ?? [])].some((s) => s?.toLowerCase().includes(q)),
    );
  }, [templates, query]);

  const onEdit = async (template: Template, solutionName: string) => {
    const token = sdk.getToken();
    if (!token) throw new Error('Please sign in again.');
    return createCopy({ templateId: template.entry.id, version: template.entry.live, solutionName }, token);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Templates</h1>
            <p className="text-sm text-gray-500">Open one to use it as is, or edit a copy in Studio Web.</p>
          </div>
          <div className="flex items-center gap-3">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search templates"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm w-56"
            />
            <button type="button" onClick={logout} className="text-sm text-gray-600 hover:text-gray-900">
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {loadError && <p className="text-sm text-red-600">{loadError}</p>}
        {!templates && !loadError && <p className="text-sm text-gray-500">Loading templates...</p>}
        {templates && visible.length === 0 && <p className="text-sm text-gray-500">No templates match.</p>}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((t) => (
            <TemplateCard key={t.entry.id} template={t} onEdit={onEdit} />
          ))}
        </div>
      </main>
    </div>
  );
}
