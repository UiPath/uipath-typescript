import { getAll as getAllEntities } from '../dist/data-fabric.entities.getAll.mjs';

// Minimal method-level POC app that only uses the refactored getAll
// method-level entrypoint. This simulates a consumer bundling the SDK
// at the method level.

async function main() {
  const config = {
    baseUrl: 'https://cloud.uipath.com',
    orgName: 'ORG',
    tenantName: 'TENANT',
    secret: 'SECRET',
  };

  // For bundle-size measurement we avoid real network calls.
  // const allEntities = await getAllEntities(config);

  console.log(
    'Method-level getAll wiring is valid:',
    typeof getAllEntities === 'function'
  );
}

main().catch((err) => {
  console.error('Method-level getAll POC failed', err);
});

