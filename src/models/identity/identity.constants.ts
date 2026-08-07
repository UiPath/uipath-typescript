/**
 * Identity field mappings.
 */

/**
 * Semantic renames applied to identity setting rows.
 *
 * The Identity API names the organization a "partition"; every other service in the SDK
 * calls this GUID `organizationId`, so the field is renamed to match.
 */
export const IdentitySettingMap = {
  partitionGlobalId: 'organizationId',
} as const;
