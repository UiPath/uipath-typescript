import type { UiPath } from '@uipath/uipath-typescript/core';
import { Users, Groups, Directory, Roles } from '@uipath/uipath-typescript/platform';

/** One instance of each platform RBAC service, created once per SDK. */
export interface PlatformServices {
  users: Users;
  groups: Groups;
  directory: Directory;
  roles: Roles;
}

export function createServices(sdk: UiPath): PlatformServices {
  return {
    users: new Users(sdk),
    groups: new Groups(sdk),
    directory: new Directory(sdk),
    roles: new Roles(sdk),
  };
}
