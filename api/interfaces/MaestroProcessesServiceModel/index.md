Service for managing UiPath Maestro Processes

UiPath Maestro is a cloud-native orchestration layer that coordinates bots, AI agents, and humans for seamless, intelligent automation of complex workflows. [UiPath Maestro Guide](https://docs.uipath.com/maestro/automation-cloud/latest/user-guide/introduction-to-maestro)

## Methods

### getAll()

```
getAll(): Promise<MaestroProcessGetAllResponse[]>;
```

#### Returns

`Promise`\<[`MaestroProcessGetAllResponse`](../MaestroProcessGetAllResponse/)[]>

Promise resolving to array of MaestroProcess objects [MaestroProcessGetAllResponse](../MaestroProcessGetAllResponse/)

#### Example

```
// Get all processes
const processes = await sdk.maestro.processes.getAll();

// Access process information
for (const process of processes) {
  console.log(`Process: ${process.processKey}`);
  console.log(`Running instances: ${process.runningCount}`);
  console.log(`Faulted instances: ${process.faultedCount}`);
}
```
