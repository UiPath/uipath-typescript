/**
 * ConversationalAgent - Comprehensive test page for ALL TypeScript SDK features
 *
 * Tests ALL functionality matching AgentInterfaces SDK:
 * - Agent API: getAll, getById
 * - Conversation API: create, getAll, get, update, delete
 * - Exchange API: getAll, get, createFeedback
 * - Message API: get, getContentPart
 * - Attachment API: upload
 * - WebSocket Events: session, exchange, messages, streaming
 * - Feature Flags: getFeatureFlags
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import {
  ConversationalAgent,
  type AgentRelease,
  type AgentReleaseWithAppearance,
  type Conversation,
  type FeatureFlags,
  type UserSettings
} from '@uipath/uipath-typescript/conversational-agent';

// Tab type for navigation
type TabType = 'chat' | 'history' | 'attachments' | 'features' | 'user';

export function ConversationalAgentTest() {
  const { sdk: uipath } = useAuth();

  // Create ConversationalAgent instance (memoized)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const conversationalAgent = useMemo(() => {
    if (!uipath) return null;
    // Cast needed due to TypeScript private field compatibility between entry points
    return new ConversationalAgent(uipath as any);
  }, [uipath]);

  // Connection state (informational - connection is managed automatically)
  const [connectionStatus, setConnectionStatus] = useState<string>('Disconnected');

  // Agent state
  const [agents, setAgents] = useState<AgentRelease[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<AgentRelease | null>(null);
  const [agentAppearance, setAgentAppearance] = useState<AgentReleaseWithAppearance | null>(null);
  const [isLoadingAgents, setIsLoadingAgents] = useState(false);

  // Conversation state
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [conversationList, setConversationList] = useState<Conversation[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);

  // Session and messaging state
  // Session helper type is internal to SDK - use any for flexibility
  const [session, setSession] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputMessage, setInputMessage] = useState<string>('');

  // Exchange history state
  // Exchange type with helper methods
  const [exchanges, setExchanges] = useState<any[]>([]);
  const [isLoadingExchanges, setIsLoadingExchanges] = useState(false);

  // Attachment state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedAttachments, setUploadedAttachments] = useState<any[]>([]);
  const [pendingAttachments, setPendingAttachments] = useState<any[]>([]); // Attachments ready to send with message
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatFileInputRef = useRef<HTMLInputElement>(null);

  // Feature flags state
  const [featureFlags, setFeatureFlags] = useState<FeatureFlags | null>(null);
  const [isLoadingFeatureFlags, setIsLoadingFeatureFlags] = useState(false);

  // User settings state
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [isLoadingUserSettings, setIsLoadingUserSettings] = useState(false);
  const [userSettingsForm, setUserSettingsForm] = useState({
    name: '',
    email: '',
    role: '',
    department: '',
    company: '',
    country: '',
    timezone: ''
  });

  // UI state
  const [activeTab, setActiveTab] = useState<TabType>('chat');
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  // Initialize SDK and set up connection status handler
  useEffect(() => {
    if (!conversationalAgent) return;

    try {
      console.log('[SDK] ConversationalAgent instance created');

      // Connection status handler
      const cleanupConnection = conversationalAgent.onConnectionStatusChanged((status: string, err: Error | null) => {
        console.log('[SDK] Connection status changed:', status, err);
        setConnectionStatus(status);
        if (err) {
          setError(`Connection error: ${err.message}`);
        }
      });

      // Global error handler for ANY error events (catches WebSocket disconnection, send errors, etc.)
      // Args structure: { source, errorId, message, details? }
      const cleanupAnyError = conversationalAgent.events.onAnyErrorStart((args: any) => {
        console.error('[SDK] Any error event:', args);
        const errorMessage = args.message || 'Unknown error';
        const errorDetails = args.details || {};
        const cause = typeof errorDetails === 'object' ? errorDetails.cause : null;
        setError(`WebSocket Error: ${errorMessage}${cause ? ` (${cause})` : ''}`);
      });

      // Unhandled error handler (fallback for errors not caught by specific session handlers)
      // Args structure: { source, errorId, message, details? }
      const cleanupUnhandledError = conversationalAgent.events.onUnhandledErrorStart((args: any) => {
        console.error('[SDK] Unhandled error event:', args);
        const errorMessage = args.message || 'Unhandled error';
        setError(`Unhandled Error: ${errorMessage}`);
      });

      return () => {
        cleanupConnection();
        cleanupAnyError();
        cleanupUnhandledError();
        conversationalAgent.disconnect();
      };
    } catch (err: any) {
      console.error('[SDK] Setup error:', err);
      setError(`Failed to initialize client: ${err.message}`);
    }
  }, [conversationalAgent]);

  // Clear success message after 3 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // ==================== AGENT API ====================

  const handleLoadAgents = async () => {
    if (!conversationalAgent) return;
    setIsLoadingAgents(true);
    setError('');

    try {
      // Test: agents.getAll()
      const response = await conversationalAgent.agents.getAll();
      console.log('[Agent API] getAll response:', response);

      setAgents(response);
      if (response.length === 0) {
        setError('No agents found. Please configure agents in Orchestrator.');
      } else {
        setSuccessMessage(`Loaded ${response.length} agent(s)`);
      }
    } catch (err: any) {
      setError(`Failed to load agents: ${err.message}`);
    } finally {
      setIsLoadingAgents(false);
    }
  };

  const handleGetAgentDetails = async () => {
    if (!conversationalAgent || !selectedAgent) return;
    setError('');

    try {
      // Test: agents.getById(folderId, agentId)
      const response = await conversationalAgent.agents.getById(
        selectedAgent.folderId,
        selectedAgent.id
      );
      console.log('[Agent API] getById response:', response);

      setAgentAppearance(response);
      setSuccessMessage('Agent appearance loaded');
    } catch (err: any) {
      setError(`Failed to get agent details: ${err.message}`);
    }
  };

  // ==================== CONVERSATION API ====================

  const handleCreateConversation = async () => {
    if (!conversationalAgent || !selectedAgent) {
      setError('Please select an agent first');
      return;
    }

    setError('');

    try {
      // Test: conversations.create(input) with all options
      const response = await conversationalAgent.conversations.create({
        agentReleaseId: selectedAgent.id,
        folderId: selectedAgent.folderId,
        label: `Test Conversation ${new Date().toLocaleTimeString()}`,
        autogenerateLabel: true
      });

      console.log('[Conversation API] create response:', response);
      setConversation(response);
      setMessages([]);
      setSuccessMessage('Conversation created successfully');
    } catch (err: any) {
      setError(`Failed to create conversation: ${err.message}`);
    }
  };

  const handleListConversations = async () => {
    if (!conversationalAgent) return;
    setIsLoadingConversations(true);
    setError('');

    try {
      // Test: conversations.getAll(options)
      const response = await conversationalAgent.conversations.getAll({
        sort: 'descending',
        limit: 20
      });

      console.log('[Conversation API] getAll response:', response);
      setConversationList(response.items);
      setSuccessMessage(`Loaded ${response.items.length} conversation(s)`);
    } catch (err: any) {
      setError(`Failed to list conversations: ${err.message}`);
    } finally {
      setIsLoadingConversations(false);
    }
  };

  const handleGetConversation = async (conversationId: string) => {
    if (!conversationalAgent) return;
    setError('');

    try {
      // Test: conversations.getById(id)
      const response = await conversationalAgent.conversations.getById(conversationId);
      console.log('[Conversation API] getById response:', response);

      setConversation(response);
      setSuccessMessage('Conversation loaded');
    } catch (err: any) {
      setError(`Failed to get conversation: ${err.message}`);
    }
  };

  const handleUpdateConversation = async () => {
    if (!conversationalAgent || !conversation) return;
    setError('');

    try {
      const newLabel = `Updated: ${new Date().toLocaleTimeString()}`;

      // Test: conversations.update(id, input)
      const response = await conversationalAgent.conversations.update(
        conversation.conversationId,
        { label: newLabel }
      );

      console.log('[Conversation API] update response:', response);
      setConversation(response);
      setSuccessMessage('Conversation label updated');
    } catch (err: any) {
      setError(`Failed to update conversation: ${err.message}`);
    }
  };

  const handleDeleteConversation = async (conversationId: string) => {
    if (!conversationalAgent) return;
    setError('');

    try {
      // Test: conversations.remove(id)
      await conversationalAgent.conversations.remove(conversationId);
      console.log('[Conversation API] remove completed');

      // Refresh list
      setConversationList(prev => prev.filter(c => c.conversationId !== conversationId));

      if (conversation?.conversationId === conversationId) {
        setConversation(null);
        setSession(null);
        setMessages([]);
      }

      setSuccessMessage('Conversation deleted');
    } catch (err: any) {
      setError(`Failed to delete conversation: ${err.message}`);
    }
  };

  // ==================== EXCHANGE API ====================

  const handleListExchanges = async () => {
    if (!conversationalAgent || !conversation) return;
    setIsLoadingExchanges(true);
    setError('');

    try {
      // Test: conversations.exchanges.getAll(conversationId, options)
      const response = await conversationalAgent.conversations.exchanges.getAll(
        conversation.conversationId,
        {
          exchangeSort: 'descending',
          messageSort: 'ascending',
          limit: 10
        }
      );

      console.log('[Exchange API] getAll response:', response);
      setExchanges(response.items);
      setSuccessMessage(`Loaded ${response.items.length} exchange(s)`);
    } catch (err: any) {
      setError(`Failed to list exchanges: ${err.message}`);
    } finally {
      setIsLoadingExchanges(false);
    }
  };

  const handleGetExchange = async (exchangeId: string) => {
    if (!conversationalAgent || !conversation) return;
    setError('');

    try {
      // Test: conversations.exchanges.getById(conversationId, exchangeId, options)
      const response = await conversationalAgent.conversations.exchanges.getById(
        conversation.conversationId,
        exchangeId,
        { messageSort: 'ascending' }
      );

      console.log('[Exchange API] getById response:', response);
      setSuccessMessage('Exchange details loaded - check console');
    } catch (err: any) {
      setError(`Failed to get exchange: ${err.message}`);
    }
  };

  const handleCreateFeedback = async (exchangeId: string, rating: 'positive' | 'negative') => {
    if (!conversationalAgent || !conversation) return;
    setError('');

    try {
      // Test: conversations.exchanges.createFeedback(conversationId, exchangeId, input)
      await conversationalAgent.conversations.exchanges.createFeedback(
        conversation.conversationId,
        exchangeId,
        {
          rating,
          comment: `Feedback from test: ${rating}`
        }
      );

      console.log('[Exchange API] createFeedback completed');
      setSuccessMessage(`Feedback "${rating}" submitted successfully`);
    } catch (err: any) {
      setError(`Failed to submit feedback: ${err.message}`);
    }
  };

  // ==================== MESSAGE API ====================

  const handleGetMessage = async (exchangeId: string, messageId: string) => {
    if (!conversationalAgent || !conversation) return;
    setError('');

    try {
      // Test: conversations.messages.getById(conversationId, exchangeId, messageId)
      const response = await conversationalAgent.conversations.messages.getById(
        conversation.conversationId,
        exchangeId,
        messageId
      );

      console.log('[Message API] getById response:', response);
      setSuccessMessage('Message loaded - check console');
    } catch (err: any) {
      setError(`Failed to get message: ${err.message}`);
    }
  };

  const handleGetContentPart = async (
    exchangeId: string,
    messageId: string,
    contentPartId: string
  ) => {
    if (!conversationalAgent || !conversation) return;
    setError('');

    try {
      // Test: conversations.messages.getContentPart(conversationId, exchangeId, messageId, contentPartId)
      // Note: This API is primarily for fetching external content parts (files, large data).
      // For inline text content, the data is already in the message response.
      const response = await conversationalAgent.conversations.messages.getContentPart(
        conversation.conversationId,
        exchangeId,
        messageId,
        contentPartId
      );

      console.log('[Message API] getContentPart response:', response);

      // Test ContentPartHelper methods
      console.log('isDataInline:', response.isDataInline);
      console.log('isDataExternal:', response.isDataExternal);

      if (response.isDataInline) {
        const data = await response.getData();
        console.log('Content data:', data);
      } else if (response.isDataExternal) {
        console.log('External data URI - fetch separately');
      }

      setSuccessMessage('Content part loaded - check console');
    } catch (err: any) {
      // 404 is expected for inline content - the endpoint only works for external content parts
      if (err.message?.includes('404') || err.message?.includes('Not Found')) {
        setError('Content part not found. Note: getContentPart API only works for external content (files). Inline text is already in the message response.');
      } else {
        setError(`Failed to get content part: ${err.message}`);
      }
    }
  };

  // ==================== ATTACHMENT API ====================

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  // Upload attachment for the Attachments tab (standalone upload)
  const handleUploadAttachment = async () => {
    if (!conversationalAgent || !conversation || !selectedFile) return;
    setIsUploading(true);
    setError('');

    try {
      // Test: conversations.attachments.upload(conversationId, file)
      const response = await conversationalAgent.conversations.attachments.upload(
        conversation.conversationId,
        selectedFile
      );

      console.log('[Attachment API] upload response:', response);

      setUploadedAttachments(prev => [...prev, {
        ...response,
        fileName: selectedFile.name,
        fileSize: selectedFile.size
      }]);

      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      setSuccessMessage(`File "${selectedFile.name}" uploaded successfully`);
    } catch (err: any) {
      setError(`Failed to upload file: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  // Initialize file attachment (without upload) - for testing the initialize API
  const handleInitializeFile = async (fileName: string) => {
    if (!conversationalAgent || !conversation) return;
    setError('');

    try {
      // Test: conversations.attachments.initialize(conversationId, fileName)
      const response = await conversationalAgent.conversations.attachments.initialize(
        conversation.conversationId,
        fileName
      );

      console.log('[Attachment API] initialize response:', response);
      console.log('File upload URL:', response.fileUploadAccess.url);
      console.log('File upload method:', response.fileUploadAccess.verb);
      console.log('File URI:', response.uri);

      setSuccessMessage(`File "${fileName}" initialized - check console for upload details`);
    } catch (err: any) {
      setError(`Failed to initialize file: ${err.message}`);
    }
  };

  // Upload attachment for chat - adds to pending attachments
  const handleChatFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !conversationalAgent || !conversation) return;

    setIsUploading(true);
    setError('');

    try {
      const response = await conversationalAgent.conversations.attachments.upload(
        conversation.conversationId,
        file
      );

      console.log('[Chat Attachment] upload response:', response);

      // Add to pending attachments for the chat message
      setPendingAttachments(prev => [...prev, {
        ...response,
        fileName: file.name,
        fileSize: file.size
      }]);

      if (chatFileInputRef.current) {
        chatFileInputRef.current.value = '';
      }

      setSuccessMessage(`File "${file.name}" ready to send`);
    } catch (err: any) {
      setError(`Failed to upload file: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  // Remove a pending attachment
  const handleRemovePendingAttachment = (index: number) => {
    setPendingAttachments(prev => prev.filter((_, i) => i !== index));
  };

  // ==================== FEATURE FLAGS ====================

  const handleLoadFeatureFlags = async () => {
    if (!conversationalAgent) return;
    setIsLoadingFeatureFlags(true);
    setError('');

    try {
      // Test: getFeatureFlags()
      const response = await conversationalAgent.getFeatureFlags();
      console.log('[Feature Flags] response:', response);

      setFeatureFlags(response);
      setSuccessMessage('Feature flags loaded');
    } catch (err: any) {
      setError(`Failed to load feature flags: ${err.message}`);
    } finally {
      setIsLoadingFeatureFlags(false);
    }
  };

  // ==================== USER SETTINGS ====================

  const handleLoadUserSettings = async () => {
    if (!conversationalAgent) return;
    setIsLoadingUserSettings(true);
    setError('');

    try {
      // Test: user.getSettings()
      const response = await conversationalAgent.user.getSettings();
      console.log('[User API] getSettings response:', response);

      setUserSettings(response);
      // Pre-fill form with current settings
      setUserSettingsForm({
        name: response.name || '',
        email: response.email || '',
        role: response.role || '',
        department: response.department || '',
        company: response.company || '',
        country: response.country || '',
        timezone: response.timezone || ''
      });
      setSuccessMessage('User settings loaded');
    } catch (err: any) {
      setError(`Failed to load user settings: ${err.message}`);
    } finally {
      setIsLoadingUserSettings(false);
    }
  };

  const handleUpdateUserSettings = async () => {
    if (!conversationalAgent) return;
    setIsLoadingUserSettings(true);
    setError('');

    try {
      // Build update object with only changed fields
      const updateInput: Record<string, string | null> = {};

      // For each field, check if it changed and add to update
      const fields = ['name', 'email', 'role', 'department', 'company', 'country', 'timezone'] as const;
      for (const field of fields) {
        const formValue = userSettingsForm[field];
        const currentValue = userSettings?.[field] || '';

        if (formValue !== currentValue) {
          // Empty string means clear the field (set to null)
          updateInput[field] = formValue || null;
        }
      }

      if (Object.keys(updateInput).length === 0) {
        setSuccessMessage('No changes to save');
        setIsLoadingUserSettings(false);
        return;
      }

      // Test: user.updateSettings(input)
      const response = await conversationalAgent.user.updateSettings(updateInput);
      console.log('[User API] updateSettings response:', response);

      setUserSettings(response);
      setSuccessMessage('User settings updated successfully');
    } catch (err: any) {
      setError(`Failed to update user settings: ${err.message}`);
    } finally {
      setIsLoadingUserSettings(false);
    }
  };

  // ==================== WEBSOCKET EVENTS ====================

  // Helper to send message with optional attachments
  const sendMessageWithAttachments = async (exchange: any, messageText: string, attachments: any[]) => {
    // Start a message
    const message = exchange.startMessage({ role: 'user' });

    // Send text content part
    if (messageText.trim()) {
      await message.sendContentPart({ data: messageText, mimeType: 'text/markdown' });
    }

    // Send attachment content parts with externalValue
    for (const attachment of attachments) {
      message.startContentPart({
        mimeType: attachment.mimeType,
        name: attachment.name,
        externalValue: { uri: attachment.uri }
      }, async (_contentPart: any) => {
        // No chunks needed for external values, just end the content part
      });
    }

    // End the message
    message.sendMessageEnd();
  };

  const handleSendMessage = async () => {
    if (!conversation || (!inputMessage.trim() && pendingAttachments.length === 0) || !conversationalAgent) {
      return;
    }

    setError('');
    const messageText = inputMessage;
    const attachmentsToSend = [...pendingAttachments];
    setInputMessage('');
    setPendingAttachments([]);

    // Add message to UI with attachment info
    const attachmentNames = attachmentsToSend.map(a => a.fileName).join(', ');
    setMessages(prev => [...prev, {
      role: 'user',
      content: messageText,
      attachments: attachmentsToSend.length > 0 ? attachmentNames : undefined
    }]);

    try {
      if (!session) {
        // Start new session
        console.log('[Events] Starting session for:', conversation.conversationId);

        const sessionHelper = conversationalAgent.events.startSession({
          conversationId: conversation.conversationId,
          echo: false
        });

        sessionHelper.onErrorStart((error: any) => {
          console.error('[Events] Session error:', error);
          setError(`Session error: ${error.message || 'Unknown error'}`);
        });

        sessionHelper.onSessionStarted(() => {
          console.log('[Events] Session started');
          setSession(sessionHelper);

          // Start exchange and send message with attachments
          const exchange = sessionHelper.startExchange();
          setupExchangeHandlers(exchange);

          if (attachmentsToSend.length > 0) {
            sendMessageWithAttachments(exchange, messageText, attachmentsToSend);
          } else {
            exchange.sendMessageWithContentPart({ data: messageText });
          }
        });
      } else {
        // Use existing session
        const exchange = session.startExchange();
        setupExchangeHandlers(exchange);

        if (attachmentsToSend.length > 0) {
          sendMessageWithAttachments(exchange, messageText, attachmentsToSend);
        } else {
          exchange.sendMessageWithContentPart({ data: messageText });
        }
      }
    } catch (err: any) {
      setError(`Failed to send message: ${err.message}`);
    }
  };

  const setupExchangeHandlers = (exchange: any) => {
    exchange.onErrorStart((error: any) => {
      console.error('[Events] Exchange error:', error);
      setError(`Exchange error: ${error.message}`);
    });

    exchange.onMessageStart((message: any) => {
      if (message.startEvent.role === 'assistant') {
        message.onContentPartStart((contentPart: any) => {
          if (contentPart.startEvent.mimeType.startsWith('text/')) {
            let fullContent = '';

            contentPart.onChunk((chunk: any) => {
              fullContent += chunk.data || '';
            });

            contentPart.onContentPartEnd(() => {
              setMessages(prev => [...prev, {
                role: 'assistant',
                content: fullContent
              }]);
            });
          }
        });
      }
    });

    exchange.onExchangeEnd(() => {
      console.log('[Events] Exchange ended');
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // ==================== RENDER ====================

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <h1 className="text-3xl font-bold mb-2">Conversation Agent</h1>
      <p className="text-gray-600 mb-6">
        Comprehensive test for ALL TypeScript SDK features (using modular ConversationalAgent)
      </p>

      {/* Connection Status (informational - connection is managed automatically) */}
      <div className="mb-4 p-4 bg-gray-100 rounded-lg border border-gray-300">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-semibold text-gray-700">Connection:</span>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            connectionStatus === 'Connected' ? 'bg-green-100 text-green-800' :
            connectionStatus === 'Connecting' ? 'bg-yellow-100 text-yellow-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {connectionStatus}
          </span>
          <span className="text-xs text-gray-500">(auto-managed)</span>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-800 rounded-lg border border-red-300">
          <p className="font-semibold">Error</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {successMessage && (
        <div className="mb-4 p-4 bg-green-100 text-green-800 rounded-lg border border-green-300">
          <p className="text-sm">{successMessage}</p>
        </div>
      )}

      {/* Agent Selection */}
      <div className="mb-6 p-4 bg-white rounded-lg border border-gray-300 shadow-sm">
        <h2 className="text-lg font-semibold mb-3">Agent Management</h2>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleLoadAgents}
            disabled={isLoadingAgents}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
          >
            {isLoadingAgents ? 'Loading...' : 'Load Agents'}
          </button>

          {agents.length > 0 && (
            <>
              <select
                value={selectedAgent?.id ?? ''}
                onChange={(e) => {
                  const agent = agents.find(a => a.id === parseInt(e.target.value));
                  setSelectedAgent(agent ?? null);
                  setAgentAppearance(null);
                }}
                className="flex-1 min-w-[200px] px-4 py-2 border border-gray-300 rounded"
              >
                <option value="">Select Agent</option>
                {agents.map(agent => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name || `Agent ${agent.id}`}
                  </option>
                ))}
              </select>

              <button
                onClick={handleGetAgentDetails}
                disabled={!selectedAgent}
                className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 disabled:opacity-50"
              >
                Get Details
              </button>

              <button
                onClick={handleCreateConversation}
                disabled={!selectedAgent || !!conversation}
                className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
              >
                {conversation ? 'Conversation Active' : 'Create Conversation'}
              </button>
            </>
          )}
        </div>

        {/* Agent Details */}
        {agentAppearance && (
          <div className="mt-4 p-4 bg-indigo-50 rounded border border-indigo-200">
            <h3 className="font-semibold text-indigo-900 mb-3">Agent Details</h3>

            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm mb-4">
              <div>
                <span className="font-medium text-indigo-800">ID:</span>
                <span className="ml-2 text-indigo-700">{agentAppearance.id}</span>
              </div>
              <div>
                <span className="font-medium text-indigo-800">Name:</span>
                <span className="ml-2 text-indigo-700">{agentAppearance.name}</span>
              </div>
              <div>
                <span className="font-medium text-indigo-800">Folder ID:</span>
                <span className="ml-2 text-indigo-700">{agentAppearance.folderId}</span>
              </div>
              <div>
                <span className="font-medium text-indigo-800">Version:</span>
                <span className="ml-2 text-indigo-700">{agentAppearance.version || 'N/A'}</span>
              </div>
              {agentAppearance.description && (
                <div className="md:col-span-2">
                  <span className="font-medium text-indigo-800">Description:</span>
                  <span className="ml-2 text-indigo-700">{agentAppearance.description}</span>
                </div>
              )}
            </div>

            {/* Appearance Section */}
            {agentAppearance.appearance && (
              <div className="border-t border-indigo-200 pt-3 mt-3">
                <h4 className="font-medium text-indigo-800 mb-2">Appearance Settings</h4>
                <div className="space-y-2 text-sm">
                  <p className="text-indigo-800">
                    <strong>Welcome Title:</strong> {agentAppearance.appearance.welcomeTitle}
                  </p>
                  {agentAppearance.appearance.welcomeDescription && (
                    <p className="text-indigo-700">
                      <strong>Welcome Description:</strong> {agentAppearance.appearance.welcomeDescription}
                    </p>
                  )}
                  {agentAppearance.appearance.agentName && (
                    <p className="text-indigo-700">
                      <strong>Agent Display Name:</strong> {agentAppearance.appearance.agentName}
                    </p>
                  )}
                  {agentAppearance.appearance.inputPlaceholder && (
                    <p className="text-indigo-700">
                      <strong>Input Placeholder:</strong> {agentAppearance.appearance.inputPlaceholder}
                    </p>
                  )}
                </div>

                {/* Starting Prompts */}
                {agentAppearance.appearance.startingPrompts && agentAppearance.appearance.startingPrompts.length > 0 && (
                  <div className="mt-3">
                    <p className="text-sm font-medium text-indigo-800 mb-2">Starting Prompts:</p>
                    <div className="flex flex-wrap gap-2">
                      {agentAppearance.appearance.startingPrompts.map(prompt => (
                        <button
                          key={(prompt as any).id}
                          onClick={() => setInputMessage((prompt as any).actualPrompt)}
                          className="px-2 py-1 text-xs bg-indigo-100 text-indigo-800 rounded hover:bg-indigo-200"
                          title={(prompt as any).actualPrompt}
                        >
                          {prompt.displayPrompt}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Conversation History */}
      <div className="mb-6 p-4 bg-white rounded-lg border border-gray-300 shadow-sm">
        <h2 className="text-lg font-semibold mb-3">Conversation History</h2>
        <div className="flex gap-3 mb-4">
          <button
            onClick={handleListConversations}
            disabled={isLoadingConversations}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {isLoadingConversations ? 'Loading...' : 'List Conversations'}
          </button>

          {conversation && (
            <button
              onClick={handleUpdateConversation}
              className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
            >
              Update Label
            </button>
          )}
        </div>

        {conversationList.length > 0 && (
          <div className="max-h-40 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 py-1 text-left">Label</th>
                  <th className="px-2 py-1 text-left">Created</th>
                  <th className="px-2 py-1 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {conversationList.map(conv => (
                  <tr key={conv.conversationId} className="border-t hover:bg-gray-50">
                    <td className="px-2 py-1">{conv.label || 'No label'}</td>
                    <td className="px-2 py-1">
                      {new Date(conv.createdAt).toLocaleString()}
                    </td>
                    <td className="px-2 py-1 space-x-2">
                      <button
                        onClick={() => handleGetConversation(conv.conversationId)}
                        className="text-blue-600 hover:underline"
                      >
                        Load
                      </button>
                      <button
                        onClick={() => handleDeleteConversation(conv.conversationId)}
                        className="text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Tabs */}
      {conversation && (
        <div className="mb-6">
          <div className="border-b border-gray-300">
            <nav className="flex space-x-4">
              {(['chat', 'history', 'attachments', 'features', 'user'] as TabType[]).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 font-medium ${
                    activeTab === tab
                      ? 'border-b-2 border-blue-500 text-blue-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </nav>
          </div>

          {/* Chat Tab */}
          {activeTab === 'chat' && (
            <div className="bg-white rounded-lg border border-gray-300 shadow-sm mt-4">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold">
                  {conversation.label || 'Conversation'}
                </h2>
                <p className="text-sm text-gray-600">ID: {conversation.conversationId}</p>
                <p className={`text-sm ${session ? 'text-green-600' : 'text-blue-600'}`}>
                  {session ? 'Session active' : 'Session will start when you send a message'}
                </p>
              </div>

              <div className="h-80 overflow-y-auto p-4 bg-gray-50">
                {messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-gray-500">
                    No messages yet. Start chatting!
                  </div>
                ) : (
                  <div className="space-y-3">
                    {messages.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[70%] p-3 rounded-lg ${
                          msg.role === 'user'
                            ? 'bg-blue-500 text-white'
                            : 'bg-white border border-gray-200 text-gray-800'
                        }`}>
                          <p className="text-xs font-semibold mb-1 opacity-75">
                            {msg.role === 'user' ? 'You' : 'Agent'}
                          </p>
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                          {msg.attachments && (
                            <p className="text-xs mt-1 opacity-75 italic">
                              Attachments: {msg.attachments}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Pending Attachments Display */}
              {pendingAttachments.length > 0 && (
                <div className="px-4 py-2 border-t border-gray-200 bg-gray-50">
                  <p className="text-xs text-gray-600 mb-1">Attachments to send:</p>
                  <div className="flex flex-wrap gap-2">
                    {pendingAttachments.map((att, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded"
                      >
                        {att.fileName}
                        <button
                          onClick={() => handleRemovePendingAttachment(idx)}
                          className="ml-1 text-blue-600 hover:text-blue-800"
                        >
                          x
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="p-4 border-t border-gray-200">
                <div className="flex gap-2">
                  {/* Hidden file input for chat attachments */}
                  <input
                    ref={chatFileInputRef}
                    type="file"
                    onChange={handleChatFileSelect}
                    className="hidden"
                  />
                  {/* Attachment button */}
                  <button
                    onClick={() => chatFileInputRef.current?.click()}
                    disabled={isUploading}
                    className="px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50"
                    title="Attach file"
                  >
                    {isUploading ? '...' : '+'}
                  </button>
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!inputMessage.trim() && pendingAttachments.length === 0}
                    className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <div className="bg-white rounded-lg border border-gray-300 shadow-sm mt-4 p-4">
              <div className="flex gap-3 mb-4">
                <button
                  onClick={handleListExchanges}
                  disabled={isLoadingExchanges}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                >
                  {isLoadingExchanges ? 'Loading...' : 'Load Exchanges'}
                </button>
              </div>

              {exchanges.length > 0 ? (
                <div className="space-y-4">
                  {exchanges.map(exchange => (
                    <div key={exchange.exchangeId} className="border rounded p-3">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium">Exchange: {exchange.exchangeId.slice(0, 8)}...</span>
                        <div className="space-x-2">
                          <button
                            onClick={() => handleGetExchange(exchange.exchangeId)}
                            className="text-blue-600 text-sm hover:underline"
                          >
                            Details
                          </button>
                          <button
                            onClick={() => handleCreateFeedback(exchange.exchangeId, 'positive')}
                            className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                          >
                            +
                          </button>
                          <button
                            onClick={() => handleCreateFeedback(exchange.exchangeId, 'negative')}
                            className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                          >
                            -
                          </button>
                        </div>
                      </div>

                      {exchange.messages && exchange.messages.length > 0 && (
                        <div className="text-sm text-gray-600 space-y-1">
                          {exchange.messages.map((msg: any) => {
                            const contentPart = msg.contentParts?.[0];
                            const isExternal = contentPart?.data?.uri !== undefined;
                            const isInline = contentPart?.data?.inline !== undefined;

                            return (
                              <div key={msg.messageId} className="flex justify-between items-center">
                                <span>
                                  <strong>{msg.role}:</strong>{' '}
                                  {isInline
                                    ? (contentPart.data.inline?.slice(0, 50) || 'Empty')
                                    : isExternal
                                      ? `[External: ${contentPart.mimeType}]`
                                      : 'No content'
                                  }...
                                  {isExternal && <span className="ml-1 px-1 bg-purple-100 text-purple-700 text-xs rounded">External</span>}
                                </span>
                                <div className="space-x-2">
                                  <button
                                    onClick={() => handleGetMessage(exchange.exchangeId, msg.messageId)}
                                    className="text-xs text-blue-600 hover:underline"
                                  >
                                    View
                                  </button>
                                  {contentPart?.contentPartId && isExternal && (
                                    <button
                                      onClick={() => handleGetContentPart(
                                        exchange.exchangeId,
                                        msg.messageId,
                                        contentPart.contentPartId
                                      )}
                                      className="text-xs text-purple-600 hover:underline"
                                      title="Fetch external content part"
                                    >
                                      Fetch Content
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">
                  No exchanges loaded. Click "Load Exchanges" to view history.
                </p>
              )}
            </div>
          )}

          {/* Attachments Tab */}
          {activeTab === 'attachments' && (
            <div className="bg-white rounded-lg border border-gray-300 shadow-sm mt-4 p-4">
              <h3 className="font-semibold mb-4">File Attachments</h3>

              <div className="flex gap-3 mb-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelect}
                  className="flex-1 text-sm"
                />
                <button
                  onClick={handleUploadAttachment}
                  disabled={!selectedFile || isUploading}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                >
                  {isUploading ? 'Uploading...' : 'Upload'}
                </button>
              </div>

              {selectedFile && (
                <p className="text-sm text-gray-600 mb-4">
                  Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
                </p>
              )}

              {uploadedAttachments.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">Uploaded Files:</h4>
                  {uploadedAttachments.map((att, idx) => (
                    <div key={idx} className="p-2 bg-gray-50 rounded text-sm">
                      <p><strong>Name:</strong> {att.name}</p>
                      <p><strong>URI:</strong> {att.uri}</p>
                      <p><strong>MIME:</strong> {att.mimeType}</p>
                    </div>
                  ))}
                </div>
              )}

              {uploadedAttachments.length === 0 && !selectedFile && (
                <p className="text-gray-500 text-center py-8">
                  No files uploaded. Select a file and click Upload.
                </p>
              )}

              {/* Initialize File Test (for testing attachment initialization without upload) */}
              <div className="mt-6 pt-4 border-t border-gray-200">
                <h4 className="font-medium mb-2 text-sm text-gray-600">API Test: Initialize File</h4>
                <button
                  onClick={() => handleInitializeFile('test-document.pdf')}
                  className="px-3 py-1 bg-gray-500 text-white text-sm rounded hover:bg-gray-600"
                >
                  Test Initialize File
                </button>
                <p className="text-xs text-gray-500 mt-1">
                  Tests attachments.initialize() - returns upload URL without uploading
                </p>
              </div>
            </div>
          )}

          {/* Features Tab */}
          {activeTab === 'features' && (
            <div className="bg-white rounded-lg border border-gray-300 shadow-sm mt-4 p-4">
              <h3 className="font-semibold mb-4">Feature Flags</h3>

              <button
                onClick={handleLoadFeatureFlags}
                disabled={isLoadingFeatureFlags}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 mb-4"
              >
                {isLoadingFeatureFlags ? 'Loading...' : 'Load Feature Flags'}
              </button>

              {featureFlags && (
                <div className="p-4 bg-gray-50 rounded">
                  <pre className="text-sm overflow-auto">
                    {JSON.stringify(featureFlags, null, 2)}
                  </pre>
                </div>
              )}

              {!featureFlags && (
                <p className="text-gray-500 text-center py-8">
                  Click "Load Feature Flags" to view tenant features.
                </p>
              )}
            </div>
          )}

          {/* User Settings Tab */}
          {activeTab === 'user' && (
            <div className="bg-white rounded-lg border border-gray-300 shadow-sm mt-4 p-4">
              <h3 className="font-semibold mb-4">User Settings</h3>

              <div className="flex gap-3 mb-4">
                <button
                  onClick={handleLoadUserSettings}
                  disabled={isLoadingUserSettings}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                >
                  {isLoadingUserSettings ? 'Loading...' : 'Load Settings'}
                </button>
                <button
                  onClick={handleUpdateUserSettings}
                  disabled={isLoadingUserSettings || !userSettings}
                  className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                >
                  Save Changes
                </button>
              </div>

              {userSettings && (
                <div className="space-y-4">
                  <div className="p-3 bg-gray-50 rounded text-sm mb-4">
                    <p><strong>User ID:</strong> {userSettings.userId}</p>
                    <p><strong>Created:</strong> {new Date(userSettings.createdAt).toLocaleString()}</p>
                    <p><strong>Updated:</strong> {new Date(userSettings.updatedAt).toLocaleString()}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                      <input
                        type="text"
                        value={userSettingsForm.name}
                        onChange={(e) => setUserSettingsForm(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded"
                        placeholder="Enter name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <input
                        type="email"
                        value={userSettingsForm.email}
                        onChange={(e) => setUserSettingsForm(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded"
                        placeholder="Enter email"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                      <input
                        type="text"
                        value={userSettingsForm.role}
                        onChange={(e) => setUserSettingsForm(prev => ({ ...prev, role: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded"
                        placeholder="Enter role"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                      <input
                        type="text"
                        value={userSettingsForm.department}
                        onChange={(e) => setUserSettingsForm(prev => ({ ...prev, department: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded"
                        placeholder="Enter department"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                      <input
                        type="text"
                        value={userSettingsForm.company}
                        onChange={(e) => setUserSettingsForm(prev => ({ ...prev, company: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded"
                        placeholder="Enter company"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                      <input
                        type="text"
                        value={userSettingsForm.country}
                        onChange={(e) => setUserSettingsForm(prev => ({ ...prev, country: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded"
                        placeholder="Enter country"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
                      <input
                        type="text"
                        value={userSettingsForm.timezone}
                        onChange={(e) => setUserSettingsForm(prev => ({ ...prev, timezone: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded"
                        placeholder="e.g., America/New_York, Europe/London"
                      />
                    </div>
                  </div>

                  <p className="text-xs text-gray-500 mt-2">
                    Clear any field and save to remove it. These settings are passed to the agent for all conversations.
                  </p>
                </div>
              )}

              {!userSettings && (
                <p className="text-gray-500 text-center py-8">
                  Click "Load Settings" to view and edit your user profile.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Instructions */}
      {!conversation && (
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="font-semibold text-blue-900 mb-2">Getting Started</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
            <li>Click "Load Agents" to fetch available agents</li>
            <li>Select an agent and click "Get Details" to see appearance config</li>
            <li>Click "Create Conversation" to start a new conversation</li>
            <li>Use the Chat tab to send messages (WebSocket connects automatically)</li>
            <li>Use the History tab to view exchanges and submit feedback</li>
            <li>Use the Attachments tab to upload files</li>
            <li>Use the Features tab to view tenant feature flags</li>
            <li>Use the User tab to view and update user settings</li>
            <li>Use "List Conversations" to view and manage history</li>
          </ol>
        </div>
      )}
    </div>
  );
}
