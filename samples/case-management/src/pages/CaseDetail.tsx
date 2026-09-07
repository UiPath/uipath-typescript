import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAsync } from '@/hooks/useAsync';
import { getCaseInstance, getCaseVariables, getCaseStages, getCaseStageSla, caseLabel } from '@/lib/sdk';
import { buildVarContext } from '@/lib/expr';
import { addRecentCase } from '@/lib/recent';
import { Badge, Loading, ErrorState, Button, SlaBadge } from '@/components/ui';
import { LifecycleActions } from '@/components/LifecycleActions';
import { humanize, statusTone } from '@/lib/format';
import type { SlaStatus } from '@/lib/types';
import { ChevronRight } from '@/components/icons';
import { OverviewTab } from '@/pages/detail/OverviewTab';
import { CaseDetailsTab } from '@/pages/detail/CaseDetailsTab';
import { StagesTab } from '@/pages/detail/StagesTab';
import { ActionsTab } from '@/pages/detail/ActionsTab';
import { HistoryTab } from '@/pages/detail/HistoryTab';
import { VariablesTab } from '@/pages/detail/VariablesTab';

export function CaseDetail() {
  const { folderKey = '', instanceId = '' } = useParams();
  const fk = decodeURIComponent(folderKey);
  const id = decodeURIComponent(instanceId);
  const { sdk } = useAuth();
  const navigate = useNavigate();

  const { data: inst, loading, error, reload: reloadInst } = useAsync(() => getCaseInstance(sdk, id, fk), [id, fk]);
  const vars = useAsync(() => getCaseVariables(sdk, id, fk), [id, fk]);
  const stages = useAsync(() => getCaseStages(sdk, id, fk), [id, fk]);
  const stageSlaQ = useAsync(() => getCaseStageSla(sdk, id), [id]);

  // After a lifecycle action, refresh the status-bearing queries.
  const onLifecycleChange = () => {
    reloadInst();
    stages.reload();
    stageSlaQ.reload();
  };

  // Record this opened case in the user's "recently viewed" history.
  useEffect(() => {
    if (inst) addRecentCase({ instanceId: id, folderKey: fk, label: caseLabel(inst) });
  }, [inst, id, fk]);

  // Header SLA = worst stage SLA for this case (per-case, on demand).
  const caseSla: SlaStatus | undefined = useMemo(() => {
    const rows = stageSlaQ.data ?? [];
    if (!rows.length) return undefined;
    const order: SlaStatus[] = ['breached', 'at-risk', 'on-track', 'completed', 'unknown'];
    for (const st of order) if (rows.some((r) => r.slaStatus === st)) return st;
    return undefined;
  }, [stageSlaQ.data]);

  const ctx = useMemo(() => buildVarContext(vars.data), [vars.data]);

  const TABS = ['Overview', 'Case details', 'Stages', 'Actions', 'History', 'Variables'] as const;
  type Tab = (typeof TABS)[number];
  const [tab, setTab] = useState<Tab>('Overview');

  if (loading) return <Loading label="Loading case…" />;
  if (error)
    return (
      <div className="p-7">
        <ErrorState message={error} />
      </div>
    );
  if (!inst)
    return (
      <div className="p-7">
        <ErrorState message="Case not found." />
      </div>
    );

  const varsReady = !vars.loading;

  return (
    <div>
      {/* Header */}
      <div className="sticky top-0 z-10 border-b bg-card px-7 pt-5">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link to="/cases" className="hover:text-primary">
            Cases
          </Link>
          <ChevronRight width={13} height={13} />
          <span className="text-foreground/80">{caseLabel(inst)}</span>
        </div>

        <div className="mt-1.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-[22px] font-semibold tracking-tight">{caseLabel(inst)}</h1>
            <Badge tone={statusTone(inst.latestRunStatus)}>{humanize(inst.latestRunStatus)}</Badge>
            {inst.caseType && <span className="text-sm text-muted-foreground">{inst.caseType}</span>}
            {caseSla && (
              <span className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">SLA</span>
                <SlaBadge status={caseSla} />
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <LifecycleActions
              instanceId={id}
              folderKey={fk}
              status={inst.latestRunStatus}
              stages={stages.data ?? []}
              onChanged={onLifecycleChange}
            />
            <Button variant="primary" onClick={() => navigate('/cases')}>
              Back to cases
            </Button>
          </div>
        </div>

        <div className="mt-3 flex gap-1 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`relative whitespace-nowrap px-3 py-2.5 text-sm font-medium transition ${
                tab === t ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t}
              {tab === t && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />}
            </button>
          ))}
        </div>
      </div>

      <div className="p-7">
        {tab === 'Overview' &&
          (varsReady ? (
            <OverviewTab inst={inst} ctx={ctx} stages={stages.data ?? []} />
          ) : (
            <Loading label="Resolving case data…" />
          ))}
        {tab === 'Case details' &&
          (varsReady ? <CaseDetailsTab inst={inst} ctx={ctx} /> : <Loading label="Resolving case data…" />)}
        {tab === 'Stages' && <StagesTab instanceId={id} folderKey={fk} />}
        {tab === 'Actions' && <ActionsTab instanceId={id} />}
        {tab === 'History' && <HistoryTab instanceId={id} folderKey={fk} />}
        {tab === 'Variables' && (
          <VariablesTab variables={vars.data?.globalVariables ?? []} loading={vars.loading} error={vars.error} />
        )}
      </div>
    </div>
  );
}
