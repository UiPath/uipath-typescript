/**
 * TabNavigation - Tab navigation and content switching
 */

import { useConversationalAgentContext } from '../context/ConversationalAgentContext';
import { ChatTab, HistoryTab, AttachmentsTab, FeatureFlagsTab } from '../tabs';
import type { TabType } from '../types';

export function TabNavigation() {
  const { ui, conversation: convState } = useConversationalAgentContext();
  const { activeTab, setActiveTab } = ui;
  const { conversation } = convState;

  if (!conversation) return null;

  const tabs: TabType[] = ['chat', 'history', 'attachments', 'features'];

  return (
    <div className="mb-6">
      <div className="border-b border-gray-300">
        <nav className="flex space-x-4">
          {tabs.map(tab => (
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

      {activeTab === 'chat' && <ChatTab />}
      {activeTab === 'history' && <HistoryTab />}
      {activeTab === 'attachments' && <AttachmentsTab />}
      {activeTab === 'features' && <FeatureFlagsTab />}
    </div>
  );
}
