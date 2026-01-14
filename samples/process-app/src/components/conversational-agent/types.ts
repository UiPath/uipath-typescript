/**
 * Types for the Conversational Agent component
 */

import type {
  ConversationalAgent,
  AgentRelease,
  AgentReleaseWithAppearance,
  Conversation,
  FeatureFlags,
  UserSettings,
  SessionEventHelper,
  ExchangeWithHelpers
} from '@uipath/uipath-typescript/conversational-agent';

// ==================== UI Types ====================

/** Tab type for navigation */
export type TabType = 'chat' | 'history' | 'attachments' | 'features' | 'user';

/** Attachment info type for uploaded files */
export interface AttachmentInfo {
  uri: string;
  name: string;
  mimeType: string;
  fileName: string;
  fileSize: number;
}

/** Chat message type for UI display */
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  attachments?: string;
  exchangeId?: string; // For assistant messages, to enable feedback
  isError?: boolean; // For system messages to show as error
}

/** User settings form state */
export interface UserSettingsFormState {
  name: string;
  email: string;
  role: string;
  department: string;
  company: string;
  country: string;
  timezone: string;
}

// ==================== Domain State Interfaces ====================

/** Core service state */
export interface ServiceState {
  conversationalAgentService: ConversationalAgent | null;
  connectionStatus: string;
}

/** UI feedback state */
export interface UIState {
  error: string;
  successMessage: string;
  activeTab: TabType;
  setError: (error: string) => void;
  setSuccessMessage: (message: string) => void;
  setActiveTab: (tab: TabType) => void;
}

/** Agent state and actions */
export interface AgentState {
  agents: AgentRelease[];
  selectedAgent: AgentRelease | null;
  agentAppearance: AgentReleaseWithAppearance | null;
  isLoading: boolean;
  setAgents: (agents: AgentRelease[]) => void;
  setSelectedAgent: (agent: AgentRelease | null) => void;
  setAgentAppearance: (appearance: AgentReleaseWithAppearance | null) => void;
  setIsLoading: (loading: boolean) => void;
}

/** Conversation state and actions */
export interface ConversationState {
  conversation: Conversation | null;
  conversationList: Conversation[];
  isLoading: boolean;
  setConversation: (conversation: Conversation | null) => void;
  setConversationList: React.Dispatch<React.SetStateAction<Conversation[]>>;
  setIsLoading: (loading: boolean) => void;
}

/** Chat/Session state and actions */
export interface ChatState {
  session: SessionEventHelper | null;
  messages: ChatMessage[];
  inputMessage: string;
  setSession: (session: SessionEventHelper | null) => void;
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  setInputMessage: (message: string) => void;
}

/** Exchange state and actions */
export interface ExchangeState {
  exchanges: ExchangeWithHelpers[];
  isLoading: boolean;
  setExchanges: (exchanges: ExchangeWithHelpers[]) => void;
  setIsLoading: (loading: boolean) => void;
}

/** Attachment state and actions */
export interface AttachmentState {
  selectedFile: File | null;
  uploadedAttachments: AttachmentInfo[];
  pendingAttachments: AttachmentInfo[];
  isUploading: boolean;
  setSelectedFile: (file: File | null) => void;
  setUploadedAttachments: React.Dispatch<React.SetStateAction<AttachmentInfo[]>>;
  setPendingAttachments: React.Dispatch<React.SetStateAction<AttachmentInfo[]>>;
  setIsUploading: (uploading: boolean) => void;
}

/** Feature flags state and actions */
export interface FeatureFlagsState {
  featureFlags: FeatureFlags | null;
  isLoading: boolean;
  setFeatureFlags: (flags: FeatureFlags | null) => void;
  setIsLoading: (loading: boolean) => void;
}

/** User settings state and actions */
export interface UserSettingsState {
  userSettings: UserSettings | null;
  isLoading: boolean;
  userSettingsForm: UserSettingsFormState;
  setUserSettings: (settings: UserSettings | null) => void;
  setIsLoading: (loading: boolean) => void;
  setUserSettingsForm: React.Dispatch<React.SetStateAction<UserSettingsFormState>>;
}

// ==================== Context Value Type ====================

/** Combined context value type - grouped by domain */
export interface ConversationalAgentContextValue extends ServiceState {
  ui: UIState;
  agent: AgentState;
  conversation: ConversationState;
  chat: ChatState;
  exchange: ExchangeState;
  attachment: AttachmentState;
  featureFlags: FeatureFlagsState;
  userSettings: UserSettingsState;
}
