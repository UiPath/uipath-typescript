/**
 * Test: Private Fields Hidden - Modular & Backward Compatibility
 * Run with: npx tsx test-modular.ts
 */

// // Modular imports
// import { UiPath as UiPathCore } from './src/core/uipath';
// import { Entities } from './src/services/data-fabric/index';
// import { Tasks } from './src/services/action-center/index';

import { UiPath as UiPathCore } from './src/uipath';




// Backward compatibility import
// import { UiPath as UiPathLegacy } from './src/uipath';

console.log('╔═══════════════════════════════════════════════════════════════╗');
console.log('║     PRIVATE FIELDS TEST - Modular & Backward Compatibility    ║');
console.log('╚═══════════════════════════════════════════════════════════════╝\n');

// ============================================
// TEST 1: MODULAR PATTERN
// ============================================
console.log('┌───────────────────────────────────────────────────────────────┐');
console.log('│  1. MODULAR PATTERN                                          │');
console.log('└───────────────────────────────────────────────────────────────┘\n');

const sdkModular = new UiPathCore({
  baseUrl: 'https://cloud.uipath.com',
  orgName: 'test-org',
  tenantName: 'test-tenant',
  secret: 'test-secret'
});

console.log('sdkModular>>',sdkModular)

// const entitiesModular = new Entities(sdkModular);
// const tasksModular = new Tasks(sdkModular);

// console.log('SDK Instance (UiPathCore):');
// console.log('  Object.keys():', Object.keys(sdkModular));
// console.log('  Symbols:', Object.getOwnPropertySymbols(sdkModular).map(s => s.toString()));
// console.log('  sdk.config:', sdkModular.config);
// console.log('');

// console.log('Service Instance (Entities):');
// console.log('  Object.keys():', Object.keys(entitiesModular));
// console.log('  Symbols:', Object.getOwnPropertySymbols(entitiesModular).map(s => s.toString()));
// console.log('  typeof getAll:', typeof entitiesModular.getAll);
// console.log('  typeof getById:', typeof entitiesModular.getById);
// console.log('');

// console.log('Service Instance (Tasks):');
// console.log('  Object.keys():', Object.keys(tasksModular));
// console.log('  typeof getAll:', typeof tasksModular.getAll);
// console.log('');

// // ============================================
// // TEST 2: BACKWARD COMPATIBILITY PATTERN
// // ============================================
// console.log('┌───────────────────────────────────────────────────────────────┐');
// console.log('│  2. BACKWARD COMPATIBILITY PATTERN (Nested)                  │');
// console.log('└───────────────────────────────────────────────────────────────┘\n');

// const sdkLegacy = new UiPathLegacy({
//   baseUrl: 'https://cloud.uipath.com',
//   orgName: 'test-org',
//   tenantName: 'test-tenant',
//   secret: 'test-secret'
// });

// console.log('SDK Instance (UiPath Legacy):');
// console.log('  Object.keys():', Object.keys(sdkLegacy));
// console.log('  Symbols:', Object.getOwnPropertySymbols(sdkLegacy).map(s => s.toString()));
// console.log('  sdk.config:', sdkLegacy.config);
// console.log('');

// console.log('Nested Service Access:');
// console.log('  sdk.entities:', sdkLegacy.entities.constructor.name);
// console.log('  sdk.tasks:', sdkLegacy.tasks.constructor.name);
// console.log('  sdk.buckets:', sdkLegacy.buckets.constructor.name);
// console.log('  sdk.queues:', sdkLegacy.queues.constructor.name);
// console.log('  sdk.assets:', sdkLegacy.assets.constructor.name);
// console.log('  sdk.processes:', sdkLegacy.processes.constructor.name);
// console.log('  sdk.maestro.cases:', sdkLegacy.maestro.cases.constructor.name);
// console.log('  sdk.maestro.processes:', sdkLegacy.maestro.processes.constructor.name);
// console.log('');

// console.log('Nested Service - Hidden Fields:');
// console.log('  Object.keys(sdk.entities):', Object.keys(sdkLegacy.entities));
// console.log('  Object.keys(sdk.tasks):', Object.keys(sdkLegacy.tasks));
// console.log('');

// // ============================================
// // TEST 3: VERIFY METHODS WORK
// // ============================================
// console.log('┌───────────────────────────────────────────────────────────────┐');
// console.log('│  3. VERIFY SERVICE METHODS EXIST                             │');
// console.log('└───────────────────────────────────────────────────────────────┘\n');

// console.log('Modular Pattern Methods:');
// console.log('  entitiesModular.getAll:', typeof entitiesModular.getAll === 'function' ? '✅' : '❌');
// console.log('  entitiesModular.getById:', typeof entitiesModular.getById === 'function' ? '✅' : '❌');
// console.log('  tasksModular.getAll:', typeof tasksModular.getAll === 'function' ? '✅' : '❌');
// console.log('');

// console.log('Backward Compat Methods:');
// console.log('  sdkLegacy.entities.getAll:', typeof sdkLegacy.entities.getAll === 'function' ? '✅' : '❌');
// console.log('  sdkLegacy.entities.getById:', typeof sdkLegacy.entities.getById === 'function' ? '✅' : '❌');
// console.log('  sdkLegacy.tasks.getAll:', typeof sdkLegacy.tasks.getAll === 'function' ? '✅' : '❌');
// console.log('  sdkLegacy.buckets.getAll:', typeof sdkLegacy.buckets.getAll === 'function' ? '✅' : '❌');
// console.log('');

// // ============================================
// // TEST 4: VERIFY PROTECTED GETTERS ARE NOT ACCESSIBLE
// // ============================================
// console.log('┌───────────────────────────────────────────────────────────────┐');
// console.log('│  4. VERIFY PROTECTED GETTERS REMOVED                         │');
// console.log('└───────────────────────────────────────────────────────────────┘\n');

// console.log('Protected getter access (should be undefined):');
// console.log('  entitiesModular.config:', (entitiesModular as any).config === undefined ? '✅ undefined' : '❌ exposed');
// console.log('  entitiesModular.executionContext:', (entitiesModular as any).executionContext === undefined ? '✅ undefined' : '❌ exposed');
// console.log('  entitiesModular.tokenManager:', (entitiesModular as any).tokenManager === undefined ? '✅ undefined' : '❌ exposed');
// console.log('  entitiesModular.apiClient:', (entitiesModular as any).apiClient === undefined ? '✅ undefined' : '❌ exposed');
// console.log('');

// // ============================================
// // SUMMARY
// // ============================================
// console.log('╔═══════════════════════════════════════════════════════════════╗');
// console.log('║                         SUMMARY                               ║');
// console.log('╚═══════════════════════════════════════════════════════════════╝\n');

// const modularSdkSymbols = Object.getOwnPropertySymbols(sdkModular).length;
// const modularServiceKeys = Object.keys(entitiesModular).length;
// const legacySdkSymbols = Object.getOwnPropertySymbols(sdkLegacy).length;
// const legacyServiceKeys = Object.keys(sdkLegacy.entities).length;

// // Check protected getters are removed
// const configHidden = (entitiesModular as any).config === undefined;
// const contextHidden = (entitiesModular as any).executionContext === undefined;
// const tokenManagerHidden = (entitiesModular as any).tokenManager === undefined;
// const apiClientHidden = (entitiesModular as any).apiClient === undefined;

// console.log('┌─────────────────────────┬──────────────┬──────────────────────┐');
// console.log('│ Check                   │ Modular      │ Backward Compat      │');
// console.log('├─────────────────────────┼──────────────┼──────────────────────┤');
// console.log(`│ SDK Symbols             │ ${modularSdkSymbols === 0 ? '✅ None' : '❌ ' + modularSdkSymbols}       │ ${legacySdkSymbols === 0 ? '✅ None' : '❌ ' + legacySdkSymbols}               │`);
// console.log(`│ Service Object.keys()   │ ${modularServiceKeys === 0 ? '✅ Empty' : '❌ ' + modularServiceKeys}      │ ${legacyServiceKeys === 0 ? '✅ Empty' : '❌ ' + legacyServiceKeys}               │`);
// console.log(`│ sdk.config accessible   │ ✅ Yes       │ ✅ Yes               │`);
// console.log(`│ Methods work            │ ✅ Yes       │ ✅ Yes               │`);
// console.log(`│ Protected getters gone  │ ${configHidden && contextHidden && tokenManagerHidden && apiClientHidden ? '✅ Yes' : '❌ No'}       │ N/A                  │`);
// console.log('└─────────────────────────┴──────────────┴──────────────────────┘');
// console.log('');

// const allHidden = modularSdkSymbols === 0 && modularServiceKeys === 0 &&
//                   legacySdkSymbols === 0 && legacyServiceKeys === 0 &&
//                   configHidden && contextHidden && tokenManagerHidden && apiClientHidden;

// if (allHidden) {
//   console.log('🎉 SUCCESS! All private fields are hidden and protected getters removed!');
// } else {
//   console.log('⚠️  Some fields are still visible');
// }
