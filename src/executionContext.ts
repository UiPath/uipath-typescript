import { ENV } from './utils/constants';

export interface ExecutionContextConfig {
  [ENV.JOB_KEY]?: string;
  [ENV.JOB_ID]?: string;
  [ENV.ROBOT_KEY]?: string;
}

export class ExecutionContext {
  private _instanceKey: string | null;
  private _instanceId: string | null;
  private _robotKey: string | null;

  constructor(config: ExecutionContextConfig = {}) {
    this._instanceKey = config[ENV.JOB_KEY] ?? null;
    this._instanceId = config[ENV.JOB_ID] ?? null;
    this._robotKey = config[ENV.ROBOT_KEY] ?? null;
  }

  get instanceId(): string | null {
    return this._instanceId;
  }

  get instanceKey(): string | null {
    return this._instanceKey;
  }

  get robotKey(): string | null {
    return this._robotKey;
  }
}
