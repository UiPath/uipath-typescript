/**
 * useFeatureFlags - Hook for feature flags operations
 */

import { useConversationalAgentContext } from '../context/ConversationalAgentContext';

export function useFeatureFlags() {
  const { conversationalAgentService, featureFlags: ffState, ui } = useConversationalAgentContext();
  const { featureFlags, isLoading, setFeatureFlags, setIsLoading } = ffState;
  const { setError, setSuccessMessage } = ui;

  const loadFeatureFlags = async () => {
    if (!conversationalAgentService) return;
    setIsLoading(true);
    setError('');

    try {
      const response = await conversationalAgentService.getFeatureFlags();
      console.log('[Feature Flags] response:', response);

      setFeatureFlags(response);
      setSuccessMessage('Feature flags loaded');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to load feature flags: ${message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    featureFlags,
    isLoading,
    loadFeatureFlags
  };
}
