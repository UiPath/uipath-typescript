import { useCallback, useEffect, useState } from 'react'
import { Entities } from '@uipath/uipath-typescript/entities'
import type {
  EntityGetResponse,
  EntityRecord,
  FieldMetaData,
} from '@uipath/uipath-typescript/entities'
import { UiPathError } from '@uipath/uipath-typescript/core'
import { useAuth } from '../context/AuthContext'
import { entityNotSupportedReason } from '../lib/entityTypes'

/**
 * Field metadata for a Data Fabric entity. Re-exported from the SDK so
 * consumers can `import type { EntityField } from './hooks/useEntity'`
 * without reaching into the SDK package directly.
 *
 * `displayName` is added on top of the SDK's `FieldMetaData` because the
 * runtime response includes it (the data-table widget keys its column
 * config by it), even though the published SDK type omits it today.
 */
export type EntityField = FieldMetaData & { displayName?: string }

export interface UseEntityResult {
  schema: EntityGetResponse | null
  records: EntityRecord[]
  loading: boolean
  recordsLoading: boolean
  error: string | null
  recordsError: string | null
  /** Re-fetch the schema and records. */
  reload: () => Promise<void>
  /**
   * Re-fetch only the records and return them.
   *
   * Returns the freshly-fetched array directly so callers don't have to
   * wait for React's next render to see updated state (handy for things
   * like CSV export where we want the new data immediately).
   */
  reloadRecords: () => Promise<EntityRecord[]>
}

/**
 * Loads one entity's schema and exposes an on-demand records fetcher.
 *
 * SDK calls:
 *  - `Entities.getById(id)`        → entity schema (fields, type, metadata).
 *    Always called on mount.
 *  - `Entities.getAllRecords(id)`  → only when a caller invokes
 *    `reloadRecords()` (CSV export, read-only records table for
 *    SystemEntity). The records grid widget owns its own data layer for the
 *    normal table view, so by default this hook does NOT prefetch records to
 *    avoid duplicate network traffic.
 *
 * `recordsLoading` / `recordsError` are independent of the schema state so
 * an on-demand records call failure doesn't blank out the schema view.
 *
 * VDOs / InternalEntity / ChoiceSet are detected up-front via
 * `entityNotSupportedReason()` and the records call is short-circuited.
 *
 * @example
 *   const { schema, reloadRecords } = useEntity(id)
 *   const rows = await reloadRecords()
 */
export function useEntity(entityId: string): UseEntityResult {
  const { sdk } = useAuth()
  const [schema, setSchema] = useState<EntityGetResponse | null>(null)
  const [records, setRecords] = useState<EntityRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [recordsLoading, setRecordsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [recordsError, setRecordsError] = useState<string | null>(null)

  const fetchRecords = useCallback(
    async (entity: EntityGetResponse): Promise<EntityRecord[]> => {
      if (entityNotSupportedReason(entity)) {
        // VDOs, InternalEntity, SystemEntity, ChoiceSet — the records endpoint
        // doesn't apply. The UI shows a friendly notice instead.
        setRecords([])
        return []
      }
      setRecordsLoading(true)
      setRecordsError(null)
      try {
        const entityService = new Entities(sdk)
        // Each `getAllRecords` call returns ONE server-capped page — passing no
        // options does NOT return every row. Loop the cursor and accumulate so
        // the full record set is available to CSV export (which must not
        // silently truncate large entities to the first page).
        const allRecords: EntityRecord[] = []
        let page = await entityService.getAllRecords(entityId, { pageSize: 100 })
        allRecords.push(...page.items)
        while (page.hasNextPage && page.nextCursor) {
          page = await entityService.getAllRecords(entityId, {
            cursor: page.nextCursor,
          })
          allRecords.push(...page.items)
        }
        setRecords(allRecords)
        return allRecords
      } catch (err) {
        setRecordsError(
          err instanceof UiPathError ? err.message : 'Failed to load records',
        )
        return []
      } finally {
        setRecordsLoading(false)
      }
    },
    [sdk, entityId],
  )

  const reloadRecords = useCallback(async (): Promise<EntityRecord[]> => {
    if (!schema) return []
    return fetchRecords(schema)
  }, [schema, fetchRecords])

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    setRecords([])
    setRecordsError(null)
    try {
      const entityService = new Entities(sdk)
      const entity = await entityService.getById(entityId)
      setSchema(entity)
      // NOTE: We deliberately do NOT call `fetchRecords` here. The records
      // widget (`<DataTable>`) owns its own data layer and runs
      // `getAllRecords` internally as soon as it mounts — fetching the same
      // records here too would mean two parallel network calls for the
      // same data, and the widget would still wait for *its* fetch before
      // rendering. Anything in this app that needs the records array
      // (e.g. CSV export) calls `reloadRecords()` on demand.
    } catch (err) {
      setError(
        err instanceof UiPathError ? err.message : 'Failed to load entity',
      )
    } finally {
      setLoading(false)
    }
  }, [sdk, entityId])

  useEffect(() => {
    reload()
    // `reload` is stable because all deps are memoised via the inner hooks.
  }, [reload])

  return {
    schema,
    records,
    loading,
    recordsLoading,
    error,
    recordsError,
    reload,
    reloadRecords,
  }
}
