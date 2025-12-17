/**
 * Tool definitions for MCP server
 * These define the contract between AI assistants and the UiPath SDK
 */

export const TOOL_DEFINITIONS = [
  // === PROCESS EXECUTION ===
  {
    name: 'uipath_start_process',
    description:
      'Start a UiPath Orchestrator process (job) execution. Use this to trigger automation workflows by process key or name. You must provide either processKey OR processName (not both).',
    inputSchema: {
      type: 'object',
      properties: {
        processKey: {
          type: 'string',
          description: 'The process key/ID to start (provide either this OR processName)',
        },
        processName: {
          type: 'string',
          description: 'The process name to start (provide either this OR processKey)',
        },
        folderId: {
          type: 'number',
          description: 'The folder ID where the process is located (required)',
        },
        inputArguments: {
          type: 'object',
          description: 'Input arguments to pass to the process (optional)',
        },
        strategy: {
          type: 'string',
          description: 'Execution strategy: All, Specific, RobotCount, JobsCount, or ModernJobsCount (optional)',
        },
        robotIds: {
          type: 'array',
          items: { type: 'number' },
          description: 'Specific robot IDs to run the process on (optional, used with Specific strategy)',
        },
      },
      required: ['folderId'],
    },
  },

  {
    name: 'uipath_cancel_process',
    description:
      'Cancel a running Maestro process instance. Use this to stop long-running workflows.',
    inputSchema: {
      type: 'object',
      properties: {
        instanceId: {
          type: 'string',
          description: 'The process instance ID to cancel',
        },
        folderKey: {
          type: 'string',
          description: 'The folder key where the instance is running',
        },
        reason: {
          type: 'string',
          description: 'Reason for cancellation (optional)',
        },
      },
      required: ['instanceId', 'folderKey'],
    },
  },

  {
    name: 'uipath_control_process_instance',
    description:
      'Control a Maestro process instance (pause or resume). Use this to temporarily pause or resume workflow execution.',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['pause', 'resume'],
          description: 'Action to perform: pause or resume',
        },
        instanceId: {
          type: 'string',
          description: 'The process instance ID to control',
        },
        folderKey: {
          type: 'string',
          description: 'The folder key where the instance is running',
        },
        reason: {
          type: 'string',
          description: 'Reason for the action (optional)',
        },
      },
      required: ['action', 'instanceId', 'folderKey'],
    },
  },

  // === TASK MANAGEMENT ===
  {
    name: 'uipath_get_tasks',
    description:
      'Retrieve Action Center tasks with optional filtering. Use this to list, search, or get all tasks. No folder ID required - returns tasks across all folders.',
    inputSchema: {
      type: 'object',
      properties: {
        pageSize: {
          type: 'number',
          description: 'Maximum number of tasks to return (default: 100)',
        },
        status: {
          type: 'string',
          description: 'Filter by task status: Unassigned, Pending, Completed, etc.',
        },
        assignedToUser: {
          type: 'string',
          description: 'Filter by assigned user ID or username',
        },
      },
      required: [],
    },
  },

  {
    name: 'uipath_create_task',
    description:
      'Create a new Action Center task. Use this to create human-in-the-loop tasks for review, approval, or validation. Note: Currently only External tasks are supported by the SDK.',
    inputSchema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Task title',
        },
        folderId: {
          type: 'number',
          description: 'Folder ID where the task will be created',
        },
        priority: {
          type: 'string',
          enum: ['Low', 'Medium', 'High', 'Critical'],
          description: 'Task priority (default: Medium)',
        },
      },
      required: ['title', 'folderId'],
    },
  },

  {
    name: 'uipath_update_task',
    description:
      'Update an Action Center task - assign, reassign, unassign, or complete. Use this to manage task lifecycle.',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['assign', 'reassign', 'unassign', 'complete'],
          description: 'Action to perform on the task',
        },
        taskId: {
          type: 'number',
          description: 'Task ID to update',
        },
        folderId: {
          type: 'number',
          description: 'Folder ID where the task exists (required for complete action only)',
        },
        userId: {
          type: 'number',
          description: 'User ID for assign/reassign actions (required for those actions)',
        },
        taskType: {
          type: 'string',
          enum: ['ExternalTask', 'FormTask', 'AppTask'],
          description: 'Task type for completion (optional - will be auto-detected if not provided). ExternalTask: no data/action needed. FormTask/AppTask: actionTitle is REQUIRED, data defaults to {} if not provided.',
        },
        completionData: {
          type: 'object',
          description: 'Data payload to submit when completing Form/App tasks. Will default to {} if not provided for App/Form tasks. Not needed for External tasks.',
        },
        actionTitle: {
          type: 'string',
          description: 'Action name for task completion (e.g., "Approve", "Reject"). REQUIRED for Form/App tasks. Optional for External tasks.',
        },
      },
      required: ['action', 'taskId'],
    },
  },

  // === ENTITY DATA ===
  {
    name: 'uipath_query_entity',
    description:
      'Query entity data from Data Fabric. Use this to read structured data with optional filtering and pagination.',
    inputSchema: {
      type: 'object',
      properties: {
        // entityId: {
        //   type: 'string',
        //   description: 'Entity ID (UUID) to query',
        // },
        entityName: {
          type: 'string',
          description: 'Entity Name to query',
        },
        operation: {
          type: 'string',
          enum: ['list', 'get', 'records'],
          description: 'Query operation: list (all entities), get (schema), records (data)',
        },
        filter: {
          type: 'string',
          description: 'OData filter expression (e.g., "status eq \'Active\'")',
        },
        select: {
          type: 'string',
          description: 'OData select fields (comma-separated)',
        },
        orderBy: {
          type: 'string',
          description: 'OData orderBy expression',
        },
        top: {
          type: 'number',
          description: 'Number of records to return (OData $top)',
        },
        skip: {
          type: 'number',
          description: 'Number of records to skip (OData $skip)',
        },
        pageSize: {
          type: 'number',
          description: 'Page size for pagination',
        },
      },
      // required: ['entityId'],
    },
  },

  {
    name: 'uipath_modify_entity',
    description:
      'Modify entity data in Data Fabric - insert, update, or delete records. Use this to write structured data.',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['insert', 'update', 'delete'],
          description: 'Action to perform: insert, update, or delete',
        },
        entityId: {
          type: 'string',
          description: 'Entity ID (UUID) to modify',
        },
        data: {
          type: 'array',
          description: 'Array of records to insert/update',
          items: { type: 'object' },
        },
        recordIds: {
          type: 'array',
          description: 'Array of record IDs to delete',
          items: { type: 'string' },
        },
      },
      required: ['action', 'entityId'],
    },
  },

  // === FILE OPERATIONS ===
  {
    name: 'uipath_upload_file',
    description:
      'Upload a file to an Orchestrator storage bucket. Use this to store files that automation workflows need to access.',
    inputSchema: {
      type: 'object',
      properties: {
        bucketId: {
          type: 'number',
          description: 'Bucket ID where the file will be uploaded',
        },
        folderId: {
          type: 'number',
          description: 'Folder ID',
        },
        filePath: {
          type: 'string',
          description: 'Destination path in the bucket (e.g., "invoices/2024/invoice.pdf")',
        },
        fileName: {
          type: 'string',
          description: 'File name',
        },
        fileContent: {
          type: 'string',
          description: 'File content (base64 encoded for binary files)',
        },
      },
      required: ['bucketId', 'folderId', 'filePath', 'fileName'],
    },
  },

  {
    name: 'uipath_get_file_url',
    description:
      'Get a temporary download URL for a file in an Orchestrator storage bucket. Use this to retrieve files stored by automation workflows.',
    inputSchema: {
      type: 'object',
      properties: {
        bucketId: {
          type: 'number',
          description: 'Bucket ID containing the file',
        },
        folderId: {
          type: 'number',
          description: 'Folder ID',
        },
        filePath: {
          type: 'string',
          description: 'Path to the file in the bucket',
        },
        expiryTime: {
          type: 'number',
          description: 'URL expiry time in minutes (default: 60)',
        },
      },
      required: ['bucketId', 'folderId', 'filePath'],
    },
  },

  // === ASSET MANAGEMENT ===
  {
    name: 'uipath_get_assets',
    description:
      'List all Orchestrator assets with optional filtering and pagination. Use this to discover available assets.',
    inputSchema: {
      type: 'object',
      properties: {
        folderId: {
          type: 'number',
          description: 'Filter assets by folder ID (optional)',
        },
        pageSize: {
          type: 'number',
          description: 'Maximum number of assets to return (default: 100)',
        },
        filter: {
          type: 'string',
          description: 'OData filter expression',
        },
      },
      required: [],
    },
  },

  {
    name: 'uipath_get_asset_value',
    description:
      'Get the value of a specific Orchestrator asset by ID. Use this to retrieve configuration values, credentials, or other stored data.',
    inputSchema: {
      type: 'object',
      properties: {
        assetId: {
          type: 'number',
          description: 'Asset ID',
        },
        folderId: {
          type: 'number',
          description: 'Folder ID where the asset is stored',
        },
      },
      required: ['assetId', 'folderId'],
    },
  },

  // === PROCESS MANAGEMENT ===
  {
    name: 'uipath_get_processes',
    description:
      'List all Orchestrator processes/releases with optional filtering and pagination. Use this to discover available processes.',
    inputSchema: {
      type: 'object',
      properties: {
        folderId: {
          type: 'number',
          description: 'Filter processes by folder ID (optional)',
        },
        pageSize: {
          type: 'number',
          description: 'Maximum number of processes to return (default: 100)',
        },
        filter: {
          type: 'string',
          description: 'OData filter expression',
        },
      },
      required: [],
    },
  },

  // === QUEUE MANAGEMENT ===
  {
    name: 'uipath_get_queues',
    description:
      'List all Orchestrator queues with optional filtering and pagination. Use this to discover available queues.',
    inputSchema: {
      type: 'object',
      properties: {
        folderId: {
          type: 'number',
          description: 'Filter queues by folder ID (optional)',
        },
        pageSize: {
          type: 'number',
          description: 'Maximum number of queues to return (default: 100)',
        },
        filter: {
          type: 'string',
          description: 'OData filter expression',
        },
      },
      required: [],
    },
  },

  // === BUCKET MANAGEMENT ===
  {
    name: 'uipath_get_buckets',
    description:
      'List all Orchestrator storage buckets with optional filtering and pagination. Use this to discover available buckets.',
    inputSchema: {
      type: 'object',
      properties: {
        folderId: {
          type: 'number',
          description: 'Filter buckets by folder ID (optional)',
        },
        pageSize: {
          type: 'number',
          description: 'Maximum number of buckets to return (default: 100)',
        },
        filter: {
          type: 'string',
          description: 'OData filter expression',
        },
      },
      required: [],
    },
  },

  // === ENTITY MANAGEMENT ===
  {
    name: 'uipath_get_entities',
    description:
      'List all Data Fabric entities. Use this to discover available entities in the Data Fabric.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },

  // === MAESTRO MANAGEMENT ===
  {
    name: 'uipath_get_maestro_processes',
    description:
      'List all Maestro process definitions with statistics. Use this to discover available Maestro processes.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },

  {
    name: 'uipath_get_maestro_instances',
    description:
      'List all Maestro process instances with optional filtering and pagination. Use this to view running or completed process instances.',
    inputSchema: {
      type: 'object',
      properties: {
        pageSize: {
          type: 'number',
          description: 'Maximum number of instances to return (default: 100)',
        },
        filter: {
          type: 'string',
          description: 'Filter expression for instances',
        },
      },
      required: [],
    },
  },

  // === CASE MANAGEMENT ===
  {
    name: 'uipath_get_cases',
    description:
      'List all case management processes. Use this to discover available case definitions.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },

  // === QUEUE OPERATIONS ===
  {
    name: 'uipath_add_queue_item',
    description:
      'Add an item to an Orchestrator queue. Use this to enqueue work items for automation workflows to process.',
    inputSchema: {
      type: 'object',
      properties: {
        queueId: {
          type: 'number',
          description: 'Queue ID (use either queueId or queueName)',
        },
        queueName: {
          type: 'string',
          description: 'Queue name (use either queueId or queueName)',
        },
        folderId: {
          type: 'number',
          description: 'Folder ID',
        },
        specificContent: {
          type: 'object',
          description: 'Queue item content/data',
        },
        reference: {
          type: 'string',
          description: 'Unique reference for the queue item',
        },
        priority: {
          type: 'string',
          enum: ['Low', 'Normal', 'High'],
          description: 'Queue item priority (default: Normal)',
        },
        deferDate: {
          type: 'string',
          description: 'ISO date string for when to process the item',
        },
        dueDate: {
          type: 'string',
          description: 'ISO date string for when the item is due',
        },
      },
      required: ['folderId', 'specificContent'],
    },
  },

  {
    name: 'uipath_get_queue_item',
    description:
      'Get a specific queue item by ID. Use this to check the status or details of a queued work item.',
    inputSchema: {
      type: 'object',
      properties: {
        itemId: {
          type: 'number',
          description: 'Queue item ID',
        },
        folderId: {
          type: 'number',
          description: 'Folder ID',
        },
      },
      required: ['itemId', 'folderId'],
    },
  },

  // === GET OPERATIONS ===
  {
    name: 'uipath_get_task_by_id',
    description:
      'Get detailed information about a specific Action Center task by its ID.',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: {
          type: 'number',
          description: 'Task ID',
        },
        folderId: {
          type: 'number',
          description: 'Folder ID (optional but required for form tasks)',
        },
      },
      required: ['taskId'],
    },
  },

  {
    name: 'uipath_get_process_by_id',
    description:
      'Get detailed information about a specific Orchestrator process by its ID.',
    inputSchema: {
      type: 'object',
      properties: {
        processId: {
          type: 'number',
          description: 'Process ID',
        },
        folderId: {
          type: 'number',
          description: 'Folder ID where the process is located',
        },
      },
      required: ['processId', 'folderId'],
    },
  },

  {
    name: 'uipath_get_maestro_process',
    description:
      'Get detailed information about a specific Maestro process by its key or name.',
    inputSchema: {
      type: 'object',
      properties: {
        processKey: {
          type: 'string',
          description: 'Maestro process key or name',
        },
      },
      required: ['processKey'],
    },
  },

  {
    name: 'uipath_get_maestro_instance',
    description:
      'Get detailed information about a specific Maestro process instance by its ID.',
    inputSchema: {
      type: 'object',
      properties: {
        instanceId: {
          type: 'string',
          description: 'Process instance ID',
        },
        folderKey: {
          type: 'string',
          description: 'Folder key where the instance is running',
        },
      },
      required: ['instanceId', 'folderKey'],
    },
  },

  {
    name: 'uipath_get_maestro_instance_variables',
    description:
      'Get all variables for a specific Maestro process instance.',
    inputSchema: {
      type: 'object',
      properties: {
        instanceId: {
          type: 'string',
          description: 'Process instance ID',
        },
        folderKey: {
          type: 'string',
          description: 'Folder key where the instance is running',
        },
      },
      required: ['instanceId', 'folderKey'],
    },
  },

  {
    name: 'uipath_get_maestro_instance_history',
    description:
      'Get execution history/spans for a specific Maestro process instance.',
    inputSchema: {
      type: 'object',
      properties: {
        instanceId: {
          type: 'string',
          description: 'Process instance ID',
        },
      },
      required: ['instanceId'],
    },
  },

  {
    name: 'uipath_get_maestro_instance_incidents',
    description:
      'Get incidents for a specific Maestro process instance.',
    inputSchema: {
      type: 'object',
      properties: {
        instanceId: {
          type: 'string',
          description: 'Process instance ID',
        },
        folderKey: {
          type: 'string',
          description: 'Folder key where the instance is running',
        },
      },
      required: ['instanceId', 'folderKey'],
    },
  },

  {
    name: 'uipath_get_maestro_instance_bpmn',
    description:
      'Get BPMN XML for a specific Maestro process instance.',
    inputSchema: {
      type: 'object',
      properties: {
        instanceId: {
          type: 'string',
          description: 'Process instance ID',
        },
        folderKey: {
          type: 'string',
          description: 'Folder key where the instance is running',
        },
      },
      required: ['instanceId', 'folderKey'],
    },
  },

  {
    name: 'uipath_get_entity_by_id',
    description:
      'Get entity schema and metadata from Data Fabric by entity ID.',
    inputSchema: {
      type: 'object',
      properties: {
        entityId: {
          type: 'string',
          description: 'Entity ID (UUID)',
        },
      },
      required: ['entityId'],
    },
  },

  {
    name: 'uipath_get_entity_records',
    description:
      'Get records/data from a specific Data Fabric entity with optional filtering and pagination.',
    inputSchema: {
      type: 'object',
      properties: {
        entityName: {
          type: 'string',
          description: 'Entity Name',
        },
        filter: {
          type: 'string',
          description: 'OData filter expression (e.g., "status eq \'Active\'")',
        },
        select: {
          type: 'string',
          description: 'OData select fields (comma-separated)',
        },
        orderBy: {
          type: 'string',
          description: 'OData orderBy expression',
        },
        top: {
          type: 'number',
          description: 'Number of records to return (OData $top)',
        },
        skip: {
          type: 'number',
          description: 'Number of records to skip (OData $skip)',
        },
        pageSize: {
          type: 'number',
          description: 'Page size for pagination (default: 100)',
        },
      },
      required: ['entityName'],
    },
  },

  {
    name: 'uipath_get_queue_by_id',
    description:
      'Get detailed information about a specific Orchestrator queue by its ID.',
    inputSchema: {
      type: 'object',
      properties: {
        queueId: {
          type: 'number',
          description: 'Queue ID',
        },
        folderId: {
          type: 'number',
          description: 'Folder ID where the queue is located',
        },
      },
      required: ['queueId', 'folderId'],
    },
  },

  {
    name: 'uipath_get_bucket_by_id',
    description:
      'Get detailed information about a specific Orchestrator storage bucket by its ID.',
    inputSchema: {
      type: 'object',
      properties: {
        bucketId: {
          type: 'number',
          description: 'Bucket ID',
        },
        folderId: {
          type: 'number',
          description: 'Folder ID where the bucket is located',
        },
      },
      required: ['bucketId', 'folderId'],
    },
  },

  {
    name: 'uipath_get_bucket_files',
    description:
      'List all files in a specific Orchestrator storage bucket.',
    inputSchema: {
      type: 'object',
      properties: {
        bucketId: {
          type: 'number',
          description: 'Bucket ID',
        },
        folderId: {
          type: 'number',
          description: 'Folder ID where the bucket is located',
        },
        pageSize: {
          type: 'number',
          description: 'Number of files to return (default: 100)',
        },
      },
      required: ['bucketId', 'folderId'],
    },
  },

  {
    name: 'uipath_get_case_instance',
    description:
      'Get detailed information about a specific case instance by its ID.',
    inputSchema: {
      type: 'object',
      properties: {
        instanceId: {
          type: 'string',
          description: 'Case instance ID',
        },
        folderKey: {
          type: 'string',
          description: 'Folder key where the case instance is located',
        },
      },
      required: ['instanceId', 'folderKey'],
    },
  },

  {
    name: 'uipath_get_task_users',
    description:
      'Get list of users who can be assigned tasks in a specific folder.',
    inputSchema: {
      type: 'object',
      properties: {
        folderId: {
          type: 'number',
          description: 'Folder ID to get eligible users from',
        },
      },
      required: ['folderId'],
    },
  },

  {
    name: 'uipath_get_maestro_process_incidents',
    description:
      'Get incidents for a specific Maestro process.',
    inputSchema: {
      type: 'object',
      properties: {
        processKey: {
          type: 'string',
          description: 'Maestro process key',
        },
        folderKey: {
          type: 'string',
          description: 'Folder key where the process is located',
        },
      },
      required: ['processKey', 'folderKey'],
    },
  },

  {
    name: 'uipath_get_case_instances',
    description:
      'List all case instances with optional filtering and pagination.',
    inputSchema: {
      type: 'object',
      properties: {
        pageSize: {
          type: 'number',
          description: 'Number of instances to return (default: 100)',
        },
        filter: {
          type: 'string',
          description: 'OData filter expression',
        },
      },
      required: [],
    },
  },

  {
    name: 'uipath_control_case_instance',
    description:
      'Control a case instance - close, pause, or resume it.',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['close', 'pause', 'resume'],
          description: 'Action to perform on the case instance',
        },
        instanceId: {
          type: 'string',
          description: 'Case instance ID',
        },
        folderKey: {
          type: 'string',
          description: 'Folder key where the case instance is located',
        },
      },
      required: ['action', 'instanceId', 'folderKey'],
    },
  },

  {
    name: 'uipath_get_case_instance_history',
    description:
      'Get execution history for a specific case instance.',
    inputSchema: {
      type: 'object',
      properties: {
        instanceId: {
          type: 'string',
          description: 'Case instance ID',
        },
        folderKey: {
          type: 'string',
          description: 'Folder key where the case instance is located',
        },
      },
      required: ['instanceId', 'folderKey'],
    },
  },

  {
    name: 'uipath_get_case_stages',
    description:
      'Get case stages with tasks for a specific case instance.',
    inputSchema: {
      type: 'object',
      properties: {
        caseInstanceId: {
          type: 'string',
          description: 'Case instance ID',
        },
        folderKey: {
          type: 'string',
          description: 'Folder key where the case instance is located',
        },
      },
      required: ['caseInstanceId', 'folderKey'],
    },
  },

  {
    name: 'uipath_get_case_action_tasks',
    description:
      'Get human-in-the-loop tasks for a specific case instance.',
    inputSchema: {
      type: 'object',
      properties: {
        caseInstanceId: {
          type: 'string',
          description: 'Case instance ID',
        },
        folderId: {
          type: 'number',
          description: 'Folder ID where the case instance is located',
        },
      },
      required: ['caseInstanceId', 'folderId'],
    },
  },

  {
    name: 'uipath_get_all_process_incidents',
    description:
      'Get all process incidents across all folders.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
] as const;
