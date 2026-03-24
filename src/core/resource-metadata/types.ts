export enum ResourceType {
  Asset = 'asset',
  Process = 'process',
  Bucket = 'bucket',
  Queue = 'queue',
  Index = 'index',
  App = 'app',
  Connection = 'connection',
}

export interface ResourceReferenceOptions {
  resource: ResourceType;
  /** Parameter name for resource id (e.g. 'id', 'bucketId') and its argument index */
  idParam?: string;
  idParamIndex?: number;
  /** Parameter name for resource name (e.g. 'processKey', 'processName') and its argument index */
  nameParam?: string;
  nameParamIndex?: number;
  /** Parameter name for folder id and its argument index */
  folderIdParam?: string;
  folderIdParamIndex?: number;
  /** Parameter name for folder path and its argument index */
  folderParam?: string;
  folderParamIndex?: number;
}

export interface ResourceMetadataEntry {
  target: Function;
  methodName: string;
  resource: ResourceType;
  options: ResourceReferenceOptions;
}
