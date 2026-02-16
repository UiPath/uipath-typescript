# Response Transformation Pipeline

Transform functions live in `src/utils/transform.ts`. Not every step is needed — inspect the actual API response first.

## Steps (apply in order, skip any that don't apply)

### Step 1: `pascalToCamelCaseKeys(response.data)`

Recursively converts PascalCase keys to camelCase. **Use only if** the API returns PascalCase keys. Skip if already camelCase.

### Step 2: `transformData(data, {Entity}Map)`

Renames specific fields using a mapping constant from `{domain}.constants.ts`. For **semantic renames only** — giving API fields clearer SDK names. **Never use for case conversion** (that's step 1). Skip if no fields need renaming.

### Step 3: `applyDataTransforms(data, { field, valueMap })`

Maps raw enum values to typed enums (e.g., numeric `1` → `TaskStatus.Pending`). **Use only if** the API returns raw codes that should be SDK enums. Skip if API returns readable values.

### Step 4: `create{Entity}WithMethods(data, this)`

Attaches bound methods to the response object. **Use only if** the service has an `{Entity}Methods` interface.

## Standard Field Renames

Reuse these in `{Entity}Map` (defined in `{domain}.constants.ts`) when the API has them:

| API field | SDK field |
|-----------|-----------|
| `creationTime` / `createdAt` | `createdTime` |
| `lastModificationTime` | `lastModifiedTime` |
| `startedTimeUtc` | `startedTime` |
| `completedTimeUtc` | `completedTime` |
| `expiryTimeUtc` | `expiredTime` |
| `organizationUnitId` | `folderId` |
| `organizationUnitFullyQualifiedName` | `folderName` |

## Outbound Requests (SDK → API)

- `transformRequest(data, {Entity}Map)` — auto-reverses the field map
- `camelToPascalCaseKeys()` — for case conversion outbound

## OData Prefix Pattern

OData APIs require `$`-prefixed query params (`$filter`, `$expand`, `$select`, `$orderby`). The SDK accepts clean camelCase keys and adds the prefix before HTTP calls.

**Applied automatically by:**
- `PaginationHelpers.getAll()` — prefixes all option keys. Use `excludeFromPrefix` to opt out.
- `FolderScopedService._getByFolder()` — prefixes all option keys.

**Apply manually** in `getById()` methods accepting `BaseOptions`:

```typescript
import { addPrefixToKeys } from '../../utils/transform';
import { ODATA_PREFIX } from '../../utils/constants/common';

const apiOptions = addPrefixToKeys(options, ODATA_PREFIX, Object.keys(options));
```

## Critical Rule

Field maps (`{Entity}Map`) are for **semantic renames only**. Never add case-only entries — case conversion is handled separately by `pascalToCamelCaseKeys()`.
