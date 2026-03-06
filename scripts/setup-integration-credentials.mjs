/**
 * Playwright credential setup for alpha.uipath.com integration tests.
 *
 * This script opens a browser and lets you complete SSO + navigation manually,
 * then automates app creation once you're on the External Applications page.
 *
 * Usage: node scripts/setup-integration-credentials.mjs
 */

import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));

// Find playwright from npx cache
const PLAYWRIGHT_PATHS = [
  '/Users/ayushjain/.npm/_npx/705bc6b22212b352/node_modules/playwright',
  resolve(__dirname, '../node_modules/playwright'),
  resolve(__dirname, '../node_modules/@playwright/test'),
];

let chromium;
for (const p of PLAYWRIGHT_PATHS) {
  try { ({ chromium } = require(p)); if (chromium) break; } catch { /* skip */ }
}
if (!chromium) { console.error('❌ playwright not found. Run: npx playwright@1.58.2 --version'); process.exit(1); }

const BASE_URL    = 'https://alpha.uipath.com';
const ORG_NAME    = 'appsdev';
const TENANT_NAME = 'appsdevDefault';
const APP_NAME    = `SDK-Machines-IntTest-${Date.now()}`;
const ENV_FILE    = resolve(__dirname, '../tests/.env.integration');

// ── Helpers ──────────────────────────────────────────────────────────────────
function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((res) => rl.question(question, (a) => { rl.close(); res(a); }));
}

async function waitForButton(page, texts, timeoutMs = 60000) {
  console.log(`   Waiting for button: ${texts.join(' / ')}...`);
  const selector = texts.map(t => `button:has-text("${t}")`).join(', ');
  await page.waitForSelector(selector, { timeout: timeoutMs });
  return page.locator(selector).first();
}

async function tryClick(page, selectors, label) {
  for (const sel of selectors) {
    try {
      const el = page.locator(sel).first();
      if (await el.isVisible({ timeout: 2000 })) {
        await el.click();
        console.log(`   ✓ ${label}`);
        return true;
      }
    } catch { /* try next */ }
  }
  console.log(`   ⚠️  Could not find "${label}" automatically`);
  return false;
}

async function readField(page, selectors) {
  for (const sel of selectors) {
    try {
      const el = page.locator(sel).first();
      if (await el.isVisible({ timeout: 2000 })) {
        return ((await el.inputValue().catch(() => '')) ||
                (await el.textContent().catch(() => ''))).trim();
      }
    } catch { /* try next */ }
  }
  return '';
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🚀 UiPath Machines Integration Test — Credential Setup');
  console.log('======================================================');
  console.log(`App name that will be created: ${APP_NAME}`);
  console.log('');

  const browser = await chromium.launch({ headless: false, slowMo: 150 });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page    = await context.newPage();

  try {
    // ── Phase 1: Manual login + navigation ─────────────────────────────────
    console.log('📂 Phase 1: Browser-assisted login');
    console.log('──────────────────────────────────');
    console.log('Opening browser to the External Applications admin page.');
    console.log('Please:');
    console.log('  1. Complete the SSO / Microsoft login');
    console.log(`  2. Make sure you land on the appsdev org External Applications page`);
    console.log(`     URL: ${BASE_URL}/${ORG_NAME}/portal_/externalApps`);
    console.log('');

    await page.goto(`${BASE_URL}/${ORG_NAME}/portal_/externalApps`);

    // Wait until the user is on the external apps page (button visible)
    console.log('⏳ Waiting for the "Add Application" button (up to 3 minutes)...');
    await page.waitForSelector(
      'button:has-text("Add application"), button:has-text("Add Application")',
      { timeout: 180000 }
    );
    console.log('✅ External Applications page ready.');
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});

    // ── Phase 2: Create application ─────────────────────────────────────────
    console.log('');
    console.log('📂 Phase 2: Creating application');
    console.log('─────────────────────────────────');

    // Click "Add Application"
    await page.locator('button:has-text("Add application"), button:has-text("Add Application")').first().click();
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
    console.log('   ✓ Clicked "Add Application"');

    // Fill app name
    const nameSelectors = ['input[placeholder*="name" i]', 'input[name="name"]', 'input[id*="name" i]'];
    let filled = false;
    for (const sel of nameSelectors) {
      try {
        const el = page.locator(sel).first();
        if (await el.isVisible({ timeout: 3000 })) {
          await el.clear();
          await el.fill(APP_NAME);
          filled = true;
          console.log(`   ✓ App name set: ${APP_NAME}`);
          break;
        }
      } catch { /* try next */ }
    }
    if (!filled) {
      await prompt(`   ⚠️  Manually type "${APP_NAME}" in the Name field, then press Enter: `);
    }

    // Select "Confidential" type
    const confClicked = await tryClick(page,
      ['label:has-text("Confidential")', 'input[value="Confidential"]', '[data-cy="confidential"]'],
      'Selected Confidential application type'
    );
    if (!confClicked) {
      await prompt('   Please select "Confidential Application" in the browser, then press Enter: ');
    }

    // Click Add / Next
    await tryClick(page,
      ['button:has-text("Add")', 'button[type="submit"]'],
      'Submitted application form'
    );
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});

    // ── Phase 3: Add OR.Machines scopes ────────────────────────────────────
    console.log('');
    console.log('📂 Phase 3: Adding OR.Machines scopes');
    console.log('─────────────────────────────────────');

    // Open scope editor
    const scopeOpened = await tryClick(page,
      ['button:has-text("Add scopes")', 'button:has-text("Edit scopes")', 'button:has-text("Add resource")'],
      'Opened scope selector'
    );
    if (!scopeOpened) {
      await prompt('   Please click "Add scopes" / "Edit scopes" in the browser, then press Enter: ');
    }
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});

    // Search for Machines
    const searchSel = 'input[placeholder*="Search" i], input[placeholder*="search" i]';
    try {
      await page.locator(searchSel).first().fill('Machines');
      await page.waitForTimeout(1000);
      console.log('   ✓ Searched for "Machines"');
    } catch { /* no search box */ }

    // Tick OR.Machines and OR.Machines.Read
    const scopesToSelect = ['OR.Machines.Read', 'OR.Machines'];
    let selectedCount = 0;
    for (const scopeText of scopesToSelect) {
      const candidates = page.locator(`text="${scopeText}"`);
      const n = await candidates.count();
      for (let i = 0; i < n; i++) {
        const el = candidates.nth(i);
        if (await el.isVisible({ timeout: 1000 }).catch(() => false)) {
          // Try checkbox near the label first
          const cb = page.locator(`input[type="checkbox"]`).filter({ has: page.locator(`text="${scopeText}"`) }).first();
          if (await cb.isVisible({ timeout: 1000 }).catch(() => false)) {
            if (!await cb.isChecked()) { await cb.click(); selectedCount++; }
          } else {
            await el.click().catch(() => {});
            selectedCount++;
          }
          console.log(`   ✓ Selected: ${scopeText}`);
          break;
        }
      }
    }

    if (selectedCount === 0) {
      console.log('   ⚠️  Could not auto-select scopes.');
      await prompt('   Please manually select OR.Machines and OR.Machines.Read, then press Enter: ');
    }

    // Confirm / Save scopes
    await tryClick(page,
      ['button:has-text("Save")', 'button:has-text("Add")', 'button:has-text("Update")', 'button:has-text("Confirm")'],
      'Saved scope selection'
    );
    await page.waitForLoadState('networkidle', { timeout: 6000 }).catch(() => {});

    // Save the whole app
    await tryClick(page,
      ['button:has-text("Save")', 'button:has-text("Update")', 'button[type="submit"]'],
      'Saved application'
    );
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});

    // ── Phase 4: Capture credentials ────────────────────────────────────────
    console.log('');
    console.log('📂 Phase 4: Capturing credentials');
    console.log('──────────────────────────────────');
    await page.waitForTimeout(2000);

    let appSecret = await readField(page, [
      '[data-cy="app-secret"] input', '[data-testid*="secret"] input',
      'input[readonly][type="text"]', 'code',
    ]);
    let appId = await readField(page, [
      '[data-cy="app-id"] input', '[data-cy="client-id"] input',
      '[data-testid*="client-id"] input', '[data-testid*="app-id"]',
    ]);

    if (appSecret) {
      console.log('   ✓ App secret captured automatically');
    } else {
      console.log('   ⚠️  Please copy the App Secret from the browser window.');
      appSecret = await prompt('   Paste App Secret here: ');
    }

    if (!appId) {
      appId = await prompt('   Paste Client/App ID (or press Enter to skip): ');
    } else {
      console.log(`   ✓ App ID: ${appId}`);
    }

    // ── Phase 5: Folder ID ──────────────────────────────────────────────────
    console.log('');
    const folderId = await prompt(
      '📂 Phase 5: Enter a Folder ID for scoped tests (press Enter to skip): '
    );

    await browser.close();

    // ── Write .env.integration ───────────────────────────────────────────────
    const envContent = [
      '# UiPath Integration Test Configuration',
      `# App: ${APP_NAME}`,
      `# Generated: ${new Date().toISOString()}`,
      '',
      `UIPATH_BASE_URL=${BASE_URL}`,
      `UIPATH_ORG_NAME=${ORG_NAME}`,
      `UIPATH_TENANT_NAME=${TENANT_NAME}`,
      `UIPATH_SECRET=${appSecret.trim()}`,
      '',
      'INTEGRATION_TEST_TIMEOUT=30000',
      'INTEGRATION_TEST_SKIP_CLEANUP=false',
      `INTEGRATION_TEST_FOLDER_ID=${folderId.trim()}`,
      '',
      'MAESTRO_TEST_PROCESS_KEY=',
      'ORCHESTRATOR_TEST_PROCESS_KEY=',
      'DATA_FABRIC_TEST_ENTITY_ID=',
    ].join('\n') + '\n';

    writeFileSync(ENV_FILE, envContent, 'utf-8');

    console.log('');
    console.log('✅ Written: ' + ENV_FILE);
    console.log('');
    console.log('📋 Summary');
    console.log('──────────');
    console.log(`   Base URL:  ${BASE_URL}`);
    console.log(`   Org:       ${ORG_NAME}`);
    console.log(`   Tenant:    ${TENANT_NAME}`);
    console.log(`   App ID:    ${appId || '(not captured)'}`);
    console.log(`   Secret:    ${'*'.repeat(Math.min(appSecret.trim().length, 12))}...`);
    console.log(`   Folder ID: ${folderId.trim() || '(none — tenant-level only)'}`);
    console.log('');
    console.log('🎉 Now run the integration tests:');
    console.log('   npm run test:integration');

  } catch (err) {
    console.error('\n❌ Error:', err.message);

    try { await browser.close(); } catch { /* ignore */ }

    // Manual fallback
    console.log('\n⚙️  Manual fallback — enter credentials directly:');
    const appSecret = await prompt('   PAT token or app secret: ');
    const folderId  = await prompt('   Folder ID (Enter to skip): ');

    const envContent = [
      '# UiPath Integration Test Configuration',
      '',
      `UIPATH_BASE_URL=${BASE_URL}`,
      `UIPATH_ORG_NAME=${ORG_NAME}`,
      `UIPATH_TENANT_NAME=${TENANT_NAME}`,
      `UIPATH_SECRET=${appSecret.trim()}`,
      '',
      'INTEGRATION_TEST_TIMEOUT=30000',
      'INTEGRATION_TEST_SKIP_CLEANUP=false',
      `INTEGRATION_TEST_FOLDER_ID=${folderId.trim()}`,
      '',
      'MAESTRO_TEST_PROCESS_KEY=',
      'ORCHESTRATOR_TEST_PROCESS_KEY=',
      'DATA_FABRIC_TEST_ENTITY_ID=',
    ].join('\n') + '\n';

    writeFileSync(ENV_FILE, envContent, 'utf-8');
    console.log('✅ Written: ' + ENV_FILE);
  }
}

main().catch((err) => { console.error('Fatal:', err); process.exit(1); });
