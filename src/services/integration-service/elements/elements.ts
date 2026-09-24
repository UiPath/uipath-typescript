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
 * import { Elements } from '@uipath/uipath-typescript/connections';
 *
 * const elements = new Elements(sdk);
 * const objects = await elements.getObjects('uipath-slack');
 * ```
 */
export class ElementsService extends BaseService implements ElementsServiceModel {
  @track('Elements.GetObjects')
  async getObjects(elementKey: string, options?: ElementObjectsGetOptions): Promise<ElementObject[]> {
    requireArg(elementKey, 'elementKey', 'getObjects');
    const response = await this.get<ElementObject[]>(ELEMENT_ENDPOINTS.OBJECTS.LIST(elementKey), {
      params: options as QueryParams | undefined,
    });
    return response.data ?? [];
  }

  @track('Elements.GetActivities')
  async getActivities(elementKey: string, options?: ElementActivitiesGetOptions): Promise<ElementActivity[]> {
    requireArg(elementKey, 'elementKey', 'getActivities');
    const response = await this.get<ElementActivity[]>(ELEMENT_ENDPOINTS.ACTIVITIES.LIST(elementKey), {
      params: options as QueryParams | undefined,
    });
    return response.data ?? [];
  }

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
