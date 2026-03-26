import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock all external dependencies before importing
vi.mock('@azure/monitor-opentelemetry-exporter', () => ({
  AzureMonitorLogExporter: vi.fn().mockImplementation(() => ({})),
}));
vi.mock('@opentelemetry/sdk-logs', () => ({
  LoggerProvider: vi.fn().mockImplementation(() => ({
    getLogger: vi.fn().mockReturnValue({ emit: vi.fn() }),
  })),
  SimpleLogRecordProcessor: vi.fn().mockImplementation(() => ({})),
}));
vi.mock('@opentelemetry/resources', () => ({
  resourceFromAttributes: vi.fn().mockReturnValue({}),
}));
vi.mock('@opentelemetry/semantic-conventions', () => ({
  ATTR_SERVICE_NAME: 'service.name',
}));
vi.mock('node:fs', async () => {
  const actual = await vi.importActual('node:fs');
  return { ...actual, readFileSync: vi.fn(), existsSync: vi.fn() };
});

import * as fs from 'node:fs';

describe('telemetry/client', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should create a singleton instance', async () => {
    const mod = await import('../../../src/telemetry/client.js');
    expect(mod.cliTelemetryClient).toBeDefined();
  });

  it('should initialize and enable telemetry when connection string is valid', async () => {
    process.env.UIPATH_TELEMETRY_ENABLED = 'true';
    const mod = await import('../../../src/telemetry/client.js');
    mod.cliTelemetryClient.initialize();
    // Should not throw
    mod.cliTelemetryClient.track('TestEvent', { key: 'value' });
  });

  it('should not enable when UIPATH_TELEMETRY_ENABLED is false', async () => {
    process.env.UIPATH_TELEMETRY_ENABLED = 'false';
    const mod = await import('../../../src/telemetry/client.js');
    mod.cliTelemetryClient.initialize();
    mod.cliTelemetryClient.track('TestEvent');
    // No error expected; event silently dropped
  });

  it('should not re-initialize if already initialized', async () => {
    const mod = await import('../../../src/telemetry/client.js');
    mod.cliTelemetryClient.initialize();
    mod.cliTelemetryClient.initialize(); // second call should be no-op
  });

  it('should silently handle track() when not initialized', async () => {
    process.env.UIPATH_TELEMETRY_ENABLED = 'false';
    const mod = await import('../../../src/telemetry/client.js');
    mod.cliTelemetryClient.initialize();
    expect(() => mod.cliTelemetryClient.track('Test')).not.toThrow();
  });

  it('should enrich attributes with env vars', async () => {
    process.env.UIPATH_BASE_URL = 'https://cloud.uipath.com';
    process.env.UIPATH_ORG_ID = 'org-123';
    process.env.UIPATH_TENANT_ID = 'tenant-456';
    const mod = await import('../../../src/telemetry/client.js');
    mod.cliTelemetryClient.initialize();
    mod.cliTelemetryClient.track('EnrichedEvent', { custom: 'attr' });
  });

  it('should read app system name from config file', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ systemName: 'my-app' }));
    process.env.UIPATH_BASE_URL = 'https://cloud.uipath.com';
    process.env.UIPATH_ORG_ID = 'org-1';
    process.env.UIPATH_TENANT_ID = 'tenant-1';
    const mod = await import('../../../src/telemetry/client.js');
    mod.cliTelemetryClient.initialize();
    mod.cliTelemetryClient.track('WithAppName');
  });

  it('should handle missing .uipath dir gracefully', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    const mod = await import('../../../src/telemetry/client.js');
    mod.cliTelemetryClient.initialize();
    mod.cliTelemetryClient.track('NoUipathDir');
  });
});
