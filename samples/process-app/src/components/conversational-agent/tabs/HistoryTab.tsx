/**
 * History Tab - Exchange listing, message details, content parts
 */

import { useExchanges } from '../hooks';
import type { MessageWithHelpers, InlineValue, ExternalValue } from '@uipath/uipath-typescript/conversational-agent';

// Type guards for InlineOrExternalValue
const isInlineValue = (data: unknown): data is InlineValue<string> =>
  data !== null && typeof data === 'object' && 'inline' in data;

const isExternalValue = (data: unknown): data is ExternalValue =>
  data !== null && typeof data === 'object' && 'uri' in data;

export function HistoryTab() {
  const {
    exchanges,
    isLoading,
    listExchanges,
    getExchangeDetails,
    submitFeedback,
    getMessage,
    getContentPart
  } = useExchanges();

  return (
    <div className="bg-white rounded-lg border border-gray-300 shadow-sm mt-4 p-4">
      <div className="flex gap-3 mb-4">
        <button
          onClick={listExchanges}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {isLoading ? 'Loading...' : 'Load Exchanges'}
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
                    onClick={() => getExchangeDetails(exchange.exchangeId)}
                    className="text-blue-600 text-sm hover:underline"
                  >
                    Details
                  </button>
                  <button
                    onClick={() => submitFeedback(exchange.exchangeId, 'positive')}
                    className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                  >
                    +
                  </button>
                  <button
                    onClick={() => submitFeedback(exchange.exchangeId, 'negative')}
                    className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                  >
                    -
                  </button>
                </div>
              </div>

              {exchange.messages && exchange.messages.length > 0 && (
                <div className="text-sm text-gray-600 space-y-1">
                  {exchange.messages.map((msg: MessageWithHelpers) => {
                    const contentPart = msg.contentParts?.[0];
                    const data = contentPart?.data;
                    const isExternal = isExternalValue(data);
                    const isInline = isInlineValue(data);

                    return (
                      <div key={msg.messageId} className="flex justify-between items-center">
                        <span>
                          <strong>{msg.role}:</strong>{' '}
                          {isInline
                            ? (data.inline?.slice(0, 50) || 'Empty')
                            : isExternal
                              ? `[External: ${contentPart?.mimeType}]`
                              : 'No content'
                          }...
                          {isExternal && <span className="ml-1 px-1 bg-purple-100 text-purple-700 text-xs rounded">External</span>}
                        </span>
                        <div className="space-x-2">
                          <button
                            onClick={() => getMessage(exchange.exchangeId, msg.messageId)}
                            className="text-xs text-blue-600 hover:underline"
                          >
                            View
                          </button>
                          {contentPart?.contentPartId && isExternal && (
                            <button
                              onClick={() => getContentPart(
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
  );
}
