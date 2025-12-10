/**
 * Raw ChoiceSet API Response Contains all fields returned by the API before transformation
 */
export interface RawChoiceSetGetAllResponse {
  name: string;
  displayName: string;
  entityTypeId: number;
  entityType: string;
  description: string;
  folderId: string;
  recordCount: number;
  storageSizeInMB: number;
  usedStorageSizeInMB: number;
  isRbacEnabled: boolean;
  invalidIdentifiers: string[];
  isModelReserved: boolean;
  id: string;
  createdBy: string;
  createTime: string;
  updateTime: string;
  updatedBy: string;
}

/**
 * Raw ChoiceSet Value API Response (PascalCase from API)
 */
export interface RawChoiceSetValue {
  Id: string;
  Name: string;
  DisplayName: string;
  NumberId: number;
  CreateTime: string;
  UpdateTime: string;
  CreatedBy: string;
  UpdatedBy: string;
  RecordOwner: string;
}
