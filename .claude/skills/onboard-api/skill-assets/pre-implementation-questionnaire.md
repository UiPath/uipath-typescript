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
- If existing — which service? (e.g., Entities, Tasks, Cases, MaestroProcesses, Assets, Queues, Buckets)
- Is it a sub-resource of an existing entity? (e.g., instances OF a process)

## 5. Cardinality & Relationship
- Does a similar method already exist? (e.g., adding singular `updateRecordById` when batch `updateRecordsById` exists)
- Is this a single-item or batch operation?
- Can existing options/response types be reused?

## 6. Operation Type
- Is this a lifecycle/state-change operation? (cancel, pause, resume, close, reopen)
- Or is it a data read/write operation? (get, create, update, delete)
- This determines whether to use `OperationResponse<TData>` pattern.

## 7. Pagination
- Does the API return paginated lists?
- If yes — OData style ($top/$skip/$count with `value` array) or continuation token?
- Does the API use standard OData conventions? (determines if `ODATA_PAGINATION` constants can be reused)

## 8. Method Binding
- Should this method be bound to an entity response? (i.e., can it operate on a previously retrieved entity?)
- What identifying context does the bound method capture? (e.g., `entityId`, `folderId`, `folderKey`)

## 9. Headers
- Does it require special headers? (e.g., `X-UIPATH-OrganizationUnitId`, `X-UIPATH-FolderKey`)
- If folder header — numeric `folderId` or string `folderKey`?

## 10. Scope
- What OAuth scope is required? (e.g., `DataFabric.Data.Write`)

---

## What the agent can derive without asking

Using `sdk-service-dev` decision trees and conventions:
- Transform pipeline (from inspecting the raw response)
- Type naming conventions (from Type Naming Quick Reference)
- File placement (from Service Placement decision tree)
- Pagination constants and setup (from Pagination reference)
- BaseService vs FolderScopedService (from decision tree)
- OperationResponse applicability (from OperationResponse Pattern table)
- Method binding decisions (from Method Binding decision tree)
- Test structure (from Testing reference)
- NEVER-do violations (from NEVER Do list)
