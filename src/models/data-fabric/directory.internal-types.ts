import {
  DataFabricDirectoryEntityType,
  DataFabricDirectoryEntityTypeName,
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

export interface RawDataFabricDirectoryRole {
  id: string;
  name: string;
}

export interface RawDataFabricDirectoryEntry {
  externalId: string;
  name: string;
  email?: string | null;
  type: DataFabricDirectoryEntityTypeName;
  roles?: RawDataFabricDirectoryRole[] | null;
  objectType?: string | null;
  isUIEnabled: boolean;
}

export interface RawDataFabricDirectoryListResponse {
  totalCount: number;
  results: RawDataFabricDirectoryEntry[];
}
