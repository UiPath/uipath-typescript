import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import type { CaseGetAllResponse } from '@uipath/uipath-typescript';

const USI_COLORS = {
  primary: '#002855',
  secondary: '#F26522',
  accent: '#00A9E0',
};

interface CasesHomeProps {
  onSelectCase: (processKey: string, caseName: string) => void;
}

export const CasesHome = ({ onSelectCase }: CasesHomeProps) => {
  const { sdk } = useAuth();
  const [cases, setCases] = useState<CaseGetAllResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCases = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await sdk.maestro.cases.getAll();
      setCases(response || []);
    } catch (err) {
      console.error('Failed to load cases:', err);
      setError(err instanceof Error ? err.message : 'Failed to load cases');
    } finally {
      setIsLoading(false);
    }
  }, [sdk]);

  useEffect(() => {
    loadCases();
  }, [loadCases]);

  const getTotalInstances = (c: CaseGetAllResponse) =>
    c.pendingCount + c.runningCount + c.completedCount + c.pausedCount +
    c.cancelledCount + c.faultedCount + c.retryingCount + c.resumingCount +
    c.pausingCount + c.cancelingCount;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="shadow-lg" style={{ backgroundColor: USI_COLORS.primary }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-xl"
                  style={{ backgroundColor: USI_COLORS.secondary }}
                >
                  USI
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">UMarket</h1>
                  <p className="text-sm text-blue-200">Case Management Portal</p>
                </div>
              </div>
            </div>
            <button
              onClick={loadCases}
              disabled={isLoading}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <svg className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Cases</p>
                <p className="text-2xl font-bold text-gray-900">{cases.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Running Instances</p>
                <p className="text-2xl font-bold text-gray-900">
                  {cases.reduce((sum, c) => sum + c.runningCount, 0)}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Completed Instances</p>
                <p className="text-2xl font-bold text-gray-900">
                  {cases.reduce((sum, c) => sum + c.completedCount, 0)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Cases List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div
            className="px-6 py-4 border-b border-gray-100 rounded-t-xl"
            style={{ backgroundColor: `${USI_COLORS.primary}08` }}
          >
            <h2 className="text-lg font-semibold" style={{ color: USI_COLORS.primary }}>
              Cases
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Select a case to view its instances
            </p>
          </div>

          {error && (
            <div className="p-6 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to load cases</h3>
              <p className="text-gray-500 mb-4">{error}</p>
              <button
                onClick={loadCases}
                className="px-4 py-2 text-white rounded-lg transition-colors"
                style={{ backgroundColor: USI_COLORS.primary }}
              >
                Try Again
              </button>
            </div>
          )}

          {isLoading && !error && (
            <div className="p-6">
              <div className="animate-pulse space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                    <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                    </div>
                    <div className="h-6 bg-gray-200 rounded w-20"></div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!isLoading && !error && cases.length === 0 && (
            <div className="p-12 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <p className="mt-4 text-gray-500">No cases found</p>
            </div>
          )}

          {!isLoading && !error && cases.length > 0 && (
            <div className="divide-y divide-gray-100">
              {cases.map((caseItem) => (
                <button
                  key={caseItem.processKey}
                  onClick={() => onSelectCase(caseItem.processKey, caseItem.name)}
                  className="w-full p-5 hover:bg-gray-50 transition-colors flex items-center gap-4 text-left"
                >
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${USI_COLORS.secondary}15` }}
                  >
                    <svg
                      className="w-6 h-6"
                      style={{ color: USI_COLORS.secondary }}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-gray-900 truncate">
                      {caseItem.name}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      {caseItem.folderName} &bull; {getTotalInstances(caseItem)} instances
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {caseItem.runningCount > 0 && (
                      <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                        {caseItem.runningCount} running
                      </span>
                    )}
                    {caseItem.completedCount > 0 && (
                      <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-800">
                        {caseItem.completedCount} completed
                      </span>
                    )}
                    {caseItem.faultedCount > 0 && (
                      <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-800">
                        {caseItem.faultedCount} faulted
                      </span>
                    )}
                  </div>
                  <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto py-6 text-center text-gray-500 text-sm">
        <p>Powered by UiPath Case Management</p>
      </footer>
    </div>
  );
};
