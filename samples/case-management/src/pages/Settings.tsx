import { useAuth } from '@/hooks/useAuth';
import { useCases } from '@/hooks/useCases';
import { Card, PageHeader, Button, Badge } from '@/components/ui';
import { ENV } from '@/lib/env';

export function Settings() {
  const { logout } = useAuth();
  const { caseDefinition, caseProcessKey } = useCases();

  const env: Record<string, string> = {
    'Base URL': ENV.baseUrl,
  };

  const scopes = ENV.scope.split(/\s+/).filter(Boolean);

  return (
    <div className="p-7">
      <PageHeader title="Settings" subtitle="Connection and workspace details" />

      <div className="grid max-w-3xl grid-cols-1 gap-5">
        <Card>
          <h3 className="mb-3 text-[13px] font-semibold">UiPath connection</h3>
          <dl className="divide-y">
            {Object.entries(env).map(([k, v]) => (
              <div key={k} className="flex items-center justify-between py-2.5 text-sm first:pt-0">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="font-mono text-[13px] font-medium">{v || '—'}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <Card>
          <h3 className="mb-3 text-[13px] font-semibold">Scoped case</h3>
          <dl className="divide-y">
            <div className="flex items-center justify-between py-2.5 text-sm first:pt-0">
              <dt className="text-muted-foreground">Case</dt>
              <dd className="font-medium">{caseDefinition?.name ?? '—'}</dd>
            </div>
            <div className="flex items-center justify-between py-2.5 text-sm">
              <dt className="text-muted-foreground">Folder</dt>
              <dd className="font-medium">{caseDefinition?.folderName ?? '—'}</dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-2.5 text-sm">
              <dt className="text-muted-foreground">Process key</dt>
              <dd className="truncate font-mono text-[13px] font-medium" title={caseProcessKey}>
                {caseProcessKey || '—'}
              </dd>
            </div>
          </dl>
        </Card>

        <Card>
          <h3 className="mb-3 text-[13px] font-semibold">Granted scopes</h3>
          <div className="flex flex-wrap gap-1.5">
            {scopes.length ? scopes.map((s) => <Badge key={s} tone="gray">{s}</Badge>) : <span className="text-sm text-muted-foreground">—</span>}
          </div>
        </Card>

        <Card>
          <h3 className="mb-1 text-[13px] font-semibold">Session</h3>
          <p className="mb-3 text-sm text-muted-foreground">Sign out of this UiPath session.</p>
          <Button variant="default" onClick={logout}>
            Sign out
          </Button>
        </Card>
      </div>
    </div>
  );
}
