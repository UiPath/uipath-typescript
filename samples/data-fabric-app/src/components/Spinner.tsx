interface Props {
  size?: 'sm' | 'md' | 'lg'
  label?: string
}

/**
 * Inline animated SVG spinner. Used for centered "loading content" states.
 * For row-level placeholders use shadcn's <Skeleton /> instead.
 */
export function Spinner({ size = 'md', label }: Props) {
  const dimension = size === 'sm' ? 16 : size === 'lg' ? 32 : 20
  return (
    <div className="flex items-center gap-2 text-muted-foreground">
      <svg
        width={dimension}
        height={dimension}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="animate-spin"
        aria-hidden="true"
      >
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeOpacity="0.2"
          strokeWidth="3"
        />
        <path
          d="M22 12a10 10 0 0 0-10-10"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
      {label && <span className="text-sm">{label}</span>}
    </div>
  )
}
