/**
 * User service mock utilities.
 */
import { UserGetResponse } from '../../../src/models/orchestrator/users.types';
import { createMockBaseResponse, createMockCollection } from './core';
import { USER_TEST_CONSTANTS } from '../constants/users';

export const createMockRawUser = (overrides: Partial<any> = {}): any => {
  return createMockBaseResponse({
    Id: USER_TEST_CONSTANTS.USER_ID,
    Name: USER_TEST_CONSTANTS.USER_NAME,
    Surname: USER_TEST_CONSTANTS.USER_SURNAME,
    FullName: USER_TEST_CONSTANTS.USER_FULL_NAME,
    UserName: USER_TEST_CONSTANTS.USERNAME,
    EmailAddress: USER_TEST_CONSTANTS.USER_EMAIL,
    IsActive: true,
    CreationTime: USER_TEST_CONSTANTS.CREATED_TIME,
    Key: USER_TEST_CONSTANTS.USER_KEY
  }, overrides);
};

export const createBasicUser = (overrides: Partial<UserGetResponse> = {}): UserGetResponse => {
  return createMockBaseResponse({
    id: USER_TEST_CONSTANTS.USER_ID,
    name: USER_TEST_CONSTANTS.USER_NAME,
    surname: USER_TEST_CONSTANTS.USER_SURNAME,
    fullName: USER_TEST_CONSTANTS.USER_FULL_NAME,
    userName: USER_TEST_CONSTANTS.USERNAME,
    emailAddress: USER_TEST_CONSTANTS.USER_EMAIL,
    isActive: true,
    createdTime: USER_TEST_CONSTANTS.CREATED_TIME,
    key: USER_TEST_CONSTANTS.USER_KEY
  }, overrides);
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
