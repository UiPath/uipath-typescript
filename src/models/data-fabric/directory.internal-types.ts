import {
  DataFabricDirectoryEntityType,
  DataFabricDirectoryEntry,
} from './directory.types';

export interface DataFabricDirectoryAssignPayload {
  directoryEntities: Array<{
    externalId: string;
    type: DataFabricDirectoryEntityType;
    resolved: true;
  }>;
  roles: string[];
  isUIEnabled: boolean;
}

export interface DataFabricDirectoryRevokePayload {
  externalIds: string[];
}

export interface RawDataFabricDirectoryListResponse {
  totalCount?: number;
  TotalCount?: number;
  results?: DataFabricDirectoryEntry[];
  Results?: DataFabricDirectoryEntry[];
  value?: DataFabricDirectoryEntry[];
  Value?: DataFabricDirectoryEntry[];
  data?: DataFabricDirectoryEntry[];
}
