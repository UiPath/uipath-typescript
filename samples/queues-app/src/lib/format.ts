const dateTimeFormat = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
})

/** Renders an ISO timestamp in the user's locale; `—` for null/absent. */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? iso : dateTimeFormat.format(date)
}

/** Pretty-prints a payload object for the inspector panels. */
export function prettyJson(value: unknown): string {
  return JSON.stringify(value, null, 2)
}
