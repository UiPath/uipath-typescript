interface ToggleProps<T extends string> {
  options: readonly T[]
  value: T
  onChange: (value: T) => void
  labels?: Partial<Record<T, string>>
  ariaLabel: string
}

/**
 * Segmented toggle — the active option renders as a filled UiPath-orange pill
 * with white text; inactive options stay plain.
 */
export function Toggle<T extends string>({ options, value, onChange, labels, ariaLabel }: ToggleProps<T>) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="inline-flex shrink-0 items-center gap-0.5 rounded-lg border border-slate-200 bg-white p-0.5"
    >
      {options.map((option) => {
        const active = option === value
        return (
          <button
            key={option}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option)}
            className={
              active
                ? 'rounded-md bg-(--brand) px-2.5 py-1 text-xs font-semibold text-white'
                : 'rounded-md px-2.5 py-1 text-xs font-medium text-slate-500 hover:text-slate-800'
            }
          >
            {labels?.[option] ?? option}
          </button>
        )
      })}
    </div>
  )
}
