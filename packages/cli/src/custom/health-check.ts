/**
 * Custom Tool Handler: Health Check
 *
 * This is an example of a custom tool that doesn't directly map to an SDK method.
 * Custom handlers receive the input parameters and should return a result.
 */

import { getSDKClient } from '../utils/sdk-client.js';

export interface HealthCheckInput {
  services?: string[];
  timeout?: number;
}

export interface ServiceStatus {
  name: string;
  status: 'healthy' | 'unhealthy' | 'unknown';
  responseTime?: number;
  error?: string;
}

export interface HealthCheckResult {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services: ServiceStatus[];
}

/**
 * Execute the health check
 */
export async function execute(input: HealthCheckInput): Promise<HealthCheckResult> {
  const services = input.services || ['orchestrator'];
  const timeout = input.timeout || 5000;
  const results: ServiceStatus[] = [];

  for (const service of services) {
    const startTime = Date.now();

    try {
      const status = await checkService(service, timeout);
      results.push({
        name: service,
        status: status ? 'healthy' : 'unhealthy',
        responseTime: Date.now() - startTime,
      });
    } catch (error) {
      results.push({
        name: service,
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Determine overall status
  const healthyCount = results.filter(r => r.status === 'healthy').length;
  let overall: 'healthy' | 'degraded' | 'unhealthy';

  if (healthyCount === results.length) {
    overall = 'healthy';
  } else if (healthyCount > 0) {
    overall = 'degraded';
  } else {
    overall = 'unhealthy';
  }

  return {
    overall,
    timestamp: new Date().toISOString(),
    services: results,
  };
}

/**
 * Check a specific service
 */
async function checkService(service: string, timeout: number): Promise<boolean> {
  const client = await getSDKClient();

  // Create a timeout promise
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Timeout')), timeout);
  });

  try {
    switch (service.toLowerCase()) {
      case 'orchestrator':
        // Try to list processes as a health check
        await Promise.race([
          client.processes.getAll({ top: 1 }),
          timeoutPromise,
        ]);
        return true;

      case 'action-center':
      case 'tasks':
        // Try to get task users
        await Promise.race([
          client.tasks.getAll({ top: 1 }, 0),
          timeoutPromise,
        ]);
        return true;

      case 'data-service':
      case 'entities':
        // Try to query entities
        await Promise.race([
          client.entities.getAll(),
          timeoutPromise,
        ]);
        return true;

      default:
        throw new Error(`Unknown service: ${service}`);
    }
  } catch (error) {
    throw error;
  }
}

export default { execute };
