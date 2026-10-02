import type { UiPath } from '@uipath/uipath-typescript/core'
import { Entities } from '@uipath/uipath-typescript/entities'
import type { EntityGetResponse, EntityRecord } from '@uipath/uipath-typescript/entities'
import type { MaintenanceStore } from './maintenance-store'

/**
 * The Data Fabric entity that holds app settings as key/value rows.
 * Override with `VITE_SETTINGS_ENTITY_NAME` if your tenant uses another name.
 */
export const SETTINGS_ENTITY_NAME =
  import.meta.env.VITE_SETTINGS_ENTITY_NAME?.trim() || 'AppSettings'

/**
 * The row the maintenance switch is stored under.
 *
 * The entity belongs to the tenant, so the key carries the app's identity —
 * without it, two apps following this pattern would share one switch. The OAuth
 * client id identifies the app: every coded app is registered with its own, and
 * it reaches the browser as `<meta name="uipath:client-id">`, injected by the
 * platform in production and by `@uipath/coded-apps-dev` from `uipath.json`
 * locally.
 *
 * Set `VITE_MAINTENANCE_SETTING_KEY` to pin a key instead. Worth doing if the
 * app's client id may be changed later: a new client id means a new row, and
 * the switch reads as off until it is set again.
 */
export const MAINTENANCE_SETTING_KEY = resolveMaintenanceSettingKey()

function resolveMaintenanceSettingKey(): string {
  const override = import.meta.env.VITE_MAINTENANCE_SETTING_KEY?.trim()
  if (override) {
    return override
  }
  const clientId = document
    .querySelector<HTMLMetaElement>('meta[name="uipath:client-id"]')
    ?.content?.trim()
  return clientId ? `MaintenanceMode:${clientId}` : 'MaintenanceMode'
}

// Field names exactly as defined on the entity. Data Fabric returns
// user-defined fields with their original casing, so these are not transformed.
const KEY_FIELD = 'Key'
const VALUE_FIELD = 'Value'

type SettingsRecord = EntityRecord & Record<string, unknown>

/**
 * Maintenance switch stored as one row of a Data Fabric entity.
 *
 * The entity is looked up once per store instance. Reading with no matching row
 * means "off"; the first write creates the row, later writes update it.
 */
export class DataFabricMaintenanceStore implements MaintenanceStore {
  readonly #entities: Entities
  #entity: EntityGetResponse | undefined

  constructor(sdk: UiPath) {
    this.#entities = new Entities(sdk)
  }

  async read(): Promise<boolean> {
    const row = await this.#findRow()
    return parseBoolean(row?.[VALUE_FIELD])
  }

  async write(enabled: boolean): Promise<void> {
    const entity = await this.#getEntity()
    const row = await this.#findRow()
    const value = String(enabled)

    if (row) {
      await entity.updateRecord(row.Id, { [VALUE_FIELD]: value })
    } else {
      await entity.insertRecord({ [KEY_FIELD]: MAINTENANCE_SETTING_KEY, [VALUE_FIELD]: value })
    }
  }

  describe(): string {
    return `Data Fabric entity ${SETTINGS_ENTITY_NAME}, row ${KEY_FIELD} = ${MAINTENANCE_SETTING_KEY}`
  }

  async #getEntity(): Promise<EntityGetResponse> {
    this.#entity ??= await this.#entities.getByName(SETTINGS_ENTITY_NAME)
    return this.#entity
  }

  async #findRow(): Promise<SettingsRecord | undefined> {
    const entity = await this.#getEntity()
    const { items } = await entity.getAllRecords()
    return (items as SettingsRecord[]).find((record) => record[KEY_FIELD] === MAINTENANCE_SETTING_KEY)
  }
}

// Accepts a Text field holding "true"/"false" as well as a Boolean field.
function parseBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') return value
  return typeof value === 'string' && value.trim().toLowerCase() === 'true'
}
