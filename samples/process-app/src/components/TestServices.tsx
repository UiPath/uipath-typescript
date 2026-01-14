import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { testAllModularServices, printTestResults, verifyModularImports } from '../utils/modular-services-test';

interface TestResult {
  service: string;
  success: boolean;
  message: string;
  data?: unknown;
  error?: string;
}

export function TestServices() {
  const { sdk } = useAuth();
  const [results, setResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [verifyResult, setVerifyResult] = useState<string | null>(null);

  const runTests = async () => {
    if (!sdk) return;

    setIsRunning(true);
    setResults([]);
    setVerifyResult(null);

    try {
      const testResults = await testAllModularServices(sdk);
      setResults(testResults);
      // Also print to console for detailed view
      printTestResults(testResults);
    } catch (error) {
      console.error('Test execution failed:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const runVerifyImports = () => {
    if (!sdk) return;

    try {
      const success = verifyModularImports(sdk);
      setVerifyResult(success ? 'All 10 modular service imports verified successfully!' : 'Verification failed');
    } catch (error) {
      setVerifyResult(`Verification failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  return (
    <div className="space-y-6">
      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Modular Services Test</h2>
          <p className="text-sm text-gray-500 mt-1">
            Test all modular service imports and API calls
          </p>
        </div>

        <div className="px-6 py-4 space-y-4">
          <div className="flex gap-4">
            <button
              onClick={runVerifyImports}
              disabled={!sdk}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Verify Imports (Sync)
            </button>

            <button
              onClick={runTests}
              disabled={!sdk || isRunning}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isRunning && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              )}
              {isRunning ? 'Running Tests...' : 'Run All Tests (Async)'}
            </button>
          </div>

          {verifyResult && (
            <div className={`p-3 rounded-md ${verifyResult.includes('successfully') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
              {verifyResult}
            </div>
          )}
        </div>
      </div>

      {results.length > 0 && (
        <div className="bg-white shadow-sm rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Test Results</h3>
            <p className="text-sm text-gray-500 mt-1">
              {passed} passed, {failed} failed
            </p>
          </div>

          <div className="divide-y divide-gray-200">
            {results.map((result, index) => (
              <div key={index} className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <span className="text-xl">
                    {result.success ? '✅' : '❌'}
                  </span>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{result.service}</div>
                    <div className="text-sm text-gray-600">{result.message}</div>
                    {result.error && (
                      <div className="text-sm text-red-600 mt-1">
                        Error: {result.error}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
        <h4 className="font-medium text-gray-900 mb-2">Services Being Tested:</h4>
        <ul className="list-disc list-inside space-y-1">
          <li><code className="bg-gray-200 px-1 rounded">MaestroProcesses</code> - from @uipath/uipath-typescript/maestro-processes</li>
          <li><code className="bg-gray-200 px-1 rounded">ProcessInstances</code> - from @uipath/uipath-typescript/maestro-processes</li>
          <li><code className="bg-gray-200 px-1 rounded">Cases</code> - from @uipath/uipath-typescript/cases</li>
          <li><code className="bg-gray-200 px-1 rounded">CaseInstances</code> - from @uipath/uipath-typescript/cases</li>
          <li><code className="bg-gray-200 px-1 rounded">Entities</code> - from @uipath/uipath-typescript/entities</li>
          <li><code className="bg-gray-200 px-1 rounded">Tasks</code> - from @uipath/uipath-typescript/tasks</li>
          <li><code className="bg-gray-200 px-1 rounded">Assets</code> - from @uipath/uipath-typescript/assets</li>
          <li><code className="bg-gray-200 px-1 rounded">Queues</code> - from @uipath/uipath-typescript/queues</li>
          <li><code className="bg-gray-200 px-1 rounded">Buckets</code> - from @uipath/uipath-typescript/buckets</li>
          <li><code className="bg-gray-200 px-1 rounded">Processes</code> - from @uipath/uipath-typescript/processes</li>
        </ul>
      </div>
    </div>
  );
}
