# Conversation Service API Analysis

## Executive Summary

This document analyzes the public API exposed by the `ConversationEventHelperManager` (accessed via `conversations.events` or directly on `ConversationService`) to determine which methods should be exposed to SDK users and which should remain internal.

---

## Current Architecture

```
ConversationalAgentService
    └── conversations (ConversationService)
            └── events (ConversationEventHelperManager)  ← WebSocket event handling
```

**Goal**: Simplify the API by moving WebSocket methods directly to `ConversationService`, eliminating the need for users to access `.events`.

---

## API Methods Analysis

### Tier 1: Essential Methods (Recommended for Public API)

These methods are actively used by the AgentInterfaces React SDK and are essential for building chat applications.

| Method | Purpose | Used in React SDK |
|--------|---------|-------------------|
| `startSession(options)` | **Primary entry point** - Creates a real-time WebSocket session for a conversation. Returns a `SessionEventHelper` for sending/receiving messages. | Yes |
| `onSessionStart(handler)` | Register callback for when new sessions start. Useful for multi-conversation management. | No (uses `session.onSessionStarted` instead) |
| `getSession(conversationId)` | Retrieve an existing active session by conversation ID. | No |
| `sessions` | Iterator to enumerate all active sessions. | No |

**Recommendation**: Expose these 4 methods directly on `ConversationService`.

---

### Tier 2: Connection Management (Recommended for Public API)

These methods manage the underlying WebSocket connection.

| Method | Purpose |
|--------|---------|
| `disconnect()` | Closes WebSocket connection and releases all session resources. |
| `connectionStatus` | Current connection state (connecting, connected, disconnected, error). |
| `isConnected` | Boolean shorthand for checking if connected. |
| `connectionError` | The current error if connection failed. |
| `onConnectionStatusChanged(handler)` | Listen for connection state changes. |

**Recommendation**: Expose these on `ConversationService` (already implemented).

---

### Tier 3: Advanced/Low-Level Methods (Internal Use Only)

These methods provide low-level access to the event system. They are not needed for typical chat applications and should remain internal or be used only by advanced users.

| Method | Purpose | Recommendation |
|--------|---------|----------------|
| `makeId()` | Generates UUID for internal IDs | Internal |
| `emitAny(event)` | Send raw conversation events directly | Internal |
| `onAny(handler)` | Listen to ALL raw events | Internal |
| `sendErrorStart(options)` | Emit error start event | Internal |
| `sendErrorEnd(options)` | Emit error end event | Internal |
| `onAnyErrorStart(handler)` | Global error start listener | Advanced |
| `onAnyErrorEnd(handler)` | Global error end listener | Advanced |
| `onUnhandledErrorStart(handler)` | Catch-all for unhandled errors | Advanced |
| `onUnhandledErrorEnd(handler)` | Catch-all for unhandled error ends | Advanced |

**Recommendation**: Do not expose these directly on `ConversationService`. Users who need them can still access via `events` getter (if we keep it) or through the helper objects returned by `startSession()`.

---

## React SDK Usage Patterns

From analyzing `AgentInterfaces/lib/react-sdk/src/providers/ConversationProvider.tsx`:

### Session Creation
```typescript
const newSession = client.conversation.event.startSession({
  conversationId: selectedConversation.conversationId,
  echo: true  // Echo events back for local rendering
});
```

### Session Event Handling
```typescript
newSession.pauseEmits();  // Buffer events until ready
newSession.onSessionStarted(() => {
  newSession.resumeEmits();
  setSessionReady(true);
});

// Error handling
newSession.onAnyErrorStart(errorStart => { ... });
newSession.onAnyErrorEnd(errorEnd => { ... });

// Exchange/Message handling
session.onExchangeStart(exchange => {
  exchange.onMessageStart(message => {
    message.onContentPartStart(contentPart => {
      contentPart.onComplete(completed => { ... });
    });
  });
  exchange.onExchangeEnd(() => { ... });
});

// Cleanup
return () => newSession.sendSessionEnd();
```

### Sending Messages
```typescript
const exchange = session.startExchange();
await message.sendContentPart({ ... });
```

### Audio Streaming
```typescript
const audioInputStream = session.startAsyncInputStream({ mimeType });
audioInputStream.sendChunk({ ... });
audioInputStream.sendAsyncInputStreamEnd();
```

---

## Proposed Simplified API

### Before (Old API)
```typescript
const agent = new ConversationalAgent(sdk);
const session = agent.events.startSession({ conversationId });
```

### After (Current API)
```typescript
const agent = new ConversationalAgent(sdk);
const session = agent.conversations.startSession({ conversationId });
```

### ConversationService Public Interface

```typescript
interface ConversationService {
  // HTTP CRUD Operations
  create(options): Promise<Conversation>;
  getById(id): Promise<Conversation>;
  getAll(options?): Promise<Conversation[]>;
  updateById(id, options): Promise<Conversation>;
  deleteById(id): Promise<void>;

  // Real-time WebSocket (NEW - moved from events)
  startSession(options): SessionEventHelper;
  onSessionStart(handler): () => void;
  getSession(conversationId): SessionEventHelper | undefined;
  readonly sessions: Iterable<SessionEventHelper>;

  // Connection Management
  disconnect(): void;
  readonly connectionStatus: ConnectionStatus;
  readonly isConnected: boolean;
  readonly connectionError: Error | null;
  onConnectionStatusChanged(handler): () => void;
}
```

---

## Implementation Status

| Task | Status |
|------|--------|
| Move WebSocket methods to ConversationService | Completed |
| Remove User service export | Completed |
| Update model interfaces | Completed |
| Update index.ts exports | Completed |
| Fix type mismatches in interface | Pending |
| Build verification | Pending |

---

## Open Questions

1. **Should we keep `events` getter?**
   - Pro: Provides access to advanced methods for power users
   - Con: Adds complexity, users might use it unnecessarily

2. **Error handling methods (`onAnyErrorStart`, etc.)**
   - These are used in React SDK but accessed via session object
   - Should we expose them on ConversationService level?

3. **Type definitions location**
   - Currently in `services/helpers` layer
   - Should they move to `models` layer for better separation?

---

## Appendix: SessionEventHelper Methods

The `SessionEventHelper` returned by `startSession()` provides these methods:

| Method | Purpose |
|--------|---------|
| `pauseEmits()` / `resumeEmits()` | Buffer control for events |
| `onSessionStarted(cb)` | Called when session is ready |
| `onExchangeStart(cb)` | Listen for new exchanges |
| `onLabelUpdated(cb)` | Listen for conversation label changes |
| `startExchange()` | Create new exchange to send messages |
| `startAsyncInputStream(options)` | Start audio input stream |
| `sendSessionEnd()` | End the session cleanly |
| `onAnyErrorStart(cb)` | Session-level error handling |
| `onAnyErrorEnd(cb)` | Session-level error end handling |

---

*Document generated for SDK API simplification review*
