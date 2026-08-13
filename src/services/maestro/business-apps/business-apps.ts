/**
 * BusinessAppsService — tenant-scoped CRUD for Maestro business app definitions.
 */

import { BaseService } from '../../base';
import { track } from '../../../core/telemetry';
import { ValidationError } from '../../../core/errors';

import type {
  RawBusinessAppGetResponse,
  BusinessAppCreateOptions,
  BusinessAppUpdateOptions,
} from '../../../models/maestro/business-apps.types';
import type { BusinessAppApiResponse } from '../../../models/maestro/business-apps.internal-types';
import type {
  BusinessAppGetResponse,
  BusinessAppsServiceModel,
} from '../../../models/maestro/business-apps.models';
import { createBusinessAppWithMethods } from '../../../models/maestro/business-apps.models';
import { BusinessAppMap } from '../../../models/maestro/business-apps.constants';

import { MAESTRO_ENDPOINTS } from '../../../utils/constants/endpoints';
import { transformData } from '../../../utils/transform';
import {
  PaginationOptions,
  PaginatedResponse,
  NonPaginatedResponse,
  HasPaginationOptions,
} from '../../../utils/pagination';
import { PaginationHelpers } from '../../../utils/pagination/helpers';
import { PaginationType } from '../../../utils/pagination/internal-types';
import { BUSINESS_APP_PAGINATION, PROCESS_INSTANCE_TOKEN_PARAMS } from '../../../utils/constants/common';

export class BusinessAppsService extends BaseService implements BusinessAppsServiceModel {
  @track('BusinessApps.Create')
  async create(
    name: string,
    description: string,
    processKeys: string[],
    options?: BusinessAppCreateOptions
  ): Promise<BusinessAppGetResponse> {
    this.assertWritableFields(name, description, processKeys);

    const response = await this.post<BusinessAppApiResponse>(
      MAESTRO_ENDPOINTS.BUSINESS_APPS.COLLECTION,
      { name, description, processKeys, ...options }
    );

    return this.toBusinessApp(response.data);
  }

  @track('BusinessApps.GetAll')
  async getAll<T extends PaginationOptions = PaginationOptions>(
    options?: T
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<BusinessAppGetResponse>
      : NonPaginatedResponse<BusinessAppGetResponse>
  > {
    return PaginationHelpers.getAll(
      {
        serviceAccess: this.createPaginationServiceAccess(),
        getEndpoint: () => MAESTRO_ENDPOINTS.BUSINESS_APPS.COLLECTION,
        transformFn: (item: BusinessAppApiResponse) => this.toBusinessApp(item),
        pagination: {
          paginationType: PaginationType.TOKEN,
          itemsField: BUSINESS_APP_PAGINATION.ITEMS_FIELD,
          continuationTokenField: BUSINESS_APP_PAGINATION.CONTINUATION_TOKEN_FIELD,
          paginationParams: {
            pageSizeParam: PROCESS_INSTANCE_TOKEN_PARAMS.PAGE_SIZE_PARAM,
            tokenParam: PROCESS_INSTANCE_TOKEN_PARAMS.TOKEN_PARAM,
          },
        },
      },
      options
    );
  }

  @track('BusinessApps.GetById')
  async getById(businessAppId: string): Promise<BusinessAppGetResponse> {
    if (!businessAppId) {
      throw new ValidationError({ message: 'businessAppId is required for getById' });
    }

    const response = await this.get<BusinessAppApiResponse>(
      MAESTRO_ENDPOINTS.BUSINESS_APPS.BY_ID(businessAppId)
    );

    return this.toBusinessApp(response.data);
  }

  @track('BusinessApps.UpdateById')
  async updateById(
    businessAppId: string,
    name: string,
    description: string,
    processKeys: string[],
    options?: BusinessAppUpdateOptions
  ): Promise<BusinessAppGetResponse> {
    if (!businessAppId) {
      throw new ValidationError({ message: 'businessAppId is required for updateById' });
    }
    this.assertWritableFields(name, description, processKeys);

    const response = await this.put<BusinessAppApiResponse>(
      MAESTRO_ENDPOINTS.BUSINESS_APPS.BY_ID(businessAppId),
      { name, description, processKeys, ...options }
    );

    return this.toBusinessApp(response.data);
  }

  @track('BusinessApps.DeleteById')
  async deleteById(businessAppId: string): Promise<void> {
    if (!businessAppId) {
      throw new ValidationError({ message: 'businessAppId is required for deleteById' });
    }

    await this.delete<void>(MAESTRO_ENDPOINTS.BUSINESS_APPS.BY_ID(businessAppId));
  }

  /**
   * Guards the fields the API requires on both create and update. Length, charset and
   * name-uniqueness rules stay server-side so the SDK cannot drift from them.
   */
  private assertWritableFields(name: string, description: string, processKeys: string[]): void {
    if (!name) {
      throw new ValidationError({ message: 'name is required' });
    }
    if (!description) {
      throw new ValidationError({ message: 'description is required' });
    }
    if (!processKeys?.length) {
      throw new ValidationError({ message: 'processKeys must contain at least one process key' });
    }
  }

  private toBusinessApp(data: BusinessAppApiResponse): BusinessAppGetResponse {
    const transformed = transformData(data, BusinessAppMap) as unknown as RawBusinessAppGetResponse;
    return createBusinessAppWithMethods(transformed, this);
  }
}
