import type { PlatformServices } from './services';

/** Name of the built-in group whose members get the admin experience. */
export const ADMIN_GROUP_NAME = 'Administrators';

/**
 * Whether the user is an access admin, decided by group membership: fetch the
 * organization's groups, find the admin group, then ask the Directory service
 * which of those groups the user actually belongs to.
 *
 * NOTE: this check gates the UI only. The platform enforces real permissions
 * on every API call server-side — a non-admin calling `roles.upsert()`
 * directly gets a 403 regardless of what the UI shows.
 */
export async function isAccessAdmin(
  services: PlatformServices,
  userId: string,
  organizationId: string
): Promise<boolean> {
  const groups = await services.groups.getAll(organizationId);
  const adminGroup = groups.find(g => g.name === ADMIN_GROUP_NAME);
  if (!adminGroup) return false;
  const memberships = await services.directory.getGroupMembership(userId, [adminGroup.id], organizationId);
  return memberships.some(m => m.id === adminGroup.id);
}
