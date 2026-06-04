import { useCallback, useEffect, useState } from 'react'
import { Entities } from '@uipath/uipath-typescript/entities'
import { UiPathError } from '@uipath/uipath-typescript/core'
import { useAuth } from './useAuth'

/**
 * Subset of `EntityGetResponse` we use in the list view.
 *
 * The SDK ships full types for these — see
 *   import type { EntityGetResponse } from '@uipath/uipath-typescript/entities'
 * — but using a narrow local type keeps the consuming components decoupled
 * from internal field additions in future SDK versions.
 */
export interface EntityListItem {
  id: string
  name: string
  displayName: string
  entityType?: string
  recordCount?: number
  // Markers used to detect Virtual Data Objects — see `lib/entityTypes.ts`.
  externalFields?: unknown[]
  sourceJoinCriterias?: unknown[]
}

export interface UseEntitiesResult {
  entities: EntityListItem[]
  loading: boolean
  error: string | null
  /** Re-fetch the entity list. Useful for a "Refresh" button. */
  refresh: () => Promise<void>
}

/**
 * Lists all entities in the user's tenant.
 *
 * SDK call: `Entities.getAll()` → see
 * https://uipath.github.io/uipath-typescript/api/interfaces/entity/
 *
 * @example
 *   const { entities, loading, error, refresh } = useEntities()
 */
export function useEntities(): UseEntitiesResult {
  const { sdk } = useAuth()
  const [entities, setEntities] = useState<EntityListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // Construct a service instance per call. The SDK keeps these cheap;
      // there's no shared client to manage. The instance is bound to the
      // authenticated `sdk` from useAuth().
      const svc = new Entities(sdk)
      const result = await svc.getAll()
      // `getAll()` returns `EntityGetResponse[]` when no pagination opts are
      // passed; defensive against future SDK shape changes.
      const all = (Array.isArray(result) ? result : (result as any).items ?? []) as EntityListItem[]
      // Filter out ChoiceSet items — those now live in their own sidebar
      // section sourced from `ChoiceSets.getAll()`, which carries choice-set-
      // specific metadata the entity catalog doesn't include. Without this
      // filter, choice sets would appear in both lists.
      const list = all.filter((e) => e.entityType !== 'ChoiceSet')
      setEntities(list)
    } catch (err) {
      setError(err instanceof UiPathError ? err.message : 'Failed to load entities')
    } finally {
      setLoading(false)
    }
  }, [sdk])

  useEffect(() => {
    load()
  }, [load])

  return { entities, loading, error, refresh: load }
}
