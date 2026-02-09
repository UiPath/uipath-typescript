#!/usr/bin/env node

/**
 * OAuth Scopes Documentation Validator
 *
 * This script validates that all SDK service methods are documented
 * in docs/oauth-scopes.md with their required OAuth scopes.
 *
 * Usage:
 *   node scripts/validate-oauth-scopes.mjs
 *
 * Exit codes:
 *   0 - All methods are documented
 *   1 - Missing documentation found
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Service directories to scan
const SERVICE_DIRS = [
  'src/services/orchestrator',
  'src/services/data-fabric',
  'src/services/maestro',
  'src/services/action-center',
];

// Methods to exclude from validation (internal/private methods)
const EXCLUDED_METHODS = new Set([
  'constructor',
  // Add any internal methods that don't need OAuth scopes documented
]);

// Map service class names to their documented names in oauth-scopes.md
const SERVICE_NAME_MAP = {
  AssetService: 'Assets',
  BucketService: 'Buckets',
  EntityService: 'Entities',
  ChoiceSetService: 'ChoiceSets',
  MaestroProcessesService: 'Maestro Processes',
  ProcessInstancesService: 'Maestro Process Instances',
  ProcessIncidentsService: 'Maestro Process Instances', // Incidents are part of process instances
  CasesService: 'Maestro Cases',
  CaseInstancesService: 'Maestro Case Instances',
  ProcessService: 'Processes',
  QueueService: 'Queues',
  TaskService: 'Tasks',
};

/**
 * Extract service methods from TypeScript files
 */
function extractServiceMethods(rootDir) {
  const methods = [];

  for (const serviceDir of SERVICE_DIRS) {
    const fullPath = path.join(rootDir, serviceDir);
    if (!fs.existsSync(fullPath)) continue;

    scanDirectory(fullPath, methods, rootDir);
  }

  return methods;
}

function scanDirectory(dir, methods, rootDir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      scanDirectory(fullPath, methods, rootDir);
    } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts') && !entry.name.endsWith('.spec.ts')) {
      extractMethodsFromFile(fullPath, methods, rootDir);
    }
  }
}

function extractMethodsFromFile(filePath, methods, rootDir) {
  const content = fs.readFileSync(filePath, 'utf-8');

  // Find service class name
  const classMatch = content.match(/export\s+class\s+(\w+Service)\s+extends/);
  if (!classMatch) return;

  const serviceName = classMatch[1];
  const documentedServiceName = SERVICE_NAME_MAP[serviceName];

  if (!documentedServiceName) {
    console.warn(`Warning: Unknown service class "${serviceName}" in ${filePath}`);
    console.warn(`  Add it to SERVICE_NAME_MAP in validate-oauth-scopes.mjs`);
    return;
  }

  // Find methods with @track decorator (indicates public API methods)
  const trackRegex = /@track\s*\(\s*['"`][\w.]+['"`]\s*\)\s*\n\s*(?:async\s+)?(\w+)\s*[<(]/g;
  let match;

  while ((match = trackRegex.exec(content)) !== null) {
    const methodName = match[1];

    if (EXCLUDED_METHODS.has(methodName)) continue;

    // Find line number
    const beforeMatch = content.substring(0, match.index);
    const lineNumber = beforeMatch.split('\n').length;

    methods.push({
      serviceName: documentedServiceName,
      methodName,
      filePath: path.relative(rootDir, filePath),
      line: lineNumber,
    });
  }
}

/**
 * Parse oauth-scopes.md to extract documented methods
 */
function parseOAuthScopesDoc(rootDir) {
  const docPath = path.join(rootDir, 'docs/oauth-scopes.md');
  const content = fs.readFileSync(docPath, 'utf-8');
  const documented = [];

  let currentSection = '';

  for (const line of content.split('\n')) {
    // Match section headers like "## Assets" or "## Maestro Processes"
    const sectionMatch = line.match(/^##\s+(.+)$/);
    if (sectionMatch) {
      currentSection = sectionMatch[1].trim();
      continue;
    }

    // Match table rows like "| `getAll()` | `OR.Assets` |"
    // Also handles aliases like "| `insertById()` / `insert()` |"
    const methodMatch = line.match(/^\|\s*`(\w+)\(\)`(?:\s*\/\s*`(\w+)\(\)`)?\s*\|/);
    if (methodMatch && currentSection) {
      // Add primary method
      documented.push({
        serviceName: currentSection,
        methodName: methodMatch[1],
      });
      // Add alias method if present
      if (methodMatch[2]) {
        documented.push({
          serviceName: currentSection,
          methodName: methodMatch[2],
        });
      }
    }
  }

  return documented;
}

/**
 * Main validation function
 */
function validate() {
  const rootDir = path.resolve(__dirname, '..');

  console.log('Validating OAuth scopes documentation...\n');

  // Extract methods from source code
  const sourceMethods = extractServiceMethods(rootDir);
  console.log(`Found ${sourceMethods.length} tracked methods in source code\n`);

  // Parse documented methods
  const documentedMethods = parseOAuthScopesDoc(rootDir);
  console.log(`Found ${documentedMethods.length} methods documented in oauth-scopes.md\n`);

  // Create a set of documented method keys for quick lookup
  const documentedSet = new Set(
    documentedMethods.map((m) => `${m.serviceName}::${m.methodName}`)
  );

  // Find undocumented methods
  const undocumented = sourceMethods.filter(
    (m) => !documentedSet.has(`${m.serviceName}::${m.methodName}`)
  );

  if (undocumented.length === 0) {
    console.log('✅ All SDK methods are documented with OAuth scopes!\n');
    return true;
  }

  console.log('❌ The following methods are missing OAuth scope documentation:\n');

  // Group by service for cleaner output
  const byService = new Map();
  for (const method of undocumented) {
    const existing = byService.get(method.serviceName) || [];
    existing.push(method);
    byService.set(method.serviceName, existing);
  }

  for (const [service, methods] of byService) {
    console.log(`## ${service}\n`);
    console.log('| Method | OAuth Scope |');
    console.log('|--------|-------------|');
    for (const m of methods) {
      console.log(`| \`${m.methodName}()\` | TODO |`);
    }
    console.log(`\nSource files:`);
    for (const m of methods) {
      console.log(`  - ${m.filePath}:${m.line}`);
    }
    console.log('');
  }

  console.log('\n📝 Please add the missing methods to docs/oauth-scopes.md');
  console.log('   with their required OAuth scopes.\n');

  return false;
}

// Run validation
const success = validate();
process.exit(success ? 0 : 1);
