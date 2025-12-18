Service for managing UiPath Maestro Cases

UiPath Maestro Case Management describes solutions that help manage and automate the full flow of complex E2E scenarios.

## Methods

### getAll()

```
getAll(): Promise<CaseGetAllResponse[]>;
```

#### Returns

`Promise`\<[`CaseGetAllResponse`](../CaseGetAllResponse/)[]>

Promise resolving to array of Case objects [CaseGetAllResponse](../CaseGetAllResponse/)

#### Example

```
// Get all case management processes
const cases = await sdk.maestro.cases.getAll();

// Access case information
for (const caseProcess of cases) {
  console.log(`Case Process: ${caseProcess.processKey}`);
  console.log(`Running instances: ${caseProcess.runningCount}`);
  console.log(`Completed instances: ${caseProcess.completedCount}`);
}
```
