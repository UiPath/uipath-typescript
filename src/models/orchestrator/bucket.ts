import { RequestOptions } from "../common/common-types";

export enum BucketOptions {
  None = 'None',
  ReadOnly = 'ReadOnly',
  AuditReadAccess = 'AuditReadAccess',
  AccessDataThroughOrchestrator = 'AccessDataThroughOrchestrator'
}

export interface BucketGetResponse {
  name: string;
  description: string | null;
  identifier: string;
  storageProvider: string | null;
  storageParameters: string | null;
  storageContainer: string | null;
  options: BucketOptions;
  credentialStoreId: number | null;
  externalName: string | null;
  password: string | null;
  foldersCount: number;
  id: number;
}

export type BucketGetAllOptions = RequestOptions;

export interface BucketGetByIdOptions {
  expand?: string;
  select?: string;
}

export interface BucketServiceModel {
  getAll(folderId: number, options?: BucketGetAllOptions): Promise<BucketGetResponse[]>;
  getById(bucketId: number, folderId: number, options?: BucketGetByIdOptions): Promise<BucketGetResponse>;
}
