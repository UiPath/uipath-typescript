import { BaseOptions, RequestOptions } from '../common/types';
import { PaginationOptions } from '../../utils/pagination';

/**
 * Interface for user role response details.
 */
export type UserRoleType = 'Mixed' | 'Tenant' | 'Folder';

export interface UserRoleInfo {
  userId?: number;
  roleId?: number;
  userName?: string;
  roleName?: string;
  roleType?: UserRoleType;
  id?: number;
}

/**
 * Interface for user response.
 */
export interface UserGetResponse {
  id: number;
  key?: string;
  name?: string;
  surname?: string;
  userName?: string;
  domain?: string;
  directoryIdentifier?: string;
  fullName?: string;
  emailAddress?: string;
  lastLoginTime?: string | null;
  isActive?: boolean;
  createdTime?: string;
  authenticationSource?: string;
  password?: string;
  isExternalLicensed?: boolean;
  userRoles?: UserRoleInfo[];
  rolesList?: string[];
  loginProviders?: string[];
  tenantId?: number;
  tenancyName?: string;
  tenantDisplayName?: string;
  tenantKey?: string;
  type?: string;
  provisionType?: string;
  licenseType?: string;
  mayHaveUserSession?: boolean;
  mayHaveRobotSession?: boolean;
  mayHaveUnattendedSession?: boolean;
  mayHavePersonalWorkspace?: boolean;
  restrictToPersonalWorkspace?: boolean;
}

/**
 * Options for getting users.
 */
export type UserGetAllOptions = RequestOptions & PaginationOptions;

/**
 * Options for getting a single user by ID.
 */
export type UserGetByIdOptions = BaseOptions;

/**
 * Options for getting current user.
 */
export type UserGetCurrentOptions = BaseOptions;
