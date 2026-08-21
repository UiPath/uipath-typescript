/**
 * The execution-context environment contract the SDK reads outside the browser.
 *
 * Unit tests must not depend on whichever of these a developer happens to have
 * exported, so any suite that constructs a UiPath instance clears them first and
 * restores them afterwards.
 */
export const UIPATH_CONTRACT_VARS = [
  'UIPATH_URL',
  'UIPATH_BASE_URL',
  'UIPATH_ORGANIZATION_ID',
  'UIPATH_ORG_ID',
  'UIPATH_ORGANIZATION_NAME',
  'UIPATH_ORG_NAME',
  'UIPATH_TENANT_ID',
  'UIPATH_TENANT_NAME',
  'UIPATH_ACCESS_TOKEN',
  'UIPATH_SECRET',
] as const;

/** Clears every contract variable and returns a restore function for afterEach. */
export function clearContractEnv(): () => void {
  const saved: Record<string, string | undefined> = {};

  for (const key of UIPATH_CONTRACT_VARS) {
    saved[key] = process.env[key];
    delete process.env[key];
  }

  return () => {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  };
}
