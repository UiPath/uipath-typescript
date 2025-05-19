export class ExecutionContext {
  private _instanceKey: string | null;
  private _instanceId: string | null;
  private _robotKey: string | null;

  constructor() {
    this._instanceKey = process.env.UIPATH_JOB_KEY ?? null;
    this._instanceId = process.env.UIPATH_JOB_ID ?? null;
    this._robotKey = process.env.UIPATH_ROBOT_KEY ?? null;
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
