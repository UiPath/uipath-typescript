import { useRef, useState } from 'react';
import { PlatformDirectoryEntityType } from '@uipath/uipath-typescript/directory';
import type { PlatformDirectoryEntry } from '@uipath/uipath-typescript/directory';
import { PlatformGroupType } from '@uipath/uipath-typescript/groups';
import { PlatformPrincipalType } from '@uipath/uipath-typescript/roles';
import type { PlatformRoleAssignment } from '@uipath/uipath-typescript/roles';
import type { PlatformServices } from '../lib/services';
import { toUserMessage } from '../lib/errors';

interface ClonePreview {
  groups: { id: string; name: string }[];
  assignments: PlatformRoleAssignment[];
}

/**
 * Onboarding shortcut: copy a teammate's access to a new joiner.
 * `directory.search()` powers both people pickers; the source's custom groups come
 * from `directory.getGroupMembership()` (built-in groups cannot be edited) and their
 * non-inherited role assignments from `roles.getAssignments()`; applying uses
 * `groups.updateById()` + `roles.updateAssignments()`.
 */
export function CloneAccess({ services }: { services: PlatformServices }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlatformDirectoryEntry[]>([]);
  const [source, setSource] = useState<PlatformDirectoryEntry | null>(null);
  const [target, setTarget] = useState<PlatformDirectoryEntry | null>(null);
  const [preview, setPreview] = useState<ClonePreview | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Picking a second source while the first preview loads must not let the slower response win
  const previewRequest = useRef(0);

  const search = async () => {
    if (!query.trim()) return;
    setError(null);
    try {
      const entries = await services.directory.search(query, {
        entityType: PlatformDirectoryEntityType.User,
      });
      setResults(entries);
    } catch (err) {
      setError(toUserMessage(err, 'The search failed. Try again in a moment.'));
    }
  };

  const loadPreview = async (sourceUser: PlatformDirectoryEntry) => {
    const request = ++previewRequest.current;
    setSource(sourceUser);
    setPreview(null);
    setError(null);
    try {
      const allGroups = await services.groups.getAll();
      const memberships = await services.directory.getGroupMembership(
        sourceUser.id,
        allGroups.filter(g => g.type === PlatformGroupType.Custom).map(g => g.id)
      );
      const assignments = await services.roles.getAssignments('/', {
        securityPrincipalId: sourceUser.id,
        pageSize: 10,
      });
      const direct = assignments.items
        .flatMap(p => p.roleAssignments)
        .filter(a => !a.inherited);
      if (request !== previewRequest.current) return;
      setPreview({
        groups: memberships.map(m => ({ id: m.id, name: m.displayName || m.name })),
        assignments: direct,
      });
    } catch (err) {
      if (request === previewRequest.current) {
        setError(toUserMessage(err, "The source person's access could not be loaded. Try again in a moment."));
      }
    }
  };

  const apply = async () => {
    if (!source || !target || !preview) return;
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      for (const group of preview.groups) {
        await services.groups.updateById(group.id, {
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
      setError(toUserMessage(err, 'The clone stopped partway. Check the target person\'s access before trying again.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section>
      <h2>Clone access</h2>
      <p className="muted">Copy a teammate’s custom groups and role assignments to a new joiner.</p>

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

      {source && target && source.id === target.id && (
        <p className="muted">Pick a different person as the target.</p>
      )}
      <button
        className="primary"
        disabled={!source || !target || !preview || busy || source.id === target.id}
        onClick={apply}
      >
        {busy ? 'Copying…' : 'Apply clone'}
      </button>

      {status && <p className="success">{status}</p>}
      {error && <p className="error">{error}</p>}
    </section>
  );
}
