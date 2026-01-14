/**
 * GettingStarted - Onboarding instructions for new users
 */

import { useConversationalAgentContext } from '../context/ConversationalAgentContext';

export function GettingStarted() {
  const { conversation: convState } = useConversationalAgentContext();
  const { conversation } = convState;

  if (conversation) return null;

  return (
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
      </ol>
    </div>
  );
}
