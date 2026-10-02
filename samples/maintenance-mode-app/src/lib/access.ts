import type { UiPath } from '@uipath/uipath-typescript/core'
import { Groups, PlatformGroupType } from '@uipath/uipath-typescript/groups'
import { Directory } from '@uipath/uipath-typescript/platform'
import { getCurrentUser } from './identity'

/**
 * The built-in group whose members bypass maintenance mode. Every organization
 * ships with it; it cannot be renamed or deleted.
 */
export const ADMINISTRATORS_GROUP_NAME = 'Administrators'

/**
 * Whether the signed-in user is a member of the organization's built-in
 * Administrators group.
 *
 * Three steps, each a single SDK call:
 * 1. Who is the user — `getCurrentUser()` reads the access token.
 * 2. Which group counts as admin — `groups.getAll()` lists the organization's
 *    groups; the built-in one named Administrators is the admin group. If it
 *    is missing, nobody is an admin.
 * 3. Is the user in it — `directory.getGroupMembership()` returns the subset
 *    of the given groups the user belongs to.
 *
 * Callers should treat a thrown error as "not an admin": failing to confirm
 * a privilege must never grant it.
 */
export async function isAccessAdmin(sdk: UiPath): Promise<boolean> {
  const { userId } = getCurrentUser(sdk)

  const groups = new Groups(sdk)
  const allGroups = await groups.getAll()
  const adminGroup = allGroups.find(
    (group) =>
      group.type === PlatformGroupType.BuiltIn &&
      group.name === ADMINISTRATORS_GROUP_NAME,
  )
  if (!adminGroup) {
    return false
  }

  const directory = new Directory(sdk)
  const memberships = await directory.getGroupMembership(userId, [adminGroup.id])
  return memberships.some((group) => group.id === adminGroup.id)
}
