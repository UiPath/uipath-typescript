/**
 * ConnectionStatus - Displays WebSocket connection status
 */

import { useConversationalAgentContext } from '../context/ConversationalAgentContext';

export function ConnectionStatus() {
  const { connectionStatus } = useConversationalAgentContext();

  return (
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
  );
}
