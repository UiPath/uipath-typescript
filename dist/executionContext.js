"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExecutionContext = void 0;
class ExecutionContext {
    constructor() {
        this._instanceKey = process.env.UIPATH_JOB_KEY ?? null;
        this._instanceId = process.env.UIPATH_JOB_ID ?? null;
        this._robotKey = process.env.UIPATH_ROBOT_KEY ?? null;
    }
    get instanceId() {
        if (!this._instanceId) {
            throw new Error('Instance ID is not set (UIPATH_JOB_ID)');
        }
        return this._instanceId;
    }
    get instanceKey() {
        if (!this._instanceKey) {
            throw new Error('Instance key is not set (UIPATH_JOB_KEY)');
        }
        return this._instanceKey;
    }
    get robotKey() {
        if (!this._robotKey) {
            throw new Error('Robot key is not set (UIPATH_ROBOT_KEY)');
        }
        return this._robotKey;
    }
}
exports.ExecutionContext = ExecutionContext;
