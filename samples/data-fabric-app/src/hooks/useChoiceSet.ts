import { useCallback, useEffect, useState } from 'react'
import { ChoiceSets } from '@uipath/uipath-typescript/entities'
import type { ChoiceSetGetResponse } from '@uipath/uipath-typescript/entities'
import { UiPathError } from '@uipath/uipath-typescript/core'
import { useAuth } from './useAuth'

/** One value inside a ChoiceSet — the SDK's `ChoiceSetGetResponse`. */
export type ChoiceSetValue = ChoiceSetGetResponse

export interface UseChoiceSetResult {
  values: ChoiceSetValue[]
  loading: boolean
  error: string | null
  reload: () => Promise<void>
}

/**
 * Loads the values of a Data Fabric ChoiceSet.
 *
 * SDK call: `ChoiceSets.getById(choiceSetId)` — note that despite the name,
 * this returns the *list of values* inside the choice set, not the choice
 * set's own metadata.
 *
 * Use this for entities whose `entityType === 'ChoiceSet'` — the standard
 * `Entities.getAllRecords` doesn't apply, but ChoiceSets has its own
 * dedicated endpoint that returns the choice values.
 *
 * @example
 *   const { values, loading } = useChoiceSet(entityId)
 */
export function useChoiceSet(choiceSetId: string): UseChoiceSetResult {
  const { sdk } = useAuth()
  const [values, setValues] = useState<ChoiceSetValue[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const svc = new ChoiceSets(sdk)
      // Without pagination options, `getById` returns a
      // NonPaginatedResponse<ChoiceSetGetResponse> shaped as `{ items, totalCount }`.
      const { items } = await svc.getById(choiceSetId)
      setValues(items)
    } catch (err) {
      setError(
        err instanceof UiPathError ? err.message : 'Failed to load choice set',
      )
    } finally {
      setLoading(false)
    }
  }, [sdk, choiceSetId])

  useEffect(() => {
    reload()
  }, [reload])

  return { values, loading, error, reload }
}
