import type { UiPathSDKConfig } from '@uipath/uipath-typescript';
import { getAll as getAllEntities } from '@uipath/uipath-typescript/data-fabric/entities/getAll';
import { getRecordsById } from '@uipath/uipath-typescript/data-fabric/entities/getRecordsById';
import { getAll as getAllTasks } from '@uipath/uipath-typescript/action-center/tasks/getAll';
import { getById as getTaskById } from '@uipath/uipath-typescript/action-center/tasks/getById';

// Simple POC script that exercises the method-level modular imports.
// As with the service-level app, this is primarily for bundle-size and
// DX comparison, not for production usage.

async function main() {
  const config: UiPathSDKConfig = {
    baseUrl: 'https://cloud.uipath.com',
    orgName: 'YOUR_ORG',
    tenantName: 'YOUR_TENANT',
    secret: 'YOUR_SECRET'
  };

  // Typical usage  comment out network calls when measuring bundle size
  // const allEntities = await getAllEntities(config);
  // const records = await getRecordsById(config, 'entityId');
  // const allTasks = await getAllTasks(config);
  // const singleTask = await getTaskById(config, 123);

  console.log('Method-level POC wiring is valid:', !!getAllEntities, !!getAllTasks);
}

main().catch((err) => {
  console.error('Method-level POC failed', err);
});

