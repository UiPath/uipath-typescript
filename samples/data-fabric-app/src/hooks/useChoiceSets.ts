import { useCallback, useEffect, useState } from 'react'
import { ChoiceSets } from '@uipath/uipath-typescript/entities'
import { UiPathError } from '@uipath/uipath-typescript/core'
import { useAuth } from './useAuth'

/**
 * Subset of `ChoiceSetGetAllResponse` we use in the list view.
 *
 * Mirrors what the SDK returns from `ChoiceSets.getAll()`. Kept as a local
 * type so the rest of the app stays decoupled from SDK internals.
 */
export interface ChoiceSetListItem {
  id: string
  name: string
  displayName: string
  description?: string
  createdBy?: string
  createdTime?: string
  updatedBy?: string
  updatedTime?: string
}

export interface UseChoiceSetsResult {
  choiceSets: ChoiceSetListItem[]
  loading: boolean
  error: string | null
  /** Re-fetch the choice set list. */
  refresh: () => Promise<void>
}

/**
 * Lists every choice set in the tenant.
 *
 * SDK call: `ChoiceSets.getAll()` → see
 *   https://uipath.github.io/uipath-typescript/api/interfaces/ChoiceSetServiceModel/#getall
 *
 * Why this exists alongside `useEntities()`:
 *   - `Entities.getAll()` returns the entity catalog (regular entities,
 *     VDOs, system entities, sometimes choice sets too depending on tenant).
 *   - `ChoiceSets.getAll()` is the canonical source for choice sets and
 *     comes with choice-set-specific metadata (description, createdBy,
 *     updatedTime) the entity endpoint doesn't include.
 *
 * Use this hook to power a dedicated "Choice Sets" sidebar section.
 *
 * @example
 *   const { choiceSets, loading } = useChoiceSets()
 */
export function useChoiceSets(): UseChoiceSetsResult {
  const { sdk } = useAuth()
  const [choiceSets, setChoiceSets] = useState<ChoiceSetListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const svc = new ChoiceSets(sdk)
      const result = await svc.getAll()
      const list = (
        Array.isArray(result) ? result : ((result as any).items ?? [])
      ) as ChoiceSetListItem[]
      setChoiceSets(list)
    } catch (err) {
      setError(
        err instanceof UiPathError ? err.message : 'Failed to load choice sets',
      )
    } finally {
      setLoading(false)
    }
  }, [sdk])

  useEffect(() => {
    load()
  }, [load])

  return { choiceSets, loading, error, refresh: load }
}
