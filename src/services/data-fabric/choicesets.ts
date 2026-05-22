import { BaseService } from '../base';
import { ChoiceSetServiceModel } from '../../models/data-fabric/choicesets.models';
import { ChoiceSetGetAllResponse, ChoiceSetGetResponse, ChoiceSetGetByIdOptions, ChoiceSetCreateOptions, ChoiceSetUpdateOptions, ChoiceSetValueInsertOptions, ChoiceSetValueInsertResponse, ChoiceSetValueUpdateResponse } from '../../models/data-fabric/choicesets.types';
import { RawChoiceSetGetAllResponse, RawChoiceSetGetResponse } from '../../models/data-fabric/choicesets.internal-types';
import { DATA_FABRIC_ENDPOINTS, DATA_FABRIC_TENANT_FOLDER_ID } from '../../utils/constants/endpoints/data-fabric';
import { transformData, pascalToCamelCaseKeys } from '../../utils/transform';
import { EntityMap } from '../../models/data-fabric/entities.constants';
import { track } from '../../core/telemetry';
import { PaginatedResponse, NonPaginatedResponse, HasPaginationOptions } from '../../utils/pagination/types';
import { PaginationType } from '../../utils/pagination/internal-types';
import { PaginationHelpers } from '../../utils/pagination/helpers';
import { CHOICESET_VALUES_PAGINATION, ENTITY_OFFSET_PARAMS, HTTP_METHODS } from '../../utils/constants/common';
import { ValidationError, NotFoundError } from '../../core/errors';

export class ChoiceSetService extends BaseService implements ChoiceSetServiceModel {
  /**
   * Gets all choice sets in the system
   *
   * @returns Promise resolving to an array of choice set metadata
   *
   * @example
   * ```typescript
   * import { ChoiceSets } from '@uipath/uipath-typescript/entities';
   *
   * const choiceSets = new ChoiceSets(sdk);
   *
   * // Get all choice sets
   * const allChoiceSets = await choiceSets.getAll();
   *
   * // Iterate through choice sets
   * allChoiceSets.forEach(choiceSet => {
   *   console.log(`ChoiceSet: ${choiceSet.displayName} (${choiceSet.name})`);
   *   console.log(`Description: ${choiceSet.description}`);
   * });
   * ```
   */
  @track('Choicesets.GetAll')
  async getAll(): Promise<ChoiceSetGetAllResponse[]> {
    const rawResponse = await this.get<RawChoiceSetGetAllResponse[]>(
      DATA_FABRIC_ENDPOINTS.CHOICESETS.GET_ALL
    );

    // Transform field names
    const data = rawResponse.data || [];
    return data.map(choiceSet =>
      transformData(choiceSet, EntityMap) as unknown as ChoiceSetGetAllResponse
    );
  }

  /**
   * Gets choice set values by choice set ID with optional pagination
   *
   * The method returns either:
   * - A NonPaginatedResponse with items array (when no pagination parameters are provided)
   * - A PaginatedResponse with navigation cursors (when any pagination parameter is provided)
   *
   * @param choiceSetId - UUID of the choice set
   * @param options - Pagination options
   * @returns Promise resolving to choice set values or paginated result
   *
   * @example
   * ```typescript
   * import { ChoiceSets } from '@uipath/uipath-typescript/entities';
   *
   * const choiceSets = new ChoiceSets(sdk);
   *
   * // First, get the choice set ID using getAll()
   * const allChoiceSets = await choiceSets.getAll();
   * const expenseTypes = allChoiceSets.find(cs => cs.name === 'ExpenseTypes');
   * const choiceSetId = expenseTypes.id;
   *
   * // Get all values (non-paginated)
   * const values = await choiceSets.getById(choiceSetId);
   *
   * // Iterate through choice set values
   * for (const value of values.items) {
   *   console.log(`Value: ${value.displayName} (${value.name})`);
   * }
   *
   * // First page with pagination
   * const page1 = await choiceSets.getById(choiceSetId, { pageSize: 10 });
   *
   * // Navigate using cursor
   * if (page1.hasNextPage) {
   *   const page2 = await choiceSets.getById(choiceSetId, { cursor: page1.nextCursor });
   * }
   * ```
   */
  @track('Choicesets.GetById')
  async getById<T extends ChoiceSetGetByIdOptions = ChoiceSetGetByIdOptions>(
    choiceSetId: string,
    options?: T
  ): Promise<
    T extends HasPaginationOptions<T>
    ? PaginatedResponse<ChoiceSetGetResponse>
    : NonPaginatedResponse<ChoiceSetGetResponse>
  > {
    // Transform a single item from PascalCase to camelCase
    const transformFn = (item: RawChoiceSetGetResponse): ChoiceSetGetResponse => {
      const camelCased = pascalToCamelCaseKeys(item);
      return transformData(camelCased, EntityMap) as unknown as ChoiceSetGetResponse;
    };

    return PaginationHelpers.getAll({
      serviceAccess: this.createPaginationServiceAccess(),
      getEndpoint: () => DATA_FABRIC_ENDPOINTS.CHOICESETS.GET_BY_ID(choiceSetId),
      transformFn,
      method: HTTP_METHODS.POST,
      pagination: {
        paginationType: PaginationType.OFFSET,
        itemsField: CHOICESET_VALUES_PAGINATION.ITEMS_FIELD,
        totalCountField: CHOICESET_VALUES_PAGINATION.TOTAL_COUNT_FIELD,
        paginationParams: {
          pageSizeParam: ENTITY_OFFSET_PARAMS.PAGE_SIZE_PARAM,
          offsetParam: ENTITY_OFFSET_PARAMS.OFFSET_PARAM,
          countParam: ENTITY_OFFSET_PARAMS.COUNT_PARAM
        }
      }
    }, options) as any;
  }

  /**
   * Creates a new Data Fabric choice set
   *
   * @param name - Choice set name. Must start with a
   *   letter, may contain only letters, numbers, and underscores, length
   *   3–100 characters (e.g., `"expenseTypes"`).
   * @param options - Optional choice-set-level settings ({@link ChoiceSetCreateOptions})
   * @returns Promise resolving to the UUID of the created choice set
   *
   * @example
   * ```typescript
   * import { ChoiceSets } from '@uipath/uipath-typescript/entities';
   *
   * const choicesets = new ChoiceSets(sdk);
   *
   * // Minimal create
   * const expenseTypesId = await choicesets.create("expense_types");
   *
   * // With display name and description
   * const priorityLevelsId = await choicesets.create("priority_levels", {
   *   displayName: "Priority Levels",
   *   description: "Ticket priority categories",
   * });
   * ```
   * @internal
   */
  @track('Choicesets.Create')
  async create(name: string, options?: ChoiceSetCreateOptions): Promise<string> {
    const opts = options ?? {};
    const payload = {
      ...(opts.description !== undefined && { description: opts.description }),
      ...(opts.displayName !== undefined && { displayName: opts.displayName }),
      entityDefinition: {
        name,
        fields: [],
        folderId: opts.folderKey ?? DATA_FABRIC_TENANT_FOLDER_ID,
      },
    };
    const response = await this.post<string>(DATA_FABRIC_ENDPOINTS.CHOICESETS.CREATE, payload);
    return response.data;
  }

  /**
   * Updates an existing choice set's metadata (display name and/or description).
   *
   * **At least one of `displayName` or `description` must be provided** —
   * the call throws `ValidationError` if both are omitted.
   *
   * @param choiceSetId - UUID of the choice set to update
   * @param options - Metadata fields to change ({@link ChoiceSetUpdateOptions})
   * @returns Promise resolving when the update is complete
   *
   * @example
   * ```typescript
   * // First, get the choice set ID using getAll()
   * const allChoiceSets = await choicesets.getAll();
   * const expenseTypes = allChoiceSets.find(cs => cs.name === 'expense_types');
   *
   * await choicesets.updateById(expenseTypes.id, {
   *   displayName: "Expense Categories",
   *   description: "Updated description",
   * });
   * ```
   * @internal
   */
  @track('Choicesets.UpdateById')
  async updateById(choiceSetId: string, options: ChoiceSetUpdateOptions): Promise<void> {
    if (options.displayName === undefined && options.description === undefined) {
      throw new ValidationError({
        message: 'updateById requires at least one of displayName or description.',
      });
    }
    await this.patch(DATA_FABRIC_ENDPOINTS.CHOICESETS.UPDATE(choiceSetId), {
      ...(options.displayName !== undefined && { displayName: options.displayName }),
      ...(options.description !== undefined && { description: options.description }),
    });
  }

  /**
   * Deletes a Data Fabric choice set and all its values.
   *
   * @param choiceSetId - UUID of the choice set to delete
   * @returns Promise resolving when the choice set is deleted
   *
   * @example
   * ```typescript
   * // First, get the choice set ID using getAll()
   * const allChoiceSets = await choicesets.getAll();
   * const expenseTypes = allChoiceSets.find(cs => cs.name === 'expense_types');
   *
   * await choicesets.deleteById(expenseTypes.id);
   * ```
   * @internal
   */
  @track('Choicesets.DeleteById')
  async deleteById(choiceSetId: string): Promise<void> {
    await this.post(DATA_FABRIC_ENDPOINTS.CHOICESETS.DELETE(choiceSetId), {});
  }

  /**
   * Inserts a single value into a choice set.
   *
   * @param choiceSetId - UUID of the parent choice set
   * @param name - Identifier name of the new value (e.g., `"TRAVEL"`)
   * @param options - Optional fields ({@link ChoiceSetValueInsertOptions})
   * @returns Promise resolving to the inserted value ({@link ChoiceSetValueInsertResponse})
   *
   * @example
   * ```typescript
   * // First, get the choice set ID using getAll()
   * const allChoiceSets = await choicesets.getAll();
   * const expenseTypes = allChoiceSets.find(cs => cs.name === 'expense_types');
   *
   * const inserted = await choicesets.insertValueById(expenseTypes.id, 'TRAVEL', {
   *   displayName: 'Travel',
   * });
   * console.log(inserted.id);
   * ```
   */
  @track('Choicesets.InsertValueById')
  async insertValueById(
    choiceSetId: string,
    name: string,
    options?: ChoiceSetValueInsertOptions,
  ): Promise<ChoiceSetValueInsertResponse> {
    const choiceSetName = await this.resolveChoiceSetName(choiceSetId);
    const payload = {
      Name: name,
      ...(options?.displayName !== undefined && { DisplayName: options.displayName }),
    };
    const response = await this.post<RawChoiceSetGetResponse>(
      DATA_FABRIC_ENDPOINTS.CHOICESETS.INSERT_BY_NAME(choiceSetName),
      payload
    );
    const camelCased = pascalToCamelCaseKeys(response.data);
    return transformData(camelCased, EntityMap) as ChoiceSetValueInsertResponse;
  }

  /**
   * Updates an existing choice-set value's display name.
   *
   * Only `displayName` is mutable; the value's `name` (identifier) is fixed at
   * insert time and cannot be changed.
   *
   * @param choiceSetId - UUID of the parent choice set
   * @param valueId - UUID of the value to update
   * @param displayName - New human-readable display name for the value
   * @returns Promise resolving to the updated value ({@link ChoiceSetValueUpdateResponse})
   *
   * @example
   * ```typescript
   * // Get the choice set ID from getAll() and the value ID from getById()
   * const allChoiceSets = await choicesets.getAll();
   * const expenseTypes = allChoiceSets.find(cs => cs.name === 'expense_types');
   * const values = await choicesets.getById(expenseTypes.id);
   * const travel = values.items.find(v => v.name === 'TRAVEL');
   *
   * await choicesets.updateValueById(expenseTypes.id, travel.id, 'Business Travel');
   * ```
   */
  @track('Choicesets.UpdateValueById')
  async updateValueById(
    choiceSetId: string,
    valueId: string,
    displayName: string,
  ): Promise<ChoiceSetValueUpdateResponse> {
    const choiceSetName = await this.resolveChoiceSetName(choiceSetId);
    const payload = { DisplayName: displayName };
    const response = await this.post<RawChoiceSetGetResponse>(
      DATA_FABRIC_ENDPOINTS.CHOICESETS.UPDATE_BY_NAME(choiceSetName, valueId),
      payload
    );
    const camelCased = pascalToCamelCaseKeys(response.data);
    return transformData(camelCased, EntityMap) as ChoiceSetValueUpdateResponse;
  }

  /**
   * Deletes one or more values from a choice set.
   *
   * @param choiceSetId - UUID of the parent choice set
   * @param valueIds - Array of value UUIDs to delete
   * @returns Promise resolving when the values are deleted
   *
   * @example
   * ```typescript
   * // Get the value IDs from getById()
   * const values = await choicesets.getById('<choiceSetId>');
   * const idsToDelete = values.items.slice(0, 2).map(v => v.id);
   *
   * await choicesets.deleteValuesById('<choiceSetId>', idsToDelete);
   * ```
   */
  @track('Choicesets.DeleteValuesById')
  async deleteValuesById(choiceSetId: string, valueIds: string[]): Promise<void> {
    await this.post(DATA_FABRIC_ENDPOINTS.CHOICESETS.DELETE_BY_ID(choiceSetId), valueIds);
  }

  private async resolveChoiceSetName(choiceSetId: string): Promise<string> {
    const all = await this.getAll();
    const match = all.find(cs => cs.id === choiceSetId);
    if (!match) {
      throw new NotFoundError({ message: `Choice set with id '${choiceSetId}' not found.` });
    }
    return match.name;
  }
}

