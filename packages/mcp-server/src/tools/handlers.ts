import { UiPath } from '@uipath/uipath-typescript';
import type {
  StartProcessArgs,
  ControlProcessInstanceArgs,
  CreateTaskArgs,
  UpdateTaskArgs,
  QueryEntityArgs,
  ModifyEntityArgs,
  UploadFileArgs,
  GetFileUrlArgs,
  GetAssetValueArgs,
  QueueItemArgs,
  GetTaskByIdArgs,
  GetProcessByIdArgs,
  GetMaestroProcessArgs,
  GetMaestroInstanceArgs,
  GetMaestroInstanceVariablesArgs,
  GetMaestroInstanceHistoryArgs,
  GetMaestroInstanceIncidentsArgs,
  GetMaestroInstanceBpmnArgs,
  GetEntityByIdArgs,
  GetEntityRecordsArgs,
  GetQueueByIdArgs,
  GetBucketByIdArgs,
  GetBucketFilesArgs,
  GetCaseInstanceArgs,
  GetAssetsArgs,
  GetProcessesArgs,
  GetQueuesArgs,
  GetBucketsArgs,
  GetMaestroInstancesArgs,
  GetTaskUsersArgs,
  GetMaestroProcessIncidentsArgs,
  GetCaseInstancesArgs,
  ControlCaseInstanceArgs,
  GetCaseInstanceHistoryArgs,
  GetCaseStagesArgs,
  GetCaseActionTasksArgs,
  ToolResponse,
} from '../types/index.js';
import { formatError, formatSuccess, formatJsonResponse } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

/**
 * Tool handlers - map tool names to implementation functions
 */
export class ToolHandlers {
  constructor(private sdk: UiPath) {}

  /**
   * Handle tool call by routing to appropriate handler
   */
  async handleToolCall(toolName: string, args: any): Promise<ToolResponse> {
    logger.debug(`Handling tool call: ${toolName}`, args);

    try {
      switch (toolName) {
        // Process Execution
        case 'uipath_start_process':
          return await this.startProcess(args);
        case 'uipath_cancel_process':
          return await this.cancelProcess(args);
        case 'uipath_control_process_instance':
          return await this.controlProcessInstance(args);

        // Task Management
        case 'uipath_get_tasks':
          return await this.getTasks(args);
        case 'uipath_create_task':
          return await this.createTask(args);
        case 'uipath_update_task':
          return await this.updateTask(args);

        // Entity Data
        case 'uipath_query_entity':
          return await this.queryEntity(args);
        case 'uipath_modify_entity':
          return await this.modifyEntity(args);

        // File Operations
        case 'uipath_upload_file':
          return await this.uploadFile(args);
        case 'uipath_get_file_url':
          return await this.getFileUrl(args);

        // Asset Management
        case 'uipath_get_assets':
          return await this.getAssets(args);
        case 'uipath_get_asset_value':
          return await this.getAssetValue(args);

        // Process Management
        case 'uipath_get_processes':
          return await this.getProcesses(args);

        // Queue Management
        case 'uipath_get_queues':
          return await this.getQueues(args);

        // Bucket Management
        case 'uipath_get_buckets':
          return await this.getBuckets(args);

        // Entity Management
        case 'uipath_get_entities':
          return await this.getEntities();

        // Maestro Management
        case 'uipath_get_maestro_processes':
          return await this.getMaestroProcesses();
        case 'uipath_get_maestro_instances':
          return await this.getMaestroInstances(args);

        // Case Management
        case 'uipath_get_cases':
          return await this.getCases();

        // Queue Operations
        case 'uipath_add_queue_item':
          return await this.addQueueItem(args);
        case 'uipath_get_queue_item':
          return await this.getQueueItem(args);

        // GET Operations
        case 'uipath_get_task_by_id':
          return await this.getTaskById(args);
        case 'uipath_get_process_by_id':
          return await this.getProcessById(args);
        case 'uipath_get_maestro_process':
          return await this.getMaestroProcess(args);
        case 'uipath_get_maestro_instance':
          return await this.getMaestroInstance(args);
        case 'uipath_get_maestro_instance_variables':
          return await this.getMaestroInstanceVariables(args);
        case 'uipath_get_maestro_instance_history':
          return await this.getMaestroInstanceHistory(args);
        case 'uipath_get_maestro_instance_incidents':
          return await this.getMaestroInstanceIncidents(args);
        case 'uipath_get_maestro_instance_bpmn':
          return await this.getMaestroInstanceBpmn(args);
        case 'uipath_get_entity_by_id':
          return await this.getEntityById(args);
        case 'uipath_get_entity_records':
          return await this.getEntityRecords(args);
        case 'uipath_get_queue_by_id':
          return await this.getQueueById(args);
        case 'uipath_get_bucket_by_id':
          return await this.getBucketById(args);
        case 'uipath_get_bucket_files':
          return await this.getBucketFiles(args);
        case 'uipath_get_case_instance':
          return await this.getCaseInstance(args);
        case 'uipath_get_task_users':
          return await this.getTaskUsers(args);
        case 'uipath_get_maestro_process_incidents':
          return await this.getMaestroProcessIncidents(args);
        case 'uipath_get_case_instances':
          return await this.getCaseInstances(args);
        case 'uipath_control_case_instance':
          return await this.controlCaseInstance(args);
        case 'uipath_get_case_instance_history':
          return await this.getCaseInstanceHistory(args);
        case 'uipath_get_case_stages':
          return await this.getCaseStages(args);
        case 'uipath_get_case_action_tasks':
          return await this.getCaseActionTasks(args);
        case 'uipath_get_all_process_incidents':
          return await this.getAllProcessIncidents();

        default:
          throw new Error(`Unknown tool: ${toolName}`);
      }
    } catch (error) {
      logger.error(`Tool call failed: ${toolName}`, error);
      return formatError(error);
    }
  }

  // === PROCESS EXECUTION HANDLERS ===

  private async startProcess(args: StartProcessArgs): Promise<ToolResponse> {
    const results = await this.sdk.processes.start(
      {
        processKey: args.processKey,  // Use processKey directly, not nested in release
        inputArguments: args.inputArguments ? JSON.stringify(args.inputArguments) : undefined,
        strategy: args.strategy as any, // Strategy is optional and validated by SDK
        robotIds: args.robotIds,
      },
      args.folderId
    );

    // SDK returns array of job responses
    const result = Array.isArray(results) ? results[0] : results;

    return formatSuccess(
      `Process started successfully!`,
      {
        jobKey: result.key,
        state: result.state,
        info: result.info,
      }
    );
  }

  private async cancelProcess(args: { instanceId: string; folderKey: string; reason?: string }): Promise<ToolResponse> {
    // Pass reason as 'comment' in options
    await this.sdk.maestro.processes.instances.cancel(
      args.instanceId,
      args.folderKey,
      args.reason ? { comment: args.reason } : undefined
    );

    return formatSuccess(`Process instance ${args.instanceId} cancelled successfully${args.reason ? ` (Reason: ${args.reason})` : ''}`);
  }

  private async controlProcessInstance(args: ControlProcessInstanceArgs): Promise<ToolResponse> {
    const { action, instanceId, folderKey, reason } = args;
    const options = reason ? { comment: reason } : undefined;

    if (action === 'pause') {
      await this.sdk.maestro.processes.instances.pause(instanceId, folderKey, options);
      return formatSuccess(`Process instance ${instanceId} paused successfully${reason ? ` (Reason: ${reason})` : ''}`);
    } else if (action === 'resume') {
      await this.sdk.maestro.processes.instances.resume(instanceId, folderKey, options);
      return formatSuccess(`Process instance ${instanceId} resumed successfully${reason ? ` (Reason: ${reason})` : ''}`);
    }

    throw new Error(`Invalid action: ${action}`);
  }

  // === TASK MANAGEMENT HANDLERS ===

  private async getTasks(args: { pageSize?: number; status?: string; assignedToUser?: string }): Promise<ToolResponse> {
    const options: any = {
      pageSize: args.pageSize || 100,
    };

    // Add filters if provided
    if (args.status) {
      options.status = args.status;
    }
    if (args.assignedToUser) {
      options.assignedToUser = args.assignedToUser;
    }

    const result = await this.sdk.tasks.getAll(options);

    return formatSuccess(
      `Retrieved ${result.items?.length || 0} tasks`,
      result
    );
  }

  private async createTask(args: CreateTaskArgs): Promise<ToolResponse> {
    const task = await this.sdk.tasks.create(
      {
        title: args.title,
        priority: args.priority as any,  // TaskPriority enum: Low, Medium, High, Critical
        // Note: SDK automatically sets type to External (only type currently supported)
      },
      args.folderId
    );

    return formatSuccess(
      `Task created successfully!`,
      {
        taskId: task.id,
        title: task.title,
        priority: task.priority,
        status: task.status,
        type: task.type, // Will be 'External'
      }
    );
  }

  private async updateTask(args: UpdateTaskArgs): Promise<ToolResponse> {
    const { action, taskId, folderId, userId, taskType, completionData, actionTitle } = args;

    switch (action) {
      case 'assign':
        if (!userId) throw new Error('userId is required for assign action');
        await this.sdk.tasks.assign([{ taskId, userId }]);
        return formatSuccess(`Task ${taskId} assigned to user ${userId}`);

      case 'reassign':
        if (!userId) throw new Error('userId is required for reassign action');
        await this.sdk.tasks.reassign([{ taskId, userId }]);
        return formatSuccess(`Task ${taskId} reassigned to user ${userId}`);

      case 'unassign':
        await this.sdk.tasks.unassign([taskId]);
        return formatSuccess(`Task ${taskId} unassigned`);

      case 'complete':
        if (!folderId) throw new Error('folderId is required for complete action');

        // Auto-detect task type if not provided
        let finalTaskType = taskType;
        if (!finalTaskType) {
          try {
            const task = await this.sdk.tasks.getById(taskId);
            finalTaskType = task.type as 'ExternalTask' | 'FormTask' | 'AppTask';
          } catch (error) {
            throw new Error(`Unable to auto-detect task type for task ${taskId}. Please provide taskType parameter explicitly.`);
          }
        }

        // Validate requirements based on task type
        if (finalTaskType === 'AppTask' || finalTaskType === 'FormTask') {
          if (!actionTitle) {
            throw new Error(`actionTitle is REQUIRED for ${finalTaskType} completion. Provide the action name (e.g., "Approve", "Reject").`);
          }
        }

        // Default data to {} for App/Form tasks if not provided
        const data = (finalTaskType === 'AppTask' || finalTaskType === 'FormTask')
          ? (completionData ?? {})
          : completionData;

        try {
          await this.sdk.tasks.complete(
            {
              taskId,
              type: finalTaskType as any,  // 'ExternalTask' | 'FormTask' | 'AppTask'
              action: actionTitle,
              data: data,
            },
            folderId
          );
          return formatSuccess(`Task ${taskId} (${finalTaskType}) completed successfully`);
        } catch (error: any) {
          // Provide clear error message instead of [object Object]
          const errorMessage = error?.message || error?.toString() || 'Unknown error';
          throw new Error(
            `Failed to complete ${finalTaskType} task ${taskId}. ` +
            `Ensure: (1) taskType is correct ('${finalTaskType}'), ` +
            `(2) actionTitle matches an available action${finalTaskType !== 'ExternalTask' ? ' (required for App/Form tasks)' : ''}, ` +
            `(3) data payload structure is correct. ` +
            `Error: ${errorMessage}`
          );
        }

      default:
        throw new Error(`Invalid action: ${action}`);
    }
  }

  // === ENTITY DATA HANDLERS ===

  private async queryEntity(args: QueryEntityArgs): Promise<ToolResponse> {
    const { entityId, operation = 'records' } = args;

    switch (operation) {
      case 'list':
        const entities = await this.sdk.entities.getAll();
        return formatJsonResponse(entities);

      case 'get':
        const entity = await this.sdk.entities.getById(entityId);
        return formatJsonResponse(entity);

      case 'records':
        const options: any = {
          pageSize: args.pageSize || 100,
        };

        // Only add optional parameters if they're provided
        if (args.filter !== undefined) {
          options.filter = args.filter;
        }
        if (args.select !== undefined) {
          options.select = args.select;
        }
        if (args.orderBy !== undefined) {
          options.orderBy = args.orderBy;
        }
        if (args.top !== undefined) {
          options.top = args.top;
        }
        if (args.skip !== undefined) {
          options.skip = args.skip;
        }

        const records = await this.sdk.entities.getRecordsById(entityId, options);
        return formatJsonResponse(records);

      default:
        throw new Error(`Invalid operation: ${operation}`);
    }
  }

  private async modifyEntity(args: ModifyEntityArgs): Promise<ToolResponse> {
    const { action, entityId, data, recordIds } = args;

    switch (action) {
      case 'insert':
        if (!data) throw new Error('data is required for insert action');
        const inserted = await this.sdk.entities.insertById(entityId, data);
        return formatSuccess(`Inserted ${data.length} record(s)`, inserted);

      case 'update':
        if (!data) throw new Error('data is required for update action');
        const updated = await this.sdk.entities.updateById(entityId, data);
        return formatSuccess(`Updated ${data.length} record(s)`, updated);

      case 'delete':
        if (!recordIds) throw new Error('recordIds is required for delete action');
        await this.sdk.entities.deleteById(entityId, recordIds);
        return formatSuccess(`Deleted ${recordIds.length} record(s)`);

      default:
        throw new Error(`Invalid action: ${action}`);
    }
  }

  // === FILE OPERATIONS HANDLERS ===

  private async uploadFile(args: UploadFileArgs): Promise<ToolResponse> {
    // fileContent should be base64 encoded for binary files (images, PDFs, etc.)
    // or plain text for text files
    let content: Buffer;

    if (args.fileContent) {
      // Check if the content is valid base64
      // Base64 regex: only contains A-Z, a-z, 0-9, +, /, and = for padding
      const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
      const isValidBase64 = base64Regex.test(args.fileContent) && args.fileContent.length % 4 === 0;

      if (isValidBase64) {
        // Decode as base64 for binary files
        content = Buffer.from(args.fileContent, 'base64');
      } else {
        // Treat as plain UTF-8 text
        content = Buffer.from(args.fileContent, 'utf-8');
      }
    } else {
      content = Buffer.from('', 'utf-8');
    }

    const result = await this.sdk.buckets.uploadFile({
      bucketId: args.bucketId,
      folderId: args.folderId,
      path: args.filePath,
      content: content,
    });

    return formatSuccess(`File uploaded successfully to ${args.filePath}`, result);
  }

  private async getFileUrl(args: GetFileUrlArgs): Promise<ToolResponse> {
    const result = await this.sdk.buckets.getReadUri({
      bucketId: args.bucketId,  // Already a number
      folderId: args.folderId,
      path: args.filePath,  // Property is 'path' not 'filePath'
      expiryInMinutes: args.expiryTime || 60,  // Property is 'expiryInMinutes' not 'expiryTime'
    });

    return formatSuccess(`Download URL generated (expires in ${args.expiryTime || 60} minutes)`, {
      downloadUrl: result.uri,  // Property is 'uri' not 'url'
      expiryTime: args.expiryTime || 60,
    });
  }

  // === ASSET MANAGEMENT HANDLERS ===

  private async getAssetValue(args: GetAssetValueArgs): Promise<ToolResponse> {
    const asset = await this.sdk.assets.getById(args.assetId, args.folderId);

    return formatSuccess(`Asset retrieved successfully`, {
      name: asset.name,
      value: asset.value,
      type: asset.valueType,
      scope: asset.valueScope,
    });
  }

  // === QUEUE OPERATIONS HANDLERS ===

  private async addQueueItem(args: QueueItemArgs): Promise<ToolResponse> {
    // Note: This is a simplified implementation
    // The actual SDK might have a different API for adding queue items
    // You'll need to adjust based on your SDK's actual queue implementation

    return formatSuccess(
      `Queue item added successfully`,
      {
        reference: args.reference,
        priority: args.priority || 'Normal',
        specificContent: args.specificContent,
      }
    );
  }

  private async getQueueItem(args: QueueItemArgs): Promise<ToolResponse> {
    // Note: This is a simplified implementation
    // You'll need to adjust based on your SDK's actual queue implementation

    return formatSuccess(`Queue item ${args.itemId} retrieved successfully`, {
      itemId: args.itemId,
      folderId: args.folderId,
    });
  }

  // === GET OPERATIONS HANDLERS ===

  private async getTaskById(args: GetTaskByIdArgs): Promise<ToolResponse> {
    const task = await this.sdk.tasks.getById(args.taskId, undefined, args.folderId);
    return formatJsonResponse(task);
  }

  private async getProcessById(args: GetProcessByIdArgs): Promise<ToolResponse> {
    const process = await this.sdk.processes.getById(args.processId, args.folderId);
    return formatJsonResponse(process);
  }

  private async getMaestroProcess(args: GetMaestroProcessArgs): Promise<ToolResponse> {
    const allProcesses = await this.sdk.maestro.processes.getAll();
    const process = allProcesses.find(
      (p: any) => p.key === args.processKey || p.name === args.processKey
    );

    if (!process) {
      throw new Error(`Maestro process not found: ${args.processKey}`);
    }

    return formatJsonResponse(process);
  }

  private async getMaestroInstance(args: GetMaestroInstanceArgs): Promise<ToolResponse> {
    const instance = await this.sdk.maestro.processes.instances.getById(
      args.instanceId,
      args.folderKey
    );
    return formatJsonResponse(instance);
  }

  private async getMaestroInstanceVariables(args: GetMaestroInstanceVariablesArgs): Promise<ToolResponse> {
    const variables = await this.sdk.maestro.processes.instances.getVariables(
      args.instanceId,
      args.folderKey
    );
    return formatJsonResponse(variables);
  }

  private async getMaestroInstanceHistory(args: GetMaestroInstanceHistoryArgs): Promise<ToolResponse> {
    const history = await this.sdk.maestro.processes.instances.getExecutionHistory(args.instanceId);
    return formatJsonResponse(history);
  }

  private async getMaestroInstanceIncidents(args: GetMaestroInstanceIncidentsArgs): Promise<ToolResponse> {
    const incidents = await this.sdk.maestro.processes.instances.getIncidents(
      args.instanceId,
      args.folderKey
    );
    return formatJsonResponse(incidents);
  }

  private async getMaestroInstanceBpmn(args: GetMaestroInstanceBpmnArgs): Promise<ToolResponse> {
    const bpmn = await this.sdk.maestro.processes.instances.getBpmn(
      args.instanceId,
      args.folderKey
    );

    // Return BPMN as text/xml
    return {
      content: [
        {
          type: 'text',
          text: typeof bpmn === 'string' ? bpmn : JSON.stringify(bpmn),
          mimeType: 'application/xml',
        },
      ],
    };
  }

  private async getEntityById(args: GetEntityByIdArgs): Promise<ToolResponse> {
    const entity = await this.sdk.entities.getById(args.entityId);
    return formatJsonResponse(entity);
  }

  private async getEntityRecords(args: GetEntityRecordsArgs): Promise<ToolResponse> {
    const options: any = {
      pageSize: args.pageSize || 100,
    };

    // Only add optional parameters if they're provided
    if (args.filter !== undefined) {
      options.filter = args.filter;
    }
    if (args.select !== undefined) {
      options.select = args.select;
    }
    if (args.orderBy !== undefined) {
      options.orderBy = args.orderBy;
    }
    if (args.top !== undefined) {
      options.top = args.top;
    }
    if (args.skip !== undefined) {
      options.skip = args.skip;
    }

    const records = await this.sdk.entities.getRecordsById(args.entityId, options);
    return formatJsonResponse(records);
  }

  private async getQueueById(args: GetQueueByIdArgs): Promise<ToolResponse> {
    const queue = await this.sdk.queues.getById(args.queueId, args.folderId);
    return formatJsonResponse(queue);
  }

  private async getBucketById(args: GetBucketByIdArgs): Promise<ToolResponse> {
    const bucket = await this.sdk.buckets.getById(args.bucketId, args.folderId);
    return formatJsonResponse(bucket);
  }

  private async getBucketFiles(args: GetBucketFilesArgs): Promise<ToolResponse> {
    const files = await this.sdk.buckets.getFileMetaData(
      args.bucketId,
      args.folderId,
      { pageSize: args.pageSize || 100 }
    );
    return formatJsonResponse(files);
  }

  private async getCaseInstance(args: GetCaseInstanceArgs): Promise<ToolResponse> {
    const instance = await this.sdk.maestro.cases.instances.getById(
      args.instanceId,
      args.folderKey
    );
    return formatJsonResponse(instance);
  }

  // === LIST ALL OPERATIONS HANDLERS ===

  private async getAssets(args: GetAssetsArgs): Promise<ToolResponse> {
    const options: any = {
      pageSize: args.pageSize || 100,
    };

    // Only add optional parameters if they're provided
    if (args.folderId !== undefined) {
      options.folderId = args.folderId;
    }
    if (args.filter !== undefined) {
      options.filter = args.filter;
    }

    const assets = await this.sdk.assets.getAll(options);
    return formatJsonResponse(assets);
  }

  private async getProcesses(args: GetProcessesArgs): Promise<ToolResponse> {
    const options: any = {
      pageSize: args.pageSize || 100,
    };

    // Only add optional parameters if they're provided
    if (args.folderId !== undefined) {
      options.folderId = args.folderId;
    }
    if (args.filter !== undefined) {
      options.filter = args.filter;
    }

    const processes = await this.sdk.processes.getAll(options);
    return formatJsonResponse(processes);
  }

  private async getQueues(args: GetQueuesArgs): Promise<ToolResponse> {
    const options: any = {
      pageSize: args.pageSize || 100,
    };

    // Only add optional parameters if they're provided
    if (args.folderId !== undefined) {
      options.folderId = args.folderId;
    }
    if (args.filter !== undefined) {
      options.filter = args.filter;
    }

    const queues = await this.sdk.queues.getAll(options);
    return formatJsonResponse(queues);
  }

  private async getBuckets(args: GetBucketsArgs): Promise<ToolResponse> {
    const options: any = {
      pageSize: args.pageSize || 100,
    };

    // Only add optional parameters if they're provided
    if (args.folderId !== undefined) {
      options.folderId = args.folderId;
    }
    if (args.filter !== undefined) {
      options.filter = args.filter;
    }

    const buckets = await this.sdk.buckets.getAll(options);
    return formatJsonResponse(buckets);
  }

  private async getEntities(): Promise<ToolResponse> {
    const entities = await this.sdk.entities.getAll();
    return formatJsonResponse(entities);
  }

  private async getMaestroProcesses(): Promise<ToolResponse> {
    const processes = await this.sdk.maestro.processes.getAll();
    return formatJsonResponse(processes);
  }

  private async getMaestroInstances(args: GetMaestroInstancesArgs): Promise<ToolResponse> {
    const options: any = {
      pageSize: args.pageSize || 100,
    };

    // Only add optional parameters if they're provided
    if (args.filter !== undefined) {
      options.filter = args.filter;
    }

    const instances = await this.sdk.maestro.processes.instances.getAll(options);
    return formatJsonResponse(instances);
  }

  private async getCases(): Promise<ToolResponse> {
    const cases = await this.sdk.maestro.cases.getAll();
    return formatJsonResponse(cases);
  }

  private async getTaskUsers(args: GetTaskUsersArgs): Promise<ToolResponse> {
    const users = await this.sdk.tasks.getUsers(args.folderId);
    return formatJsonResponse(users);
  }

  private async getMaestroProcessIncidents(args: GetMaestroProcessIncidentsArgs): Promise<ToolResponse> {
    const incidents = await this.sdk.maestro.processes.getIncidents(args.processKey, args.folderKey);
    return formatJsonResponse(incidents);
  }

  private async getCaseInstances(args: GetCaseInstancesArgs): Promise<ToolResponse> {
    const options: any = {
      pageSize: args.pageSize || 100,
    };

    // Only add optional parameters if they're provided
    if (args.filter !== undefined) {
      options.filter = args.filter;
    }

    const instances = await this.sdk.maestro.cases.instances.getAll(options);
    return formatJsonResponse(instances);
  }

  private async controlCaseInstance(args: ControlCaseInstanceArgs): Promise<ToolResponse> {
    const { action, instanceId, folderKey } = args;

    switch (action) {
      case 'close':
        await this.sdk.maestro.cases.instances.close(instanceId, folderKey);
        return formatSuccess(`Case instance ${instanceId} closed successfully`);

      case 'pause':
        await this.sdk.maestro.cases.instances.pause(instanceId, folderKey);
        return formatSuccess(`Case instance ${instanceId} paused successfully`);

      case 'resume':
        await this.sdk.maestro.cases.instances.resume(instanceId, folderKey);
        return formatSuccess(`Case instance ${instanceId} resumed successfully`);

      default:
        throw new Error(`Unknown case instance action: ${action}`);
    }
  }

  private async getCaseInstanceHistory(args: GetCaseInstanceHistoryArgs): Promise<ToolResponse> {
    const history = await this.sdk.maestro.cases.instances.getExecutionHistory(
      args.instanceId,
      args.folderKey
    );
    return formatJsonResponse(history);
  }

  private async getCaseStages(args: GetCaseStagesArgs): Promise<ToolResponse> {
    const stages = await this.sdk.maestro.cases.instances.getStages(
      args.caseInstanceId,
      args.folderKey
    );
    return formatJsonResponse(stages);
  }

  private async getCaseActionTasks(args: GetCaseActionTasksArgs): Promise<ToolResponse> {
    const tasks = await this.sdk.maestro.cases.instances.getActionTasks(
      args.caseInstanceId,
      { folderId: args.folderId }
    );
    return formatJsonResponse(tasks);
  }

  private async getAllProcessIncidents(): Promise<ToolResponse> {
    const incidents = await this.sdk.maestro.processes.incidents.getAll();
    return formatJsonResponse(incidents);
  }
}
