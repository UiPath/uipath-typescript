/**
 * Custom Tool Handler: Workflow Summary
 *
 * Aggregates data from multiple SDK calls to provide a summary view.
 */

import { getSDKClient } from '../utils/sdk-client.js';

export interface WorkflowSummaryInput {
  folderId: number;
  includeMetrics?: boolean;
}

export interface WorkflowSummaryResult {
  folder: {
    id: number;
  };
  processes: {
    total: number;
    items: Array<{ name: string; id: string }>;
  };
  queues: {
    total: number;
    items: Array<{ name: string; id: string; itemCount?: number }>;
  };
  tasks: {
    total: number;
    pending: number;
    completed: number;
  };
  generatedAt: string;
}

/**
 * Execute the workflow summary
 */
export async function execute(input: WorkflowSummaryInput): Promise<WorkflowSummaryResult> {
  const client = await getSDKClient();
  const folderId = input.folderId;

  // Fetch data in parallel for efficiency
  const [processesResult, queuesResult, tasksResult] = await Promise.allSettled([
    client.processes.getAll({ folderId }),
    client.queues.getAll({ folderId }),
    client.tasks.getAll({}, folderId),
  ]);

  // Process results
  const processes = processesResult.status === 'fulfilled'
    ? (Array.isArray(processesResult.value) ? processesResult.value : [])
    : [];

  const queues = queuesResult.status === 'fulfilled'
    ? (Array.isArray(queuesResult.value) ? queuesResult.value : [])
    : [];

  const tasks = tasksResult.status === 'fulfilled'
    ? (Array.isArray(tasksResult.value) ? tasksResult.value : [])
    : [];

  // Calculate task stats
  const pendingTasks = tasks.filter((t: any) =>
    t.status === 'Pending' || t.status === 'Unassigned'
  ).length;
  const completedTasks = tasks.filter((t: any) =>
    t.status === 'Completed'
  ).length;

  return {
    folder: {
      id: folderId,
    },
    processes: {
      total: processes.length,
      items: processes.slice(0, 10).map((p: any) => ({
        name: p.name || p.Name,
        id: p.id || p.Id,
      })),
    },
    queues: {
      total: queues.length,
      items: queues.slice(0, 10).map((q: any) => ({
        name: q.name || q.Name,
        id: q.id || q.Id,
        itemCount: input.includeMetrics ? q.itemCount : undefined,
      })),
    },
    tasks: {
      total: tasks.length,
      pending: pendingTasks,
      completed: completedTasks,
    },
    generatedAt: new Date().toISOString(),
  };
}

export default { execute };
