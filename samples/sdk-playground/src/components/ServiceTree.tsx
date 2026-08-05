import { useMemo, useState } from 'react';
import type { MethodManifest, ServiceManifest, VersionManifest } from '../types/manifest';

interface ServiceTreeProps {
  manifest: VersionManifest | null;
  selectedService?: string;
  selectedMethod?: string;
  onSelect: (service: ServiceManifest, method: MethodManifest) => void;
}

export function ServiceTree({ manifest, selectedService, selectedMethod, onSelect }: ServiceTreeProps) {
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const filtered = useMemo(() => {
    if (!manifest) return [];
    const q = query.trim().toLowerCase();
    if (q === '') return manifest.services;
    return manifest.services
      .map((s) => {
        const serviceHit = s.name.toLowerCase().includes(q);
        const methods = s.methods.filter((m) => serviceHit || m.name.toLowerCase().includes(q));
        return { ...s, methods };
      })
      .filter((s) => s.methods.length > 0);
  }, [manifest, query]);

  const searching = query.trim() !== '';

  if (!manifest) {
    return (
      <aside className="panel service-tree">
        <p className="hint">Loading manifest…</p>
      </aside>
    );
  }

  return (
    <aside className="panel service-tree">
      <input
        type="search"
        className="tree-search"
        placeholder={`Search ${manifest.services.reduce((n, s) => n + s.methods.length, 0)} methods…`}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        spellCheck={false}
      />
      <nav>
        {filtered.map((service) => {
          const isOpen = searching || (expanded[service.name] ?? false);
          return (
            <div key={service.name} className="tree-service">
              <button
                className="tree-service-name"
                onClick={() => setExpanded((prev) => ({ ...prev, [service.name]: !isOpen }))}
              >
                <span className={`chevron ${isOpen ? 'open' : ''}`}>▸</span>
                {service.name}
                <span className="count">{service.methods.length}</span>
              </button>
              {isOpen && (
                <ul>
                  {service.methods.map((method) => (
                    <li key={method.name}>
                      <button
                        className={
                          selectedService === service.name && selectedMethod === method.name
                            ? 'tree-method selected'
                            : 'tree-method'
                        }
                        onClick={() => onSelect(service, method)}
                      >
                        {method.name}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && <p className="hint">No methods match "{query}"</p>}
      </nav>
    </aside>
  );
}
