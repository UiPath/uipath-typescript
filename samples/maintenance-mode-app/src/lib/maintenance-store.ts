import type { UiPath } from '@uipath/uipath-typescript/core'
import { DataFabricMaintenanceStore } from './data-fabric-store'

/**
 * Where the maintenance switch lives.
 *
 * The app asks only two things of its storage: read the switch, write the
 * switch. Keeping that behind an interface means the storage can change without
 * touching the gate, the pages, or the admin check.
 *
 * Today the implementation is a Data Fabric entity holding key/value rows —
 * the same shape as platform-level app settings (environment variables). When
 * those are available, return a different implementation from
 * `createMaintenanceStore()` and nothing else moves.
 */
export interface MaintenanceStore {
  /** Whether maintenance mode is currently on. */
  read(): Promise<boolean>
  /** Turns maintenance mode on or off for everyone. */
  write(enabled: boolean): Promise<void>
  /** Where the value is kept, in words — shown on the Settings page. */
  describe(): string
}

export function createMaintenanceStore(sdk: UiPath): MaintenanceStore {
  return new DataFabricMaintenanceStore(sdk)
}
