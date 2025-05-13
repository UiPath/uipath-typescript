import { Config } from '../config';
import { ExecutionContext } from '../executionContext';
import { BaseService } from './baseService';
import { Action, ActionSchema } from '../models/action';
import { v4 as uuidv4 } from 'uuid';
import { RequestSpec } from '../models/requestSpec';
import { FolderContext } from '../folderContext';
import { headerFolder } from '../utils/headers';
import { ENV, HEADERS } from '../utils/constants';

interface FolderOptions {
  appFolderKey?: string;
  appFolderPath?: string;
}

/**
 * Service for managing UiPath Actions.
 * 
 * Actions are task-based automation components that can be integrated into
 * applications and processes. They represent discrete units of work that can
 * be triggered and monitored through the UiPath API.
 * 
 * @see {@link https://docs.uipath.com/automation-cloud/docs/actions|Actions Documentation}
 */
export class ActionsService extends BaseService {
  private readonly folderContext: FolderContext;

  constructor(config: Config, executionContext: ExecutionContext) {
    super(config, executionContext);
    this.folderContext = new FolderContext(config, executionContext);
  }

  /**
   * Creates a new action.
   * 
   * @param title - The title of the action
   * @param data - Optional dictionary containing input data for the action
   * @param options - Optional parameters for action creation
   * @returns Created action object
   */
  async create(
    title: string,
    data?: Record<string, unknown>,
    options: {
      appName?: string;
      appKey?: string;
      appFolderPath?: string;
      appFolderKey?: string;
      appVersion?: number;
      assignee?: string;
    } = {}
  ): Promise<Action> {
    const {
      appName,
      appKey,
      appFolderPath,
      appFolderKey,
      appVersion = 1,
      assignee
    } = options;

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

    const response = await this.requestWithSpec<Action>(spec);

    if (assignee) {
      const assignSpec = this.assignTaskSpec(response.data.id!.toString(), assignee);
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
  async retrieve(
    actionKey: string,
    options: FolderOptions = {}
  ): Promise<Action> {
    const spec = this.retrieveActionSpec(actionKey, options);
    const response = await this.requestWithSpec<Action>(spec);
    return response.data;
  }

  private createSpec(params: {
    title: string;
    data?: Record<string, unknown>;
    appKey?: string;
    appVersion?: number;
    actionSchema?: ActionSchema;
    appFolderKey?: string;
    appFolderPath?: string;
  }): RequestSpec {
    const {
      title,
      data,
      appKey,
      appVersion = 1,
      actionSchema,
      appFolderKey,
      appFolderPath
    } = params;

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
                    id: uuidv4(),
                    fields: fieldList
                  }
                : {},
              actionSet: outcomeList.length
                ? {
                    id: uuidv4(),
                    actions: outcomeList
                  }
                : {}
            }
          : {}
      },
      headers: {
        ...headerFolder(appFolderKey, appFolderPath)
      }
    };
  }

  private retrieveActionSpec(
    actionKey: string,
    options: FolderOptions
  ): RequestSpec {
    return {
      method: 'GET',
      url: '/orchestrator_/tasks/GenericTasks/GetTaskDataByKey',
      params: { taskKey: actionKey },
      headers: {
        ...headerFolder(options.appFolderKey, options.appFolderPath)
      }
    };
  }

  private assignTaskSpec(taskKey: string, assignee: string): RequestSpec {
    return {
      method: 'POST',
      url: '/orchestrator_/odata/Tasks/UiPath.Server.Configuration.OData.AssignTasks',
      data: {
        taskAssignments: [{ taskId: taskKey, UserNameOrEmail: assignee }]
      }
    };
  }

  private async getAppKeyAndSchema(
    appName?: string,
    appFolderPath?: string
  ): Promise<[string, ActionSchema | undefined]> {
    if (!appName) {
      throw new Error('appName or appKey is required');
    }

    const spec = this.retrieveAppKeySpec(appName);
    const response = await this.request<{
      deployed: Array<{
        actionSchema: any;
        systemName: string;
        deploymentFolder: { fullyQualifiedName: string; key: string };
      }>;
    }>(spec.method, spec.url, {
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
      } catch (error) {
        throw new Error('Failed to deserialize action schema');
      }
    } catch (error) {
      throw new Error('Action app not found');
    }
  }

  private retrieveAppKeySpec(appName: string): RequestSpec {
    const tenantId = process.env[ENV.TENANT_ID];
    if (!tenantId) {
      throw new Error(`${ENV.TENANT_ID} env var is not set`);
    }

    return {
      method: 'GET',
      url: '/apps_/default/api/v1/default/deployed-action-apps-schemas',
      params: { search: appName },
      headers: { [HEADERS.TENANT_ID]: tenantId }
    };
  }

  private extractDeployedApp(
    deployedApps: Array<{
      actionSchema: any;
      systemName: string;
      deploymentFolder: { fullyQualifiedName: string; key: string };
    }>,
    appFolderPath?: string
  ) {
    if (deployedApps.length > 1 && !appFolderPath) {
      throw new Error('Multiple app schemas found');
    }

    try {
      if (appFolderPath) {
        return deployedApps.find(
          app => app.deploymentFolder.fullyQualifiedName === appFolderPath
        );
      } else {
        return deployedApps.find(
          app => app.deploymentFolder.key === this.folderContext.folderKey
        );
      }
    } catch {
      throw new Error('Action app not found');
    }
  }
} 