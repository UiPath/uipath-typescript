export interface Connection {
  id?: string;
  name?: string;
  owner?: string;
  createTime?: string;
  updateTime?: string;
  state?: string;
  apiBaseUri?: string;
  elementInstanceId: number;
  connector?: any;
  isDefault?: boolean;
  lastUsedTime?: string;
  connectionIdentity?: string;
  pollingIntervalInMinutes?: number;
  folder?: any;
  elementVersion?: string;
}

export interface ConnectionToken {
  accessToken: string;
  tokenType?: string;
  scope?: string;
  expiresIn?: number;
  apiBaseUri?: string;
  elementInstanceId?: number;
} 