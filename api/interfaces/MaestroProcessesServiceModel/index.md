Service for managing UiPath Maestro Processes

UiPath Maestro is a cloud-native orchestration layer that coordinates bots, AI agents, and humans for seamless, intelligent automation of complex workflows. [UiPath Maestro Guide](https://docs.uipath.com/maestro/automation-cloud/latest/user-guide/introduction-to-maestro)

## Methods

### getAll()

```
getAll(): Promise<MaestroProcessGetAllResponse[]>;
```

#### Returns

`Promise`\<[`MaestroProcessGetAllResponse`](../../type-aliases/MaestroProcessGetAllResponse/)[]>

Promise resolving to array of MaestroProcess objects with methods [MaestroProcessGetAllResponse](../../type-aliases/MaestroProcessGetAllResponse/)

#### Example

```
// Get all processes
const processes = await sdk.maestro.processes.getAll();

// Access process information and incidents
for (const process of processes) {
  console.log(`Process: ${process.processKey}`);
  console.log(`Running instances: ${process.runningCount}`);
  console.log(`Faulted instances: ${process.faultedCount}`);

  // Get incidents for this process
  const incidents = await process.getIncidents();
  console.log(`Incidents: ${incidents.length}`);
}
```

______________________________________________________________________

### getIncidents()

```
getIncidents(processKey: string, folderKey: string): Promise<ProcessIncidentGetResponse[]>;
```

Get incidents for a specific process

#### Parameters

| Parameter    | Type     | Description                                 |
| ------------ | -------- | ------------------------------------------- |
| `processKey` | `string` | The key of the process to get incidents for |
| `folderKey`  | `string` | The folder key for authorization            |

#### Returns

`Promise`\<[`ProcessIncidentGetResponse`](../ProcessIncidentGetResponse/)[]>

Promise resolving to array of incidents for the process [ProcessIncidentGetResponse](../ProcessIncidentGetResponse/)

#### Example

```
// Get incidents for a specific process
const incidents = await sdk.maestro.processes.getIncidents('<processKey>', '<folderKey>');

// Access incident details
for (const incident of incidents) {
  console.log(`Element: ${incident.incidentElementActivityName} (${incident.incidentElementActivityType})`);
  console.log(`Status: ${incident.incidentStatus}`);
  console.log(`Error: ${incident.errorMessage}`);
}
```
