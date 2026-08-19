import { useState } from 'react';
import {
  PlatformDirectoryEntityType,
  PlatformPrincipalType,
} from '@uipath/uipath-typescript/platform';
import type { PlatformDirectoryEntry, PlatformRoleAssignment } from '@uipath/uipath-typescript/platform';
import type { PlatformServices } from '../lib/services';
import type { CurrentUser } from '../lib/identity';

interface ClonePreview {
  groups: { id: string; name: string }[];
  assignments: PlatformRoleAssignment[];
}

/**
 * Onboarding shortcut: copy a teammate's access to a new joiner.
 * `directory.search()` powers both people pickers; the source's groups come
 * from `directory.getGroupMembership()` and their direct role assignments
 * from `roles.getAssignments()`; applying uses `groups.updateById()` +
 * `roles.updateAssignments()`.
 */
export function CloneAccess({ services, user }: { services: PlatformServices; user: CurrentUser }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlatformDirectoryEntry[]>([]);
  const [source, setSource] = useState<PlatformDirectoryEntry | null>(null);
  const [target, setTarget] = useState<PlatformDirectoryEntry | null>(null);
  const [preview, setPreview] = useState<ClonePreview | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const search = async () => {
    setError(null);
    try {
      const entries = await services.directory.search(user.organizationId, {
        startsWith: query,
        entityType: PlatformDirectoryEntityType.User,
      });
      setResults(entries);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    }
  };

  const loadPreview = async (sourceUser: PlatformDirectoryEntry) => {
    setSource(sourceUser);
    setPreview(null);
    setError(null);
    try {
      const allGroups = await services.groups.getAll(user.organizationId);
      const memberships = await services.directory.getGroupMembership(
        sourceUser.id,
        allGroups.map(g => g.id),
        user.organizationId
      );
      const assignments = await services.roles.getAssignments('/', {
        securityPrincipalId: sourceUser.id,
        pageSize: 10,
      });
      const direct = assignments.items
        .flatMap(p => p.roleAssignments)
        .filter(a => !a.inherited);
      setPreview({
        groups: memberships.map(m => ({ id: m.id, name: m.displayName || m.name })),
        assignments: direct,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load source access');
    }
  };

  const apply = async () => {
    if (!source || !target || !preview) return;
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      // Groups: updateById requires the current name alongside membership changes.
      for (const group of preview.groups) {
        await services.groups.updateById(group.id, user.organizationId, group.name, {
          memberUserIdsToAdd: [target.id],
        });
      }
      if (preview.assignments.length > 0) {
        await services.roles.updateAssignments({
          toAdd: preview.assignments.map(a => ({
            roleId: a.roleId,
            securityPrincipalId: target.id,
            securityPrincipalType: PlatformPrincipalType.User,
            scope: a.scope,
          })),
        });
      }
      setStatus(`Copied ${preview.groups.length} group membership(s) and ${preview.assignments.length} role assignment(s) from ${source.displayName || source.name} to ${target.displayName || target.name}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Clone failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section>
      <h2>Clone access</h2>
      <p className="muted">Copy a teammate’s groups and direct role assignments to a new joiner.</p>

      <div className="form-inline">
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search people by name…"
          onKeyDown={e => e.key === 'Enter' && search()}
        />
        <button onClick={search}>Search</button>
      </div>

      {results.length > 0 && (
        <table>
          <thead>
            <tr><th>Name</th><th>Email</th><th>Pick as</th></tr>
          </thead>
          <tbody>
            {results.map(entry => (
              <tr key={entry.id}>
                <td>{entry.displayName || entry.name}</td>
                <td>{entry.email ?? '—'}</td>
                <td className="actions">
                  <button onClick={() => loadPreview(entry)}>Source</button>
                  <button onClick={() => setTarget(entry)}>Target</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {(source || target) && (
        <p>
          Copy from <strong>{source ? (source.displayName || source.name) : '…'}</strong>{' '}
          to <strong>{target ? (target.displayName || target.name) : '…'}</strong>
        </p>
      )}

      {preview && (
        <div className="card">
          <div className="card-title"><strong>Will copy</strong></div>
          <ul className="pills">
            {preview.groups.map(g => <li key={g.id}>👥 {g.name}</li>)}
            {preview.assignments.map(a => <li key={a.id}>🔑 {a.roleName}</li>)}
          </ul>
          {preview.groups.length === 0 && preview.assignments.length === 0 && (
            <p className="muted">Source has no groups or direct assignments to copy.</p>
          )}
        </div>
      )}

      <button className="primary" disabled={!source || !target || !preview || busy} onClick={apply}>
        {busy ? 'Copying…' : 'Apply clone'}
      </button>

      {status && <p className="success">{status}</p>}
      {error && <p className="error">{error}</p>}
    </section>
  );
}
