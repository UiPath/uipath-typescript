/**
 * Internal types for SDK components.
 * @internal - Not for public use
 */

import { UiPathConfig } from '../config/config';
import { ExecutionContext } from '../context/execution';
import { TokenManager } from '../auth/token-manager';
import type { OrganizationIdResolver } from '../organization/organization-id-resolver';
import type { SessionLicense } from '../licensing/session-license';

/**
 * Private SDK components used by services.
 * @internal
 */
export interface PrivateSDK {
  /** Configuration including base URL, organization name, and tenant name */
  config: UiPathConfig;
  /** Execution context for request tracking and metadata */
  context: ExecutionContext;
  /** Token manager for authentication */
  tokenManager: TokenManager;
  /**
   * Default folder key (GUID) for folder-scoped services when the caller supplies no folder
   * context: a coded function's `ctx.platform.folderKey`, or `<meta name="uipath:folder-key">`
   * injected during coded-app deployment. Not settable through the configuration object.
   */
  folderKey?: string;
  /**
   * The `<meta name="uipath:folder-key">` key alone, Integration Service's fallback. A coded
   * function's invocation folder is left out: Integration Service rejects a connection outside the
   * header's folder, and the connection a function uses often lives in another folder.
   */
  metaFolderKey?: string;
  /**
   * Serverless robot key, taken from a coded function's `ctx.robot.key`.
   * Orchestrator needs it to hand a queue item to the function's robot.
   */
  robotKey?: string;
  sessionLicense?: SessionLicense;
  /**
   * Organization GUID resolver, created lazily by
   * `SDKInternalsRegistry.getOrganizationIdResolver()` and cached here so every
   * service built on the instance shares one resolution.
   */
  organizationIdResolver?: OrganizationIdResolver;
}
