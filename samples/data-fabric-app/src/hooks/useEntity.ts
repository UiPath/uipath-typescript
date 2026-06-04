import { useCallback, useEffect, useState } from 'react'
import { Entities } from '@uipath/uipath-typescript/entities'
import { UiPathError } from '@uipath/uipath-typescript/core'
import { useAuth } from './useAuth'
import { entityNotSupportedReason } from '../lib/entityTypes'

/** Minimal field shape we use; the SDK also exports `FieldMetaData`. */
export interface EntityField {
  id: string
  name: string
  // The SDK type definitions don't list `displayName` on FieldMetaData but
  // the runtime response includes it (the widget keys its column config by
  // this). We accept it optionally and fall back to `name` if absent.
  displayName?: string
  isPrimaryKey: boolean
  isRequired: boolean
  isSystemField: boolean
  isAttachment: boolean
  fieldDataType?: { name: string }
}

/** Minimal entity schema; the SDK also exports `EntityGetResponse`. */
export interface EntitySchema {
  id: string
  name: string
  displayName: string
  description?: string
  entityType?: string
  fields: EntityField[]
  externalFields?: unknown[]
  sourceJoinCriterias?: unknown[]
}

/** A single record. `Id` is always present; other fields are dynamic per entity. */
export type EntityRow = { Id: string; [key: string]: unknown }

export interface UseEntityResult {
  schema: EntitySchema | null
  records: EntityRow[]
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
  reloadRecords: () => Promise<EntityRow[]>
}

/**
 * Loads one entity's schema and records.
 *
 * SDK calls:
 *  - `Entities.getById(id)`        → entity schema (fields, type, metadata)
 *  - `Entities.getAllRecords(id)`  → records inside the entity
 *
 * Schema and records have **separate loading + error states** so a records
 * fetch failure doesn't blank out the schema view.
 *
 * VDOs / InternalEntity / SystemEntity / ChoiceSet are detected up-front via
 * `entityNotSupportedReason()` and the records call is **skipped** — the
 * standard `getAllRecords` endpoint doesn't apply to those entity kinds. Use
 * `entityNotSupportedReason(schema)` in the UI to show an explanation.
 *
 * @example
 *   const { schema, records, recordsLoading, reloadRecords } = useEntity(id)
 */
export function useEntity(entityId: string): UseEntityResult {
  const { sdk } = useAuth()
  const [schema, setSchema] = useState<EntitySchema | null>(null)
  const [records, setRecords] = useState<EntityRow[]>([])
  const [loading, setLoading] = useState(false)
  const [recordsLoading, setRecordsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [recordsError, setRecordsError] = useState<string | null>(null)

  const fetchRecords = useCallback(
    async (entity: EntitySchema): Promise<EntityRow[]> => {
      if (entityNotSupportedReason(entity)) {
        // VDOs, InternalEntity, SystemEntity, ChoiceSet — the records endpoint
        // doesn't apply. The UI shows a friendly notice instead.
        setRecords([])
        return []
      }
      setRecordsLoading(true)
      setRecordsError(null)
      try {
        const svc = new Entities(sdk)
        const result = await svc.getAllRecords(entityId)
        const items = Array.isArray(result)
          ? result
          : ((result as any).items ?? [])
        const rows = items as EntityRow[]
        setRecords(rows)
        return rows
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

  const reloadRecords = useCallback(async (): Promise<EntityRow[]> => {
    if (!schema) return []
    return fetchRecords(schema)
  }, [schema, fetchRecords])

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    setRecords([])
    setRecordsError(null)
    try {
      const svc = new Entities(sdk)
      const entity = (await svc.getById(entityId)) as unknown as EntitySchema
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
