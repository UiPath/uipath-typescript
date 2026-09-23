/**
 * PlatformDirectoryService — looks up an organization's principals and answers
 * membership questions.
 */

import { track } from '../../core/telemetry';
import { ValidationError } from '../../core/errors';
import type { IUiPath } from '../../core/types';
import { SDKInternalsRegistry } from '../../core/internals';
import type { OrganizationIdResolver } from '../../core/organization/organization-id-resolver';
import { BaseService } from '../base';

import type {
  PlatformDirectoryEntry,
  PlatformDirectorySearchOptions,
  PlatformDirectoryGroup,
} from '../../models/platform/directory.types';
import type {
  RawPlatformDirectoryEntry,
  RawPlatformDirectoryGroup,
} from '../../models/platform/directory.internal-types';
import type { PlatformDirectoryServiceModel } from '../../models/platform/directory.models';
import {
  PlatformDirectoryEntryMap,
  PlatformDirectoryGroupMap,
  PlatformDirectoryEntityTypeMap,
} from '../../models/platform/directory.constants';

import { IDENTITY_DIRECTORY_ENDPOINTS } from '../../utils/constants/endpoints';
import { transformData, applyDataTransforms } from '../../utils/transform';
import { createParams } from '../../utils/http/params';

/**
 * Service for looking up an organization's principals — users, groups, and
 * applications — and answering membership questions.
 */
export class PlatformDirectoryService extends BaseService implements PlatformDirectoryServiceModel {
  readonly #organizationIdResolver: OrganizationIdResolver;

  /**
   * Creates an instance of the Directory service.
   *
   * @param instance - UiPath SDK instance providing authentication and configuration
   */
  constructor(instance: IUiPath) {
    super(instance);
    // Identity keys on the organization GUID; resolved once per SDK instance and shared
    this.#organizationIdResolver = SDKInternalsRegistry.getOrganizationIdResolver(instance);
  }

  @track('PlatformDirectory.Search')
  async search(options?: PlatformDirectorySearchOptions): Promise<PlatformDirectoryEntry[]> {
    const organizationId = await this.#organizationIdResolver.resolve();

    const params = {
      ...createParams({ startsWith: options?.startsWith, entityType: options?.entityType }),
      // The API calls the source narrowing "sourceFilter"
      ...(options?.sources !== undefined && { sourceFilter: options.sources }),
    };
    const response = await this.get<RawPlatformDirectoryEntry[]>(
      IDENTITY_DIRECTORY_ENDPOINTS.SEARCH(organizationId),
      { params }
    );
    return response.data.map(entry => this.toEntry(entry));
  }

  @track('PlatformDirectory.GetGroupMembership')
  async getGroupMembership(userId: string, groupIds: string[]): Promise<PlatformDirectoryGroup[]> {
    if (!userId) {
      throw new ValidationError({ message: 'userId is required for getGroupMembership' });
    }
    if (!groupIds?.length) {
      throw new ValidationError({ message: 'groupIds must contain at least one group ID' });
    }
    const organizationId = await this.#organizationIdResolver.resolve();

    const response = await this.post<RawPlatformDirectoryGroup[]>(
      IDENTITY_DIRECTORY_ENDPOINTS.GROUP_MEMBERSHIP(organizationId),
      { userId, groupIds }
    );
    return response.data.map(group => this.toGroup(group));
  }

  /**
   * Transforms a wire search result: renames `identifier`/`identityName` to
   * `id`/`name`, drops the redundant `objectType`, and maps the numeric type
   * code to the enum.
   */
  private toEntry(raw: RawPlatformDirectoryEntry): PlatformDirectoryEntry {
    const wire: Record<string, unknown> = { ...raw };
    delete wire.objectType;

    let data = transformData(wire, PlatformDirectoryEntryMap) as Record<string, unknown>;
    data = applyDataTransforms(data, { field: 'type', valueMap: PlatformDirectoryEntityTypeMap });

    return data as unknown as PlatformDirectoryEntry;
  }

  /**
   * Transforms a wire membership-check result: renames `identifier` to `id`
   * and drops the redundant `objectType` (all entries are groups).
   */
  private toGroup(raw: RawPlatformDirectoryGroup): PlatformDirectoryGroup {
    const wire: Record<string, unknown> = { ...raw };
    delete wire.objectType;

    return transformData(wire, PlatformDirectoryGroupMap) as unknown as PlatformDirectoryGroup;
  }
}
