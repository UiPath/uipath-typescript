import { UiPathEnvVars } from '@/core/config/environment';

/**
 * The execution-context environment contract the SDK reads outside the browser.
 *
 * Unit tests must not depend on whichever of these a developer happens to have
 * exported, so any suite that constructs a UiPath instance clears them first and
 * restores them afterwards.
 */
// Derived from the SDK's own contract rather than restated: a new alias added to
// UiPathEnvVars is then cleared here automatically, instead of silently leaking
// into tests until someone notices.
export const UIPATH_CONTRACT_VARS: readonly string[] = Object.values(UiPathEnvVars);

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
