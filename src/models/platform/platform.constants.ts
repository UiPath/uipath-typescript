/**
 * Platform field mappings.
 */

/**
 * Semantic renames applied to platform setting rows.
 *
 * The API names the organization a "partition"; every other service in the SDK
 * calls this GUID `organizationId`, so the field is renamed to match.
 */
export const PlatformSettingMap = {
  partitionGlobalId: 'organizationId',
} as const;
