/**
 * ConversationalAgentContext - Centralized state management for conversational agent
 */

import { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import {
  ConversationalAgent,
  User,
  Exchanges,
  Messages,
  Attachments,
  type AgentGetResponse,
  type AgentGetByIdResponse,
  type ConversationGetResponse,
  type FeatureFlags,
  type UserSettingsGetResponse,
  type SessionEventHelper,
  type ExchangeGetResponse
} from '@uipath/uipath-typescript/conversational-agent';
import type {
  TabType,
  ChatMessage,
  AttachmentInfo,
  UserSettingsFormState,
  ConversationalAgentContextValue
} from '../types';

// ==================== Context ====================

const ConversationalAgentContext = createContext<ConversationalAgentContextValue | null>(null);

// ==================== Provider ====================

export function ConversationalAgentProvider({ children }: { children: ReactNode }) {
  const { sdk: uipath } = useAuth();

  // ConversationalAgent service instance
  const conversationalAgentService = useMemo(() => {
    if (!uipath) return null;
    return new ConversationalAgent(uipath);
  }, [uipath]);

  // User service instance (standalone)
  const userService = useMemo(() => {
    if (!uipath) return null;
    return new User(uipath);
  }, [uipath]);

  // Exchanges service instance (standalone)
  const exchangeService = useMemo(() => {
    if (!uipath) return null;
    return new Exchanges(uipath);
  }, [uipath]);

  // Messages service instance (standalone)
  const messageService = useMemo(() => {
    if (!uipath) return null;
    return new Messages(uipath);
  }, [uipath]);

  // Attachments service instance (standalone)
  const attachmentService = useMemo(() => {
    if (!uipath) return null;
    return new Attachments(uipath);
  }, [uipath]);

  // Connection state
  const [connectionStatus, setConnectionStatus] = useState('Disconnected');

  // UI state
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('chat');

  // Agent state
  const [agents, setAgents] = useState<AgentGetResponse[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<AgentGetResponse | null>(null);
  const [agentAppearance, setAgentAppearance] = useState<AgentGetByIdResponse | null>(null);
  const [isLoadingAgents, setIsLoadingAgents] = useState(false);

  // Conversation state
  const [conversation, setConversation] = useState<ConversationGetResponse | null>(null);
  const [conversationList, setConversationList] = useState<ConversationGetResponse[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);

  // Session & Chat state
  const [session, setSession] = useState<SessionEventHelper | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');

  // Exchange state
  const [exchanges, setExchanges] = useState<ExchangeGetResponse[]>([]);
  const [isLoadingExchanges, setIsLoadingExchanges] = useState(false);

  // Attachment state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedAttachments, setUploadedAttachments] = useState<AttachmentInfo[]>([]);
  const [pendingAttachments, setPendingAttachments] = useState<AttachmentInfo[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Feature flags state
  const [featureFlags, setFeatureFlags] = useState<FeatureFlags | null>(null);
  const [isLoadingFeatureFlags, setIsLoadingFeatureFlags] = useState(false);

  // User settings state
  const [userSettings, setUserSettings] = useState<UserSettingsGetResponse | null>(null);
  const [isLoadingUserSettings, setIsLoadingUserSettings] = useState(false);
  const [userSettingsForm, setUserSettingsForm] = useState<UserSettingsFormState>({
    name: '', email: '', role: '', department: '', company: '', country: '', timezone: ''
  });

  // SDK event handlers
  const handleConnectionStatusChanged = useCallback((status: string, err: Error | null) => {
    setConnectionStatus(status);
    if (err) setError(`Connection error: ${err.message}`);
  }, []);

  // Initialize ConversationalAgent service
  useEffect(() => {
    if (!conversationalAgentService) return;

    try {
      console.log('[ConversationalAgent] Service instance created');

      // Connection status and error handling now via conversations sub-service
      const cleanupConnection = conversationalAgentService.conversations.onConnectionStatusChanged(handleConnectionStatusChanged);

      return () => {
        cleanupConnection();
        conversationalAgentService.conversations.disconnect();
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to initialize client: ${message}`);
    }
  }, [conversationalAgentService, handleConnectionStatusChanged]);

  // Auto-clear success message
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Keep a ref to the session for cleanup on unmount
  const sessionRef = useRef<SessionEventHelper | null>(null);
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  // Session cleanup: only end session on component unmount
  // Session closing for conversation changes is handled explicitly in useConversations hook
  useEffect(() => {
    return () => {
      if (sessionRef.current) {
        console.log('[ConversationalAgent] Ending session on unmount');
        sessionRef.current.sendSessionEnd();
      }
    };
  }, []); // Empty deps - only run on unmount

  const value: ConversationalAgentContextValue = {
    // Services
    conversationalAgentService,
    userService,
    exchangeService,
    messageService,
    attachmentService,
    connectionStatus,

    // Grouped domain state
    ui: {
      error, successMessage, activeTab,
      setError, setSuccessMessage, setActiveTab
    },
    agent: {
      agents, selectedAgent, agentAppearance, isLoading: isLoadingAgents,
      setAgents, setSelectedAgent, setAgentAppearance, setIsLoading: setIsLoadingAgents
    },
    conversation: {
      conversation, conversationList, isLoading: isLoadingConversations,
      setConversation, setConversationList, setIsLoading: setIsLoadingConversations
    },
    chat: {
      session, messages, inputMessage,
      setSession, setMessages, setInputMessage
    },
    exchange: {
      exchanges, isLoading: isLoadingExchanges,
      setExchanges, setIsLoading: setIsLoadingExchanges
    },
    attachment: {
      selectedFile, uploadedAttachments, pendingAttachments, isUploading,
      setSelectedFile, setUploadedAttachments, setPendingAttachments, setIsUploading
    },
    featureFlags: {
      featureFlags, isLoading: isLoadingFeatureFlags,
      setFeatureFlags, setIsLoading: setIsLoadingFeatureFlags
    },
    userSettings: {
      userSettings, isLoading: isLoadingUserSettings, userSettingsForm,
      setUserSettings, setIsLoading: setIsLoadingUserSettings, setUserSettingsForm
    }
  };

  return (
    <ConversationalAgentContext.Provider value={value}>
      {children}
    </ConversationalAgentContext.Provider>
  );
}

// ==================== Hook ====================

export function useConversationalAgentContext() {
  const context = useContext(ConversationalAgentContext);
  if (!context) {
    throw new Error('useConversationalAgentContext must be used within ConversationalAgentProvider');
  }
  return context;
}
