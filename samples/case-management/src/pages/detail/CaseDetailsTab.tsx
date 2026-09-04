import { Card } from '@/components/ui';
import { formatDate, looksLikeMoney } from '@/lib/format';
import { parseDetails, type VarContext } from '@/lib/expr';
import type { CaseInstance } from '@/lib/types';

function DetailsBlock({ details, ctx }: { details: string; ctx: VarContext }) {
  const pairs = parseDetails(details, ctx);
  if (!pairs) return <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{details}</p>;
  return (
    <dl className="divide-y">
      {pairs.map((p, i) => {
        const money = p.resolved && looksLikeMoney(p.value);
        return (
          <div
            key={i}
            className={`flex items-start justify-between gap-4 px-1 py-2.5 text-sm ${money ? 'rounded bg-emerald-50/60 dark:bg-emerald-950/30' : ''}`}
          >
            <dt className="text-muted-foreground">{p.label}</dt>
            <dd
              className={`text-right font-medium ${
                !p.resolved
                  ? 'font-mono text-[11px] text-muted-foreground'
                  : money
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : ''
              }`}
            >
              {p.value}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

export function CaseDetailsTab({ inst, ctx }: { inst: CaseInstance; ctx: VarContext }) {
  const overview = inst.caseAppConfig?.overview ?? [];

  if (overview.length === 0) {
    return (
      <Card>
        <h3 className="mb-3 text-[13px] font-semibold">Case record</h3>
        <dl className="divide-y">
          <Row label="Title" value={inst.caseTitle || inst.instanceDisplayName} />
          <Row label="Type" value={inst.caseType || '—'} />
          <Row label="Status" value={inst.latestRunStatus} />
          <Row label="Started" value={formatDate(inst.startedTime)} />
          <Row label="Started by" value={inst.startedByUser || '—'} />
          <Row label="Completed" value={inst.completedTime ? formatDate(inst.completedTime) : '—'} />
          <Row label="Process key" value={inst.processKey} />
          <Row label="Package" value={`${inst.packageId}${inst.packageVersion ? ` · v${inst.packageVersion}` : ''}`} />
        </dl>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
      {overview.map((section, i) => (
        <Card key={i}>
          <h3 className="mb-2 text-[13px] font-semibold">{section.title}</h3>
          <DetailsBlock details={section.details} ctx={ctx} />
        </Card>
      ))}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 text-sm first:pt-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="max-w-[60%] break-words text-right font-medium">{value}</dd>
    </div>
  );
}
