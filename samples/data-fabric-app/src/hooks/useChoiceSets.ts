import { useCallback, useEffect, useState } from 'react'
import { ChoiceSets } from '@uipath/uipath-typescript/entities'
import type { ChoiceSetGetAllResponse } from '@uipath/uipath-typescript/entities'
import { UiPathError } from '@uipath/uipath-typescript/core'
import { useAuth } from '../context/AuthContext'

/** Choice set row from `ChoiceSets.getAll()`. */
export type ChoiceSetListItem = ChoiceSetGetAllResponse

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
      const choiceSetService = new ChoiceSets(sdk)
      // `ChoiceSets.getAll()` returns `ChoiceSetGetAllResponse[]` directly.
      const list = await choiceSetService.getAll()
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
