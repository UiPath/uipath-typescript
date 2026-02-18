# UiPath TypeScript SDK - PR Review Guidelines

This document provides comprehensive guidelines for reviewing pull requests and understanding the SDK's architecture.

**📌 Quick Navigation:**
- [PR Review Checklist](#pr-review-checklist) - Complete checklist for reviewing PRs
- [Architecture Principles](#architecture-principles) - Deep dive into SDK design
- [Pagination System](#pagination-system) - Understanding the pagination abstraction
- [Git Workflow](#git-workflow) - Commit messages and PR guidelines

---

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
- **NEVER add a constructor that only calls `super()` - it's redundant and will fail linting**

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

---

## SDK Initialization & Authentication

### Authentication Methods

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

**CRITICAL:** Secret-based auth auto-initializes; OAuth REQUIRES explicit `await sdk.initialize()`.

### OAuth Lifecycle Methods

- `await sdk.initialize()` - Start OAuth flow (REQUIRED for OAuth)
- `sdk.isInitialized()` - Check SDK initialization status
- `sdk.isAuthenticated()` - Check token validity
- `sdk.isInOAuthCallback()` - Detect OAuth redirect processing
- `sdk.completeOAuth()` - Manual OAuth completion (advanced)

### OAuth Scope Best Practice

**Rules:**
- MUST request minimum necessary scopes (principle of least privilege)
- Use granular scopes when available (e.g., `OR.Tasks.Read` vs `OR.Tasks`)
- SHOULD document required scopes in JSDoc using `@requires` tag

```typescript
/**
 * Gets all assets from the specified folder
 * @requires OR.Assets or OR.Assets.Read OAuth scope
 */
async getAll(options?: AssetGetAllOptions) { }
```

---

## Pagination System

The SDK implements **intelligent, unified pagination** that abstracts API differences.

### Two Pagination Types

```typescript
enum PaginationType {
  OFFSET = 'offset',  // Skip/top (supports jumpToPage, provides totalCount)
  TOKEN = 'token'     // Continuation tokens (next/previous only, more efficient)
}
```

**OFFSET**: OData APIs (Tasks, Assets, Queues). Parameters: `$skip`, `$top`, `$count`
**TOKEN**: Buckets, some Maestro endpoints. Parameters: `continuationToken`, `limit`

### User-Facing API

**Method Signature:**
```typescript
async getAll<T extends Options>(options?: T): Promise<
  T extends HasPaginationOptions<T>
    ? PaginatedResponse<Item>      // When pagination params provided
    : NonPaginatedResponse<Item>    // When no pagination params
>
```

**Options:**
```typescript
interface PaginationOptions { pageSize?, cursor?, jumpToPage? }
```

**⚠️ CRITICAL CONSTRAINT:** `cursor` and `jumpToPage` are **mutually exclusive** - use one OR the other, NEVER both.

```typescript
// ❌ BAD - Using both (will error)
await sdk.tasks.getAll({ cursor: someCursor, jumpToPage: 5 });

// ✅ GOOD - Use one or the other
await sdk.tasks.getAll({ cursor: someCursor });
await sdk.tasks.getAll({ jumpToPage: 5 });
```

**Return Types:**
```typescript
// NonPaginatedResponse (no pagination)
{ items: T[]; totalCount?: number }

// PaginatedResponse (with pagination)
{ items: T[]; hasNextPage; hasPreviousPage; nextCursor?; previousCursor?; totalCount?; currentPage?; totalPages?; supportsPageJump }
```

### Usage Patterns

```typescript
// All items (non-paginated)
const all = await sdk.tasks.getAll();

// First page
const page1 = await sdk.tasks.getAll({ pageSize: 10 });

// Navigate sequentially with cursor
const page2 = await sdk.tasks.getAll({ cursor: page1.nextCursor });

// Check capability before jumping to specific page
if (page1.supportsPageJump) {
  const page5 = await sdk.tasks.getAll({ jumpToPage: 5, pageSize: 20 });
} else {
  // TOKEN pagination - must navigate with cursor only
}
```

### Implementation: MUST Use PaginationHelpers.getAll()

**CRITICAL RULE:** ALL service methods supporting pagination MUST use `PaginationHelpers.getAll()`:

```typescript
return PaginationHelpers.getAll({
  serviceAccess: this.createPaginationServiceAccess(),
  getEndpoint: (folderId) => /* endpoint logic */,
  transformFn: (item) => /* case conversion */,
  pagination: {
    paginationType: PaginationType.OFFSET, // or TOKEN
    itemsField, totalCountField, continuationTokenField,
    paginationParams: { pageSizeParam, offsetParam, countParam }
  },
  excludeFromPrefix: ['event', 'expansionLevel']
}, options);
```

### OData Parameter Prefixing

**CRITICAL:** OData parameters MUST be prefixed with `$`:

```typescript
// User: { filter: "status eq 1", expand: "user" }
// SDK:  { "$filter": "status eq 1", "$expand": "user" }

const keysToPrefix = Object.keys(options).filter(k => !excludeKeys.includes(k));
const prefixedOptions = addPrefixToKeys(options, ODATA_PREFIX, keysToPrefix);
```

**Common Exclusions:** `event`, `expansionLevel`, `prefix`

---

## API Design Patterns

### Service Method Naming

**Standard CRUD:** `create(data, folderId?)` • `getById(id, options?, folderId?)` • `getAll(options?)` • `update(id, data, folderId?)` • `patch(id, data, folderId?)` • `delete(id, folderId?)`

**Special Operations:** `start()`, `stop()`, `pause()`, `resume()`, `assign()`, `unassign()`, `reassign()`, `complete()`

**Rules:**
- MUST follow RESTful naming conventions consistently
- MUST include optional `folderId` parameter for folder-scoped operations
- MUST return typed responses (not plain objects)

### Task Service Specifics

**Form Tasks Require Folder ID:**
```typescript
// ❌ BAD - Form task without folderId (will fail)
const formTask = await sdk.tasks.getById(taskId);

// ✅ GOOD - Form task with folderId
const formTask = await sdk.tasks.getById(taskId, options, folderId);
```

**Admin Access Flag:** Use `asTaskAdmin: true` in options for elevated permissions.

### Operation Response Pattern

```typescript
interface OperationResponse<T> {
  success: boolean;
  data: T;
}
```

**Rules:** Use for operations that can partially fail. Success = true when no errors, false when failed/partial failure.

### OData Batch Operation Pattern

Many OData APIs return **empty arrays for success**, **error arrays for failures**:

```typescript
// Transform and use processODataArrayResponse
const transformedResponse = pascalToCamelCaseKeys(response.data);
return processODataArrayResponse(transformedResponse, inputArray);

// Empty response.value → { success: true, data: originalInputArray }
// Non-empty response.value → { success: false, data: errorDetailsArray }
```

---

## Git Workflow

### Commit Messages

**Format:**
```
<type>(<scope>): <subject>

<body>

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

**Types:** `feat` • `fix` • `docs` • `refactor` • `test` • `chore`

**CRITICAL - Pre-Commit Checks:**
Before committing, ALWAYS verify:
- [ ] No `.env` files staged
- [ ] No credential files staged (credentials.json, secrets.json, *.key, *.pem)
- [ ] No hardcoded secrets in code (API keys, passwords, tokens)
- [ ] `.gitignore` includes `.env*` and credential patterns

### Pull Request Guidelines

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

## Tests
- All XXX unit tests pass
- Added X new test cases covering [scenarios]

## Usage (if applicable)
```typescript
// Code example showing how to use the new feature
```

## Is this a breaking change?
[Yes/No - If yes, explain impact and migration path]

## Related
- Jira Ticket: [PLT-XXXXX](https://uipath.atlassian.net/browse/PLT-XXXXX)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

**Before Submitting:**
- [ ] **CRITICAL: No .env or credential files in commits**
- [ ] **Jira ticket linked** in PR title and description
- [ ] All tests pass - Report exact numbers (e.g., "341/341 tests pass")
- [ ] Code builds cleanly (`npm run build`) - No warnings or errors
- [ ] Linting passes - 0 warnings, 0 errors (`npx oxlint`)
- [ ] **No unused variables or imports**
- [ ] **No redundant constructors**
- [ ] New code has tests (80%+ coverage)
- [ ] Documentation updated (JSDoc, README, etc.)
- [ ] CHANGELOG.md updated for user-facing changes

---

## PR Review Checklist

**FIRST: Check for Sensitive Files:**
- Manually review changed files in PR for .env, credentials.json, or similar files
- Search PR diff for hardcoded API keys, passwords, tokens, secrets
- Verify .gitignore includes sensitive file patterns

### Code Quality
- [ ] Follows naming conventions (camelCase, PascalCase, UPPER_SNAKE_CASE)
- [ ] No TypeScript `any` types
- [ ] Proper error handling with specific types
- [ ] Error handling uses type guards (isAuthenticationError, isValidationError, etc.)
- [ ] No hardcoded values (use constants)
- [ ] **No unused variables or imports** (will be caught by linter)
- [ ] **No redundant constructors** (remove constructors that only call super())
- [ ] No console.log statements (use proper logging)
- [ ] No commented-out code

### Architecture
- [ ] Services extend BaseService or FolderScopedService
- [ ] Models separated: types, models, constants, internal-types
- [ ] No circular dependencies

### Authentication & Initialization
- [ ] OAuth examples call `await sdk.initialize()` after configuration
- [ ] Secret-based examples DO NOT call `initialize()` (auto-initialized)
- [ ] OAuth scopes request minimum necessary permissions
- [ ] JSDoc includes `@requires` tag for OAuth-dependent methods

### API Design
- [ ] **Consistent method naming** (getAll, getById, create, update, delete)
- [ ] Pagination via `PaginationHelpers.getAll()` or `requestWithPagination`
- [ ] Proper TypeScript types for parameters and returns
- [ ] JSDoc documentation with examples
- [ ] Optional parameters documented
- [ ] Task service: Form task operations include `folderId` parameter

### Breaking Changes
- [ ] **Explicitly stated** in PR: "Is this a breaking change? Yes/No"
- [ ] If Yes: **Label PR with `breaking-change`**
- [ ] If Yes: **Document migration path** for users
- [ ] If Yes: **Update CHANGELOG.md** with breaking change notice

### Transformations (CRITICAL)
- [ ] PascalCase → camelCase conversion applied
- [ ] Field names mapped via constants (TaskMap, EntityMap, etc.)
- [ ] Values mapped to enums (TaskStatusMap, etc.)
- [ ] Transformation order correct: case → field → value

### Pagination (CRITICAL)
- [ ] Uses `PaginationHelpers.getAll()` (not manual)
- [ ] Supports both paginated and non-paginated modes
- [ ] Returns correct type based on options
- [ ] Pagination type (OFFSET/TOKEN) matches API
- [ ] **NEVER uses cursor and jumpToPage together** (mutually exclusive)
- [ ] Examples check `supportsPageJump` before using `jumpToPage`
- [ ] OData parameters prefixed with $ (except exclusions)

### Testing (CRITICAL)
- [ ] **All tests pass** - Report exact count (e.g., "341/341 tests pass")
- [ ] **Tests for new code** - Both success and error cases
- [ ] Test coverage meets minimum 80% for new code
- [ ] Mocks used properly
- [ ] Tests follow Arrange-Act-Assert pattern

### Documentation
- [ ] Public methods have JSDoc with `@param`, `@returns`, `@example`
- [ ] Complex logic has inline comments
- [ ] README updated if needed
- [ ] CHANGELOG.md updated for user-facing changes

### Security (CRITICAL)
- [ ] **No .env files committed** (check PR files for .env, .env.local, .env.*.local)
- [ ] **No credential files committed** (credentials.json, secrets.json, *.key, *.pem)
- [ ] **No hardcoded secrets** in code (API keys, passwords, tokens, connection strings)
- [ ] `.gitignore` includes sensitive file patterns (`.env*`, `credentials.json`, etc.)
- [ ] Input validation for required parameters
- [ ] Error messages don't expose sensitive data

### Cross-Platform
- [ ] Works in browser and Node.js
- [ ] No platform-specific imports without checks

---

## Questions to Ask During PR Review

### Critical Checks (Always Check First)
1. **Security**: Manually review PR for .env files, credentials.json, or any files with secrets. Check code diff for hardcoded API keys, passwords, tokens.
2. **Jira Ticket**: Is there a Jira ticket linked in the title (e.g., `[PLT-12345]`) and description?
3. **Tests**: Do all tests pass? Is the exact count reported (e.g., "341/341 tests pass")?
4. **Breaking Changes**: Is "Is this a breaking change?" section included? If yes, is migration path documented?
5. **Linting**: Are there 0 linting warnings and 0 errors? No unused variables/imports?

### Code Quality Checks
6. **Architecture**: Follows service-based architecture (extends BaseService/FolderScopedService)?
7. **Type Safety**: All types properly defined? No `any`?
8. **Authentication**: OAuth examples call `initialize()`? Secret-based examples DON'T call it?
9. **OAuth Scopes**: Requests minimum necessary permissions? JSDoc includes `@requires` tags?
10. **Transformations**: All three steps applied (case → field → value)?
11. **Pagination**: Uses `PaginationHelpers.getAll()` or `requestWithPagination`? Never uses cursor AND jumpToPage together?
12. **Error Handling**: Uses type guards (isAuthenticationError, etc.)?
13. **Method Naming**: Follows consistent patterns (getAll, getById, create, etc.)?
14. **Cross-Platform**: Works in both browser and Node.js?
15. **Code Cleanup**: No unused imports/variables? No redundant constructors?

---

## Code Style Guidelines

### Naming Conventions

- **camelCase**: `getUserById`, `taskService`, `pageSize`
- **PascalCase**: `TaskService`, `UserLoginInfo`, `TaskType`
- **UPPER_SNAKE_CASE**: `DEFAULT_PAGE_SIZE`, `TASK_ENDPOINTS`
- **Private Methods**: Prefer `private` keyword over underscore prefix
- **File Names**: kebab-case (`api-client.ts`) or dot-separated (`tasks.types.ts`)

### Code Organization Within Files

**Standard Order:** Imports (grouped: Node.js → Third-party → Internal) → Types/Interfaces → Constants → Classes → Utility functions

**Within Classes:** Properties (public → protected → private) → Constructor → Public methods → Protected methods → Private methods

### Import/Export Conventions

**Rules:**
- MUST use named imports/exports (avoid default exports)
- MUST use barrel exports (index.ts) for public API
- MUST NOT export internal types from barrel exports

---

## Security Best Practices (CRITICAL)

### Files That Must NEVER Be Committed

- `.env`, `.env.local`, `.env.*.local` - Environment variables with secrets
- `credentials.json`, `secrets.json` - Credential files
- `*.key`, `*.pem`, `*.p12` - Private keys and certificates
- `.aws/credentials` - AWS credentials
- Any file containing API keys, tokens, passwords, or connection strings

### Before Every Commit

- [ ] Run `git status` - Verify no sensitive files staged
- [ ] Verify `.gitignore` includes `.env*` and credential patterns
- [ ] No hardcoded secrets in code (search for API keys, passwords, tokens)

### Proper Pattern

```typescript
// ✅ GOOD - Use environment variables
const apiKey = process.env.UIPATH_API_KEY;
if (!apiKey) throw new Error('UIPATH_API_KEY environment variable required');

// ❌ BAD - Hardcoded secrets (NEVER do this)
const apiKey = "sk_live_abcdef123456";
```

### If Sensitive Files Were Accidentally Committed

**Immediate Actions:**
1. **DO NOT** merge the PR
2. **DO NOT** force push to main/master without approval
3. Contact team lead immediately
4. **Rotate all exposed secrets immediately**

**To Remove from PR (before merge):**
- Remove files from latest commit
- Re-commit without sensitive files
- Force push to your branch (never to main/master)
- For older commits, may require git filter-branch (consult team lead)

---

## Design Principles: API Consistency

### The "Unified Standard" Philosophy

The SDK's primary goal is **predictability**. Learning one service means understanding all services.

**Core Principles:**
1. **Names Must Click**: `sdk.tasks.assign()` is self-explanatory
2. **Cross-Platform First**: MUST work in browser AND Node.js
3. **Consistent Signatures**: Same operation = same pattern across services
4. **Fail Fast**: Invalid input fails immediately with helpful errors
5. **Sensible Defaults**: Common cases "just work" with minimal config
6. **Return Useful Data**: Complete objects with IDs, timestamps, AND methods
7. **Type Everything**: If it's in the API, it's typed in the SDK
8. **Document with Examples**: Every public method has JSDoc with real examples

---

**Remember**: This SDK is used by developers worldwide and by LLMs for AI-assisted development. Every API should be **intuitive**, **well-documented**, **type-safe**, and **maintainable**. Consistency is more valuable than cleverness.

**When in doubt:** Look at existing implementations (Tasks, Entities, Buckets) and follow their patterns exactly.
