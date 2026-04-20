# Architecture & Project Structure

## Repo layout

```
src/
  core/                  # UiPath client, auth, config, errors, HTTP client, telemetry
  services/              # Service implementations grouped by platform area
    action-center/       # Tasks
    conversational-agent/# Conversations
    data-fabric/         # Entities, ChoiceSets
    maestro/             # Processes, ProcessInstances, ProcessIncidents, Cases, CaseInstances
    orchestrator/        # Assets, Buckets, Processes, Queues
  models/                # TypeScript interfaces/types per service domain
  utils/                 # Constants, pagination, encoding, HTTP helpers
    constants/
      endpoints/         # Endpoint constants per domain (data-fabric.ts, maestro.ts, etc.)
tests/
  unit/                  # Mirrors src/ structure
  integration/           # Integration tests (real API calls)
  utils/                 # Shared mocks, constants, test setup helpers
samples/                 # Sample apps (process-app, conversational-agent-app, etc.)
docs/                    # MkDocs source; API docs generated via typedoc
```

## Architecture

- **BaseService** (`src/services/base.ts`) — all services extend this. Provides authenticated HTTP methods via ApiClient.
- **SDKInternalsRegistry** (`src/core/internals/registry.ts`) — WeakMap storing private config/context/tokenManager per UiPath instance. Services access internals through this registry, not public API.
- **Modular imports** — each service is a separate subpath export (`@uipath/uipath-typescript/entities`, `/tasks`, `/processes`, etc.). Services take a `UiPath` instance via constructor DI.
- **Two auth modes** — OAuth (requires `sdk.initialize()`, for frontend applications) and secret-based (auto-initializes for backend services). See `src/core/index.ts:1-44` for examples.
- **Pagination** — PaginationManager supports offset-based and token-based pagination, abstracted to a cursor-based interface. See `src/utils/pagination/`.
- **Errors** — typed hierarchy under `UiPathError`. ErrorFactory maps HTTP status codes to specific types (AuthenticationError, NotFoundError, etc.). See `src/core/errors/`. Type guard functions in `src/core/errors/guards.ts` (`isAuthenticationError()`, `isValidationError()`, `isNotFoundError()`, `isRateLimitError()`, `isServerError()`, `isNetworkError()`). All `UiPathError` instances expose `getDebugInfo()` for diagnostics.

**Subpath imports:**

| Import path | Services |
|-------------|----------|
| `@uipath/uipath-typescript/entities` | Entities, ChoiceSets |
| `@uipath/uipath-typescript/tasks` | Tasks |
| `@uipath/uipath-typescript/assets` | Assets |
| `@uipath/uipath-typescript/queues` | Queues |
| `@uipath/uipath-typescript/buckets` | Buckets |
| `@uipath/uipath-typescript/processes` | Processes |
| `@uipath/uipath-typescript/cases` | Cases, CaseInstances |
| `@uipath/uipath-typescript/maestro-processes` | MaestroProcesses, ProcessInstances, ProcessIncidents |
| `@uipath/uipath-typescript/conversational-agent` | ConversationalAgent, Exchanges, Messages |

## Key source files

| Pattern | File |
|---------|------|
| BaseService | `src/services/base.ts` |
| Transform functions | `src/utils/transform.ts` |
| Pagination helpers & types | `src/utils/pagination/helpers.ts`, `src/utils/pagination/types.ts`, `src/utils/pagination/internal-types.ts` |
| Pagination manager | `src/utils/pagination/pagination-manager.ts` |
| Pagination & OData constants | `src/utils/constants/common.ts` |
| Endpoint constants | `src/utils/constants/endpoints/` |
| Headers utility | `src/utils/http/headers.ts` |
| Common types | `src/models/common/types.ts` |
| OData response utility | `src/utils/object.ts` |
| Error types | `src/core/errors/` |
| SDK internals | `src/core/internals/` |

## Build details

- **Rollup** builds ESM (`.mjs`), CJS (`.cjs`), UMD (`.umd.js`), and `.d.ts` per module.
- Config: `rollup.config.js`. Custom `rewriteDtsImports` plugin normalizes core imports.
- TypeScript target: ES2020, strict mode, `experimentalDecorators: true`.
- Node.js requirement: 20.x or higher.
