> **TaskCompleteResponse** = \{ `errorCode`: `number` \| `null`; `errorMessage`: `string` \| `null`; `success`: `boolean`; \}

Response returned by Action Center after a task completion attempt. This type is used by coded-action-apps package

## Properties

### errorCode

> **errorCode**: `number` \| `null`

Error code returned on failure, null when successful

***

### errorMessage

> **errorMessage**: `string` \| `null`

Human-readable error message returned on failure, null when successful.

***

### success

> **success**: `boolean`

Whether the task was completed successfully.
