import { BaseService } from '../services/base';
import type { Config } from '../core/config/config';
import type { ExecutionContext } from '../core/context/execution';
import type { TokenManager } from '../core/auth/token-manager';
import { DATA_FABRIC_ENDPOINTS } from '../utils/constants/endpoints';
import {
  EntityFieldTypeMap,
  EntityMap,
  SqlFieldType,
} from '../models/data-fabric/entities.constants';
import {
  EntityFieldDataType,
  RawEntityGetResponse,
} from '../models/data-fabric/entities.types';
import type {
  EntityGetResponse,
  EntityMethods,
} from '../models/data-fabric/entities.models';
import { transformData } from '../utils/transform';
import { UiPathSDKConfig } from '../core/config/sdk-config';
import { createSdkRuntime } from './sdk-runtime';

/**
 * Internal service with a minimal surface area required for getAll().
 *
 * This intentionally does NOT import the full EntityService class to keep
 * the method-level entrypoint as tree-shake-friendly as possible.
 */
class EntitiesGetAllService extends BaseService {
  constructor(config: Config, executionContext: ExecutionContext, tokenManager: TokenManager) {
    super(config, executionContext, tokenManager);
  }

  async getAll(): Promise<EntityGetResponse[]> {
    const response = await this.get<RawEntityGetResponse[]>(
      DATA_FABRIC_ENDPOINTS.ENTITY.GET_ALL
    );

    const entities = response.data.map((entity) => {
      const metadata = transformData(entity as RawEntityGetResponse, EntityMap);
      applyFieldMappings(metadata);
      return createEntityWithStubMethods(metadata);
    });

    return entities;
  }
}

/**
 * Orchestrates field mapping transformations used by getAll().
 */
function applyFieldMappings(metadata: RawEntityGetResponse): void {
  mapFieldTypes(metadata);
  mapExternalFields(metadata);
}

/**
 * Maps SQL field types to friendly EntityFieldTypes and normalizes nested references.
 */
function mapFieldTypes(metadata: RawEntityGetResponse): void {
  if (!metadata.fields?.length) return;

  metadata.fields = metadata.fields.map((field) => {
    let transformedField = transformData(field, EntityMap);

    if (transformedField.fieldDataType?.name) {
      const sqlTypeName = transformedField.fieldDataType
        .name as unknown as SqlFieldType;

      if (EntityFieldTypeMap[sqlTypeName]) {
        transformedField.fieldDataType.name =
          EntityFieldTypeMap[sqlTypeName] as unknown as EntityFieldDataType;
      }
    }

    transformNestedReferences(transformedField);
    return transformedField;
  });
}

/**
 * Transforms nested reference objects in field metadata.
 */
function transformNestedReferences(field: any): void {
  if (field.referenceEntity) {
    field.referenceEntity = transformData(field.referenceEntity, EntityMap);
  }
  if (field.referenceChoiceSet) {
    field.referenceChoiceSet = transformData(field.referenceChoiceSet, EntityMap);
  }
  if (field.referenceField?.definition) {
    field.referenceField.definition = transformData(
      field.referenceField.definition,
      EntityMap
    );
  }
}

/**
 * Maps external field names to consistent naming.
 */
function mapExternalFields(metadata: RawEntityGetResponse): void {
  if (!metadata.externalFields?.length) return;

  metadata.externalFields = metadata.externalFields.map((externalSource) => {
    if (externalSource.fields?.length) {
      externalSource.fields = externalSource.fields.map((field) => {
        const transformedField = transformData(field, EntityMap);
        if (transformedField.fieldMetaData) {
          transformedField.fieldMetaData = transformData(
            transformedField.fieldMetaData,
            EntityMap
          );
          transformNestedReferences(transformedField.fieldMetaData);
        }
        return transformedField;
      });
    }
    return externalSource;
  });
}

/**
 * Creates an entity object with methods attached.
 *
 * For this POC we attach methods that preserve the public shape (`EntityMethods`)
 * but intentionally throw if invoked, so we don't have to pull in all of the
 * heavier EntityService dependencies. This gives us a "best case" bundle-size
 * measurement for a highly specialized method-level entrypoint.
 */
function createEntityWithStubMethods(
  entityData: RawEntityGetResponse
): EntityGetResponse {
  const methods: EntityMethods = {
    async insert() {
      throw new Error(
        'insert() is not available on the method-level getAll() POC entrypoint.'
      );
    },
    async update() {
      throw new Error(
        'update() is not available on the method-level getAll() POC entrypoint.'
      );
    },
    async delete() {
      throw new Error(
        'delete() is not available on the method-level getAll() POC entrypoint.'
      );
    },
    async getRecords() {
      throw new Error(
        'getRecords() is not available on the method-level getAll() POC entrypoint.'
      );
    },
  };

  return Object.assign({}, entityData, methods) as EntityGetResponse;
}

/**
 * Method-level entrypoint for EntityService.getAll.
 *
 * This implementation is intentionally optimized for tree-shaking by:
 * - Avoiding any import of the full EntityService class
 * - Importing only the minimal utilities required for getAll()
 */
export async function getAll(
  config: UiPathSDKConfig
): Promise<EntityGetResponse[]> {
  const runtime = createSdkRuntime(config);
  const service = new EntitiesGetAllService(
    runtime.config,
    runtime.executionContext,
    runtime.tokenManager
  );

  return service.getAll();
}
