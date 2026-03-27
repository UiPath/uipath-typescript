import { describe, it, expect } from 'vitest';
import {
  CONNECTION_STRING,
  CLI_VERSION,
  CLOUD_ORGANIZATION_ID,
  CLOUD_TENANT_ID,
  CLOUD_URL,
  APP_NAME,
  APP_SYSTEM_NAME,
  VERSION,
  CLOUD_ROLE_NAME,
  UNKNOWN,
  ENV_TELEMETRY_ENABLED,
  CLI_SERVICE_NAME,
  CLI_LOGGER_NAME,
} from '../../../src/telemetry/constants.js';

describe('telemetry/constants', () => {
  it('should export CONNECTION_STRING', () => {
    expect(typeof CONNECTION_STRING).toBe('string');
    expect(CONNECTION_STRING.length).toBeGreaterThan(0);
  });

  it('should export CLI_VERSION', () => {
    expect(typeof CLI_VERSION).toBe('string');
  });

  it('should export attribute name constants', () => {
    expect(CLOUD_ORGANIZATION_ID).toBe('CloudOrganizationId');
    expect(CLOUD_TENANT_ID).toBe('CloudTenantId');
    expect(CLOUD_URL).toBe('CloudUrl');
    expect(APP_NAME).toBe('ApplicationName');
    expect(APP_SYSTEM_NAME).toBe('AppSystemName');
    expect(VERSION).toBe('Version');
    expect(CLOUD_ROLE_NAME).toBe('uipath-ts-cli');
  });

  it('should export UNKNOWN as empty string', () => {
    expect(UNKNOWN).toBe('');
  });

  it('should export environment and service name constants', () => {
    expect(ENV_TELEMETRY_ENABLED).toBe('UIPATH_TELEMETRY_ENABLED');
    expect(CLI_SERVICE_NAME).toBe('UiPath.Typescript.Cli');
    expect(CLI_LOGGER_NAME).toBe('uipath-ts-cli-telemetry');
  });
});
