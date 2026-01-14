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

import { ConversationalAgentProvider } from './context/ConversationalAgentContext';
import {
  ConnectionStatus,
  ErrorDisplay,
  AgentManagement,
  ConversationHistory,
  TabNavigation,
  GettingStarted
} from './components';

// ==================== Main Component ====================

function ConversationalAgentContent() {
  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <h1 className="text-3xl font-bold mb-2">Conversation Agent</h1>
      <p className="text-gray-600 mb-6">
        Comprehensive test for ALL TypeScript SDK features (using modular ConversationalAgent)
      </p>

      <ConnectionStatus />
      <ErrorDisplay />
      <AgentManagement />
      <ConversationHistory />
      <TabNavigation />
      <GettingStarted />
    </div>
  );
}

export function ConversationalAgentTest() {
  return (
    <ConversationalAgentProvider>
      <ConversationalAgentContent />
    </ConversationalAgentProvider>
  );
}
