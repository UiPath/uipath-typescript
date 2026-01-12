/**
 * Conversational Agent Service Models
 *
 * Interfaces defining the public API contracts for conversational agent services.
 * Services implement these interfaces to provide documented, type-safe APIs.
 */

import type {
  AgentRelease,
  AgentReleaseWithAppearance,
  AttachmentUploadResponse,
  Conversation,
  ConversationCreateResponse,
  ConversationDeleteResponse,
  ConversationId,
  ConversationResponse,
  CreateConversationInput,
  CreateFeedbackInput,
  ExchangeId,
  FeedbackCreateResponse,
  GetExchangeInput,
  ListConversationsInput,
  ListExchangesInput,
  LlmOpsSpan,
  MessageId,
  ContentPartId,
  UpdateConversationInput,
  UpdateUserSettingsInput,
  UserSettings
} from './index';

import type { PaginatedResponse, NonPaginatedResponse, HasPaginationOptions } from '../../utils/pagination';
import type { ExchangeWithHelpers, MessageWithHelpers } from '../../services/conversational-agent/helpers';
import type { ContentPartHelper } from '../../services/conversational-agent/helpers/content-part-helper';
import type { InitializeFileOutput } from '../../services/conversational-agent/conversations/attachments';

// ==================== Agents Service Model ====================

/**
 * Service for listing and retrieving conversational agents
 *
 * Agents are conversational AI applications that can be deployed and interacted with.
 * This service provides read-only access to agent metadata and configurations.
 * [UiPath Conversational Agents Guide](https://docs.uipath.com/automation-cloud/docs/conversational-agents)
 *
 * ### Usage
 *
 * Prerequisites: Initialize the SDK first - see [Getting Started](/uipath-typescript/getting-started/)
 *
 * ```typescript
 * import { UiPath } from '@uipath/uipath-typescript/core';
 * import { ConversationalAgent } from '@uipath/uipath-typescript/conversational-agent';
 *
 * const sdk = new UiPath(config);
 * await sdk.initialize();
 *
 * const agent = new ConversationalAgent(sdk);
 * const agents = await agent.agents.getAll();
 * ```
 */
export interface AgentsServiceModel {
  /**
   * Gets all conversational agents
   *
   * Retrieves a list of all available conversational agents, optionally filtered by folder.
   *
   * @param folderId - Optional folder ID to filter agents
   * @returns Promise resolving to an array of agent releases
   * {@link AgentRelease}
   *
   * @example
   * ```typescript
   * // Get all agents
   * const agents = await agent.agents.getAll();
   *
   * // Get agents in a specific folder
   * const folderAgents = await agent.agents.getAll(123);
   *
   * // Access agent properties
   * for (const a of agents) {
   *   console.log(`${a.name} (ID: ${a.id}) - Folder: ${a.folderId}`);
   * }
   * ```
   */
  getAll(folderId?: number): Promise<AgentRelease[]>;

  /**
   * Gets a conversational agent by ID with appearance configuration
   *
   * Retrieves detailed information about a specific agent including its
   * visual appearance settings (colors, icons, etc.).
   *
   * @param folderId - Folder ID containing the agent
   * @param agentId - Agent ID to retrieve
   * @returns Promise resolving to the agent with appearance configuration
   * {@link AgentReleaseWithAppearance}
   *
   * @example
   * ```typescript
   * const agentWithAppearance = await agent.agents.getById(123, 456);
   * console.log(agentWithAppearance.name);
   * console.log(agentWithAppearance.appearance?.primaryColor);
   * ```
   */
  getById(folderId: number, agentId: number): Promise<AgentReleaseWithAppearance>;
}

// ==================== Exchange Operations Service Model ====================

/**
 * Service for exchange operations within conversations
 *
 * Exchanges represent individual request-response pairs within a conversation.
 * Each exchange contains messages from the user and assistant.
 *
 * ### Usage
 *
 * ```typescript
 * // Access via conversations service
 * const exchanges = await agent.conversations.exchanges.getAll(conversationId);
 * ```
 */
export interface ExchangeOperationsServiceModel {
  /**
   * Gets all exchanges for a conversation with optional filtering and pagination
   *
   * @param conversationId - The conversation ID to get exchanges for
   * @param options - Query options including optional pagination parameters
   * @returns Promise resolving to exchanges or paginated result
   * {@link ExchangeWithHelpers}
   *
   * @example
   * ```typescript
   * // Get all exchanges (non-paginated)
   * const exchanges = await agent.conversations.exchanges.getAll(conversationId);
   *
   * // First page with pagination
   * const page1 = await agent.conversations.exchanges.getAll(conversationId, { pageSize: 10 });
   *
   * // Navigate using cursor
   * if (page1.hasNextPage) {
   *   const page2 = await agent.conversations.exchanges.getAll(conversationId, {
   *     cursor: page1.nextCursor
   *   });
   * }
   * ```
   */
  getAll<T extends ListExchangesInput = ListExchangesInput>(
    conversationId: ConversationId,
    options?: T
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<ExchangeWithHelpers>
      : NonPaginatedResponse<ExchangeWithHelpers>
  >;

  /**
   * Gets an exchange by ID with its messages
   *
   * Retrieves a specific exchange including user and assistant messages.
   * Returns an ExchangeWithHelpers object that provides convenient access
   * to messages and content.
   *
   * @param conversationId - The conversation containing the exchange
   * @param exchangeId - The exchange ID to retrieve
   * @param input - Optional parameters for message sorting
   * @returns Promise resolving to the exchange with helper methods
   * {@link ExchangeWithHelpers}
   *
   * @example
   * ```typescript
   * const exchange = await agent.conversations.exchanges.getById(
   *   conversationId,
   *   exchangeId
   * );
   *
   * // Access messages via helpers
   * const userMessage = exchange.getUserMessage();
   * const assistantMessage = exchange.getAssistantMessage();
   *
   * // With message sort order
   * const exchangeSorted = await agent.conversations.exchanges.getById(
   *   conversationId,
   *   exchangeId,
   *   { messageSort: 'desc' }
   * );
   * ```
   */
  getById(
    conversationId: ConversationId,
    exchangeId: ExchangeId,
    input?: GetExchangeInput
  ): Promise<ExchangeWithHelpers>;

  /**
   * Creates feedback for an exchange
   *
   * Submits user feedback (rating and optional comment) for an exchange.
   * Useful for collecting feedback on assistant responses for quality improvement.
   *
   * @param conversationId - The conversation containing the exchange
   * @param exchangeId - The exchange to provide feedback for
   * @param input - Feedback data including rating and optional comment
   * @returns Promise resolving to the feedback creation response
   * {@link FeedbackCreateResponse}
   *
   * @example
   * ```typescript
   * // Submit positive feedback
   * await agent.conversations.exchanges.createFeedback(
   *   conversationId,
   *   exchangeId,
   *   { rating: 'positive', comment: 'Very helpful response!' }
   * );
   *
   * // Submit negative feedback
   * await agent.conversations.exchanges.createFeedback(
   *   conversationId,
   *   exchangeId,
   *   { rating: 'negative', comment: 'Response was not accurate' }
   * );
   * ```
   */
  createFeedback(
    conversationId: ConversationId,
    exchangeId: ExchangeId,
    input: CreateFeedbackInput
  ): Promise<FeedbackCreateResponse>;
}

// ==================== Message Operations Service Model ====================

/**
 * Service for message operations within conversations
 *
 * Messages are the individual turns within an exchange. Each exchange typically
 * contains a user message (the prompt) and an assistant message (the response).
 * Messages contain content parts which hold the actual text, attachments, or tool calls.
 *
 * ### Usage
 *
 * ```typescript
 * // Access via conversations service
 * const message = await agent.conversations.messages.getById(
 *   conversationId, exchangeId, messageId
 * );
 * ```
 */
export interface MessageOperationsServiceModel {
  /**
   * Gets a message by ID
   *
   * Retrieves a specific message including all its content parts.
   * Returns a MessageWithHelpers object that provides convenient methods
   * for accessing text content, tool calls, citations, and more.
   *
   * @param conversationId - The conversation containing the message
   * @param exchangeId - The exchange containing the message
   * @param messageId - The message ID to retrieve
   * @returns Promise resolving to the message with helper methods
   * {@link MessageWithHelpers}
   *
   * @example
   * ```typescript
   * const message = await agent.conversations.messages.getById(
   *   conversationId,
   *   exchangeId,
   *   messageId
   * );
   *
   * // Get all text content concatenated
   * const text = message.getTextContent();
   *
   * // Get tool calls from the message
   * const toolCalls = message.getToolCalls();
   *
   * // Get citations for verification
   * const citations = message.getCitations();
   * ```
   */
  getById(
    conversationId: ConversationId,
    exchangeId: ExchangeId,
    messageId: MessageId
  ): Promise<MessageWithHelpers>;

  /**
   * Gets a content part by ID
   *
   * Retrieves external content part data. This is used when content is stored
   * externally (e.g., large files or attachments) rather than inline in the message.
   *
   * Note: This API returns 404 for inline content parts (text). Use the message's
   * contentParts directly for inline content.
   *
   * @param conversationId - The conversation containing the content
   * @param exchangeId - The exchange containing the content
   * @param messageId - The message containing the content part
   * @param contentPartId - The content part ID to retrieve
   * @returns Promise resolving to a ContentPartHelper for accessing the data
   * {@link ContentPartHelper}
   *
   * @example
   * ```typescript
   * // Get an external content part (file/attachment)
   * const contentPart = await agent.conversations.messages.getContentPart(
   *   conversationId,
   *   exchangeId,
   *   messageId,
   *   contentPartId
   * );
   *
   * // Access the content part data
   * console.log(contentPart.getType());
   * console.log(contentPart.getData());
   * ```
   */
  getContentPart(
    conversationId: ConversationId,
    exchangeId: ExchangeId,
    messageId: MessageId,
    contentPartId: ContentPartId
  ): Promise<ContentPartHelper>;
}

// ==================== Attachment Operations Service Model ====================

/**
 * Service for attachment operations within conversations
 *
 * Attachments allow files to be uploaded and referenced in conversation messages.
 * Files are stored in external blob storage and referenced by URI in messages.
 *
 * ### Usage
 *
 * ```typescript
 * // Access via conversations service
 * const attachment = await agent.conversations.attachments.upload(conversationId, file);
 * ```
 */
export interface AttachmentOperationsServiceModel {
  /**
   * Initialize a file attachment for the conversation
   *
   * Creates the attachment entry and returns the upload details, without uploading
   * any file content. The client must handle the file upload using the returned
   * fileUploadAccess details. Use this for custom upload handling.
   *
   * @param conversationId - The conversation to attach the file to
   * @param fileName - The name of the file to initialize
   * @returns Promise resolving to attachment details with upload access
   * {@link InitializeFileOutput}
   *
   * @example
   * ```typescript
   * // Two-step initialize for custom upload handling
   * const initResult = await agent.conversations.attachments.initialize(
   *   conversationId,
   *   'document.pdf'
   * );
   *
   * // Handle upload manually using initResult.fileUploadAccess
   * const { url, verb, headers } = initResult.fileUploadAccess;
   * await fetch(url, { method: verb, body: fileContent, headers: ... });
   * ```
   */
  initialize(conversationId: ConversationId, fileName: string): Promise<InitializeFileOutput>;

  /**
   * Creates an attachment by uploading a file to a conversation
   *
   * Both initializes the attachment and uploads the file contents to the
   * attachment's storage URL. This is the recommended method for most use cases.
   *
   * @param conversationId - The conversation to attach the file to
   * @param file - The file to upload
   * @returns Promise resolving to attachment metadata with URI for referencing
   * {@link AttachmentUploadResponse}
   *
   * @example
   * ```typescript
   * // One-step upload (recommended)
   * const attachment = await agent.conversations.attachments.upload(
   *   conversationId,
   *   file
   * );
   * console.log(`Uploaded: ${attachment.uri}`);
   * console.log(`Name: ${attachment.name}`);
   * console.log(`Type: ${attachment.mimeType}`);
   * ```
   */
  upload(conversationId: ConversationId, file: File): Promise<AttachmentUploadResponse>;
}

// ==================== Conversations Service Model ====================

/**
 * Service for managing conversations and related operations
 *
 * Conversations are the main interaction container for conversational agents.
 * Each conversation can have multiple exchanges (request-response pairs).
 *
 * ### Usage
 *
 * Prerequisites: Initialize the SDK first - see [Getting Started](/uipath-typescript/getting-started/)
 *
 * ```typescript
 * import { UiPath } from '@uipath/uipath-typescript/core';
 * import { ConversationalAgent } from '@uipath/uipath-typescript/conversational-agent';
 *
 * const sdk = new UiPath(config);
 * await sdk.initialize();
 *
 * const agent = new ConversationalAgent(sdk);
 *
 * // Create a conversation
 * const conversation = await agent.conversations.create({
 *   agentReleaseId: 123,
 *   folderId: 456
 * });
 *
 * // Access sub-services
 * const exchanges = await agent.conversations.exchanges.getAll(conversation.id);
 * ```
 */
export interface ConversationsServiceModel {
  /** Exchange operations for conversations */
  readonly exchanges: ExchangeOperationsServiceModel;

  /** Message operations for conversations */
  readonly messages: MessageOperationsServiceModel;

  /** Attachment operations for conversations */
  readonly attachments: AttachmentOperationsServiceModel;

  /**
   * Creates a new conversation
   *
   * @param input - Conversation creation options
   * @returns Promise resolving to the created conversation
   * {@link ConversationCreateResponse}
   *
   * @example
   * ```typescript
   * // Using options object
   * const conversation = await agent.conversations.create({
   *   agentReleaseId: 123,
   *   folderId: 456,
   *   name: 'My Conversation'
   * });
   * ```
   */
  create(input: CreateConversationInput): Promise<ConversationCreateResponse>;

  /**
   * Creates a new conversation with agent release and folder IDs
   *
   * @param agentReleaseId - The agent release ID
   * @param folderId - The folder ID
   * @returns Promise resolving to the created conversation
   * {@link ConversationCreateResponse}
   *
   * @example
   * ```typescript
   * // Using positional parameters
   * const conversation = await agent.conversations.create(123, 456);
   * ```
   */
  create(agentReleaseId: number, folderId: number): Promise<ConversationCreateResponse>;

  /**
   * Gets a conversation by ID
   *
   * @param conversationId - The conversation ID to retrieve
   * @returns Promise resolving to the conversation details
   * {@link ConversationResponse}
   *
   * @example
   * ```typescript
   * const conversation = await agent.conversations.getById(conversationId);
   * console.log(conversation.name);
   * console.log(conversation.agentReleaseId);
   * ```
   */
  getById(conversationId: ConversationId): Promise<ConversationResponse>;

  /**
   * Gets all conversations with optional filtering and pagination
   *
   * @param options - Query options including optional pagination parameters
   * @returns Promise resolving to conversations or paginated result
   * {@link Conversation}
   *
   * @example
   * ```typescript
   * // Get all conversations (non-paginated)
   * const conversations = await agent.conversations.getAll();
   *
   * // First page with pagination
   * const page1 = await agent.conversations.getAll({ pageSize: 10 });
   *
   * // Navigate using cursor
   * if (page1.hasNextPage) {
   *   const page2 = await agent.conversations.getAll({ cursor: page1.nextCursor });
   * }
   * ```
   */
  getAll<T extends ListConversationsInput = ListConversationsInput>(
    options?: T
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<Conversation>
      : NonPaginatedResponse<Conversation>
  >;

  /**
   * Updates a conversation
   *
   * @param conversationId - The conversation ID to update
   * @param input - Fields to update
   * @returns Promise resolving to the updated conversation
   * {@link ConversationResponse}
   *
   * @example
   * ```typescript
   * const updated = await agent.conversations.update(conversationId, {
   *   name: 'Updated Name'
   * });
   * ```
   */
  update(
    conversationId: ConversationId,
    input: UpdateConversationInput
  ): Promise<ConversationResponse>;

  /**
   * Deletes a conversation
   *
   * @param conversationId - The conversation ID to delete
   * @returns Promise resolving to the deletion response
   * {@link ConversationDeleteResponse}
   *
   * @example
   * ```typescript
   * await agent.conversations.remove(conversationId);
   * ```
   */
  remove(conversationId: ConversationId): Promise<ConversationDeleteResponse>;
}

// ==================== Traces Service Model ====================

/**
 * Service for accessing LLM Operations traces
 *
 * Traces provide observability into LLM operations during conversational agent sessions.
 * Each conversation can have a traceId that links to spans representing
 * LLM calls, tool executions, and agent operations.
 *
 * ### Usage
 *
 * ```typescript
 * // Create a conversation with a trace ID
 * const conversation = await agent.conversations.create({
 *   agentReleaseId: 123,
 *   folderId: 456,
 *   traceId: 'my-trace-id'
 * });
 *
 * // Later, retrieve the trace spans
 * const spans = await agent.traces.getSpans('my-trace-id');
 * ```
 */
export interface TracesServiceModel {
  /**
   * Get all spans for a given trace ID
   *
   * Retrieves the distributed trace spans associated with a conversation trace.
   * Each span represents an operation (LLM call, tool execution, etc.) and
   * contains timing, status, and attribute information.
   *
   * @param traceId - The trace ID to retrieve spans for
   * @returns Promise resolving to array of LLM Ops spans
   * {@link LlmOpsSpan}
   *
   * @example
   * ```typescript
   * const spans = await agent.traces.getSpans('550e8400-e29b-41d4-a716-446655440000');
   *
   * // Find spans with errors
   * const errorSpans = spans.filter(s => s.Status === LlmOpsSpanStatus.Error);
   *
   * // Calculate total duration
   * const rootSpan = spans.find(s => !s.ParentId);
   * if (rootSpan?.StartTime && rootSpan?.EndTime) {
   *   const duration = new Date(rootSpan.EndTime).getTime() -
   *                    new Date(rootSpan.StartTime).getTime();
   *   console.log(`Total duration: ${duration}ms`);
   * }
   * ```
   */
  getSpans(traceId: string): Promise<LlmOpsSpan[]>;
}

// ==================== User Service Model ====================

/**
 * Service for managing user profile and context settings
 *
 * User settings are passed to the agent for all conversations
 * to provide user context (name, email, role, timezone, etc.).
 *
 * ### Usage
 *
 * ```typescript
 * // Get current user settings
 * const settings = await agent.user.getSettings();
 *
 * // Update user settings
 * await agent.user.updateSettings({
 *   name: 'John Doe',
 *   timezone: 'America/New_York'
 * });
 * ```
 */
export interface UserServiceModel {
  /**
   * Gets the current user's profile and context settings
   *
   * @returns Promise resolving to user settings object
   * {@link UserSettings}
   *
   * @example
   * ```typescript
   * const settings = await agent.user.getSettings();
   * console.log(settings.name);      // User's name
   * console.log(settings.email);     // User's email
   * console.log(settings.timezone);  // User's timezone
   * ```
   */
  getSettings(): Promise<UserSettings>;

  /**
   * Updates the current user's profile and context settings
   *
   * All fields are optional - only send the fields you want to change.
   * Set fields to `null` to explicitly clear them.
   *
   * @param input - Fields to update
   * @returns Promise resolving to updated user settings
   * {@link UserSettings}
   *
   * @example
   * ```typescript
   * // Update specific fields
   * const updated = await agent.user.updateSettings({
   *   name: 'John Doe',
   *   email: 'john@example.com',
   *   timezone: 'America/New_York'
   * });
   *
   * // Clear fields by setting to null
   * await agent.user.updateSettings({
   *   role: null,
   *   department: null
   * });
   * ```
   */
  updateSettings(input: UpdateUserSettingsInput): Promise<UserSettings>;
}

// ==================== Conversational Agent Service Model ====================

/**
 * Main service for interacting with UiPath Conversational Agents
 *
 * Provides access to:
 * - agents: List and retrieve conversational agents
 * - conversations: Manage conversations, exchanges, messages, and attachments
 * - user: Manage user profile and context settings
 * - traces: Access LLM Operations traces for observability
 * - events: Real-time WebSocket events for streaming responses
 *
 * ### Usage
 *
 * Prerequisites: Initialize the SDK first - see [Getting Started](/uipath-typescript/getting-started/)
 *
 * ```typescript
 * import { UiPath } from '@uipath/uipath-typescript/core';
 * import { ConversationalAgent } from '@uipath/uipath-typescript/conversational-agent';
 *
 * const sdk = new UiPath({
 *   baseUrl: 'https://cloud.uipath.com',
 *   orgName: 'myorg',
 *   tenantName: 'mytenant',
 *   secret: 'your-secret'
 * });
 * await sdk.initialize();
 *
 * const agent = new ConversationalAgent(sdk);
 *
 * // HTTP Operations
 * const agentList = await agent.agents.getAll();
 * const conversation = await agent.conversations.create({
 *   agentReleaseId: agentList[0].id,
 *   folderId: agentList[0].folderId
 * });
 *
 * // WebSocket Operations (real-time streaming)
 * agent.events.onSession((session) => {
 *   session.onExchangeStart((exchange) => {
 *     console.log('Exchange started:', exchange.exchangeId);
 *   });
 *   session.onMessageChunk((chunk) => {
 *     process.stdout.write(chunk.text);
 *   });
 * });
 * ```
 */
export interface ConversationalAgentServiceModel {
  /** Service for listing and retrieving conversational agents */
  readonly agents: AgentsServiceModel;

  /** Service for managing conversations and related operations */
  readonly conversations: ConversationsServiceModel;

  /** Service for managing user profile and context settings */
  readonly user: UserServiceModel;

  /** Service for accessing LLM Operations traces */
  readonly traces: TracesServiceModel;
}
