/**
 * Notification field mappings (API field name → SDK field name).
 *
 * Semantic renames only — case conversion is handled by `pascalToCamelCaseKeys()`
 * (not needed here, the API already returns camelCase).
 */
export const NotificationMap: { [key: string]: string } = {
  isRead: 'hasRead',
};
