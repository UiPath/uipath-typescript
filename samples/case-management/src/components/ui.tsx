// Shared UI primitives for the case-management app, built on @uipath/apollo-wind
// + Apollo Vertex semantic tokens. The export surface (names + props) mirrors
// what the pages consume, so swapping the custom implementation for apollo-wind
// is transparent to call sites. `tone` is the app's status vocabulary; it maps
// to apollo Badge/StatsCard variants here.
import { useState } from 'react';
import type { ReactNode } from 'react';
import { Badge as AwBadge } from '@uipath/apollo-wind/components/ui/badge';
import { Button as AwButton } from '@uipath/apollo-wind/components/ui/button';
import { Card as AwCard } from '@uipath/apollo-wind/components/ui/card';
import { Avatar as AwAvatar, AvatarFallback } from '@uipath/apollo-wind/components/ui/avatar';
import { Spinner as AwSpinner } from '@uipath/apollo-wind/components/ui/spinner';
import { StatsCard } from '@uipath/apollo-wind/components/ui/stats-card';
import { EmptyState as AwEmptyState } from '@uipath/apollo-wind/components/ui/empty-state';
import { Alert, AlertDescription, AlertTitle } from '@uipath/apollo-wind/components/ui/alert';
import type { Tone } from '@/lib/format';
import { initials } from '@/lib/format';
import type { SlaStatus, ActorType } from '@/lib/types';

type BadgeVariant = 'secondary' | 'success' | 'error' | 'warning' | 'info' | 'outline';

const TONE_VARIANT: Record<Tone, BadgeVariant> = {
  green: 'success',
  red: 'error',
  amber: 'warning',
  blue: 'info',
  gray: 'secondary',
  violet: 'outline',
};

// Violet has no apollo variant — render it as an outline badge with violet ink.
const VIOLET_CLASS = 'border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950 dark:text-violet-300';

export function Badge({ tone = 'gray', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <AwBadge variant={TONE_VARIANT[tone]} className={tone === 'violet' ? VIOLET_CLASS : undefined}>
      {children}
    </AwBadge>
  );
}

const DOT_CLASS: Record<Tone, string> = {
  green: 'bg-emerald-500',
  red: 'bg-rose-500',
  amber: 'bg-amber-500',
  blue: 'bg-sky-500',
  gray: 'bg-muted-foreground/50',
  violet: 'bg-violet-500',
};

export function Dot({ tone = 'gray' }: { tone?: Tone }) {
  return <span className={`inline-block h-2 w-2 rounded-full ${DOT_CLASS[tone]}`} />;
}

export function Card({
  children,
  className = '',
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return <AwCard className={`${padded ? 'p-5' : ''} ${className}`}>{children}</AwCard>;
}

export function SectionTitle({
  title,
  meta,
  right,
}: {
  title: ReactNode;
  meta?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <div className="flex items-baseline gap-2">
        <h2 className="text-[15px] font-semibold text-foreground">{title}</h2>
        {meta && <span className="text-xs text-muted-foreground">{meta}</span>}
      </div>
      {right}
    </div>
  );
}

export function Avatar({ name, className = '' }: { name?: string | null; className?: string }) {
  return (
    <AwAvatar className={className}>
      <AvatarFallback className="bg-primary/10 text-[11px] font-semibold text-primary">
        {initials(name)}
      </AvatarFallback>
    </AwAvatar>
  );
}

export function Spinner({ className = '' }: { className?: string }) {
  return <AwSpinner className={className} />;
}

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center py-16">
      <AwSpinner label={label} showLabel />
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return <AwEmptyState title={title} description={hint} />;
}

const KPI_VARIANT: Record<Tone, 'default' | 'primary' | 'success' | 'warning' | 'danger'> = {
  green: 'success',
  red: 'danger',
  amber: 'warning',
  blue: 'primary',
  gray: 'default',
  violet: 'default',
};

export function Kpi({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: Tone;
}) {
  return (
    <StatsCard
      title={label}
      value={typeof value === 'string' || typeof value === 'number' ? value : String(value)}
      description={typeof sub === 'string' ? sub : undefined}
      variant={tone ? KPI_VARIANT[tone] : 'default'}
    />
  );
}

export function PageHeader({
  title,
  subtitle,
  right,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="mb-5 flex items-start justify-between gap-4">
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight text-foreground">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {right && <div className="flex shrink-0 items-center gap-2">{right}</div>}
    </div>
  );
}

const BTN_VARIANT: Record<'default' | 'primary' | 'ghost', 'outline' | 'default' | 'ghost'> = {
  default: 'outline',
  primary: 'default',
  ghost: 'ghost',
};

export function Button({
  children,
  onClick,
  variant = 'default',
  className = '',
  title,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'default' | 'primary' | 'ghost';
  className?: string;
  title?: string;
}) {
  return (
    <AwButton variant={BTN_VARIANT[variant]} size="sm" onClick={onClick} title={title} className={className}>
      {children}
    </AwButton>
  );
}

// ---- SLA badge ----
const SLA_META: Record<SlaStatus, { tone: Tone; label: string }> = {
  'on-track': { tone: 'green', label: 'On track' },
  'at-risk': { tone: 'amber', label: 'At risk' },
  breached: { tone: 'red', label: 'Overdue' },
  completed: { tone: 'gray', label: 'Met' },
  unknown: { tone: 'gray', label: 'No SLA' },
};
export function SlaBadge({ status }: { status?: SlaStatus | null }) {
  const meta = SLA_META[status ?? 'unknown'];
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}

// ---- actor badge (execution-history actor type) ----
const ACTOR_META: Record<ActorType, { tone: Tone; label: string }> = {
  agent: { tone: 'violet', label: 'Agent' },
  automation: { tone: 'blue', label: 'Automation' },
  human: { tone: 'amber', label: 'Human' },
  api: { tone: 'green', label: 'API' },
  system: { tone: 'gray', label: 'System' },
};
export function ActorBadge({ actor }: { actor: ActorType }) {
  const meta = ACTOR_META[actor];
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}

// ---- pagination ----
/** Client-side paginator over an already-loaded array. */
export function usePaged<T>(items: T[], pageSize = 25) {
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(items.length / pageSize));
  const clamped = Math.min(page, pages - 1);
  const slice = items.slice(clamped * pageSize, (clamped + 1) * pageSize);
  return { slice, page: clamped, setPage, total: items.length, pageSize, pages };
}

export function Pagination({
  page,
  pageSize,
  total,
  onPage,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (p: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total === 0) return null;
  const from = page * pageSize + 1;
  const to = Math.min(total, (page + 1) * pageSize);
  return (
    <div className="flex items-center justify-between border-t px-5 py-3 text-xs text-muted-foreground">
      <span>
        Showing {from}–{to} of {total}
      </span>
      <div className="flex items-center gap-2">
        <AwButton variant="outline" size="xs" disabled={page <= 0} onClick={() => onPage(page - 1)}>
          Prev
        </AwButton>
        <span>
          Page {page + 1} of {pages}
        </span>
        <AwButton variant="outline" size="xs" disabled={page >= pages - 1} onClick={() => onPage(page + 1)}>
          Next
        </AwButton>
      </div>
    </div>
  );
}

/** Prev/Next pager for server-side cursor pagination (no known total). */
export function CursorPagination({
  page,
  hasNext,
  onPage,
  count,
}: {
  page: number;
  hasNext: boolean;
  onPage: (p: number) => void;
  count: number;
}) {
  return (
    <div className="flex items-center justify-between border-t px-5 py-3 text-xs text-muted-foreground">
      <span>
        Page {page + 1} · {count} shown
      </span>
      <div className="flex items-center gap-2">
        <AwButton variant="outline" size="xs" disabled={page <= 0} onClick={() => onPage(page - 1)}>
          Prev
        </AwButton>
        <AwButton variant="outline" size="xs" disabled={!hasNext} onClick={() => onPage(page + 1)}>
          Next
        </AwButton>
      </div>
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <Alert variant="destructive">
      <AlertTitle>Couldn't load data from UiPath</AlertTitle>
      <AlertDescription className="break-words">{message}</AlertDescription>
    </Alert>
  );
}
