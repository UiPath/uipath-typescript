Service for managing UiPath Maestro Cases

UiPath Maestro Case Management describes solutions that help manage and automate the full flow of complex E2E scenarios.

### Usage

Prerequisites: Initialize the SDK first - see [Getting Started](/uipath-typescript/getting-started/#import-initialize)

```
import { Cases } from '@uipath/uipath-typescript/cases';

const cases = new Cases(sdk);
const allCases = await cases.getAll();
```

## Methods

### getAll()

> **getAll**(): `Promise`\<[`CaseGetAllResponse`](../CaseGetAllResponse/)[]>

#### Returns

`Promise`\<[`CaseGetAllResponse`](../CaseGetAllResponse/)[]>

Promise resolving to array of Case objects [CaseGetAllResponse](../CaseGetAllResponse/)

#### Example

```
// Get all case management processes
const allCases = await cases.getAll();

// Access case information
for (const caseProcess of allCases) {
  console.log(`Case Process: ${caseProcess.processKey}`);
  console.log(`Running instances: ${caseProcess.runningCount}`);
  console.log(`Completed instances: ${caseProcess.completedCount}`);
}
```
