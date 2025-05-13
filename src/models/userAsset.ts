export interface UserAsset {
  name?: string;
  value?: string;
  credentialUsername?: string;
  credentialPassword?: string;
  hasValue?: boolean;
  robotValues?: Record<string, unknown>;
  valueScope?: string;
  valueType?: string;
} 