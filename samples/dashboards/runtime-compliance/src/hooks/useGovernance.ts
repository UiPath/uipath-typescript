import { useEffect, useState } from 'react'
import type { UiPath } from '@uipath/uipath-typescript/core'
import type { Decision, KpiTotals } from '@/lib/governance'
import { fetchDecisions, fetchKpis } from '@/lib/governance'
import type { TimeWindow } from '@/lib/time'
import { rangeFor } from '@/lib/time'

interface Result<T> {
  data: T | null
  loading: boolean
  error: string | null
}

// Session-scoped caches so toggling a card between windows it has already
// shown is instant, and cards sharing a window share one network call.
const decisionsCache = new Map<TimeWindow, Promise<Decision[]>>()
const kpisCache = new Map<TimeWindow, Promise<KpiTotals>>()

function useCached<T>(
  sdk: UiPath,
  window: TimeWindow,
  cache: Map<TimeWindow, Promise<T>>,
  fetcher: (sdk: UiPath, range: ReturnType<typeof rangeFor>) => Promise<T>,
): Result<T> {
  const [state, setState] = useState<Result<T>>({ data: null, loading: true, error: null })

  useEffect(() => {
    let cancelled = false
    setState((s) => ({ ...s, loading: true, error: null }))
    let promise = cache.get(window)
    if (!promise) {
      promise = fetcher(sdk, rangeFor(window))
      cache.set(window, promise)
    }
    promise
      .then((data) => {
        if (!cancelled) setState({ data, loading: false, error: null })
      })
      .catch((err: unknown) => {
        cache.delete(window) // don't cache failures
        if (!cancelled) {
          setState({
            data: null,
            loading: false,
            error: err instanceof Error ? err.message : 'Request failed',
          })
        }
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sdk, window])

  return state
}

/** All compliance-check decisions for the window (cursor-looped, cached). */
export function useDecisions(sdk: UiPath, window: TimeWindow): Result<Decision[]> {
  return useCached(sdk, window, decisionsCache, fetchDecisions)
}

/** KPI totals (current + prior window) from the aggregated summary. */
export function useKpis(sdk: UiPath, window: TimeWindow): Result<KpiTotals> {
  return useCached(sdk, window, kpisCache, fetchKpis)
}
