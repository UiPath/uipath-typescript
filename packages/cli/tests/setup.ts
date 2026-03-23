import { vi } from 'vitest';

// Global mocks shared across all CLI test files.
// Eliminates duplicated vi.hoisted() + vi.mock() boilerplate in each test.

vi.mock('inquirer', () => ({ default: { prompt: vi.fn() } }));

vi.mock('ora', () => ({
  default: vi.fn(() => ({
    start: vi.fn().mockReturnThis(),
    succeed: vi.fn().mockReturnThis(),
    fail: vi.fn().mockReturnThis(),
    stop: vi.fn().mockReturnThis(),
    info: vi.fn().mockReturnThis(),
    text: '',
    isSpinning: false,
  })),
}));

vi.mock('../src/telemetry/index.js', () => ({
  cliTelemetryClient: { track: vi.fn() },
}));
