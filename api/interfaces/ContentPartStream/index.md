Model for content part event helpers.

A content part is a single piece of content within a message — text, audio, an image, or a transcript. Use the type-check properties (`isText`, `isMarkdown`, `isHtml`, `isAudio`, `isImage`, `isTranscript`) to determine the content type and handle it accordingly.

## Examples

```
message.onContentPartStart((part) => {
  if (part.isMarkdown) {
    part.onChunk((chunk) => {
      process.stdout.write(chunk.data ?? '');
    });
  }
});
```

```
message.onContentPartStart((part) => {
  if (part.isText) {
    part.onChunk((chunk) => showPlainText(chunk.data ?? ''));
  } else if (part.isMarkdown) {
    part.onChunk((chunk) => renderMarkdown(chunk.data ?? ''));
  } else if (part.isHtml) {
    part.onChunk((chunk) => renderHtml(chunk.data ?? ''));
  } else if (part.isAudio) {
    part.onChunk((chunk) => audioPlayer.enqueue(chunk.data ?? ''));
  } else if (part.isImage) {
    part.onChunk((chunk) => imageBuffer.append(chunk.data ?? ''));
  } else if (part.isTranscript) {
    part.onChunk((chunk) => showTranscript(chunk.data ?? ''));
  }
});
```

```
message.onContentPartStart((part) => {
  part.onCompleted((completed) => {
    console.log(`Full text: ${completed.data}`);

    // Access citations — each has offset, length, and sources
    for (const citation of completed.citations) {
      const citedText = completed.data.substring(
        citation.offset,
        citation.offset + citation.length
      );
      console.log(`"${citedText}" cited from:`, citation.sources);
    }
  });
});
```

```
message.onContentPartCompleted((completed) => {
  console.log(`[${completed.mimeType}] ${completed.data}`);
});
```

## Properties

| Property        | Modifier   | Type        | Description                                                     |
| --------------- | ---------- | ----------- | --------------------------------------------------------------- |
| `contentPartId` | `readonly` | `string`    | Unique identifier for this content part                         |
| `ended`         | `readonly` | `boolean`   | Whether this content part has ended                             |
| `isAudio`       | `readonly` | `boolean`   | Whether this content part is audio content                      |
| `isHtml`        | `readonly` | `boolean`   | Whether this content part is HTML. Matches `text/html`.         |
| `isImage`       | `readonly` | `boolean`   | Whether this content part is an image                           |
| `isMarkdown`    | `readonly` | `boolean`   | Whether this content part is markdown. Matches `text/markdown`. |
| `isText`        | `readonly` | `boolean`   | Whether this content part is plain text. Matches `text/plain`.  |
| `isTranscript`  | `readonly` | `boolean`   | Whether this content part is a transcript (from speech-to-text) |
| `mimeType`      | `readonly` | `undefined` | `string`                                                        |

## Methods

### onChunk()

> **onChunk**(`cb`: (`chunk`: [`ContentPartChunkEvent`](../ContentPartChunkEvent/)) => `void`): () => `void`

Registers a handler for content part chunks

Chunks are the fundamental unit of streaming data. Each chunk contains a piece of the content (text, audio data, etc.).

#### Parameters

| Parameter | Type                                                                      | Description                   |
| --------- | ------------------------------------------------------------------------- | ----------------------------- |
| `cb`      | (`chunk`: [`ContentPartChunkEvent`](../ContentPartChunkEvent/)) => `void` | Callback receiving each chunk |

#### Returns

Cleanup function to remove the handler

> (): `void`

##### Returns

`void`

#### Example

```
part.onChunk((chunk) => {
  process.stdout.write(chunk.data ?? '');
});
```

______________________________________________________________________

### onCompleted()

> **onCompleted**(`cb`: (`completedContentPart`: [`CompletedContentPart`](../../type-aliases/CompletedContentPart/)) => `void`): `void`

Registers a handler called when this content part finishes

The handler receives the aggregated content part data including all buffered text, citations, and any citation errors.

#### Parameters

| Parameter | Type                                                                                                   | Description                                        |
| --------- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------- |
| `cb`      | (`completedContentPart`: [`CompletedContentPart`](../../type-aliases/CompletedContentPart/)) => `void` | Callback receiving the completed content part data |

#### Returns

`void`

#### Example

```
part.onCompleted((completed) => {
  console.log(`Content type: ${completed.mimeType}`);
  console.log(`Full text: ${completed.data}`);

  // Citations provide offset/length into the text and source references
  for (const citation of completed.citations) {
    const citedText = completed.data.substring(
      citation.offset,
      citation.offset + citation.length
    );
    console.log(`"${citedText}" — sources:`, citation.sources);
  }

  // Citation errors indicate malformed citation ranges
  if (completed.citationErrors.length > 0) {
    console.warn('Citation errors:', completed.citationErrors);
  }
});
```

______________________________________________________________________

### onContentPartEnd()

> **onContentPartEnd**(`cb`: (`endContentPart`: [`ContentPartEndEvent`](../ContentPartEndEvent/)) => `void`): () => `void`

Registers a handler for content part end events

#### Parameters

| Parameter | Type                                                                           | Description                      |
| --------- | ------------------------------------------------------------------------------ | -------------------------------- |
| `cb`      | (`endContentPart`: [`ContentPartEndEvent`](../ContentPartEndEvent/)) => `void` | Callback receiving the end event |

#### Returns

Cleanup function to remove the handler

> (): `void`

##### Returns

`void`

#### Example

```
part.onContentPartEnd((endEvent) => {
  console.log('Content part finished');
});
```

______________________________________________________________________

### onErrorEnd()

> **onErrorEnd**(`cb`: (`error`: { `errorId`: `string`; } & [`ErrorEndEvent`](../ErrorEndEvent/)) => `void`): () => `void`

Registers a handler for error end events

#### Parameters

| Parameter | Type                                                                                 | Description                            |
| --------- | ------------------------------------------------------------------------------------ | -------------------------------------- |
| `cb`      | (`error`: { `errorId`: `string`; } & [`ErrorEndEvent`](../ErrorEndEvent/)) => `void` | Callback receiving the error end event |

#### Returns

Cleanup function to remove the handler

> (): `void`

##### Returns

`void`

______________________________________________________________________

### onErrorStart()

> **onErrorStart**(`cb`: (`error`: { `errorId`: `string`; } & [`ErrorStartEvent`](../ErrorStartEvent/)) => `void`): () => `void`

Registers a handler for error start events

#### Parameters

| Parameter | Type                                                                                     | Description                        |
| --------- | ---------------------------------------------------------------------------------------- | ---------------------------------- |
| `cb`      | (`error`: { `errorId`: `string`; } & [`ErrorStartEvent`](../ErrorStartEvent/)) => `void` | Callback receiving the error event |

#### Returns

Cleanup function to remove the handler

> (): `void`

##### Returns

`void`

#### Example

```
part.onErrorStart((error) => {
  console.error(`Content part error: ${error.message}`);
});
```

______________________________________________________________________

### sendChunk()

> **sendChunk**(`chunk`: [`ContentPartChunkEvent`](../ContentPartChunkEvent/)): `void`

Sends a content part chunk

#### Parameters

| Parameter | Type                                                 | Description        |
| --------- | ---------------------------------------------------- | ------------------ |
| `chunk`   | [`ContentPartChunkEvent`](../ContentPartChunkEvent/) | Chunk data to send |

#### Returns

`void`

#### Example

```
part.sendChunk({ data: 'Hello ' });
part.sendChunk({ data: 'world!' });
```

______________________________________________________________________

### sendContentPartEnd()

> **sendContentPartEnd**(`endContentPart?`: [`ContentPartEndEvent`](../ContentPartEndEvent/)): `void`

Ends the content part stream

#### Parameters

| Parameter         | Type                                             | Description             |
| ----------------- | ------------------------------------------------ | ----------------------- |
| `endContentPart?` | [`ContentPartEndEvent`](../ContentPartEndEvent/) | Optional end event data |

#### Returns

`void`

#### Example

```
part.sendContentPartEnd();
```
