/**
 * ConversationHistory - List and manage past conversations
 */

import { useConversations } from '../hooks';

export function ConversationHistory() {
  const {
    conversationList, isLoading: isLoadingConversations,
    listConversations, deleteConversation, loadConversation
  } = useConversations();

  return (
    <div className="mb-6 p-4 bg-white rounded-lg border border-gray-300 shadow-sm">
      <h2 className="text-lg font-semibold mb-3">Conversation History</h2>
      <div className="flex gap-3 mb-4">
        <button
          onClick={listConversations}
          disabled={isLoadingConversations}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {isLoadingConversations ? 'Loading...' : 'List Conversations'}
        </button>
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
                  <td className="px-2 py-1">{new Date(conv.createdAt).toLocaleString()}</td>
                  <td className="px-2 py-1">
                    <button onClick={() => loadConversation(conv.conversationId)} className="text-red-600 hover:underline">Load</button>
                  </td>
                  <td className="px-2 py-1">
                    <button onClick={() => deleteConversation(conv.conversationId)} className="text-red-600 hover:underline">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
