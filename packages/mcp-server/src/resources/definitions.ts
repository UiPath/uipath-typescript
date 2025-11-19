/**
 * Resource definitions for MCP server
 * Resources are read-only data sources that AI assistants can browse
 *
 * MCP distinguishes between:
 * - Static Resources: Fixed URIs (use 'uri' field)
 * - Resource Templates: Parameterized URIs (use 'uriTemplate' field)
 */

/**
 * Static resources - these have fixed URIs and return lists/collections
 */
export const STATIC_RESOURCES = [
  // === TASKS ===
  {
    uri: 'uipath://tasks',
    name: 'Action Center Tasks',
    description: 'List ALL Action Center tasks across all folders. No parameters or folder IDs required. Returns up to 100 tasks. Use this resource to browse, search, or list tasks.',
    mimeType: 'application/json',
  },
  {
    uri: 'uipath://tasks/users',
    name: 'Task-Eligible Users',
    description: 'List users who can be assigned tasks',
    mimeType: 'application/json',
  },

  // === ORCHESTRATOR PROCESSES ===
  {
    uri: 'uipath://processes',
    name: 'Orchestrator Processes',
    description: 'List all Orchestrator processes/releases',
    mimeType: 'application/json',
  },

  // === MAESTRO PROCESSES ===
  {
    uri: 'uipath://maestro/processes',
    name: 'Maestro Processes',
    description: 'List all Maestro process definitions with statistics',
    mimeType: 'application/json',
  },

  // === MAESTRO INSTANCES ===
  {
    uri: 'uipath://maestro/instances',
    name: 'Maestro Process Instances',
    description: 'List all Maestro process instances with filtering',
    mimeType: 'application/json',
  },

  // === ENTITIES (DATA FABRIC) ===
  {
    uri: 'uipath://entities',
    name: 'Data Fabric Entities',
    description: 'List all Data Fabric entities',
    mimeType: 'application/json',
  },

  // === ASSETS ===
  {
    uri: 'uipath://assets',
    name: 'Orchestrator Assets',
    description: 'List all Orchestrator assets',
    mimeType: 'application/json',
  },

  // === QUEUES ===
  {
    uri: 'uipath://queues',
    name: 'Orchestrator Queues',
    description: 'List all Orchestrator queues',
    mimeType: 'application/json',
  },

  // === BUCKETS (STORAGE) ===
  {
    uri: 'uipath://buckets',
    name: 'Orchestrator Storage Buckets',
    description: 'List all Orchestrator storage buckets',
    mimeType: 'application/json',
  },

  // === CASES ===
  {
    uri: 'uipath://cases',
    name: 'Case Management Processes',
    description: 'List all case management processes',
    mimeType: 'application/json',
  },
] as const;

/**
 * Resource templates - these have parameterized URIs for accessing specific items
 */
export const RESOURCE_TEMPLATES = [
  // === TASKS ===
  {
    uriTemplate: 'uipath://tasks/{taskId}',
    name: 'Action Center Task Details',
    description: 'Get detailed information about a specific Action Center task by its ID',
    mimeType: 'application/json',
  },

  // === ORCHESTRATOR PROCESSES ===
  {
    uriTemplate: 'uipath://processes/{processId}',
    name: 'Orchestrator Process Details',
    description: 'Get detailed information about a specific process',
    mimeType: 'application/json',
  },

  // === MAESTRO PROCESSES ===
  {
    uriTemplate: 'uipath://maestro/processes/{processKey}',
    name: 'Maestro Process Details',
    description: 'Get detailed information about a specific Maestro process',
    mimeType: 'application/json',
  },

  // === MAESTRO INSTANCES ===
  {
    uriTemplate: 'uipath://maestro/instances/{instanceId}',
    name: 'Maestro Instance Details',
    description: 'Get detailed information about a specific process instance',
    mimeType: 'application/json',
  },
  {
    uriTemplate: 'uipath://maestro/instances/{instanceId}/variables',
    name: 'Maestro Instance Variables',
    description: 'Get all variables for a process instance',
    mimeType: 'application/json',
  },
  {
    uriTemplate: 'uipath://maestro/instances/{instanceId}/history',
    name: 'Maestro Instance Execution History',
    description: 'Get execution history/spans for a process instance',
    mimeType: 'application/json',
  },
  {
    uriTemplate: 'uipath://maestro/instances/{instanceId}/incidents',
    name: 'Maestro Instance Incidents',
    description: 'Get incidents for a process instance',
    mimeType: 'application/json',
  },
  {
    uriTemplate: 'uipath://maestro/instances/{instanceId}/bpmn',
    name: 'Maestro Instance BPMN',
    description: 'Get BPMN XML for a process instance',
    mimeType: 'application/xml',
  },

  // === ENTITIES (DATA FABRIC) ===
  {
    uriTemplate: 'uipath://entities/{entityId}',
    name: 'Data Fabric Entity Schema',
    description: 'Get entity schema and metadata',
    mimeType: 'application/json',
  },
  {
    uriTemplate: 'uipath://entities/{entityId}/records',
    name: 'Data Fabric Entity Records',
    description: 'Get records/data from an entity',
    mimeType: 'application/json',
  },

  // === ASSETS ===
  {
    uriTemplate: 'uipath://assets/{assetId}',
    name: 'Orchestrator Asset Details',
    description: 'Get detailed information about a specific asset',
    mimeType: 'application/json',
  },

  // === QUEUES ===
  {
    uriTemplate: 'uipath://queues/{queueId}',
    name: 'Orchestrator Queue Details',
    description: 'Get detailed information about a specific queue',
    mimeType: 'application/json',
  },

  // === BUCKETS (STORAGE) ===
  {
    uriTemplate: 'uipath://buckets/{bucketId}',
    name: 'Orchestrator Bucket Details',
    description: 'Get detailed information about a specific bucket',
    mimeType: 'application/json',
  },
  {
    uriTemplate: 'uipath://buckets/{bucketId}/files',
    name: 'Bucket Files',
    description: 'List all files in a storage bucket',
    mimeType: 'application/json',
  },

  // === CASES ===
  {
    uriTemplate: 'uipath://case-instances/{instanceId}',
    name: 'Case Instance Details',
    description: 'Get detailed information about a specific case instance',
    mimeType: 'application/json',
  },
] as const;

// For backwards compatibility and convenience
export const RESOURCE_DEFINITIONS = STATIC_RESOURCES;
