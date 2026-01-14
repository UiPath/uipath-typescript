/**
 * Feature Flags Tab - Display tenant feature flags
 */

import { useFeatureFlags } from '../hooks';

export function FeatureFlagsTab() {
  const { featureFlags, isLoading, loadFeatureFlags } = useFeatureFlags();

  return (
    <div className="bg-white rounded-lg border border-gray-300 shadow-sm mt-4 p-4">
      <h3 className="font-semibold mb-4">Feature Flags</h3>

      <button
        onClick={loadFeatureFlags}
        disabled={isLoading}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 mb-4"
      >
        {isLoading ? 'Loading...' : 'Load Feature Flags'}
      </button>

      {featureFlags && (
        <div className="p-4 bg-gray-50 rounded">
          <pre className="text-sm overflow-auto">
            {JSON.stringify(featureFlags, null, 2)}
          </pre>
        </div>
      )}

      {!featureFlags && (
        <p className="text-gray-500 text-center py-8">
          Click "Load Feature Flags" to view tenant features.
        </p>
      )}
    </div>
  );
}
