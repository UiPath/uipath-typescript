import { BaseService } from '../../base';
import { track } from '../../../core/telemetry';
import { ValidationError } from '../../../core/errors';
import { ELEMENT_ENDPOINTS } from '../../../utils/constants/endpoints';
import { QueryParams } from '../../../models/common/request-spec';
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
} from '../../../models/integration-service/elements.types';
import { ElementsServiceModel } from '../../../models/integration-service/elements.models';

function requireArg(value: string, name: string, method: string): void {
  if (!value) {
    throw new ValidationError({ message: `${name} is required for ${method}` });
  }
}

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
export class ElementsService extends BaseService implements ElementsServiceModel {
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
  @track('Elements.GetObjects')
  async getObjects(elementKey: string, options?: ElementObjectsGetOptions): Promise<ElementObject[]> {
    requireArg(elementKey, 'elementKey', 'getObjects');
    const response = await this.get<ElementObject[]>(ELEMENT_ENDPOINTS.OBJECTS.LIST(elementKey), {
      params: options as QueryParams | undefined,
    });
    return response.data ?? [];
  }

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
  @track('Elements.GetActivities')
  async getActivities(elementKey: string, options?: ElementActivitiesGetOptions): Promise<ElementActivity[]> {
    requireArg(elementKey, 'elementKey', 'getActivities');
    const response = await this.get<ElementActivity[]>(ELEMENT_ENDPOINTS.ACTIVITIES.LIST(elementKey), {
      params: options as QueryParams | undefined,
    });
    return response.data ?? [];
  }

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
  @track('Elements.GetObjectMetadata')
  async getObjectMetadata(
    elementKey: string,
    objectName: string,
    options?: ElementObjectMetadataGetOptions,
  ): Promise<ElementObjectMetadataResponse> {
    requireArg(elementKey, 'elementKey', 'getObjectMetadata');
    requireArg(objectName, 'objectName', 'getObjectMetadata');
    const response = await this.get<ElementObjectMetadataResponse>(
      ELEMENT_ENDPOINTS.OBJECTS.METADATA(elementKey, objectName),
      { params: options as QueryParams | undefined },
    );
    return response.data;
  }

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
  @track('Elements.GetEventObjects')
  async getEventObjects(
    elementKey: string,
    operationName: string,
    options?: ElementEventObjectsGetOptions,
  ): Promise<ElementEventObject[]> {
    requireArg(elementKey, 'elementKey', 'getEventObjects');
    requireArg(operationName, 'operationName', 'getEventObjects');
    const response = await this.get<ElementEventObject[]>(
      ELEMENT_ENDPOINTS.EVENTS.OBJECTS(elementKey, operationName),
      { params: options as QueryParams | undefined },
    );
    return response.data ?? [];
  }

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
  @track('Elements.GetEventObjectMetadata')
  async getEventObjectMetadata(
    elementKey: string,
    operationName: string,
    objectName: string,
    options?: ElementEventObjectMetadataGetOptions,
  ): Promise<ElementEventObjectMetadataResponse> {
    requireArg(elementKey, 'elementKey', 'getEventObjectMetadata');
    requireArg(operationName, 'operationName', 'getEventObjectMetadata');
    requireArg(objectName, 'objectName', 'getEventObjectMetadata');
    const response = await this.get<ElementEventObjectMetadataResponse>(
      ELEMENT_ENDPOINTS.EVENTS.METADATA(elementKey, operationName, objectName),
      { params: options as QueryParams | undefined },
    );
    return response.data;
  }

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
  @track('Elements.GetInstanceObjects')
  async getInstanceObjects(
    connectionId: string,
    elementKey: string,
    options?: ElementObjectsGetOptions,
  ): Promise<ElementObject[]> {
    requireArg(connectionId, 'connectionId', 'getInstanceObjects');
    requireArg(elementKey, 'elementKey', 'getInstanceObjects');
    const response = await this.get<ElementObject[]>(
      ELEMENT_ENDPOINTS.INSTANCE.OBJECTS.LIST(connectionId, elementKey),
      { params: options as QueryParams | undefined },
    );
    return response.data ?? [];
  }

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
  @track('Elements.GetInstanceObjectMetadata')
  async getInstanceObjectMetadata(
    connectionId: string,
    elementKey: string,
    objectName: string,
    options?: ElementObjectMetadataGetOptions,
  ): Promise<ElementObjectMetadataResponse> {
    requireArg(connectionId, 'connectionId', 'getInstanceObjectMetadata');
    requireArg(elementKey, 'elementKey', 'getInstanceObjectMetadata');
    requireArg(objectName, 'objectName', 'getInstanceObjectMetadata');
    const response = await this.get<ElementObjectMetadataResponse>(
      ELEMENT_ENDPOINTS.INSTANCE.OBJECTS.METADATA(connectionId, elementKey, objectName),
      { params: options as QueryParams | undefined },
    );
    return response.data;
  }

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
  @track('Elements.GetInstanceEventObjects')
  async getInstanceEventObjects(
    connectionId: string,
    elementKey: string,
    operationName: string,
    options?: ElementEventObjectsGetOptions,
  ): Promise<ElementEventObject[]> {
    requireArg(connectionId, 'connectionId', 'getInstanceEventObjects');
    requireArg(elementKey, 'elementKey', 'getInstanceEventObjects');
    requireArg(operationName, 'operationName', 'getInstanceEventObjects');
    const response = await this.get<ElementEventObject[]>(
      ELEMENT_ENDPOINTS.INSTANCE.EVENTS.OBJECTS(connectionId, elementKey, operationName),
      { params: options as QueryParams | undefined },
    );
    return response.data ?? [];
  }

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
  @track('Elements.GetInstanceEventObjectMetadata')
  async getInstanceEventObjectMetadata(
    connectionId: string,
    elementKey: string,
    operationName: string,
    objectName: string,
    options?: ElementEventObjectMetadataGetOptions,
  ): Promise<ElementEventObjectMetadataResponse> {
    requireArg(connectionId, 'connectionId', 'getInstanceEventObjectMetadata');
    requireArg(elementKey, 'elementKey', 'getInstanceEventObjectMetadata');
    requireArg(operationName, 'operationName', 'getInstanceEventObjectMetadata');
    requireArg(objectName, 'objectName', 'getInstanceEventObjectMetadata');
    const response = await this.get<ElementEventObjectMetadataResponse>(
      ELEMENT_ENDPOINTS.INSTANCE.EVENTS.METADATA(connectionId, elementKey, operationName, objectName),
      { params: options as QueryParams | undefined },
    );
    return response.data;
  }
}
