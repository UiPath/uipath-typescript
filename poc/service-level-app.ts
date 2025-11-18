import type { UiPathSDKConfig } from '@uipath/uipath-typescript';
import { EntityService } from '@uipath/uipath-typescript/data-fabric/entities';
import { TaskService } from '@uipath/uipath-typescript/action-center/tasks';

// Simple POC script that exercises the service-level modular imports.
// This is not meant to be run against a live tenant; it is mainly
// for bundle-size and DX evaluation.

async function main() {
  const config: UiPathSDKConfig = {
    baseUrl: 'https://cloud.uipath.com',
    orgName: 'YOUR_ORG',
    tenantName: 'YOUR_TENANT',
    secret: 'YOUR_SECRET'
  };

  const entities = new EntityService(config);
  const tasks = new TaskService(config);

  // Typical usage – comment out network calls when measuring bundle size
  // const allEntities = await entities.getAll();
  // const records = await entities.getRecordsById('entityId');
  // const allTasks = await tasks.getAll();
  // const singleTask = await tasks.getById(123);

  console.log('Service-level POC wiring is valid:', !!entities, !!tasks);
}

main().catch((err) => {
  console.error('Service-level POC failed', err);
});

