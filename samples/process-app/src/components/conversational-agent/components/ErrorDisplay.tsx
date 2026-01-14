/**
 * ErrorDisplay - Shows error and success messages
 */

import { useConversationalAgentContext } from '../context/ConversationalAgentContext';

export function ErrorDisplay() {
  const { ui } = useConversationalAgentContext();
  const { error, successMessage } = ui;

  return (
    <>
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
    </>
  );
}
