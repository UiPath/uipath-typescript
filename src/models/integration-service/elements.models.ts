/**
 * Integration Service — Elements models
 *
 * Read-only catalog/metadata APIs — no entity binding.
 */

import {
  ElementObject,
  ElementActivity,
  ElementObjectMetadataResponse,
  ElementEventObject,
  ElementEventObjectMetadataResponse,
  ElementObjectsGetOptions,
  ElementActivitiesGetOptions,
  ElementObjectMetadataGetOptions,
  ElementEventObjectsGetOptions,
  ElementEventObjectMetadataGetOptions,
} from './elements.types';

/**
 * Service for inspecting connector elements (objects, activities, trigger events,
 * field schemas) on UiPath Integration Service.
 *
 * The Elements API powers design-time tooling — every connector exposes a
 * catalog of *objects* (resources like `contacts`, `messages`), *activities*
 * (curated operations like `Send Email`), and *event objects* (trigger sources
 * like `New Message`). Each can be inspected statically (connector-only) or
 * scoped to a connection instance (which enriches the response with custom
 * fields discovered from the live system).
 *
 * ### Usage
 *
 * Prerequisites: Initialize the SDK first - see [Getting Started](/uipath-typescript/getting-started/#import-initialize)
 *
 * ```typescript
 * import { Elements } from '@uipath/uipath-typescript/is-elements';
 *
 * const elements = new Elements(sdk);
 * const objects = await elements.getObjects('uipath-slack');
 * ```
 */
export interface ElementsServiceModel {
  /**
   * List objects (resources) exposed by a connector.
   *
   * @param elementKey - Connector key (e.g. `uipath-slack`)
   * @param options - Filtering options (type, subtype, hasEvents, hasBulk)
   * @returns Promise resolving to an array of {@link ElementObject}
   * @example
   * ```typescript
   * import { Elements } from '@uipath/uipath-typescript/is-elements';
   *
   * const elements = new Elements(sdk);
   *
   * const objects = await elements.getObjects('uipath-slack');
   * for (const obj of objects) {
   *   console.log(`${obj.name} — ${obj.displayName}`);
   * }
   * ```
   *
   * @example
   * ```typescript
   * // Only objects that support events
   * const eventCapable = await elements.getObjects('uipath-slack', { hasEvents: true });
   * ```
   */
  getObjects(elementKey: string, options?: ElementObjectsGetOptions): Promise<ElementObject[]>;

  /**
   * List curated activities exposed by a connector.
   *
   * @param elementKey - Connector key
   * @param options - Optional `version` to pin to a specific connector schema
   * @returns Promise resolving to an array of {@link ElementActivity}
   * @example
   * ```typescript
   * const activities = await elements.getActivities('uipath-slack');
   * for (const activity of activities) {
   *   console.log(`${activity.name}: ${activity.operation} on ${activity.objectName}`);
   * }
   * ```
   */
  getActivities(elementKey: string, options?: ElementActivitiesGetOptions): Promise<ElementActivity[]>;

  /**
   * Get metadata for a single connector object (field schema, supported methods,
   * parameters). Connection-independent — returns the standard schema only.
   *
   * @param elementKey - Connector key
   * @param objectName - Object name (e.g. `messages`)
   * @param options - Optional `version`, `hydrateParameters`, `includeParentArray`
   * @returns Promise resolving to an {@link ElementObjectMetadataResponse}
   * @example
   * ```typescript
   * const meta = await elements.getObjectMetadata('uipath-slack', 'messages');
   * console.log(`Fields: ${Object.keys(meta.fields ?? {}).length}`);
   * ```
   */
  getObjectMetadata(
    elementKey: string,
    objectName: string,
    options?: ElementObjectMetadataGetOptions,
  ): Promise<ElementObjectMetadataResponse>;

  /**
   * List event objects (trigger sources) for a connector's event operation.
   *
   * @param elementKey - Connector key
   * @param operationName - Event operation name (e.g. `INDEX_COMPLETED`)
   * @param options - Optional `version`
   * @returns Promise resolving to an array of {@link ElementEventObject}
   * @example
   * ```typescript
   * const events = await elements.getEventObjects('uipath-slack', 'NEW_MESSAGE');
   * ```
   */
  getEventObjects(
    elementKey: string,
    operationName: string,
    options?: ElementEventObjectsGetOptions,
  ): Promise<ElementEventObject[]>;

  /**
   * Get metadata for a single event object.
   *
   * @param elementKey - Connector key
   * @param operationName - Event operation name
   * @param objectName - Event object name
   * @param options - Optional `version`, `allFields`, `includeParentArray`
   * @returns Promise resolving to an {@link ElementEventObjectMetadataResponse}
   * @example
   * ```typescript
   * const meta = await elements.getEventObjectMetadata(
   *   'uipath-slack',
   *   'NEW_MESSAGE',
   *   'channels',
   * );
   * ```
   */
  getEventObjectMetadata(
    elementKey: string,
    operationName: string,
    objectName: string,
    options?: ElementEventObjectMetadataGetOptions,
  ): Promise<ElementEventObjectMetadataResponse>;

  /**
   * List objects exposed by a connection instance (includes connector custom
   * fields discovered from the live system).
   *
   * @param connectionId - Connection GUID
   * @param elementKey - Connector key
   * @param options - Filtering options
   * @returns Promise resolving to an array of {@link ElementObject}
   * @example
   * ```typescript
   * const objects = await elements.getInstanceObjects('<connectionId>', 'uipath-slack');
   * ```
   */
  getInstanceObjects(
    connectionId: string,
    elementKey: string,
    options?: ElementObjectsGetOptions,
  ): Promise<ElementObject[]>;

  /**
   * Get instance-scoped metadata for a single object — includes connector
   * custom fields discovered from the live system.
   *
   * @param connectionId - Connection GUID
   * @param elementKey - Connector key
   * @param objectName - Object name
   * @param options - Optional `version`, `hydrateParameters`, `includeParentArray`
   * @returns Promise resolving to an {@link ElementObjectMetadataResponse}
   * @example
   * ```typescript
   * const meta = await elements.getInstanceObjectMetadata(
   *   '<connectionId>',
   *   'uipath-salesforce',
   *   'Account',
   * );
   * ```
   */
  getInstanceObjectMetadata(
    connectionId: string,
    elementKey: string,
    objectName: string,
    options?: ElementObjectMetadataGetOptions,
  ): Promise<ElementObjectMetadataResponse>;

  /**
   * List event objects for a connection instance.
   *
   * @param connectionId - Connection GUID
   * @param elementKey - Connector key
   * @param operationName - Event operation name
   * @param options - Optional `version`
   * @returns Promise resolving to an array of {@link ElementEventObject}
   * @example
   * ```typescript
   * const events = await elements.getInstanceEventObjects(
   *   '<connectionId>',
   *   'uipath-slack',
   *   'NEW_MESSAGE',
   * );
   * ```
   */
  getInstanceEventObjects(
    connectionId: string,
    elementKey: string,
    operationName: string,
    options?: ElementEventObjectsGetOptions,
  ): Promise<ElementEventObject[]>;

  /**
   * Get instance-scoped metadata for a single event object.
   *
   * @param connectionId - Connection GUID
   * @param elementKey - Connector key
   * @param operationName - Event operation name
   * @param objectName - Event object name
   * @param options - Optional `version`, `allFields`, `includeParentArray`
   * @returns Promise resolving to an {@link ElementEventObjectMetadataResponse}
   * @example
   * ```typescript
   * const meta = await elements.getInstanceEventObjectMetadata(
   *   '<connectionId>',
   *   'uipath-slack',
   *   'NEW_MESSAGE',
   *   'channels',
   * );
   * ```
   */
  getInstanceEventObjectMetadata(
    connectionId: string,
    elementKey: string,
    operationName: string,
    objectName: string,
    options?: ElementEventObjectMetadataGetOptions,
  ): Promise<ElementEventObjectMetadataResponse>;
}
