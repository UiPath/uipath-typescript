// This is an end to end test file samplethat makes actual API calls.

import { UiPath } from '../../src/index';
import { UiPathSDKConfig } from '../../src/core/config/sdkConfig';

const e2eConfig: UiPathSDKConfig = {
  baseUrl: process.env.UIPATH_BASE_URL || '',
  orgName: process.env.UIPATH_ORG_NAME || '',
  tenantName: process.env.UIPATH_TENANT_NAME || '',
  secret: process.env.UIPATH_SECRET || '',
};

const isConfigured = e2eConfig.baseUrl && e2eConfig.orgName && e2eConfig.tenantName && e2eConfig.secret;

// Conditionally run the tests only if the environment is configured
(isConfigured ? describe : describe.skip)('E2E - MaestroProcessesService', () => {
  let sdk: UiPath;

  beforeAll(async () => {
    sdk = new UiPath(e2eConfig);
    await sdk.initialize();
  });

  it('should successfully fetch all processes from the live API', async () => {
    // Act
    const processes = await sdk.maestroProcesses.getAll();

    // Assert
    // This test verifies that the call succeeds and returns data in the expected shape.
    expect(Array.isArray(processes)).toBe(true);
    console.log(`Found ${processes.length} processes in the live test environment.`);

    if (processes.length > 0) {
      // Perform structural checks on the first process object to ensure it matches the MaestroProcess interface.
      const firstProcess = processes[0];
      expect(typeof firstProcess.processKey).toBe('string');
      expect(typeof firstProcess.packageId).toBe('string');
      expect(typeof firstProcess.folderName).toBe('string');
      expect(Array.isArray(firstProcess.packageVersions)).toBe(true);
      expect(typeof firstProcess.instanceCounts).toBe('object');
      expect(typeof firstProcess.instanceCounts.running).toBe('number');
      expect(typeof firstProcess.instanceCounts.completed).toBe('number');
    }
  });
}); 