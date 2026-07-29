Service for managing UiPath Orchestrator Attachments.

Attachments are files that can be associated with Orchestrator jobs.

## Methods

### getById()

> **getById**(`id`: `string`, `options?`: `AttachmentGetByIdOptions`): `Promise`\<`AttachmentResponse`>

Gets an attachment by ID

#### Parameters

- `id`: `string` — The UUID of the attachment to retrieve
- `options?`: `AttachmentGetByIdOptions` — Optional query parameters (expand, select)

#### Returns

`Promise`\<`AttachmentResponse`>

Promise resolving to the attachment [AttachmentResponse](../AttachmentResponse/)

#### Example

```
import { Attachments } from '@uipath/uipath-typescript/attachments';

const attachments = new Attachments(sdk);
const attachment = await attachments.getById('12345678-1234-1234-1234-123456789abc');
```
