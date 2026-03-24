# Composite Methods Reference — Design Decisions

Design decision trees and patterns for composite SDK methods — methods that internally chain multiple API calls. Read this before implementing a composite method.

---

## Section 1: Input Analysis

### Composite with reference (Python SDK)

1. **Fetch the referenced repository** — clone or read via GitHub API. If the repo is private or inaccessible, fall back to the "Composite without reference" path — ask the user to provide the flow manually.
2. **Read its `CLAUDE.md`** to understand repo structure, package layout, and service conventions
3. **Locate the method** by name using the `path-hint` from the ticket. If the method has been renamed, moved, or deleted — stop and ask the user for the current location or a manual flow description.
4. **Extract the flow** from the method body:
   - Sequence of API calls: HTTP method, endpoint path, request body construction
   - How each response is used (passed to next call, merged into result, used for branching)
   - Control flow: sequential, conditional, parallel, fan-out
5. **Map each API call** to a Swagger operation ID in the provided Swagger spec
6. **Propose the flow** back to the user for confirmation before proceeding to design. Format:

```
Proposed flow for <methodName>:
  1. <HTTP_METHOD> <endpoint> → <what it returns, how it's used>
  2. IF <condition>: <HTTP_METHOD> <endpoint> → <what it returns>
  3. ...
  Final response: <description of composed result>
```

Wait for user confirmation. Adjust if they correct the flow.

### Composite without reference (Flow block)

1. **Parse the `Flow:` block** from the ticket description
2. Each numbered step = one API call
3. `IF` conditions = branching logic
4. `→` describes what the call returns and how it feeds into subsequent steps
5. `Output:` defines the composed response shape
6. **Validate each endpoint** exists in the Swagger spec — if an endpoint is missing, stop and report
7. **Confirm the flow** with the user if any step is ambiguous

---

## Section 2: Composition Patterns

Choose the pattern that matches the flow:

```
Is the flow purely sequential (each call depends on the previous)?
  YES → Sequential Chain

Does the flow have conditional branches (IF/ELSE based on a response)?
  YES → Conditional Composition

Can some calls run in parallel (no data dependency between them)?
  YES → Parallel Aggregation

Does the flow iterate over results from an earlier call?
  YES → Fan-out
```

A single composite method may combine patterns (e.g., sequential chain with a conditional branch at step 2).

**Complexity guardrail:** If the flow has more than 5 API calls or more than 2 levels of conditional nesting, stop and discuss simplification with the user before proceeding. Consider splitting into multiple SDK methods or exposing intermediate steps as separate public methods. A composite method that's too complex becomes untestable and fragile.

### Sequential Chain

Call A → use result to call B → use result to call C. Final response is typically the last call's result, possibly enriched with fields from earlier calls.

**Codebase example:** `Buckets._uploadToUri()` in `src/services/orchestrator/buckets/buckets.ts:333` — gets an upload URI from the API, then uploads to that URI.

### Conditional Composition

Call A → examine result → conditionally call B or C. The response shape must either be a union type or normalize both branches into a common shape.

**Key design question:** Does the user need to know which branch was taken? If yes, include a discriminator field (e.g., `source: 'inline' | 'attachment'`). If no, normalize to one shape.

### Parallel Aggregation

Calls A and B have no data dependency. Use `Promise.allSettled` for resilience or `Promise.all` if both must succeed. Merge results into a composed response.

**Codebase example:** `CaseInstances.getStages()` in `src/services/maestro/cases/case-instances.ts:380` — fetches execution history and case JSON in parallel via `Promise.allSettled`, composes stages from both.

### Fan-out

Call A returns a list → call B for each item. Use `Promise.all` with concurrency considerations for large lists.

**Codebase example:** `enrichMultipleInstanceIncidents()` in `src/services/maestro/processes/helpers.ts:99` — groups incidents by instance, enriches each group in parallel.

---

## Section 3: Response Composition

### Type design

- The **public response type** represents the composed result — it is NOT the raw response of any single API call
- Fields from intermediate calls used only for routing or conditioning are **not** included in the final response
- If the Python reference exists, **match its return shape** — the Python SDK is the DX reference for composite methods
- If using a `Flow:` block, the `Output:` field defines the shape

### Type file placement

| Type | File | Exported? |
|------|------|-----------|
| Composed response type | `{domain}.types.ts` | Yes (public) |
| Intermediate raw response types | `{domain}.internal-types.ts` | No (private) |
| Options type for the composite method | `{domain}.types.ts` | Yes (public) |

- If an intermediate response type already exists as a public type from a direct API method (e.g., `JobGetResponse`), **reuse it** via import — do not duplicate
- The composed response type name follows the standard pattern: `{Entity}{Operation}Response` (e.g., `JobOutputResponse`)

---

## Section 4: Error Handling Strategy

```
For each API call in the flow:
  │
  Is this call's failure recoverable?
  (i.e., the final response is still useful without this data)
  │
  YES → Graceful degradation
        - Wrap in try/catch or use Promise.allSettled
        - Set the enrichment field to null/undefined
        - Continue composing the response
  │
  NO  → Let it propagate
        - No try/catch
        - The composite method throws if this call fails
```

### Rules

- **First call in a sequential chain** almost always propagates — if the primary data fetch fails, there is nothing to compose
- **Enrichment calls** (adding metadata, names, labels) almost always degrade gracefully
- **Conditional branches:** if the condition-check call fails, treat the condition as false (skip the branch) unless the ticket/reference specifies otherwise
- **Fan-out items:** if one item's enrichment fails, include it without enrichment rather than failing the entire batch

### Codebase reference

`CaseInstances.getStages()` uses `Promise.allSettled`:
- Execution history: degrades gracefully (stages still returned without execution details)
- Case JSON: propagates (without node definitions, nothing can be composed)

---

## Section 5: Implementation Patterns

### Structure

Each API call in the flow gets a **private helper method**. The public composite method orchestrates them.

```typescript
// Private helpers — one per API call in the flow (no @track)
private async fetchJobDetails(jobId: string, headers: Headers): Promise<InternalJobResponse> {
  const response = await this.get(JOB_ENDPOINTS.GET_BY_ID(jobId), { headers });
  return pascalToCamelCaseKeys(response.data);
}

private async downloadOutput(downloadUrl: string): Promise<unknown> {
  try {
    const response = await this.get(downloadUrl);
    return response.data;
  } catch {
    return undefined; // graceful degradation
  }
}

// Public composite method — the only one decorated with @track
@track('Jobs.GetOutput')
async getOutput(jobId: string, options?: JobGetOutputOptions): Promise<JobOutputResponse> {
  const headers = createHeaders({ [FOLDER_ID]: options?.folderId });
  const job = await this.fetchJobDetails(jobId, headers);

  if (job.outputArguments && !isAttachmentReference(job.outputArguments)) {
    return this.composeInlineOutput(job);
  }

  const exportId = await this.triggerExport(jobId, headers);
  const downloadUrl = await this.getDownloadLink(exportId, headers);
  const content = await this.downloadOutput(downloadUrl);

  return this.composeAttachmentOutput(job, content);
}

// Composition helpers — private, keeps public method readable and testable
private composeInlineOutput(job: InternalJobResponse): JobOutputResponse {
  return { source: 'inline', data: JSON.parse(job.outputArguments) };
}

private composeAttachmentOutput(job: InternalJobResponse, content: unknown): JobOutputResponse {
  return { source: 'attachment', data: content ?? null };
}
```

### Key rules

- **Only the public composite method** gets `@track('ServiceName.MethodName')`
- **Private helpers** are not decorated — they are internal implementation details
- **Composition helpers** (methods that merge/transform results) should be separate private methods for testability
- **Endpoint constants** for all internal API calls must be defined in the endpoint constants file, grouped under the existing domain object
- Each private helper applies its own transform pipeline (e.g., `pascalToCamelCaseKeys`) based on what the individual API returns — use `references/onboarding.md` transform pipeline guidance for each sub-endpoint

---

## Section 6: Testing Composite Methods

### Unit tests

Mock **every** internal API call the composite method makes. Cover:

| Scenario | What to verify |
|----------|---------------|
| **Happy path (all calls succeed)** | Response is correctly composed from all sub-responses |
| **Graceful degradation** | Enrichment call fails → primary data still returned, enrichment field is null |
| **Propagation** | Primary call fails → error surfaces to caller |
| **Conditional branches** | Both branches exercised — condition true path and false path |
| **Each private helper** | If transform logic is non-trivial, test the helper independently |

```typescript
// Example: test graceful degradation
it('should return output even if download fails', async () => {
  mockGet
    .mockResolvedValueOnce({ data: mockJobResponse })     // fetchJobDetails
    .mockResolvedValueOnce({ data: mockExportResponse })   // triggerExport
    .mockResolvedValueOnce({ data: mockDownloadLink })     // getDownloadLink
    .mockRejectedValueOnce(new Error('Download failed'));  // downloadOutput

  const result = await service.getOutput(TEST_JOB_ID, { folderId: TEST_FOLDER_ID });

  expect(result.data).toBeNull();
  expect(result.source).toBe('attachment');
});
```

### Integration tests

Treat the composite method like any other SDK method — call it once, verify the composed response shape. The integration test does NOT need to test individual sub-calls; that's what unit tests are for.

### E2E component

When generating the E2E test component (Step 6), the composite method is tested like any other method. The key validation is that the **composed response** has the correct shape — fields are camelCase, intermediate data is not leaked, and the response type matches expectations.

---

## NEVER Do (Composite-Specific)

- **NEVER call sub-endpoints directly from the public composite method body** — always use private helper methods. Inlining API calls makes the public method unreadable and untestable. Each API call = one private helper.
- **NEVER add `@track` to private helper methods** — only the public composite method gets telemetry. Tracking every internal call pollutes telemetry with implementation details.
- **NEVER leak intermediate response fields into the composed response type** — fields used only for routing, conditioning, or as input to the next call are internal. If `exportId` is only used to get the download link, it does not appear in the final response.
- **NEVER skip the user confirmation step** after proposing the flow — composite methods involve design judgment. The proposed flow must be confirmed before implementation begins.
- **NEVER implement a composite method without curling ALL underlying endpoints first** — skipping curl for "secondary" endpoints leads to wrong type decisions for intermediate responses. Every endpoint in the flow needs a real response.
