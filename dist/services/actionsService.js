"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActionsService = void 0;
const baseService_1 = require("./baseService");
const uuid_1 = require("uuid");
const folderContext_1 = require("../folderContext");
const headers_1 = require("../utils/headers");
const constants_1 = require("../utils/constants");
/**
 * Service for managing UiPath Actions.
 *
 * Actions are task-based automation components that can be integrated into
 * applications and processes. They represent discrete units of work that can
 * be triggered and monitored through the UiPath API.
 *
 * @see {@link https://docs.uipath.com/automation-cloud/docs/actions|Actions Documentation}
 */
class ActionsService extends baseService_1.BaseService {
    constructor(config, executionContext) {
        super(config, executionContext);
        this.folderContext = new folderContext_1.FolderContext(config, executionContext);
    }
    /**
     * Creates a new action.
     *
     * @param title - The title of the action
     * @param data - Optional dictionary containing input data for the action
     * @param options - Optional parameters for action creation
     * @returns Created action object
     */
    async create(title, data, options = {}) {
        const { appName, appKey, appFolderPath, appFolderKey, appVersion = 1, assignee } = options;
        const [key, actionSchema] = appKey
            ? [appKey, undefined]
            : await this.getAppKeyAndSchema(appName, appFolderPath);
        const spec = this.createSpec({
            title,
            data,
            appKey: key,
            appVersion,
            actionSchema,
            appFolderKey,
            appFolderPath
        });
        const response = await this.requestWithSpec(spec);
        if (assignee) {
            const assignSpec = this.assignTaskSpec(response.data.id.toString(), assignee);
            await this.requestWithSpec(assignSpec);
        }
        return response.data;
    }
    /**
     * Retrieves an action by its key.
     *
     * @param actionKey - The unique identifier of the action to retrieve
     * @param options - Optional folder parameters
     * @returns Retrieved action object
     */
    async retrieve(actionKey, options = {}) {
        const spec = this.retrieveActionSpec(actionKey, options);
        const response = await this.requestWithSpec(spec);
        return response.data;
    }
    createSpec(params) {
        const { title, data, appKey, appVersion = 1, actionSchema, appFolderKey, appFolderPath } = params;
        const fieldList = [];
        const outcomeList = [];
        if (actionSchema) {
            if (actionSchema.inputs) {
                for (const input of actionSchema.inputs) {
                    fieldList.push({
                        Id: input.key,
                        Name: input.name,
                        Title: input.name,
                        Type: 'Fact',
                        Value: data?.[input.name] ?? ''
                    });
                }
            }
            if (actionSchema.outputs) {
                for (const output of actionSchema.outputs) {
                    fieldList.push({
                        Id: output.key,
                        Name: output.name,
                        Title: output.name,
                        Type: 'Fact',
                        Value: ''
                    });
                }
            }
            if (actionSchema.inOuts) {
                for (const inout of actionSchema.inOuts) {
                    fieldList.push({
                        Id: inout.key,
                        Name: inout.name,
                        Title: inout.name,
                        Type: 'Fact',
                        Value: data?.[inout.name] ?? ''
                    });
                }
            }
            if (actionSchema.outcomes) {
                for (const outcome of actionSchema.outcomes) {
                    outcomeList.push({
                        Id: actionSchema.key,
                        Name: outcome.name,
                        Title: outcome.name,
                        Type: 'Action.Http',
                        IsPrimary: true
                    });
                }
            }
        }
        return {
            method: 'POST',
            url: '/orchestrator_/tasks/AppTasks/CreateAppTask',
            data: {
                appId: appKey,
                appVersion,
                title,
                data: data ?? {},
                actionableMessageMetaData: actionSchema
                    ? {
                        fieldSet: fieldList.length
                            ? {
                                id: (0, uuid_1.v4)(),
                                fields: fieldList
                            }
                            : {},
                        actionSet: outcomeList.length
                            ? {
                                id: (0, uuid_1.v4)(),
                                actions: outcomeList
                            }
                            : {}
                    }
                    : {}
            },
            headers: {
                ...(0, headers_1.headerFolder)(appFolderKey, appFolderPath)
            }
        };
    }
    retrieveActionSpec(actionKey, options) {
        return {
            method: 'GET',
            url: '/orchestrator_/tasks/GenericTasks/GetTaskDataByKey',
            params: { taskKey: actionKey },
            headers: {
                ...(0, headers_1.headerFolder)(options.appFolderKey, options.appFolderPath)
            }
        };
    }
    assignTaskSpec(taskKey, assignee) {
        return {
            method: 'POST',
            url: '/orchestrator_/odata/Tasks/UiPath.Server.Configuration.OData.AssignTasks',
            data: {
                taskAssignments: [{ taskId: taskKey, UserNameOrEmail: assignee }]
            }
        };
    }
    async getAppKeyAndSchema(appName, appFolderPath) {
        if (!appName) {
            throw new Error('appName or appKey is required');
        }
        const spec = this.retrieveAppKeySpec(appName);
        const response = await this.request(spec.method, spec.url, {
            params: spec.params,
            headers: spec.headers
        });
        try {
            const deployedApp = this.extractDeployedApp(response.data.deployed, appFolderPath);
            if (!deployedApp) {
                throw new Error('Action app not found');
            }
            const actionSchema = deployedApp.actionSchema;
            const deployedAppKey = deployedApp.systemName;
            try {
                return [
                    deployedAppKey,
                    {
                        key: actionSchema.key,
                        inOuts: actionSchema.inOuts,
                        inputs: actionSchema.inputs,
                        outputs: actionSchema.outputs,
                        outcomes: actionSchema.outcomes
                    }
                ];
            }
            catch (error) {
                throw new Error('Failed to deserialize action schema');
            }
        }
        catch (error) {
            throw new Error('Action app not found');
        }
    }
    retrieveAppKeySpec(appName) {
        const tenantId = process.env[constants_1.ENV.TENANT_ID];
        if (!tenantId) {
            throw new Error(`${constants_1.ENV.TENANT_ID} env var is not set`);
        }
        return {
            method: 'GET',
            url: '/apps_/default/api/v1/default/deployed-action-apps-schemas',
            params: { search: appName },
            headers: { [constants_1.HEADERS.TENANT_ID]: tenantId }
        };
    }
    extractDeployedApp(deployedApps, appFolderPath) {
        if (deployedApps.length > 1 && !appFolderPath) {
            throw new Error('Multiple app schemas found');
        }
        try {
            if (appFolderPath) {
                return deployedApps.find(app => app.deploymentFolder.fullyQualifiedName === appFolderPath);
            }
            else {
                return deployedApps.find(app => app.deploymentFolder.key === this.folderContext.folderKey);
            }
        }
        catch {
            throw new Error('Action app not found');
        }
    }
}
exports.ActionsService = ActionsService;
