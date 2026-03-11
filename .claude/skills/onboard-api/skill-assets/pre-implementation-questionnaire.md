# Pre-Implementation Questionnaire for API Onboarding

Ask these questions before starting any new API onboarding. Gather all answers before writing code.

## 1. Endpoint Details
- What is the full endpoint URL? (e.g., `.../entity/${entityId}/update/${recordId}`)
- What is the HTTP method? (GET / POST / PUT / PATCH / DELETE)

## 2. Request
- What does the request body look like? Provide a sample curl or raw JSON body.
- Are fields dynamic (user-defined) or fixed schema?
- Are there query parameters? (e.g., `expansionLevel`, `failOnFirst`, `$top`, `$skip`)

## 3. Response
- Provide the raw JSON response from actually calling the endpoint. (Non-negotiable — don't design from docs alone.)
- What casing does the response use? (PascalCase, camelCase, mixed?)

## 4. Service Placement
- Is this being added to an existing service or a new one?
- If existing — which service? (e.g., Entities, Tasks, Cases)
- Is it a sub-resource of an existing entity? (e.g., instances OF a process)

## 5. Cardinality & Relationship
- Does a similar method already exist? (e.g., adding singular `updateRecordById` when batch `updateRecordsById` exists)
- Is this a single-item or batch operation?
- Can existing options/response types be reused?

## 6. Method Binding
- Should this method be bound to an entity response? (i.e., can it operate on a previously retrieved entity?)
- What identifying context does the bound method capture? (e.g., `entityId`, `folderId`, `folderKey`)

## 7. Headers
- Does it require special headers? (e.g., `X-UIPATH-OrganizationUnitId`, `X-UIPATH-FolderKey`)

## 8. Scope
- What OAuth scope is required? (e.g., `DataFabric.Data.Write`)

---

## What the agent can derive without asking
- Transform pipeline (from inspecting the raw response)
- Type naming conventions (from skill rules)
- File placement (from decision trees)
- Pagination style (from response shape)
- BaseService vs FolderScopedService (from headers/response pattern)
- Test structure (from existing patterns)
