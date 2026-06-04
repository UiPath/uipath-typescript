import { useCallback, useEffect, useState } from 'react'
import { Entities } from '@uipath/uipath-typescript/entities'
import type { EntityGetResponse } from '@uipath/uipath-typescript/entities'
import { UiPathError } from '@uipath/uipath-typescript/core'
import { useAuth } from './useAuth'

/** Entity row from `Entities.getAll()`. */
export type EntityListItem = EntityGetResponse

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
      // `Entities.getAll()` returns `EntityGetResponse[]` directly (no
      // pagination wrapper). Filter out ChoiceSet items here so they don't
      // show up in both the entities and choice-sets sidebar sections —
      // the choice-sets section is sourced from `ChoiceSets.getAll()` and
      // carries choice-set-specific metadata.
      const all = await svc.getAll()
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
