/**
 * History Tab - Exchange listing, message details, content parts
 */

import { useExchanges } from '../hooks';
import { FeedbackRating, type MessageGetResponse, type InlineValue, type ExternalValue } from '@uipath/uipath-typescript/conversational-agent';

// Thumbs up/down icons as simple SVG components
const ThumbsUpIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
  </svg>
);

const ThumbsDownIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17" />
  </svg>
);

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
                    onClick={() => submitFeedback(exchange.exchangeId, FeedbackRating.Positive)}
                    className="p-1 text-green-600 hover:bg-green-100 rounded transition-colors"
                    title="Thumbs up"
                  >
                    <ThumbsUpIcon />
                  </button>
                  <button
                    onClick={() => submitFeedback(exchange.exchangeId, FeedbackRating.Negative)}
                    className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors"
                    title="Thumbs down"
                  >
                    <ThumbsDownIcon />
                  </button>
                </div>
              </div>

              {exchange.messages && exchange.messages.length > 0 && (
                <div className="text-sm text-gray-600 space-y-1">
                  {exchange.messages.map((msg: MessageGetResponse) => {
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
