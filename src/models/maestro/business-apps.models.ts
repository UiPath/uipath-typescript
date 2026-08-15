/**
 * Business App service model — the ServiceModel interface that drives generated
 * API documentation, plus the entity methods bound onto each returned app.
 */

import type {
  RawBusinessAppGetResponse,
  BusinessAppCreateOptions,
  BusinessAppUpdateOptions,
} from './business-apps.types';
import type {
  PaginationOptions,
  PaginatedResponse,
  NonPaginatedResponse,
  HasPaginationOptions,
} from '../../utils/pagination';

/**
 * A business app definition, with entity methods attached.
 */
export type BusinessAppGetResponse = RawBusinessAppGetResponse & BusinessAppMethods;

/**
 *
 * @experimental
 *
 * /// warning
 * Preview: This service is experimental and may change or be removed in future releases.
 * ///
 *
 * Public surface of the Business Apps service. JSDoc on this interface drives
 * the generated API reference documentation.
 *
 * A business app is the tenant-level definition behind a workspace in Maestro — its name,
 * description, icon, color, and the Orchestrator processes it surfaces. Definitions are
 * scoped to the tenant, so no folder is involved.
 *
 * Reads require the tenant-level `APPS.View` permission; `create` requires `APPS.Create`,
 * and both `updateById` and `deleteById` require `APPS.Edit`.
 */
export interface BusinessAppsServiceModel {
  /**
   * Creates a business app.
   *
   * @experimental
   *
   * /// warning
   * Preview: This method is experimental and may change or be removed in future releases.
   * ///
   *
   * The name must be unique within the tenant, compared case-insensitively — creating a
   * second app whose name differs only by case is rejected as a conflict. Returns the
   * stored app including its generated `id` and audit fields.
   *
   * @param name - Display name, unique within the tenant
   * @param description - Human description of what the app is for
   * @param processKeys - Orchestrator process (release) keys the app surfaces; at least one
   * @param options - Optional icon and color
   * @returns The created app as a {@link BusinessAppGetResponse}, with `update` and `delete` attached
   *
   * @example Basic usage
   * ```typescript
   * import { UiPath } from '@uipath/uipath-typescript/core';
   * import { BusinessApps } from '@uipath/uipath-typescript/business-apps';
   *
   * const sdk = new UiPath(config);
   * await sdk.initialize();
   *
   * const businessApps = new BusinessApps(sdk);
   * const app = await businessApps.create('Claims Intake', 'Handles inbound claims', [
   *   '<processKey>',
   * ]);
   * ```
   *
   * @example With an icon and color
   * ```typescript
   * const app = await businessApps.create(
   *   'Claims Intake',
   *   'Handles inbound claims',
   *   ['<processKey>'],
   *   { icon: 'claims-icon', color: '#1F6FEB' }
   * );
   * ```
   */
  create(
    name: string,
    description: string,
    processKeys: string[],
    options?: BusinessAppCreateOptions
  ): Promise<BusinessAppGetResponse>;

  /**
   * Gets the tenant's business apps, ordered by name.
   *
   * @experimental
   *
   * /// warning
   * Preview: This method is experimental and may change or be removed in future releases.
   * ///
   *
   * Apps are visible to anyone who can read them — there is no per-caller filtering. The
   * results are paged: calling without options returns the first page at the service's
   * default page size, so pass `pageSize` and follow `nextCursor` to walk a tenant that
   * has more apps than one page holds.
   *
   * @param options - Pagination options
   * @returns The tenant's apps as {@link BusinessAppGetResponse} items, each with `update` and `delete` attached
   *
   * @example Basic usage
   * ```typescript
   * const result = await businessApps.getAll();
   * result.items.forEach(app => console.log(app.name, app.processKeys));
   * ```
   *
   * @example Walking every page
   * ```typescript
   * let page = await businessApps.getAll({ pageSize: 50 });
   * const allApps = [...page.items];
   *
   * while (page.hasNextPage) {
   *   page = await businessApps.getAll({ cursor: page.nextCursor });
   *   allApps.push(...page.items);
   * }
   * ```
   */
  getAll<T extends PaginationOptions = PaginationOptions>(
    options?: T
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<BusinessAppGetResponse>
      : NonPaginatedResponse<BusinessAppGetResponse>
  >;

  /**
   * Gets a business app by id.
   *
   * @experimental
   *
   * /// warning
   * Preview: This method is experimental and may change or be removed in future releases.
   * ///
   *
   * Apps are addressable by id only — names are mutable, so resolve a name through
   * `getAll()` first if that is all you have.
   *
   * @param businessAppId - GUID of the business app
   * @returns The app as a {@link BusinessAppGetResponse}, with `update` and `delete` attached
   *
   * @example Basic usage
   * ```typescript
   * const app = await businessApps.getById('<businessAppId>');
   * ```
   */
  getById(businessAppId: string): Promise<BusinessAppGetResponse>;

  /**
   * Replaces a business app.
   *
   * @experimental
   *
   * /// warning
   * Preview: This method is experimental and may change or be removed in future releases.
   * ///
   *
   * This is a full replace, not a partial update: every editable field is overwritten, so
   * an omitted `icon` or `color` is cleared rather than left alone. The name must stay
   * unique within the tenant. Writes are last-write-wins — concurrent updates do not
   * conflict, the later one simply survives.
   *
   * @param businessAppId - GUID of the business app
   * @param name - New display name, unique within the tenant
   * @param description - New description
   * @param processKeys - The full set of Orchestrator process (release) keys the app surfaces
   * @param options - Optional icon and color; omitting one clears it
   * @returns The app as stored after the write, as a {@link BusinessAppGetResponse}
   *
   * @example Basic usage
   * ```typescript
   * const updated = await businessApps.updateById(
   *   '<businessAppId>',
   *   'Claims Intake',
   *   'Handles inbound and renewal claims',
   *   ['<processKey>']
   * );
   * ```
   *
   * @example Keeping the existing icon and color
   * ```typescript
   * const app = await businessApps.getById('<businessAppId>');
   *
   * const updated = await businessApps.updateById(
   *   app.id,
   *   app.name,
   *   'An updated description',
   *   app.processKeys,
   *   { icon: app.icon ?? undefined, color: app.color ?? undefined }
   * );
   * ```
   */
  updateById(
    businessAppId: string,
    name: string,
    description: string,
    processKeys: string[],
    options?: BusinessAppUpdateOptions
  ): Promise<BusinessAppGetResponse>;

  /**
   * Deletes a business app.
   *
   * @experimental
   *
   * /// warning
   * Preview: This method is experimental and may change or be removed in future releases.
   * ///
   *
   * Only the definition is removed — the processes it referenced are left untouched.
   *
   * @param businessAppId - GUID of the business app
   *
   * @example Basic usage
   * ```typescript
   * await businessApps.deleteById('<businessAppId>');
   * ```
   */
  deleteById(businessAppId: string): Promise<void>;
}

/**
 * Methods attached to each business app returned by the service.
 */
export interface BusinessAppMethods {
  /**
   * Replaces this business app. A full replace — an omitted `icon` or `color` is cleared.
   */
  update(
    name: string,
    description: string,
    processKeys: string[],
    options?: BusinessAppUpdateOptions
  ): Promise<BusinessAppGetResponse>;

  /**
   * Deletes this business app.
   */
  delete(): Promise<void>;
}

/**
 * Builds the methods bound to a single business app.
 */
function createBusinessAppMethods(
  data: RawBusinessAppGetResponse,
  service: BusinessAppsServiceModel
): BusinessAppMethods {
  return {
    // `async` so a missing id rejects rather than throwing synchronously out of a
    // method the interface types as returning a promise.
    async update(
      name: string,
      description: string,
      processKeys: string[],
      options?: BusinessAppUpdateOptions
    ): Promise<BusinessAppGetResponse> {
      if (!data.id) throw new Error('Business app ID is undefined');

      return service.updateById(data.id, name, description, processKeys, options);
    },

    async delete(): Promise<void> {
      if (!data.id) throw new Error('Business app ID is undefined');

      return service.deleteById(data.id);
    },
  };
}

/**
 * Merges a raw business app with its bound entity methods.
 */
export function createBusinessAppWithMethods(
  data: RawBusinessAppGetResponse,
  service: BusinessAppsServiceModel
): BusinessAppGetResponse {
  return Object.assign({}, data, createBusinessAppMethods(data, service));
}
