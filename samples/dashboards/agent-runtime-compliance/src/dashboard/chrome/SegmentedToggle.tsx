import React from 'react'

type SegmentedToggleProps<T extends string> = {
  options: readonly T[]
  value: T
  onChange: (value: T) => void
  labels?: Partial<Record<T, string>>
}

/** Small in-card segmented control (e.g. 24h / 7d / 30d, Top 5 / 10 / 20).
 *  Stops click propagation so it can sit inside a clickable, navigating card. */
export function SegmentedToggle<T extends string>({ options, value, onChange, labels }: SegmentedToggleProps<T>) {
  return (
    <div
      className="inline-flex shrink-0 items-center gap-0.5 rounded-md border border-border bg-muted/40 p-0.5"
      onClick={e => e.stopPropagation()}
      role="group"
    >
      {options.map(option => (
        <button
          key={option}
          type="button"
          aria-pressed={option === value}
          onClick={e => {
            e.stopPropagation()
            onChange(option)
          }}
          className={`rounded px-2 py-0.5 text-xs font-medium transition-colors ${
            option === value
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {labels?.[option] ?? option}
        </button>
      ))}
    </div>
  )
}
