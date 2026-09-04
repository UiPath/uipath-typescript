import { useState } from 'react';
import { Card, Badge, Loading, ErrorState, EmptyState } from '@/components/ui';
import { Input } from '@uipath/apollo-wind/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@uipath/apollo-wind/components/ui/table';
import { SearchIcon } from '@/components/icons';
import type { GlobalVariable } from '@/lib/sdk';

function renderValue(v: unknown): string {
  if (v == null) return '—';
  if (typeof v === 'object') return JSON.stringify(v, null, 2);
  return String(v);
}

export function VariablesTab({
  variables,
  loading,
  error,
}: {
  variables: GlobalVariable[];
  loading: boolean;
  error: string | null;
}) {
  const [q, setQ] = useState('');

  if (loading) return <Loading label="Loading variables…" />;
  if (error) return <ErrorState message={error} />;
  if (variables.length === 0)
    return <EmptyState title="No global variables" hint="This case instance exposes no global variables." />;

  const rows = variables.filter(
    (v) => !q || v.name.toLowerCase().includes(q.toLowerCase()) || renderValue(v.value).toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          {variables.length} global variable{variables.length === 1 ? '' : 's'} on this case instance — these are what the
          Overview and Case&nbsp;details binding expressions (
          <code className="rounded bg-muted px-1 text-[12px]">=vars.…</code>) resolve against.
        </p>
        <div className="relative shrink-0">
          <SearchIcon width={15} height={15} className="absolute left-2.5 top-2.5 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter variables…" className="w-56 pl-8" />
        </div>
      </div>

      <Card padded={false}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((v) => (
              <TableRow key={v.id || v.name} className="align-top">
                <TableCell className="font-mono text-[13px] font-medium">{v.name}</TableCell>
                <TableCell>
                  <Badge tone="gray">{v.type || 'any'}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{v.source || '—'}</TableCell>
                <TableCell>
                  <pre className="max-w-xl whitespace-pre-wrap break-words font-mono text-[12px] leading-relaxed text-muted-foreground">
                    {renderValue(v.value)}
                  </pre>
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                  No variables match.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
