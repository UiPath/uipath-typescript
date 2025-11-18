import { EntityService } from '../dist/data-fabric.entities.mjs';

// Minimal service-level POC app that only uses EntityService.getAll.
// This simulates a consumer bundling the SDK at the service level.

async function main() {
  const config = {
    baseUrl: 'https://cloud.uipath.com',
    orgName: 'ORG',
    tenantName: 'TENANT',
    secret: 'SECRET',
  };

  const entities = new EntityService(config);

  // For bundle-size measurement we do not actually perform network calls.
  // await entities.getAll();

  console.log('Service-level getAll wiring is valid:', Boolean(entities));
}

main().catch((err) => {
  console.error('Service-level getAll POC failed', err);
});

