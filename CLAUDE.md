# UiPath TypeScript SDK - Development Guidelines for Claude Agent

This file provides guidelines for Claude agent to perform effective PR reviews and enforce best practices for the UiPath TypeScript SDK.

**📌 Quick Navigation:**
- [Quick Reference Commands](#quick-reference-essential-commands) - Essential commands for authors and reviewers
- [PR Review Checklist](#pr-review-checklist) - Complete checklist for reviewing PRs
- [Anti-Patterns](#anti-patterns-to-avoid) - Common mistakes to avoid
- [Git Workflow](#git-workflow) - Commit messages and PR guidelines

## Project Overview

The **UiPath TypeScript SDK** is a comprehensive, type-safe library for interacting with UiPath Platform services. It provides seamless integration for both browser and Node.js applications with enterprise-grade reliability.

**Key Technologies:** TypeScript 5.3+ (strict mode) • Rollup (ESM, CJS, UMD) • Vitest • Zod • Axios • OpenTelemetry

**Build Targets:** Node.js 18.x+ • Browser (UMD) • ESM and CommonJS

**Core Mission:** The SDK abstracts API inconsistencies and provides a **unified, predictable interface** across all UiPath Platform services. Different UiPath APIs have different protocols (OData, REST), pagination styles (offset, token-based), and naming conventions. The SDK normalizes all of this for both developer-friendly and LLM-friendly usage.

## SDK Initialization & Authentication

**OAuth (Recommended):**
```typescript
const sdk = new UiPath({ baseUrl, orgName, tenantName, clientId, redirectUri, scope });
await sdk.initialize(); // REQUIRED for OAuth
```

**Secret-Based (PAT/Bearer Token):**
```typescript
const sdk = new UiPath({ baseUrl, orgName, tenantName, secret });
// Auto-initialized - NO initialize() call needed
```

**CRITICAL:** OAuth REQUIRES `await sdk.initialize()` • Secret-based auth auto-initializes • OAuth-dependent methods MUST document required scopes with `@requires` JSDoc tag • MUST request minimum necessary scopes

## Architecture Principles

### 1. Service-Based Architecture

**Pattern:**
```
BaseService (HTTP operations, pagination) → ApiClient integration
FolderScopedService extends BaseService (folder-specific operations)
```

**Rules:**
- All services MUST extend `BaseService` or `FolderScopedService`
- Services MUST NOT directly instantiate HTTP clients
- Services MUST use protected methods from base classes

### 2. Module Organization

**File Structure:**
```
src/
├── core/              # Core SDK (auth, config, context, errors, http, telemetry)
├── models/            # Data models and types
│   └── {service}/
│       ├── *.types.ts         # Public API types
│       ├── *.models.ts        # Model classes with methods
│       ├── *.constants.ts     # Constants and mappings
│       └── *.internal-types.ts # Internal types (not exported)
├── services/          # Service implementations
├── utils/             # Utility functions
└── index.ts           # Main entry point
```

**Rules:**
- MUST separate types, models, constants, and internal types into separate files
- Internal types MUST use `*.internal-types.ts` and NOT be exported publicly
- Each service MUST have its own directory under models/ and services/

### 3. Type Safety

**Rules:**
- ALWAYS use strict TypeScript mode (no implicit any)
- MUST define explicit return types for all public methods
- MUST NOT use `any` type (use `unknown` if truly unknown)
- PREFER type unions over enums when exhaustiveness checking is needed

## Code Style Guidelines

### 1. Naming Conventions

**Standardized Case Conventions (SDK Standards):**

| Element | Convention | Examples |
|---------|-----------|----------|
| **Services** | camelCase | `sdk.tasks`, `sdk.processInstances`, `sdk.entities` |
| **Methods** | camelCase | `getById()`, `create()`, `bulkDelete()` |
| **Properties** | camelCase | `taskId`, `createdTime`, `isActive` |
| **Variables** | camelCase | `taskData`, `pageSize`, `currentUser` |
| **Functions** | camelCase | `getUserById()`, `transformData()`, `validateInput()` |
| **Interfaces** | PascalCase | `TaskResponse`, `PaginationOptions`, `IUiPath` |
| **Types** | PascalCase | `TaskStatus`, `PaginatedResponse<T>`, `OperationResult` |
| **Classes** | PascalCase | `TaskService`, `ApiClient`, `TokenManager` |
| **Enums** | PascalCase | `TaskStatus`, `TaskPriority`, `PaginationType` |
| **Enum Values** | PascalCase | `TaskStatus.Pending`, `TaskPriority.High` |
| **Constants** | UPPER_SNAKE_CASE | `DEFAULT_PAGE_SIZE`, `TASK_ENDPOINTS`, `MAX_RETRIES` |
| **File Names** | kebab-case | `api-client.ts`, `token-manager.ts` |
| **Type Files** | dot-separated | `tasks.types.ts`, `tasks.models.ts`, `tasks.constants.ts` |

**Additional Rules:**
- **Private Methods**: Prefer `private` keyword over underscore prefix
- **Boolean Properties**: Prefix with `is`, `has`, or `can` (e.g., `isAuthenticated`, `hasNextPage`, `canDelete`)
- **Event Handlers**: Prefix with `on` or `handle` (e.g., `onError`, `handleResponse`)
- **Async Methods**: No special prefix needed (TypeScript types indicate Promise return)

### 2. Code Organization Within Files

**Standard Order:** Imports (grouped: Node.js → Third-party → Internal) → Types/Interfaces → Constants → Classes → Utility functions

**Within Classes:** Properties (public → protected → private) → Constructor → Public methods → Protected methods → Private methods

### 3. Import/Export Conventions

**Rules:**
- MUST use named imports/exports (avoid default exports)
- MUST use barrel exports (index.ts) for public API
- MUST NOT export internal types from barrel exports

## API Design Patterns

### 1. Service Method Naming

**Standardized Method Patterns (from SDK Standards):**

| Operation Type | Method Pattern | Example |
|----------------|----------------|---------|
| **Create** | `create()` | `sdk.jobs.create({})` |
| **Read Single** | `getById()`, `getByName()` | `sdk.entities.getByName()`, `sdk.tasks.getById()` |
| **Read Multiple** | `getAll()` | `sdk.processInstances.getAll()` |
| **Update** | `update()` | `sdk.entities.update()` |
| **Delete** | `delete()` | `sdk.jobs.delete()` |
| **Actions** | `cancel()`, `pause()`, `resume()` | `sdk.processInstances.cancel()` |
| **Bulk Operations** | `bulkCreate()`, `bulkDelete()` | `sdk.tasks.bulkDelete()` |
| **Complex Operations** | `verbNoun()` | `getExecutionHistory()`, `getSummary()` |

**Service Naming Pattern:** `sdk.<resourceName>.<methodName>()`
**Examples:** `sdk.tasks.complete()` • `sdk.processInstances.cancel()` • `sdk.entities.getByName()`

**Rules:**
- MUST follow standardized method patterns above
- MUST use descriptive, self-explanatory method names (User/LLM-friendly)
- MUST include optional `folderId` parameter for folder-scoped operations
- MUST return typed responses (not plain objects)

#### Task Service Specifics

**Form Tasks Require Folder ID:**
```typescript
// ❌ BAD - Form task without folderId (will fail)
const formTask = await sdk.tasks.getById(taskId);

// ✅ GOOD - Form task with folderId
const formTask = await sdk.tasks.getById(taskId, options, folderId);
```

**Admin Access Flag:** Use `asTaskAdmin: true` in options for elevated permissions.

#### Method Chaining Support

**Response objects include operational methods for fluent API:**
```typescript
await sdk.processInstances.getById(instanceId).cancel();
const instance = await sdk.processInstances.getById(instanceId);
await instance.pause('Maintenance').then(() => instance.resume());
```

**Rules:** Response objects SHOULD include relevant operational methods • Methods SHOULD return self or Promise for chaining

### 2. Pagination Support

**Two Pagination Types:** OFFSET (skip/top with jumpToPage, totalCount) • TOKEN (continuation tokens, efficient)

**CRITICAL CONSTRAINTS:**
- `cursor` and `jumpToPage` are **mutually exclusive** - NEVER use both together
- MUST check `supportsPageJump` before using `jumpToPage`
- OData parameters MUST be prefixed with `$` (except exclusions: `event`, `expansionLevel`, `prefix`)

**Recommended Pattern - Cursor-Based Page Object:**
```typescript
let page = await sdk.processes.getAll({ pageSize: 10 });
console.log(page.items);
if (page.hasNextPage) page = await page.nextPage();
```

**Implementation Rule:** MUST use `PaginationHelpers.getAll()` - never manual pagination
```typescript
return PaginationHelpers.getAll({
  serviceAccess: this.createPaginationServiceAccess(),
  getEndpoint: (folderId) => /* endpoint */,
  transformFn: (item) => /* transform */,
  pagination: { paginationType: PaginationType.OFFSET, itemsField, totalCountField }
}, options);
```

### 3. Response Standardization

**MUST Export:** Response models • Request models • Enums (with runtime values) • Error types • Utility types
**MUST NOT Export:** Internal types (`*.internal-types.ts`) • Transformation maps • Internal helpers

**CRITICAL - Enum Export Pattern:**
```typescript
// ✅ GOOD - Exports runtime value
export { TaskStatus } from './tasks.constants';
// ❌ BAD - Type only, no runtime access
export type { TaskStatus } from './tasks.constants';
```

### 4. Error Handling

**Error Hierarchy:** `UiPathError` (base) → `AuthenticationError` (401) • `AuthorizationError` (403) • `ValidationError` (400) • `ResourceNotFoundError` (404) • `ConflictError` (409) • `RateLimitError` (429) • `ServerError` (500+) • `NetworkError`

**Type Guards (Recommended):**
```typescript
try {
  await sdk.tasks.create(taskData, folderId);
} catch (error) {
  if (isAuthenticationError(error)) { /* handle auth */ }
  else if (isValidationError(error)) { /* handle validation */ }
  else if (isRateLimitError(error)) { /* retry with backoff */ }
}
```

**Available Guards:** `isAuthenticationError` • `isAuthorizationError` • `isValidationError` • `isNotFoundError` • `isConflictError` • `isRateLimitError` • `isServerError` • `isNetworkError`

**Rules:** MUST use specific error types • PREFER type guards over instanceof • MUST include requestId for tracing • Use `error.getDebugInfo()` for debugging • MUST NOT expose sensitive info

### 5. Debuggability

**Debug Mode:** Enable with `debug: true` in SDK config
```typescript
const sdk = new UiPath({ baseUrl, orgName, tenantName, secret, debug: true });
```

**Logs:** HTTP requests/responses • Auth flows • Pagination • Transformations • Error context

**Custom Logger:** Integrate with Winston/Bunyan/Pino
```typescript
const sdk = new UiPath({ ..., debug: true, logger: customLogger });
// Logger interface: { debug, info, warn, error }
```

**Rules:** MUST support debug flag • MUST accept custom Logger • MUST include requestId in errors • MUST NOT log sensitive data (tokens, secrets) even in debug mode

### 6. Operation Response Pattern

```typescript
interface OperationResponse<T> {
  success: boolean;
  data: T;
}
```

**Rules:** Use for operations that can partially fail. Success = true when no errors, false when failed/partial failure.

#### 6.1 OData Batch Operation Pattern

Many OData APIs return **empty arrays for success**, **error arrays for failures**:

```typescript
// Transform and use processODataArrayResponse
const transformedResponse = pascalToCamelCaseKeys(response.data);
return processODataArrayResponse(transformedResponse, inputArray);

// Empty response.value → { success: true, data: originalInputArray }
// Non-empty response.value → { success: false, data: errorDetailsArray }
```

### 7. Transformation Pattern

**Three-Step Pipeline (MUST be in this order):**
1. **Case Conversion:** `pascalToCamelCaseKeys()` - PascalCase → camelCase
2. **Field Mapping:** `transformData(data, fieldMap)` - Rename fields (e.g., `completionTime → completedTime`)
3. **Value Mapping:** `applyDataTransforms(data, { field, valueMap })` - Convert to enums (e.g., `0 → TaskStatus.Unassigned`)

```typescript
const response = await this.get<TaskResponse>(endpoint);
const camelCased = pascalToCamelCaseKeys(response.data);
const normalized = transformData(camelCased, TaskMap);
const final = applyDataTransforms(normalized, { field: 'status', valueMap: TaskStatusMap });
return createTaskWithMethods(final, this);
```

## Testing Guidelines

### 1. Test Structure

**Pattern:** Organize with sections (IMPORTS → MOCKING → TEST SUITE) • Use Arrange-Act-Assert • Test success and error cases

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
vi.mock('path/to/api-client');

describe('ServiceClass', () => {
  beforeEach(() => { /* setup */ });
  afterEach(() => { vi.clearAllMocks(); });

  it('should handle success case', async () => {
    // Arrange → Act → Assert
    expect(mockApiClient.method).toHaveBeenCalledWith(/*...*/);
  });
});
```

### 2. Test Coverage

**Requirements:** 80% minimum for new code • 100% for critical paths (auth, API calls) • Test all public methods, error paths, edge cases

**Exclusions:** `node_modules/`, `tests/`, `dist/`, `samples/**`, `packages/cli/**`, `docs/**`, `**/*.d.ts`, `**/*.config.*`, `**/index.ts`

## Documentation Requirements

### 1. JSDoc Comments

**Rules:** MUST document all public methods, classes, interfaces • MUST include `@param`, `@returns`, `@example` • SHOULD include `@throws` • Update README.md and CHANGELOG.md

## Special Patterns in This Codebase

### 1. Telemetry Tracking

```typescript
import { track } from '../../core/telemetry';

@track('Tasks.Create')
async create(task: TaskCreateOptions, folderId: number): Promise<TaskCreateResponse> {
  // Method automatically tracked
}
```

### 2. Folder-Scoped Operations

**Via Headers:** `createHeaders({ [FOLDER_ID]: folderId })`
**FolderScopedService:** Use when service ALWAYS requires folderId (Assets, Queues)
**Required:** First parameter, validate • **Optional:** In options object

### 3. Model with Methods Pattern

```typescript
function createTaskWithMethods(taskData, service) {
  return Object.assign(taskData, {
    assign: (opts) => service.assign({ taskId: taskData.id, ...opts })
  });
}
// Usage: const task = await sdk.tasks.getById(123); await task.assign({ userId: 456 });
```

## Anti-Patterns to Avoid

❌ **Don't bypass BaseService** → See [Service-Based Architecture](#1-service-based-architecture)
❌ **Don't use `any` type** → See [Type Safety](#3-type-safety)
❌ **Don't skip transformations** → See [Transformation Pattern](#7-transformation-pattern)
❌ **Don't implement pagination manually** → See [Pagination Support](#2-pagination-support)
❌ **Don't ignore errors** → See [Error Handling](#4-error-handling)
❌ **Don't export internal types** → See [Response Standardization](#3-response-standardization)
❌ **Don't forget OData prefixes** → See [Pagination Support](#2-pagination-support)
❌ **Don't skip validation** → See [Error Handling](#4-error-handling)
❌ **Don't leave unused code** → Linter catches unused imports/variables/constructors
❌ **Don't commit secrets** → See [Security Best Practices](#1-security-best-practices)

## Code Quality Standards

### 1. Security Best Practices

**CRITICAL - Files That Must NEVER Be Committed:**
- `.env`, `.env.local`, `.env.*.local` - Environment variables with secrets
- `credentials.json`, `secrets.json` - Credential files
- `*.key`, `*.pem`, `*.p12` - Private keys and certificates
- `config.local.js`, `config.secret.js` - Local configuration with secrets
- `.aws/credentials` - AWS credentials
- Any file containing API keys, tokens, passwords, or connection strings

**Rules:**
- MUST NOT commit secrets, tokens, or credentials
- MUST validate and sanitize all user input
- MUST NOT log sensitive information
- MUST use HTTPS for all external requests
- MUST handle authentication errors properly (don't expose details)

**If .env or credentials files are accidentally staged:**
- Unstage them immediately
- If already committed, contact team lead immediately
- Never force push to main/master without team approval
- May require using git-filter-branch or BFG Repo-Cleaner (consult team lead)

**Proper Pattern:**
```typescript
// ✅ GOOD - Use environment variables
const apiKey = process.env.UIPATH_API_KEY;

// ❌ BAD - Hardcoded secrets
const apiKey = "sk_live_abcdef123456";  // NEVER
```

### 2. Performance & Compatibility

**Performance:** Use pagination for large datasets • Don't load entire collections • Cache tokens • Avoid unnecessary API calls

**Backwards Compatibility:** Maintain compatibility in public APIs • Use `@deprecated` JSDoc • Provide migration paths • Don't remove public methods without deprecation

## Git Workflow

### 0. Jira Ticket Requirements

**CRITICAL - Every PR MUST have a Jira ticket:**
- Include in PR title: `feat: add feature name [PLT-12345]`
- Link in PR body: `Jira Ticket: [PLT-12345](https://uipath.atlassian.net/browse/PLT-12345)`
- Use "Associated Jira Ticket- PLT-12345" format for CLI PRs

**If no ticket exists:**
- Request ticket creation before submitting PR
- For urgent fixes, get approval from team lead

### 1. Commit Messages

**Format:**
```
<type>(<scope>): <subject>

<body>

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

**Types:** `feat` • `fix` • `docs` • `refactor` • `test` • `chore`

**Pre-Commit:** Verify no secrets committed (see [Security Best Practices](#1-security-best-practices))

### 2. Pull Request Guidelines

**PR Title Format:**
- Include Jira ticket: `feat: add feature name [PLT-12345]`
- Use conventional commit type: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`

**PR Description MUST Include:**

```markdown
## Summary
[Brief description of what and why]

## Changes
- Bullet point 1
- Bullet point 2
- For complex changes, use subsections

## Tests
- All XXX unit tests pass
- Added X new test cases covering [scenarios]
- [Include screenshot of test results for significant changes]

## Usage (if applicable)
```typescript
// Code example showing how to use the new feature
```

## Is this a breaking change?
[Yes/No - If yes, explain impact and migration path]

## Related
- Jira Ticket: [PLT-XXXXX](https://uipath.atlassian.net/browse/PLT-XXXXX)
- [Any other related PRs or issues]

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

**Before Submitting:**
- [ ] **No secrets committed** (see [Security](#1-security-best-practices))
- [ ] **Jira ticket linked** in PR title and description
- [ ] All tests pass - Report exact count (e.g., "341/341 tests pass")
- [ ] Build succeeds with 0 errors/warnings
- [ ] Linting passes (0 warnings, 0 errors)
- [ ] No unused variables/imports, no redundant constructors
- [ ] New code has tests (80%+ coverage)
- [ ] Documentation updated (JSDoc, README, CHANGELOG.md)
- [ ] Breaking changes labeled and documented
- [ ] Commit messages follow convention

### 3. If Secrets Accidentally Committed

**Immediate:** DO NOT merge • Contact team lead • Remove and re-commit • Rotate exposed secrets immediately
**→ See [Security Best Practices](#1-security-best-practices) for detailed recovery steps**

## Quick Reference: Essential Commands

```bash
# Tests & Build (Required before PR)
npm test                    # All tests
npm run test:coverage       # Coverage report
npm run build               # Build project (must succeed)

# PR Review (using GitHub CLI)
gh pr view <number>         # View PR
gh pr diff <number>         # View diff
gh pr checks <number>       # CI status

# Development
npm run test:watch          # Watch mode
npm run build:watch         # Build watch

# Troubleshooting
node --version              # Check Node 18.x+
npx oxlint                  # Linting (if configured)
npx tsc --noEmit            # Type check
```

---

## PR Review Checklist

**→ See linked sections for complete rules**

- [ ] **Security** - No secrets committed → [Security](#1-security-best-practices)
- [ ] **Code Quality** - Naming, no `any`, type guards, no unused code → [Code Style](#code-style-guidelines) | [Error Handling](#4-error-handling)
- [ ] **Architecture** - Extends BaseService, models separated → [Architecture](#architecture-principles)
- [ ] **Authentication** - OAuth: `initialize()`, Secret: auto-init → [SDK Init](#sdk-initialization--authentication)
- [ ] **API Design** - Method naming, pagination, enums → [API Design](#api-design-patterns)
- [ ] **Response Standardization** - Models exported, internals NOT → [Response Std](#3-response-standardization)
- [ ] **Transformations** - case → field → value → [Transformations](#7-transformation-pattern)
- [ ] **Pagination** - `PaginationHelpers`, never cursor+jumpToPage → [Pagination](#2-pagination-support)
- [ ] **Error Handling** - Type guards, requestId → [Errors](#4-error-handling)
- [ ] **Testing** - 80%+ coverage, count in PR → [Testing](#testing-guidelines)
- [ ] **Documentation** - JSDoc, README, CHANGELOG → [Docs](#documentation-requirements)
- [ ] **Breaking Changes** - Stated with migration, labeled
- [ ] **Debuggability** - Debug flag, logger → [Debug](#5-debuggability)
- [ ] **Cross-Platform** - Browser + Node.js

## Questions to Ask During PR Review

**Critical:** Security? Jira ticket? Tests pass with count? Breaking changes documented? Linting clean?

**Code Quality:** Architecture? Type safety? Naming? Auth? Transformations? Pagination? Errors? Response std? Testing? Docs? Code cleanup?

**→ See [PR Review Checklist](#pr-review-checklist) for complete list with links**

---

**Remember**: This SDK is used by developers worldwide and by LLMs for AI-assisted development. Every API should be **intuitive**, **well-documented**, **type-safe**, and **maintainable**. Consistency is more valuable than cleverness.

**When in doubt:** Look at existing implementations (Tasks, Entities, Buckets) and follow their patterns exactly.
