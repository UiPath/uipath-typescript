import type { ReactNode } from 'react'
import { ArrowUpRight } from 'lucide-react'

interface CardShellProps {
  title: string
  subtitle?: string
  /** Header controls (toggles). Wraps below the title when space is tight. */
  controls?: ReactNode
  onViewAll?: () => void
  children: ReactNode
}

export function CardShell({ title, subtitle, controls, onViewAll, children }: CardShellProps) {
  return (
    <section className="flex min-w-0 flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      {/* flex-wrap keeps headers from cramping: controls drop below the title */}
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="min-w-0 flex-1 basis-48">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate text-sm font-semibold" title={title}>
              {title}
            </h3>
            {onViewAll && (
              <button
                type="button"
                onClick={onViewAll}
                className="inline-flex shrink-0 items-center gap-0.5 text-xs font-medium text-(--brand) hover:text-(--brand-dark)"
              >
                View all
                <ArrowUpRight className="h-3 w-3" />
              </button>
            )}
          </div>
          {subtitle && (
            <p className="mt-0.5 truncate text-xs text-slate-500" title={subtitle}>
              {subtitle}
            </p>
          )}
        </div>
        {controls}
      </div>
      {children}
    </section>
  )
}

export function LoadingBlock() {
  return <div className="h-24 animate-pulse rounded-lg bg-slate-100" />
}

export function ErrorBlock({ message }: { message: string }) {
  const accessDenied = /403|forbidden|authoriz/i.test(message)
  return (
    <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
      {accessDenied
        ? 'Your account does not have access to governance data for this organization — ask your administrator.'
        : message}
    </div>
  )
}

export function EmptyBlock() {
  return (
    <p className="py-6 text-center text-sm text-slate-500">
      No compliance checks in this window. Agents must run with UiPath compliance checks enabled
      (Agentic Governance preview) for data to appear.
    </p>
  )
}
