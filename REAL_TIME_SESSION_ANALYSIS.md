# Real-Time Session Architecture

**Purpose:** Architecture overview for developers integrating with Conversational Agent WebSocket API
**Status:** Internal reference document

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    ConversationalAgent                          │
│                 (WebSocket connection manager)                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Session                                  │
│              (Conversation-scoped connection)                   │
│                                                                 │
│   Purpose: Manages real-time bidirectional communication        │
│   Lifecycle: startSession() → events → sendSessionEnd()         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Exchange                                  │
│                  (Request/Response pair)                        │
│                                                                 │
│   Purpose: Groups a user prompt with the agent's response       │
│   Contains: Multiple messages (user input + assistant reply)    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Message                                  │
│                 (Single speaker's turn)                         │
│                                                                 │
│   Purpose: Contains content from one participant                │
│   Roles: user | assistant | system                              │
│   Helpers: message.isAssistant, message.isUser, message.role    │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
┌─────────────────────────┐     ┌─────────────────────────┐
│      ContentPart        │     │       ToolCall          │
│   (Text/Audio/Files)    │     │  (Function invocation)  │
│                         │     │                         │
│ Helpers:                │     │ Purpose: Agent requests │
│  part.isText            │     │ external action         │
│  part.isAudio           │     │                         │
│  part.mimeType          │     │ Flow: Start → Execute   │
│                         │     │       → sendToolCallEnd │
└─────────────────────────┘     └─────────────────────────┘
```

---

## 2. Quick Start

### Basic Chat (Simplest Usage)

```typescript
import { ConversationalAgent } from '@uipath/uipath-typescript/conversational-agent';

const agent = new ConversationalAgent(sdk);

// Create conversation and start session
const conversation = await agent.conversations.create({ agentReleaseId, folderId });
const session = conversation.startSession();

// Listen for responses
session.onExchangeStart((exchange) => {
  exchange.onMessageStart((message) => {
    if (message.isAssistant) {
      message.onContentPartStart((part) => {
        if (part.isText) {
          part.onChunk((chunk) => process.stdout.write(chunk.data ?? ''));
        }
      });
    }
  });
});

// Send message
session.sendPrompt({ text: 'Hello!' });
```

### With Full Control

```typescript
const session = conversation.startSession({ echo: true });

session.onSessionStarted(() => {
  const exchange = session.startExchange();

  exchange.onMessageStart((message) => {
    // Handle by role
    if (message.isAssistant) handleAssistant(message);
    if (message.isUser) handleUserEcho(message);  // Only with echo:true
  });

  exchange.sendMessageWithContentPart({ data: 'Hello!', mimeType: 'text/markdown' });
});
```

---

## 3. Event Helpers Reference

### SessionEventHelper

| Method | Purpose |
|--------|---------|
| `sendPrompt({ text })` | Quick way to send user message |
| `startExchange()` | Begin request/response cycle |
| `sendSessionEnd()` | Close session gracefully |
| `onExchangeStart(cb)` | Handle incoming exchanges |
| `onSessionEnd(cb)` | Handle session termination |
| `onAnyErrorStart(cb)` | Catch all errors |

### ExchangeEventHelper

| Method | Purpose |
|--------|---------|
| `startMessage(opts)` | Begin a new message |
| `sendMessageWithContentPart(opts)` | Quick send text message |
| `onMessageStart(cb)` | Handle incoming messages |
| `onExchangeEnd(cb)` | Know when exchange completes |

### MessageEventHelper

| Property/Method | Purpose |
|-----------------|---------|
| `role` | Get message role (user/assistant/system) |
| `isAssistant` | Check if from AI agent |
| `isUser` | Check if from user |
| `isSystem` | Check if system message |
| `onContentPartStart(cb)` | Handle streaming content |
| `onToolCallStart(cb)` | Handle tool invocations |
| `onInterruptStart(cb)` | Handle interrupts |
| `onCompleted(cb)` | Get full message when done |

### ContentPartEventHelper

| Property/Method | Purpose |
|-----------------|---------|
| `mimeType` | Get content MIME type |
| `isText` | Check if text/* content |
| `isAudio` | Check if audio/* content |
| `isImage` | Check if image/* content |
| `isMarkdown` | Check if text/markdown |
| `onChunk(cb)` | Receive streaming chunks |
| `onComplete(cb)` | Get accumulated content |

---

## 4. Common Patterns

### Pattern 1: Streaming Text Display

**When:** You want to show AI responses character-by-character as they arrive (like ChatGPT).

**Why:** Improves perceived responsiveness. Users see output immediately instead of waiting for the full response.

**Use Case:** Chat UIs, real-time typing indicators, progress feedback.

```typescript
message.onContentPartStart((part) => {
  if (part.isText) {
    part.onChunk((chunk) => {
      // Stream to UI as chunks arrive
      appendToUI(chunk.data);
    });
  }
});
```

---

### Pattern 2: Wait for Complete Response

**When:** You need the full response before processing (e.g., parsing JSON, validation, logging).

**Why:** Some operations require complete data - you can't parse half a JSON object.

**Use Case:** API responses, data extraction, saving to database, analytics.

```typescript
message.onCompleted((completed) => {
  // All content parts and tool calls are done
  console.log('Full response:', completed.contentParts);
  console.log('Tool calls:', completed.toolCalls);
});
```

---

### Pattern 3: Handle Tool Calls

**When:** The AI agent needs to execute external actions (run automation, call API, query database).

**Why:** Agents can't perform actions directly - they request the client to execute tools and return results.

**Use Case:** Running UiPath automations, fetching live data, performing calculations.

```typescript
message.onToolCallStart((toolCall) => {
  const { name, input } = toolCall.startEvent;

  // Execute the tool (e.g., UiPath automation)
  const result = await executeAutomation(name, input);

  // Send result back to agent
  toolCall.sendToolCallEnd({ output: JSON.stringify(result) });
});
```

---

### Pattern 4: Handle Interrupts (Human-in-the-Loop)

**When:** The agent needs user approval before executing sensitive operations.

**Why:** Security and compliance - some actions require human confirmation (e.g., deleting data, making payments).

**Use Case:** Approval workflows, confirmation dialogs, sensitive tool execution.

```typescript
message.onInterruptStart(({ interruptId, startEvent }) => {
  if (startEvent.type === 'ToolCallConfirmation') {
    // Show confirmation dialog to user
    const approved = await showConfirmDialog(startEvent.value);

    // Send user's decision back to agent
    message.sendInterruptEnd(interruptId, {
      type: 'ToolCallConfirmation',
      value: { approved }
    });
  }
});
```

---

### Pattern 5: Handle Citations

**When:** The AI response includes references to source documents (knowledge base, PDFs, URLs).

**Why:** Provides transparency and traceability - users can verify where information came from.

**Use Case:** Knowledge base queries, document Q&A, compliance (showing sources).

```typescript
part.onChunk((chunk) => {
  if (chunk.citation?.endCitation) {
    for (const source of chunk.citation.endCitation.sources) {
      // source.url - web link
      // source.title - document name
      // source.pageNumber - PDF page reference
      addCitationToUI(source);
    }
  }
});
```

---

### Pattern 6: Audio Streaming

**When:** Building voice-enabled applications (voice assistants, accessibility features).

**Why:** Real-time audio requires streaming - can't wait for full audio file to play.

**Use Case:** Voice chat, text-to-speech playback, voice input transcription.

```typescript
// RECEIVING: Play audio as it streams from agent
message.onContentPartStart((part) => {
  if (part.isAudio) {
    part.onChunk((chunk) => audioPlayer.play(chunk.data));
  }
});

// SENDING: Stream microphone audio to agent (push-to-talk)
const exchange = session.startExchange();
const message = exchange.startMessage({});
const audioPart = message.startContentPart({ mimeType: 'audio/pcm;rate=24000' });

audioPart.sendChunk({ data: audioBuffer });  // Send mic data
audioPart.sendContentPartEnd();              // User released button
```

---

### Pattern Summary

| Pattern | When to Use | Key Benefit |
|---------|-------------|-------------|
| Streaming Text | Chat UI with typing effect | Immediate feedback |
| Complete Response | Need full data before processing | Data integrity |
| Tool Calls | Agent needs to perform actions | Extensibility |
| Interrupts | Sensitive operations need approval | Security/Compliance |
| Citations | Show information sources | Transparency |
| Audio Streaming | Voice-enabled apps | Real-time audio |
| Error Handling | Handle server/validation errors | User experience |

---

### Pattern 7: Error Handling

**When:** You need to handle errors from the server (rate limits, validation errors, server issues).

**Why:** Errors can occur at any level of the event hierarchy. Handle them to show user-friendly messages.

**Key Insight:** `onErrorStart` and `onErrorEnd` are available on ALL helper classes (inherited from base class).

#### Error Methods by Helper

| Helper Class | Method | Scope |
|--------------|--------|-------|
| `SessionEventHelper` | `session.onErrorStart(cb)` | Errors at session level |
| `SessionEventHelper` | `session.onAnyErrorStart(cb)` | **Catches ALL errors in session** |
| `ExchangeEventHelper` | `exchange.onErrorStart(cb)` | Errors during this exchange |
| `MessageEventHelper` | `message.onErrorStart(cb)` | Errors during this message |
| `ContentPartEventHelper` | `contentPart.onErrorStart(cb)` | Errors during this content |
| `ToolCallEventHelper` | `toolCall.onErrorStart(cb)` | Errors during tool execution |

#### Usage Examples

```typescript
// RECOMMENDED: Catch all errors at session level
session.onAnyErrorStart((error) => {
  // error.source tells you where it occurred
  // error.message contains the error description
  console.error(`Error from ${error.source}: ${error.message}`);
  showErrorToast(error.message);
});

// Alternative: Handle errors at specific levels
session.onErrorStart((error) => {
  console.error('Session error:', error.message);
});

exchange.onErrorStart((error) => {
  console.error('Exchange error:', error.message);
});

message.onErrorStart((error) => {
  console.error('Message error:', error.message);
});
```

#### Error Callback Parameters

```typescript
// ErrorStartHandler receives:
session.onErrorStart(({ errorId, message, details }) => {
  console.log('Error ID:', errorId);      // Unique error identifier
  console.log('Message:', message);        // Human-readable message
  console.log('Details:', details);        // Additional error info
});

// AnyErrorStartHandler receives additional 'source':
session.onAnyErrorStart(({ source, errorId, message, details }) => {
  console.log('Source:', source);          // Which helper had the error
  // source examples: 'session', 'exchange', 'message', 'contentPart'
});
```

#### Best Practice

```typescript
// Use onAnyErrorStart for global error handling
const session = conversation.startSession();

session.onAnyErrorStart((error) => {
  // Single handler catches ALL errors
  setError(`Error: ${error.message}`);

  // Log for debugging
  console.error(`[${error.source}] ${error.errorId}: ${error.message}`);
});

// Optional: Handle specific errors at lower levels
exchange.onErrorStart((error) => {
  // Only if you need special handling for exchange errors
  if (error.message.includes('rate limit')) {
    showRetryDialog();
  }
});
```

---

## 5. Design Philosophy

### User Control Principle

The SDK provides **raw events + helper methods**, not opinionated abstractions:

```
┌─────────────────────────────────────────────────────┐
│  SDK provides:                                      │
│    - Events exactly as server sends them            │
│    - Helper methods for common checks               │
│    - Completion aggregators (optional)              │
├─────────────────────────────────────────────────────┤
│  User decides:                                      │
│    - How to accumulate data                         │
│    - When to render (streaming vs complete)         │
│    - Which events matter to their app               │
│    - Their own abstractions on top                  │
└─────────────────────────────────────────────────────┘
```

### Why This Design?

| Principle | How SDK Implements It |
|-----------|----------------------|
| **No hidden magic** | Events flow as server sends |
| **User controls state** | They decide accumulation |
| **Composable** | Build custom patterns on top |
| **Future-proof** | New events don't break existing code |

---

## 6. Connection Lifecycle

```
┌──────────────┐    startSession()    ┌──────────────┐
│ Disconnected │ ──────────────────▶  │  Connecting  │
└──────────────┘                      └──────────────┘
       ▲                                     │
       │                              onSessionStarted()
       │                                     ▼
       │                              ┌──────────────┐
  disconnect()                        │  Connected   │◀─┐
  or error                            └──────────────┘  │
       │                                     │          │
       │                              sendSessionEnd()  │
       │                                     ▼          │
       │                              ┌──────────────┐  │
       └───────────────────────────── │   Ending     │──┘
                                      └──────────────┘  reconnect
```

### Connection Status

```typescript
agent.connectionStatus    // 'disconnected' | 'connecting' | 'connected'
agent.isConnected         // boolean
agent.connectionError     // Error | null

agent.onConnectionStatusChanged((status, error) => {
  console.log('Status:', status);
});
```

---

## 7. Event Flow Summary

```
User sends message:
  session.sendPrompt({ text })
       │
       ▼
Server responds with events:
  ExchangeStart
       │
       ├──▶ MessageStart (role: assistant)
       │         │
       │         ├──▶ ContentPartStart (mimeType: text/markdown)
       │         │         │
       │         │         ├──▶ Chunk { data: "Hello" }
       │         │         ├──▶ Chunk { data: " there!" }
       │         │         └──▶ ContentPartEnd
       │         │
       │         ├──▶ ToolCallStart (optional)
       │         │         └──▶ ToolCallEnd
       │         │
       │         └──▶ MessageEnd
       │
       └──▶ ExchangeEnd
```

---

## 8. Quick Reference

| What You Want | How To Do It |
|---------------|--------------|
| Send text | `session.sendPrompt({ text })` |
| Stream response | `part.onChunk(cb)` |
| Get full response | `message.onCompleted(cb)` |
| Check if assistant | `message.isAssistant` |
| Check if text | `part.isText` |
| Handle tool calls | `message.onToolCallStart(cb)` |
| Handle interrupts | `message.onInterruptStart(cb)` |
| Clean disconnect | `session.sendSessionEnd()` |
| Force disconnect | `agent.disconnect()` |

---

## 9. Server Events Reference

### Event Types (All Events from Server)

| Event | Description | SDK Exposes | Handler |
|-------|-------------|-------------|---------|
| **Session Level** ||||
| `SessionStartEvent` | Client initiates session | Yes | `startSession()` sends this |
| `SessionStartedEvent` | Server confirms session ready | Yes | `onSessionStarted(cb)` |
| `SessionEndingEvent` | Server warns session will close | Yes | `onSessionEnding(cb)` |
| `SessionEndEvent` | Session terminated | Yes | `onSessionEnd(cb)` |
| **Exchange Level** ||||
| `ExchangeStartEvent` | New request/response cycle begins | Yes | `onExchangeStart(cb)` |
| `ExchangeEndEvent` | Exchange completed | Yes | `onExchangeEnd(cb)` |
| **Message Level** ||||
| `MessageStartEvent` | New message begins (has `role`) | Yes | `onMessageStart(cb)` |
| `MessageEndEvent` | Message completed | Yes | `onMessageEnd(cb)` |
| **Content Level** ||||
| `ContentPartStartEvent` | Content stream begins (has `mimeType`) | Yes | `onContentPartStart(cb)` |
| `ContentPartChunkEvent` | Streaming data chunk | Yes | `onChunk(cb)` |
| `ContentPartEndEvent` | Content stream completed | Yes | `onContentPartEnd(cb)` |
| **Tool Calls** ||||
| `ToolCallStartEvent` | Agent invokes a tool | Yes | `onToolCallStart(cb)` |
| `ToolCallEndEvent` | Tool execution completed | Yes | `onToolCallEnd(cb)` |
| **Interrupts** ||||
| `InterruptStartEvent` | Human-in-the-loop request | Yes | `onInterruptStart(cb)` |
| `InterruptEndEvent` | Interrupt resolved | Yes | `onInterruptEnd(cb)` |
| **Errors** ||||
| `ErrorStartEvent` | Error occurred | Yes | `session.onErrorStart(cb)`, `exchange.onErrorStart(cb)`, `message.onErrorStart(cb)` |
| `ErrorEndEvent` | Error resolved | Yes | `session.onErrorEnd(cb)`, `exchange.onErrorEnd(cb)`, `message.onErrorEnd(cb)` |
| **Citations** ||||
| `CitationStartEvent` | Citation begins in chunk | Yes | Via `chunk.citation` |
| `CitationEndEvent` | Citation ends with sources | Yes | Via `chunk.citation.endCitation` |
| **Async Streams (Audio)** ||||
| `AsyncInputStreamStartEvent` | Voice input stream begins | Yes | `onInputStreamStart(cb)` |
| `AsyncInputStreamChunkEvent` | Audio data chunk | Yes | `onChunk(cb)` |
| `AsyncInputStreamEndEvent` | Voice input stream ends | Yes | `onAsyncInputStreamEnd(cb)` |
| **Other** ||||
| `LabelUpdatedEvent` | Conversation label changed | Yes | `onLabelUpdated(cb)` |
| `MetaEvent` | Arbitrary metadata | Yes | `onMetaEvent(cb)` |

### Event Usage Summary

```
┌─────────────────────────────────────────────────────────────────┐
│  FULLY EXPOSED (with dedicated handlers)                        │
├─────────────────────────────────────────────────────────────────┤
│  Session:    SessionStarted, SessionEnding, SessionEnd          │
│  Exchange:   ExchangeStart, ExchangeEnd                         │
│  Message:    MessageStart, MessageEnd                           │
│  Content:    ContentPartStart, ContentPartChunk, ContentPartEnd │
│  ToolCall:   ToolCallStart, ToolCallEnd                         │
│  Interrupt:  InterruptStart, InterruptEnd                       │
│  Error:      ErrorStart, ErrorEnd                               │
│  Audio:      AsyncInputStreamStart, Chunk, End                  │
│  Other:      LabelUpdated, MetaEvent                            │
├─────────────────────────────────────────────────────────────────┤
│  EMBEDDED IN OTHER EVENTS                                       │
├─────────────────────────────────────────────────────────────────┤
│  Citation:   Delivered via ContentPartChunkEvent.citation       │
└─────────────────────────────────────────────────────────────────┘
```

### Key Event Properties

| Event | Key Properties | Helper Access |
|-------|----------------|---------------|
| `MessageStartEvent` | `role: 'user' \| 'assistant' \| 'system'` | `message.role`, `message.isAssistant` |
| `ContentPartStartEvent` | `mimeType: string` | `part.mimeType`, `part.isText` |
| `ContentPartChunkEvent` | `data: string`, `citation?: CitationEvent` | Via `onChunk(cb)` |
| `ToolCallStartEvent` | `name: string`, `input: any` | `toolCall.startEvent.name` |
| `InterruptStartEvent` | `type: string`, `value: any` | `startEvent.type` |
| `SessionEndingEvent` | `timeToLiveMS: number` | Direct access |

### What's NOT Exposed (Internal)

| Event/Type | Reason |
|------------|--------|
| `ConversationEvent` | Internal wrapper containing all events |
| `MessageEvent` | Internal aggregate type |
| `ExchangeEvent` | Internal aggregate type |
| `ContentPartEvent` | Internal aggregate type |
| `ToolCallEvent` | Internal aggregate type |
| `SessionCapabilities` | Handled internally during handshake |

---

## 10. Event Helper Manager (`_getEvents()`)

The `ConversationEventHelperManager` is the internal event dispatcher that routes WebSocket events to the appropriate helpers. The `ConversationService` exposes some methods directly, keeps others internal.

### Methods Exposed via ConversationService

| Method | Exposed As | Description | When to Use |
|--------|------------|-------------|-------------|
| `startSession()` | `conversations.startSession()` | Creates a new real-time session | Starting a chat session |
| `onSessionStart()` | `conversations.onSessionStart()` | Listen for new sessions starting | Multi-session apps |
| `getSession()` | `conversations.getSession()` | Get existing session by ID | Resume/check session |
| `sessions` | `conversations.sessions` | Iterator over all active sessions | List all sessions |

### Methods NOT Exposed (Internal)

| Method | Description | Why Not Exposed |
|--------|-------------|-----------------|
| `emitAny()` | Send raw event to WebSocket | Too low-level; users should use helper methods |
| `onAny()` | Receive all raw events | Too low-level; use specific event handlers instead |
| `sendErrorStart()` | Send error to server | Internal error handling; SDK handles errors |
| `sendErrorEnd()` | Mark error resolved | Internal error handling |
| `onAnyErrorStart()` | Global error listener | Internal; errors bubble up through helpers |
| `onAnyErrorEnd()` | Global error end listener | Internal |
| `onUnhandledErrorStart()` | Catch unhandled errors | Internal; prevents silent failures |
| `onUnhandledErrorEnd()` | Catch unhandled error ends | Internal |
| `dispatch()` | Route event to helpers | Internal dispatch mechanism |
| `removeSession()` | Clean up session | Internal lifecycle management |

### Why Some Methods Are Internal

```
┌─────────────────────────────────────────────────────────────────┐
│  PUBLIC (via ConversationService)                               │
│                                                                 │
│  startSession()    → User initiates connection                  │
│  onSessionStart()  → User wants to know when sessions start     │
│  getSession()      → User retrieves existing session            │
│  sessions          → User lists all sessions                    │
├─────────────────────────────────────────────────────────────────┤
│  INTERNAL (hidden in _getEvents())                              │
│                                                                 │
│  emitAny()         → Raw socket send (bypasses helpers)         │
│  onAny()           → Raw event listener (unstructured)          │
│  dispatch()        → Event routing logic                        │
│  removeSession()   → Cleanup (automatic on session end)         │
│  sendErrorStart()  → SDK-level error reporting                  │
│  onAnyError*()     → Global error handlers (SDK uses these)     │
│  onUnhandledError*() → Fallback error handlers                  │
└─────────────────────────────────────────────────────────────────┘
```

### Internal Method Explanations

| Method | What It Does | Why Internal |
|--------|--------------|--------------|
| **`emitAny(event)`** | Sends any `ConversationEvent` directly to WebSocket | Bypasses all helper validation. Users should use typed methods like `session.sendPrompt()` |
| **`onAny(cb)`** | Receives every raw event before dispatch | For debugging/logging only. Users should use structured handlers like `onExchangeStart()` |
| **`dispatch(event)`** | Routes incoming event to correct session/exchange/message | Core internal routing. Called by SessionManager when events arrive |
| **`removeSession(helper)`** | Removes session from internal map | Called automatically when session ends. Manual removal could break state |
| **`sendErrorStart()`** | Emits error event to server | SDK uses this internally. User errors should be thrown as exceptions |
| **`onAnyErrorStart(cb)`** | Catches errors from any nested helper | SDK registers this to handle errors globally. Users handle errors via `session.onErrorStart()` |
| **`onUnhandledErrorStart(cb)`** | Catches errors with no handler | Last-resort handler. If no handler exists, throws unhandled rejection |

### Error Handling Flow

```
Error occurs in server response
         │
         ▼
dispatch() receives error event
         │
         ▼
┌─────────────────────────────────────┐
│ Try session.onErrorStart handlers   │
│ (user-registered handlers)          │
└─────────────────────────────────────┘
         │
         ▼ (if no handlers)
┌─────────────────────────────────────┐
│ Try onAnyErrorStart handlers        │
│ (global error handlers)             │
└─────────────────────────────────────┘
         │
         ▼ (if no handlers)
┌─────────────────────────────────────┐
│ Try onUnhandledErrorStart handlers  │
│ (fallback handlers)                 │
└─────────────────────────────────────┘
         │
         ▼ (if no handlers)
┌─────────────────────────────────────┐
│ Throw unhandled promise rejection   │
│ (prevents silent failures)          │
└─────────────────────────────────────┘
```

### Design Decision

The SDK exposes **just enough** to let users manage sessions, while keeping internal plumbing hidden:

| Layer | User Sees | SDK Handles Internally |
|-------|-----------|------------------------|
| Session Management | `startSession()`, `getSession()` | `dispatch()`, `removeSession()` |
| Event Sending | `session.sendPrompt()` | `emitAny()` |
| Event Receiving | `session.onExchangeStart()` | `onAny()`, routing |
| Error Handling | `session.onErrorStart()` | `onAnyError*()`, `onUnhandledError*()` |
