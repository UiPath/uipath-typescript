import { defineConfig, devices } from '@playwright/test';
/**
 * refer https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests/e2e',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,
  /* Retry flaky tests on CI (E2E tests run at release time only) */
  retries: process.env.CI ? 2 : 0,
  /* undefined = auto-detect CPU cores (8 cores for for local machine  = 8 parallel tests locally, 2 cores = 2 parallel tests in CI in github actions) */
  workers: undefined,
  /* Reporter to use */
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
    ['junit', { outputFile: 'test-results/junit.xml' }]
  ],

  /* Shared settings for all the projects below */
  use: {
    /* Base URL to use in actions like `await page.goto('/')` */
    baseURL: 'http://localhost:3000',
    /* Collect trace when retrying the failed test */
    trace: 'on-first-retry',
    /* Screenshot on failure */
    screenshot: 'only-on-failure',
    /* Video on failure */
    video: 'retain-on-failure',
  },

  /* Configure projects for major browsers */
  projects: [
    // Module tests - run in Node.js environment
    {
      name: 'module-tests',
      testDir: './tests/e2e/module-tests',
      testMatch: '**/*.test.ts',
      use: {
        // No browser needed for module tests
      },
    },

    // Framework tests - React
    {
      name: 'react',
      testDir: './tests/e2e/framework-tests',
      testMatch: '**/react.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:3000',
      },
    },

    // Framework tests - Vue
    // {
    //   name: 'vue',
    //   testDir: './tests/e2e/framework-tests',
    //   testMatch: '**/vue.spec.ts',
    //   use: {
    //     ...devices['Desktop Chrome'],
    //     baseURL: 'http://localhost:3001',
    //   },
    // },

    // // Framework tests - Angular
    // {
    //   name: 'angular',
    //   testDir: './tests/e2e/framework-tests',
    //   testMatch: '**/angular.spec.ts',
    //   use: {
    //     ...devices['Desktop Chrome'],
    //     baseURL: 'http://localhost:3002',
    //   },
    // },

    // Bundler tests
    {
      name: 'bundler-tests',
      testDir: './tests/e2e/bundler-tests',
      testMatch: '**/*.spec.ts',
      use: {
        // Mix of Node.js and browser tests
      },
    },

    // Cross-browser testing (right now we are only testing Safari and chrome)
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      testMatch: '**/browser-*.spec.ts',
    }
  ],

  /* Run your local dev servers before starting the tests */
  webServer: [
    {
      command: 'cd tests/e2e/test-apps/react-app && npm run dev',
      port: 3000,
      timeout: 120 * 1000,
      reuseExistingServer: !process.env.CI, // Always kill any existing server and start fresh(Ensures clean state) in ci
    },
    // TODO: Enable when Vue app is created
    // {
    //   command: 'cd tests/e2e/test-apps/vue-app && npm run dev',
    //   port: 3001,
    //   timeout: 120 * 1000,
    //   reuseExistingServer: !process.env.CI,
    // },
    // TODO: Enable when Angular app is created
    // {
    //   command: 'cd tests/e2e/test-apps/angular-app && npm run dev',
    //   port: 3002,
    //   timeout: 120 * 1000,
    //   reuseExistingServer: !process.env.CI,
    // },
  ],

  /* Timeout for each test (generous for E2E tests with dev servers) */
  timeout: 60 * 1000,

  /* Timeout for each expect */
  expect: {
    timeout: 10000,
  },
});
