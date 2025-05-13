export class ExecutionContext {
  private _instanceKey: string | null;
  private _instanceId: string | null;
  private _robotKey: string | null;

  constructor() {
    this._instanceKey = process.env.UIPATH_JOB_KEY ?? null;
    this._instanceId = process.env.UIPATH_JOB_ID ?? null;
    this._robotKey = process.env.UIPATH_ROBOT_KEY ?? null;
  }

  get instanceId(): string {
    if (!this._instanceId) {
      throw new Error('Instance ID is not set (UIPATH_JOB_ID)');
    }
    return this._instanceId;
  }

  get instanceKey(): string {
    if (!this._instanceKey) {
      throw new Error('Instance key is not set (UIPATH_JOB_KEY)');
    }
    return this._instanceKey;
  }

  get robotKey(): string {
    if (!this._robotKey) {
      throw new Error('Robot key is not set (UIPATH_ROBOT_KEY)');
    }
    return this._robotKey;
  }
}
