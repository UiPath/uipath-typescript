/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Name of the Data Fabric entity holding app settings. Defaults to `AppSettings`. */
  readonly VITE_SETTINGS_ENTITY_NAME?: string
  /**
   * Row key the maintenance switch is stored under. Defaults to
   * `MaintenanceMode:<client id>` so each app gets its own switch.
   */
  readonly VITE_MAINTENANCE_SETTING_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
