Service for managing UiPath Orchestrator Attachments.

Attachments are files that can be associated with Orchestrator jobs.

## Methods

### create()

> **create**(`name`: `string`, `content`: `Uint8Array`\<`ArrayBuffer`> | `Blob` | `File`, `options?`: `AttachmentCreateOptions`): `Promise`\<`AttachmentCreateResponse`>

Creates an attachment and uploads its content.

The upload is handled for you — the attachment record and its file are both in place once this resolves. Returns the stored attachment, whose `id` is the handle to use everywhere else (for example as the value of a `file` field in an action's output data).

Pass `jobKey` to link the attachment to a job as part of the same call; `jobs.linkAttachment()` is only needed to attach it to a further job later.

#### Parameters

- `name`: `string` — File name to store the attachment under, including its extension
- `content`: `Uint8Array`\<`ArrayBuffer`> | `Blob` | `File` — File content to upload
- `options?`: `AttachmentCreateOptions` — Optional job to link to, its category, and the folder to create the attachment in

#### Returns

`Promise`\<`AttachmentCreateResponse`>

Promise resolving to the created [AttachmentCreateResponse](../AttachmentCreateResponse/)

#### Examples

```
import { Attachments } from '@uipath/uipath-typescript/attachments';

const attachments = new Attachments(sdk);

// Upload a file picked in the browser
const attachment = await attachments.create(file.name, file);
console.log(attachment.id);
```

```
// Upload and link it to a job in one call
const attachment = await attachments.create('invoice.pdf', file, {
  jobKey: <jobKey>,
  category: 'Invoice',
});
```

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

### getFor()

> **getFor**(`attachment`: `JobAttachmentSchema`, `options?`: `AttachmentGetForOptions`): `Promise`\<`AttachmentResponse`>

Gets the attachment a job attachment input refers to.

#### Parameters

- `attachment`: `JobAttachmentSchema` — A [JobAttachmentSchema](../JobAttachmentSchema/) received as automation input
- `options?`: `AttachmentGetForOptions` — Optional query parameters (expand, select)

#### Returns

`Promise`\<`AttachmentResponse`>

Promise resolving to the attachment [AttachmentResponse](../AttachmentResponse/)

#### Example

```
// Inside a coded function whose input declares a JobAttachmentSchema field
const attachment = await attachments.getFor(input.invoice);
```
