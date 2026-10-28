import type { PlatformServices } from './services';

/** The two experiences the app can render. */
export type View = 'admin' | 'member';

/** Built-in group whose members get the admin view. */
export const ADMIN_GROUP_NAME = 'Administrators';

/**
 * Picks the view for a user from their group membership: find the admin group
 * among the organization's groups, then ask the Directory service whether the
 * user belongs to it.
 *
 * This decides what the UI shows, nothing more. Every API call is authorized by
 * the platform against the caller's own permissions, so a member who forces the
 * admin view still cannot read data their account is not allowed to see.
 */
export async function resolveView(services: PlatformServices, userId: string): Promise<View> {
  const groups = await services.groups.getAll();
  const adminGroup = groups.find(g => g.name === ADMIN_GROUP_NAME);
  if (!adminGroup) return 'member';
  const memberships = await services.directory.getGroupMembership(userId, [adminGroup.id]);
  return memberships.some(m => m.id === adminGroup.id) ? 'admin' : 'member';
}
