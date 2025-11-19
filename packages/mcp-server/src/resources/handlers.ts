import { UiPath } from '@uipath/uipath-typescript';
import { logger } from '../utils/logger.js';

/**
 * Resource handlers - implement read operations for MCP resources
 */
export class ResourceHandlers {
  constructor(private sdk: UiPath) {}

  /**
   * Handle resource read by parsing URI and routing to appropriate handler
   */
  async handleResourceRead(uri: string): Promise<{ uri: string; mimeType: string; text: string }> {
    logger.debug(`Reading resource: ${uri}`);

    try {
      const data = await this.routeResource(uri);

      return {
        uri,
        mimeType: uri.includes('/bpmn') ? 'application/xml' : 'application/json',
        text: typeof data === 'string' ? data : JSON.stringify(data, null, 2),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`Resource read failed: ${uri}`, error);

      return {
        uri,
        mimeType: 'text/plain',
        text: `Error reading resource: ${message}`,
      };
    }
  }

  /**
   * Route resource URI to appropriate handler
   */
  private async routeResource(uri: string): Promise<any> {
    const parts = uri.replace('uipath://', '').split('/');
    const [domain, ...rest] = parts;

    switch (domain) {
      case 'tasks':
        return this.handleTasksResource(rest);

      case 'processes':
        return this.handleProcessesResource(rest);

      case 'maestro':
        return this.handleMaestroResource(rest);

      case 'entities':
        return this.handleEntitiesResource(rest);

      case 'assets':
        return this.handleAssetsResource(rest);

      case 'queues':
        return this.handleQueuesResource(rest);

      case 'buckets':
        return this.handleBucketsResource(rest);

      case 'cases':
        return this.handleCasesResource(rest);

      case 'case-instances':
        return this.handleCaseInstancesResource(rest);

      default:
        throw new Error(`Unknown resource domain: ${domain}`);
    }
  }

  // === TASKS ===
  private async handleTasksResource(parts: string[]): Promise<any> {
    if (parts.length === 0) {
      // uipath://tasks
      return await this.sdk.tasks.getAll({ pageSize: 100 });
    }

    if (parts[0] === 'users') {
      // uipath://tasks/users
      return await this.sdk.tasks.getUsers(0); // Note: May need folderId parameter
    }

    // uipath://tasks/{taskId}
    const taskId = parseInt(parts[0], 10);
    if (isNaN(taskId)) {
      throw new Error(`Invalid task ID: ${parts[0]}`);
    }
    return await this.sdk.tasks.getById(taskId);
  }

  // === ORCHESTRATOR PROCESSES ===
  private async handleProcessesResource(parts: string[]): Promise<any> {
    if (parts.length === 0) {
      // uipath://processes
      return await this.sdk.processes.getAll({ pageSize: 100 });
    }

    // uipath://processes/{processId}
    const processId = parseInt(parts[0], 10);
    if (isNaN(processId)) {
      throw new Error(`Invalid process ID: ${parts[0]}`);
    }
    return await this.sdk.processes.getById(processId, 0); // Note: May need folderId
  }

  // === MAESTRO ===
  private async handleMaestroResource(parts: string[]): Promise<any> {
    const [subdomain, ...rest] = parts;

    if (subdomain === 'processes') {
      return this.handleMaestroProcessesResource(rest);
    }

    if (subdomain === 'instances') {
      return this.handleMaestroInstancesResource(rest);
    }

    throw new Error(`Unknown maestro resource: ${subdomain}`);
  }

  private async handleMaestroProcessesResource(parts: string[]): Promise<any> {
    if (parts.length === 0) {
      // uipath://maestro/processes
      return await this.sdk.maestro.processes.getAll();
    }

    // uipath://maestro/processes/{processKey}
    const processKey = parts[0];
    const allProcesses = await this.sdk.maestro.processes.getAll();
    const process = allProcesses.find((p: any) => p.key === processKey || p.name === processKey);

    if (!process) {
      throw new Error(`Process not found: ${processKey}`);
    }

    return process;
  }

  private async handleMaestroInstancesResource(parts: string[]): Promise<any> {
    if (parts.length === 0) {
      // uipath://maestro/instances
      return await this.sdk.maestro.processes.instances.getAll({ pageSize: 100 });
    }

    const instanceId = parts[0];
    const subResource = parts[1];

    // Get folder key - in real implementation, this should be provided
    const folderKey = 'default'; // This should be configurable or extracted from context

    if (!subResource) {
      // uipath://maestro/instances/{instanceId}
      return await this.sdk.maestro.processes.instances.getById(instanceId, folderKey);
    }

    switch (subResource) {
      case 'variables':
        // uipath://maestro/instances/{instanceId}/variables
        return await this.sdk.maestro.processes.instances.getVariables(instanceId, folderKey);

      case 'history':
        // uipath://maestro/instances/{instanceId}/history
        return await this.sdk.maestro.processes.instances.getExecutionHistory(instanceId);

      case 'incidents':
        // uipath://maestro/instances/{instanceId}/incidents
        return await this.sdk.maestro.processes.instances.getIncidents(instanceId, folderKey);

      case 'bpmn':
        // uipath://maestro/instances/{instanceId}/bpmn
        return await this.sdk.maestro.processes.instances.getBpmn(instanceId, folderKey);

      default:
        throw new Error(`Unknown instance sub-resource: ${subResource}`);
    }
  }

  // === ENTITIES ===
  private async handleEntitiesResource(parts: string[]): Promise<any> {
    if (parts.length === 0) {
      // uipath://entities
      return await this.sdk.entities.getAll();
    }

    const entityId = parts[0];
    const subResource = parts[1];

    if (!subResource) {
      // uipath://entities/{entityId}
      return await this.sdk.entities.getById(entityId);
    }

    if (subResource === 'records') {
      // uipath://entities/{entityId}/records
      return await this.sdk.entities.getRecordsById(entityId, { pageSize: 100 });
    }

    throw new Error(`Unknown entity sub-resource: ${subResource}`);
  }

  // === ASSETS ===
  private async handleAssetsResource(parts: string[]): Promise<any> {
    if (parts.length === 0) {
      // uipath://assets
      return await this.sdk.assets.getAll({ pageSize: 100 });
    }

    // uipath://assets/{assetId}
    const assetId = parseInt(parts[0], 10);
    if (isNaN(assetId)) {
      throw new Error(`Invalid asset ID: ${parts[0]}`);
    }
    return await this.sdk.assets.getById(assetId, 0); // Note: May need folderId
  }

  // === QUEUES ===
  private async handleQueuesResource(parts: string[]): Promise<any> {
    if (parts.length === 0) {
      // uipath://queues
      return await this.sdk.queues.getAll({ pageSize: 100 });
    }

    // uipath://queues/{queueId}
    const queueId = parseInt(parts[0], 10);
    if (isNaN(queueId)) {
      throw new Error(`Invalid queue ID: ${parts[0]}`);
    }
    return await this.sdk.queues.getById(queueId, 0); // Note: May need folderId
  }

  // === BUCKETS ===
  private async handleBucketsResource(parts: string[]): Promise<any> {
    if (parts.length === 0) {
      // uipath://buckets
      return await this.sdk.buckets.getAll({ pageSize: 100 });
    }

    const bucketId = parts[0];
    const subResource = parts[1];

    if (!subResource) {
      // uipath://buckets/{bucketId}
      return await this.sdk.buckets.getById(parseInt(bucketId, 10), 0); // Note: May need folderId
    }

    if (subResource === 'files') {
      // uipath://buckets/{bucketId}/files
      return await this.sdk.buckets.getFileMetaData(parseInt(bucketId, 10), 0, { pageSize: 100 });
    }

    throw new Error(`Unknown bucket sub-resource: ${subResource}`);
  }

  // === CASES ===
  private async handleCasesResource(parts: string[]): Promise<any> {
    if (parts.length === 0) {
      // uipath://cases
      return await this.sdk.maestro.cases.getAll();
    }

    // Future: Handle specific case details
    throw new Error('Case details not yet implemented');
  }

  // === CASE INSTANCES ===
  private async handleCaseInstancesResource(parts: string[]): Promise<any> {
    if (parts.length === 0) {
      throw new Error('Case instance ID is required');
    }

    const instanceId = parts[0];
    const folderKey = 'default'; // Should be configurable

    return await this.sdk.maestro.cases.instances.getById(instanceId, folderKey);
  }
}
