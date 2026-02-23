/**
 * User service mock utilities.
 */
import { UserGetResponse } from '../../../src/models/orchestrator/users.types';
import { createMockBaseResponse, createMockCollection } from './core';
import { USER_TEST_CONSTANTS } from '../constants/users';

const BASE_USER: UserGetResponse = {
  id: USER_TEST_CONSTANTS.USER_ID,
  name: USER_TEST_CONSTANTS.USER_NAME,
  surname: USER_TEST_CONSTANTS.USER_SURNAME,
  fullName: USER_TEST_CONSTANTS.USER_FULL_NAME,
  userName: USER_TEST_CONSTANTS.USERNAME,
  emailAddress: USER_TEST_CONSTANTS.USER_EMAIL,
  isActive: true,
  createdTime: USER_TEST_CONSTANTS.CREATED_TIME,
  key: USER_TEST_CONSTANTS.USER_KEY
};

const RAW_USER_FIELDS: Array<[keyof UserGetResponse, string]> = [
  ['id', 'Id'],
  ['name', 'Name'],
  ['surname', 'Surname'],
  ['fullName', 'FullName'],
  ['userName', 'UserName'],
  ['emailAddress', 'EmailAddress'],
  ['isActive', 'IsActive'],
  ['createdTime', 'CreationTime'],
  ['key', 'Key']
];

const toRawUser = (user: UserGetResponse): Record<string, unknown> => {
  return RAW_USER_FIELDS.reduce((result, [sourceKey, targetKey]) => {
    const value = user[sourceKey];
    if (value !== undefined) {
      result[targetKey] = value;
    }
    return result;
  }, {} as Record<string, unknown>);
};

export const createMockRawUser = (overrides: Record<string, unknown> = {}): Record<string, unknown> => {
  return createMockBaseResponse(toRawUser(BASE_USER), overrides);
};

export const createBasicUser = (overrides: Partial<UserGetResponse> = {}): UserGetResponse => {
  return createMockBaseResponse(BASE_USER, overrides);
};

export const createMockTransformedUserCollection = (
  count: number = 1,
  options?: {
    totalCount?: number;
    hasNextPage?: boolean;
    nextCursor?: string;
    previousCursor?: string | null;
    currentPage?: number;
    totalPages?: number;
  }
): any => {
  const items = createMockCollection(count, (index) => createBasicUser({
    id: USER_TEST_CONSTANTS.USER_ID + index,
    userName: `${USER_TEST_CONSTANTS.USERNAME}${index + 1}`,
    emailAddress: `user${index + 1}@uipath.com`
  }));

  return createMockBaseResponse({
    items,
    totalCount: options?.totalCount || count,
    ...(options?.hasNextPage !== undefined && { hasNextPage: options.hasNextPage }),
    ...(options?.nextCursor && { nextCursor: options.nextCursor }),
    ...(options?.previousCursor !== undefined && { previousCursor: options.previousCursor }),
    ...(options?.currentPage !== undefined && { currentPage: options.currentPage }),
    ...(options?.totalPages !== undefined && { totalPages: options.totalPages })
  });
};
