import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { formatDate } from '../utils/formatters';
import type { ChoiceSetGetAllResponse, ChoiceSetGetResponse, PaginatedResponse, PaginationCursor } from '@uipath/uipath-typescript';

// Extended type to include id which is returned by the API but not in the public types
type ChoiceSetWithId = ChoiceSetGetAllResponse & { id?: string };

export const ChoiceSets = () => {
  const { sdk } = useAuth();
  const [choiceSets, setChoiceSets] = useState<ChoiceSetWithId[]>([]);
  const [selectedChoiceSet, setSelectedChoiceSet] = useState<ChoiceSetWithId | null>(null);
  const [values, setValues] = useState<ChoiceSetGetResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingValues, setLoadingValues] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [pageSize, setPageSize] = useState(20);
  const [currentCursor, setCurrentCursor] = useState<PaginationCursor | undefined>(undefined);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPreviousPage, setHasPreviousPage] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [cursorHistory, setCursorHistory] = useState<(PaginationCursor | undefined)[]>([]);

  useEffect(() => {
    fetchChoiceSets();
  }, [sdk]);

  useEffect(() => {
    if (selectedChoiceSet) {
      setCurrentCursor(undefined);
      setCursorHistory([]);
      fetchChoiceSetValues();
    }
  }, [selectedChoiceSet, pageSize]);

  const fetchChoiceSets = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await sdk.entities.choicesets.getAll();
      // Cast to extended type that includes id
      setChoiceSets(response as ChoiceSetWithId[]);
    } catch (err) {
      console.error('Failed to fetch choice sets:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch choice sets');
    } finally {
      setLoading(false);
    }
  };

  const fetchChoiceSetValues = async (cursor?: PaginationCursor) => {
    if (!selectedChoiceSet?.id) return;

    setLoadingValues(true);
    try {
      // Only include cursor in options when it's defined to avoid undefined value errors
      const options = cursor ? { pageSize, cursor } : { pageSize };
      const response = await sdk.entities.choicesets.getById(selectedChoiceSet.id, options) as PaginatedResponse<ChoiceSetGetResponse>;

      setValues(response.items || []);
      setHasNextPage(response.hasNextPage || false);
      setHasPreviousPage(cursorHistory.length > 0);
      setTotalCount(response.totalCount || 0);
    } catch (err) {
      console.error('Failed to fetch choice set values:', err);
      setValues([]);
    } finally {
      setLoadingValues(false);
    }
  };

  const handleNextPage = async () => {
    if (!hasNextPage || !selectedChoiceSet?.id) return;

    // Only include cursor in options when it's defined
    const options = currentCursor ? { pageSize, cursor: currentCursor } : { pageSize };
    const response = await sdk.entities.choicesets.getById(selectedChoiceSet.id, options) as PaginatedResponse<ChoiceSetGetResponse>;

    if (response.nextCursor) {
      setCursorHistory([...cursorHistory, currentCursor]);
      setCurrentCursor(response.nextCursor);
      fetchChoiceSetValues(response.nextCursor);
    }
  };

  const handlePreviousPage = () => {
    if (cursorHistory.length === 0) return;

    const newHistory = [...cursorHistory];
    const previousCursor = newHistory.pop();
    setCursorHistory(newHistory);
    setCurrentCursor(previousCursor);
    fetchChoiceSetValues(previousCursor);
  };

  const filteredChoiceSets = choiceSets.filter(cs =>
    cs.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cs.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          <span className="text-gray-600 font-medium">Loading choice sets...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <span className="text-red-800">{error}</span>
        </div>
        <button onClick={fetchChoiceSets} className="mt-3 text-sm text-red-600 hover:text-red-800 underline">
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Choice Sets</h2>
          <p className="text-gray-600 mt-1">Browse and view choice set values</p>
        </div>
        <button
          onClick={fetchChoiceSets}
          className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>Refresh</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="text-sm text-gray-500">Total Choice Sets</div>
          <div className="text-2xl font-bold text-purple-600">{choiceSets.length}</div>
        </div>
        {selectedChoiceSet && (
          <>
            <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
              <div className="text-sm text-gray-500">Selected Choice Set</div>
              <div className="text-lg font-bold text-gray-900 truncate">{selectedChoiceSet.displayName}</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
              <div className="text-sm text-gray-500">Total Values</div>
              <div className="text-2xl font-bold text-gray-900">{totalCount.toLocaleString()}</div>
            </div>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Choice Sets List */}
        <div className="bg-white rounded-lg shadow border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Choice Sets</h3>
            <input
              type="text"
              placeholder="Search choice sets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          <div className="max-h-[500px] overflow-y-auto">
            {filteredChoiceSets.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No choice sets found</p>
              </div>
            ) : (
              filteredChoiceSets.map((cs, idx) => (
                <button
                  key={cs.id || cs.name || idx}
                  onClick={() => setSelectedChoiceSet(cs)}
                  className={`w-full text-left p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                    selectedChoiceSet?.name === cs.name ? 'bg-purple-50 border-l-4 border-l-purple-500' : ''
                  }`}
                >
                  <h4 className="font-medium text-gray-900">{cs.displayName}</h4>
                  <p className="text-sm text-gray-500 truncate">{cs.name}</p>
                  {cs.description && (
                    <p className="text-xs text-gray-400 mt-1 truncate">{cs.description}</p>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Choice Set Values */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow border border-gray-200">
          {!selectedChoiceSet ? (
            <div className="flex items-center justify-center h-64 text-gray-500">
              <div className="text-center">
                <svg className="w-16 h-16 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
                <p className="mt-4">Select a choice set to view its values</p>
              </div>
            </div>
          ) : (
            <>
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{selectedChoiceSet.displayName}</h3>
                  <p className="text-sm text-gray-500">Name: {selectedChoiceSet.name}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className="px-3 py-1 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>

              {loadingValues ? (
                <div className="flex items-center justify-center h-64">
                  <div className="flex items-center space-x-3">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                    <span className="text-gray-600 font-medium">Loading values...</span>
                  </div>
                </div>
              ) : values.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p>No values found in this choice set</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Display Name</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Number ID</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {values.map((value, idx) => (
                          <tr key={value.id || idx} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">{value.name}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{value.displayName}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{value.numberId ?? '-'}</td>
                            <td className="px-4 py-3 text-sm text-gray-500">{formatDate(value.createdTime)?.split(',')[0]}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  <div className="p-4 border-t border-gray-200 flex items-center justify-between">
                    <p className="text-sm text-gray-500">
                      Showing {values.length} of {totalCount.toLocaleString()} values
                    </p>
                    <div className="flex space-x-2">
                      <button
                        onClick={handlePreviousPage}
                        disabled={!hasPreviousPage}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      <button
                        onClick={handleNextPage}
                        disabled={!hasNextPage}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Choice Set Details */}
      {selectedChoiceSet && (
        <div className="bg-white rounded-lg shadow border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Choice Set Details</h3>
          </div>
          <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Name:</span>
              <p className="font-medium">{selectedChoiceSet.name}</p>
            </div>
            <div>
              <span className="text-gray-500">Display Name:</span>
              <p className="font-medium">{selectedChoiceSet.displayName}</p>
            </div>
            <div>
              <span className="text-gray-500">Description:</span>
              <p className="font-medium">{selectedChoiceSet.description || 'N/A'}</p>
            </div>
            <div>
              <span className="text-gray-500">Folder ID:</span>
              <p className="font-mono text-xs break-all">{selectedChoiceSet.folderId}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
