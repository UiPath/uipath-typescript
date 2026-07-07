export type TimeWindow = '24h' | '7d' | '30d'

export const WINDOWS: TimeWindow[] = ['24h', '7d', '30d']

const WINDOW_MS: Record<TimeWindow, number> = {
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
}

export interface Range {
  start: Date
  end: Date
}

export function rangeFor(window: TimeWindow): Range {
  const end = new Date()
  return { start: new Date(end.getTime() - WINDOW_MS[window]), end }
}

/** The equal-length period immediately before `range` — used for change badges. */
export function priorRange(range: Range): Range {
  const length = range.end.getTime() - range.start.getTime()
  return { start: new Date(range.start.getTime() - length), end: range.start }
}

export const WINDOW_LABEL: Record<TimeWindow, string> = {
  '24h': 'last 24 hours',
  '7d': 'last 7 days',
  '30d': 'last 30 days',
}
