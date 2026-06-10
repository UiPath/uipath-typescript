import {
  ChoiceSetGetAllOptions,
  ChoiceSetGetAllResponse,
  ChoiceSetGetResponse,
  ChoiceSetGetByIdOptions,
  ChoiceSetCreateOptions,
  ChoiceSetUpdateOptions,
  ChoiceSetDeleteByIdOptions,
  ChoiceSetValueInsertOptions,
  ChoiceSetValueInsertResponse,
  ChoiceSetValueUpdateOptions,
  ChoiceSetValueUpdateResponse,
  ChoiceSetValueDeleteOptions,
} from './choicesets.types';
import { PaginatedResponse, NonPaginatedResponse, HasPaginationOptions } from '../../utils/pagination/types';

/**
 * Service for managing UiPath Data Fabric Choice Sets
 *
 * Choice Sets are enumerated lists of values that can be used as field types in entities. They enable single-select or multi-select fields, such as expense types, categories, or status values. [UiPath Choice Sets Guide](https://docs.uipath.com/data-service/automation-cloud/latest/user-guide/choice-sets)
 *
 * ### Usage
 *
 * Prerequisites: Initialize the SDK first - see [Getting Started](/uipath-typescript/getting-started/#import-initialize)
 *
 * ```typescript
 * import { ChoiceSets } from '@uipath/uipath-typescript/entities';
 *
 * const choicesets = new ChoiceSets(sdk);
 * const allChoiceSets = await choicesets.getAll();
 * ```
 */
export interface ChoiceSetServiceModel {
  /**
   * Gets choice sets in the org
   *
   * The Data Fabric choice-set list is scoped exclusively, not additively:
   * omitting `folderKey` returns only tenant-level choice sets; passing
   * `folderKey` returns only choice sets in that folder. To enumerate
   * every choice set across folders, call `getAll()` once per folder
   * plus once with no `folderKey` for the tenant scope.
   *
   * @param options - Optional {@link ChoiceSetGetAllOptions} (e.g. `folderKey` to list folder-scoped choice sets)
   * @returns Promise resolving to an array of choice set metadata
   * {@link ChoiceSetGetAllResponse}
   * @example
   * ```typescript
   * // Get tenant-level choice sets
   * const tenantChoiceSets = await choicesets.getAll();
   *
   * // Get folder-scoped choice sets
   * const folderChoiceSets = await choicesets.getAll({ folderKey: "<folderKey>" });
   *
   * // Iterate through choice sets
   * tenantChoiceSets.forEach(choiceSet => {
   *   console.log(`ChoiceSet: ${choiceSet.displayName} (${choiceSet.name})`);
   *   console.log(`Description: ${choiceSet.description}`);
   *   console.log(`Created by: ${choiceSet.createdBy}`);
   * });
   *
   * // Find a specific choice set by name
   * const expenseTypes = tenantChoiceSets.find(cs => cs.name === 'ExpenseTypes');
   *
   * // Check choice set details
   * if (expenseTypes) {
   *   console.log(`Last updated: ${expenseTypes.updatedTime}`);
   *   console.log(`Updated by: ${expenseTypes.updatedBy}`);
   * }
   * ```
   */
  getAll(options?: ChoiceSetGetAllOptions): Promise<ChoiceSetGetAllResponse[]>;

  /**
   * Gets choice set values by choice set ID with optional pagination
   *
   * The method returns either:
   * - A NonPaginatedResponse with items array (when no pagination parameters are provided)
   * - A PaginatedResponse with navigation cursors (when any pagination parameter is provided)
   *
   * @param choiceSetId - UUID of the choice set
   * @param options - Pagination options and optional `folderKey` (omit for tenant-level choice sets)
   * @returns Promise resolving to choice set values or paginated result
   * {@link ChoiceSetGetResponse}
   * @example
   * ```typescript
   * // First, get the choice set ID using getAll()
   * const allChoiceSets = await choicesets.getAll();
   * const expenseTypes = allChoiceSets.find(cs => cs.name === 'ExpenseTypes');
   * const choiceSetId = expenseTypes.id;
   *
   * // Get all values (non-paginated)
   * const values = await choicesets.getById(choiceSetId);
   *
   * // Iterate through choice set values
   * for (const value of values.items) {
   *   console.log(`Value: ${value.displayName}`);
   * }
   *
   * // First page with pagination
   * const page1 = await choicesets.getById(choiceSetId, { pageSize: 10 });
   *
   * // Navigate using cursor
   * if (page1.hasNextPage) {
   *   const page2 = await choicesets.getById(choiceSetId, { cursor: page1.nextCursor });
   * }
   *
   * // Folder-scoped choice set
   * const folderValues = await choicesets.getById(choiceSetId, { folderKey: "<folderKey>" });
   * ```
   */
  getById<T extends ChoiceSetGetByIdOptions = ChoiceSetGetByIdOptions>(
    choiceSetId: string,
    options?: T
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<ChoiceSetGetResponse>
      : NonPaginatedResponse<ChoiceSetGetResponse>
  >;

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
  create(name: string, options?: ChoiceSetCreateOptions): Promise<string>;

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
  updateById(choiceSetId: string, options: ChoiceSetUpdateOptions): Promise<void>;

  /**
   * Deletes a Data Fabric choice set and all its values.
   *
   * @param choiceSetId - UUID of the choice set to delete
   * @param options - Optional {@link ChoiceSetDeleteByIdOptions} — pass `folderKey` for folder-scoped choice sets; omit for tenant-level
   * @returns Promise resolving when the choice set is deleted
   *
   * @example
   * ```typescript
   * // First, get the choice set ID using getAll()
   * const allChoiceSets = await choicesets.getAll();
   * const expenseTypes = allChoiceSets.find(cs => cs.name === 'expense_types');
   *
   * await choicesets.deleteById(expenseTypes.id);
   *
   * // Folder-scoped choice set
   * await choicesets.deleteById(expenseTypes.id, { folderKey: "<folderKey>" });
   * ```
   * @internal
   */
  deleteById(choiceSetId: string, options?: ChoiceSetDeleteByIdOptions): Promise<void>;

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
   *
   * // Folder-scoped choice set: folderKey is required on the wire
   * await choicesets.insertValueById(expenseTypes.id, 'TRAVEL', {
   *   displayName: 'Travel',
   *   folderKey: "<folderKey>",
   * });
   * ```
   * @internal
   */
  insertValueById(
    choiceSetId: string,
    name: string,
    options?: ChoiceSetValueInsertOptions,
  ): Promise<ChoiceSetValueInsertResponse>;

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
   *
   * // Folder-scoped choice set: folderKey is required on the wire
   * await choicesets.updateValueById(expenseTypes.id, travel.id, 'Business Travel', {
   *   folderKey: "<folderKey>",
   * });
   * ```
   * @internal
   */
  updateValueById(
    choiceSetId: string,
    valueId: string,
    displayName: string,
    options?: ChoiceSetValueUpdateOptions,
  ): Promise<ChoiceSetValueUpdateResponse>;

  /**
   * Deletes one or more values from a choice set.
   *
   * @param choiceSetId - UUID of the parent choice set
   * @param valueIds - Array of value UUIDs to delete
   * @param options - Optional {@link ChoiceSetValueDeleteOptions} — pass `folderKey` for folder-scoped choice sets; omit for tenant-level
   * @returns Promise resolving when the values are deleted
   *
   * @example
   * ```typescript
   * // Get the value IDs from getById()
   * const values = await choicesets.getById('<choiceSetId>');
   * const idsToDelete = values.items.slice(0, 2).map(v => v.id);
   *
   * await choicesets.deleteValuesById('<choiceSetId>', idsToDelete);
   *
   * // Folder-scoped choice set
   * await choicesets.deleteValuesById('<choiceSetId>', idsToDelete, { folderKey: "<folderKey>" });
   * ```
   * @internal
   */
  deleteValuesById(choiceSetId: string, valueIds: string[], options?: ChoiceSetValueDeleteOptions): Promise<void>;
}

