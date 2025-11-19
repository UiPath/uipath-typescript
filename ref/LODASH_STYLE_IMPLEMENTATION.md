# Lodash-Style Implementation for UiPath SDK

## Current State Analysis

You already have well-structured services that export cleanly:
- `ProcessService` in `src/services/orchestrator/processes.ts`
- `TaskService` in `src/services/action-center/tasks.ts`  
- `EntityService` in `src/services/data-fabric/entities.ts`
- etc.

## What Would Need to Change (Minimal)

### Option 1: Individual Service Entry Points

To enable imports like:
```typescript
import { ProcessService } from '@uipath/uipath-typescript/processes';
import { TaskService } from '@uipath/uipath-typescript/tasks';
import { EntityService } from '@uipath/uipath-typescript/entities';
```

#### Changes Required:

**1. Add Individual Entry Point Files (in `src/` root):**

```typescript
// src/processes.ts
export { ProcessService } from './services/orchestrator/processes';
export type * from './models/orchestrator/processes.types';
export type * from './models/orchestrator/processes.models';

// src/tasks.ts  
export { TaskService } from './services/action-center/tasks';
export type * from './models/action-center/tasks.types';
export type * from './models/action-center/tasks.models';

// src/entities.ts
export { EntityService } from './services/data-fabric/entities';
export type * from './models/data-fabric/entities.types';
export type * from './models/data-fabric/entities.models';

// src/assets.ts
export { AssetService } from './services/orchestrator/assets';
export type * from './models/orchestrator/assets.types';
export type * from './models/orchestrator/assets.models';

// src/queues.ts
export { QueueService } from './services/orchestrator/queues';
export type * from './models/orchestrator/queues.types';
export type * from './models/orchestrator/queues.models';

// src/buckets.ts
export { BucketService } from './services/orchestrator/buckets';
export type * from './models/orchestrator/buckets.types';
export type * from './models/orchestrator/buckets.models';

// src/cases.ts
export { CasesService } from './services/maestro/cases';
export type * from './models/maestro/cases.types';
export type * from './models/maestro/cases.models';

// src/case-instances.ts
export { CaseInstancesService } from './services/maestro/case-instances';
export type * from './models/maestro/case-instances.types';
export type * from './models/maestro/case-instances.models';

// src/process-instances.ts  
export { ProcessInstancesService } from './services/maestro/process-instances';
export type * from './models/maestro/process-instances.types';
export type * from './models/maestro/process-instances.models';

// src/core.ts (for auth, config, errors)
export * from './core/auth';
export * from './core/config'; 
export * from './core/errors';
export * from './core/telemetry';
```

**2. Update Rollup Config to Build Multiple Entry Points:**

```javascript
// rollup.config.js (updated)
const entryPoints = [
  'src/index.ts',       // Main entry
  'src/processes.ts',   // Individual services
  'src/tasks.ts',
  'src/entities.ts',
  'src/assets.ts',
  'src/queues.ts',
  'src/buckets.ts',
  'src/cases.ts',
  'src/case-instances.ts',
  'src/process-instances.ts',
  'src/core.ts'
];

const configs = entryPoints.flatMap(input => {
  const name = path.basename(input, '.ts');
  return [
    // ESM build
    {
      input,
      output: {
        file: `dist/${name}.mjs`,
        format: 'es',
        inlineDynamicImports: true
      },
      plugins: createPlugins(false),
      external: allDependencies
    },
    // CJS build  
    {
      input,
      output: {
        file: `dist/${name}.cjs`,
        format: 'cjs',
        exports: 'named',
        inlineDynamicImports: true
      },
      plugins: createPlugins(false),
      external: allDependencies
    },
    // Type definitions
    {
      input,
      output: {
        file: `dist/${name}.d.ts`,
        format: 'es'
      },
      plugins: [dts()]
    }
  ];
});

export default configs;
```

**3. Update package.json exports:**

```json
{
  "name": "@uipath/uipath-typescript",
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs",
      "types": "./dist/index.d.ts"
    },
    "./processes": {
      "import": "./dist/processes.mjs",
      "require": "./dist/processes.cjs", 
      "types": "./dist/processes.d.ts"
    },
    "./tasks": {
      "import": "./dist/tasks.mjs",
      "require": "./dist/tasks.cjs",
      "types": "./dist/tasks.d.ts"
    },
    "./entities": {
      "import": "./dist/entities.mjs",
      "require": "./dist/entities.cjs",
      "types": "./dist/entities.d.ts"
    },
    "./assets": {
      "import": "./dist/assets.mjs",
      "require": "./dist/assets.cjs",
      "types": "./dist/assets.d.ts"
    },
    "./queues": {
      "import": "./dist/queues.mjs", 
      "require": "./dist/queues.cjs",
      "types": "./dist/queues.d.ts"
    },
    "./buckets": {
      "import": "./dist/buckets.mjs",
      "require": "./dist/buckets.cjs", 
      "types": "./dist/buckets.d.ts"
    },
    "./cases": {
      "import": "./dist/cases.mjs",
      "require": "./dist/cases.cjs",
      "types": "./dist/cases.d.ts"
    },
    "./case-instances": {
      "import": "./dist/case-instances.mjs",
      "require": "./dist/case-instances.cjs",
      "types": "./dist/case-instances.d.ts"
    },
    "./process-instances": {
      "import": "./dist/process-instances.mjs",
      "require": "./dist/process-instances.cjs",
      "types": "./dist/process-instances.d.ts"
    },
    "./core": {
      "import": "./dist/core.mjs",
      "require": "./dist/core.cjs",
      "types": "./dist/core.d.ts"
    }
  }
}
```

## Usage Examples

### Before (Current):
```typescript
import { UiPath } from '@uipath/uipath-typescript';

const client = new UiPath(config);
const processes = await client.processes.list();
const tasks = await client.tasks.list(); 
```

### After (Modular):
```typescript
import { ProcessService } from '@uipath/uipath-typescript/processes';
import { TaskService } from '@uipath/uipath-typescript/tasks';
import { createConfig, authenticate } from '@uipath/uipath-typescript/core';

const config = createConfig({
  baseUrl: 'https://cloud.uipath.com',
  orgName: 'myorg',
  tenantName: 'mytenant'
});

await authenticate(config, { secret: 'your-secret' });

const processService = new ProcessService(config);
const taskService = new TaskService(config);

const processes = await processService.list();
const tasks = await taskService.list();
```

## Alternative: Category-Based Grouping

If you want fewer entry points, you could group by service domain:

```typescript
// src/orchestrator.ts
export { ProcessService } from './services/orchestrator/processes';
export { AssetService } from './services/orchestrator/assets';
export { QueueService } from './services/orchestrator/queues'; 
export { BucketService } from './services/orchestrator/buckets';
export type * from './models/orchestrator';

// src/maestro.ts  
export { CasesService } from './services/maestro/cases';
export { CaseInstancesService } from './services/maestro/case-instances';
export { ProcessInstancesService } from './services/maestro/process-instances';
export type * from './models/maestro';

// src/data-fabric.ts
export { EntityService } from './services/data-fabric/entities';
export type * from './models/data-fabric';

// src/action-center.ts
export { TaskService } from './services/action-center/tasks';
export type * from './models/action-center';
```

Usage:
```typescript
import { ProcessService, AssetService } from '@uipath/uipath-typescript/orchestrator';
import { CasesService } from '@uipath/uipath-typescript/maestro';
import { EntityService } from '@uipath/uipath-typescript/data-fabric';
import { TaskService } from '@uipath/uipath-typescript/action-center';
```

## Benefits You'd Get

### 1. Tree Shaking
```typescript
// This would only include ProcessService + its dependencies
import { ProcessService } from '@uipath/uipath-typescript/processes';

// Instead of the entire SDK
```

### 2. Clearer Dependencies
```typescript
// Crystal clear what services you're using
import { ProcessService } from '@uipath/uipath-typescript/processes';
import { TaskService } from '@uipath/uipath-typescript/tasks';
```

### 3. Faster Build Times
- Bundlers can process smaller chunks
- Only rebuild affected entry points

## Challenges You'd Face

### 1. Shared Authentication
Each service needs auth context:
```typescript
// You'd need a way to share auth across services
const config = createConfig({...});
await authenticate(config, {...}); // Sets up auth globally

const processService = new ProcessService(config); // Uses shared auth
const taskService = new TaskService(config);       // Uses shared auth
```

### 2. Backward Compatibility
You'd need to maintain the existing `UiPath` class:
```typescript
// src/index.ts (updated)
export { UiPath } from './uipath'; // Keep existing API

// Also export individual services for those who want them
export { ProcessService } from './processes';
export { TaskService } from './tasks';
// etc.
```

## Recommendation

Given your current structure, I'd recommend **Option 1: Individual Service Entry Points** because:

1. **Minimal Changes**: Your services are already well-separated
2. **Modern Approach**: Uses package.json `exports` field (better than Lodash's approach)
3. **Granular Tree Shaking**: Each service can be imported independently
4. **TypeScript Support**: Full type safety for each entry point

You could implement this incrementally:
1. Start with one entry point (e.g., `processes.ts`)
2. Update build config
3. Add remaining entry points
4. Update documentation

The core insight is: **You don't need complex code generation like Lodash**. Your services are already modular, you just need additional entry points and build configuration.