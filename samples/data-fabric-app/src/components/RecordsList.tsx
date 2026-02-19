import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { truncateId } from '../utils/formatters';
import type { EntityGetResponse, EntityRecord, PaginatedResponse, PaginationCursor } from '@uipath/uipath-typescript';

interface RecordsListProps {
  onDownloadAttachment: (entityName: string, recordId: string, fieldName: string) => void;
}

export const RecordsList = ({ onDownloadAttachment }: RecordsListProps) => {
  const { sdk } = useAuth();
  const [entities, setEntities] = useState<EntityGetResponse[]>([]);
  const [selectedEntity, setSelectedEntity] = useState<EntityGetResponse | null>(null);
  const [records, setRecords] = useState<EntityRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingEntities, setLoadingEntities] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState(20);
  const [currentCursor, setCurrentCursor] = useState<PaginationCursor | undefined>(undefined);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPreviousPage, setHasPreviousPage] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [cursorHistory, setCursorHistory] = useState<(PaginationCursor | undefined)[]>([]);
  const [expansionLevel, setExpansionLevel] = useState(0);
  const [selectedRecord, setSelectedRecord] = useState<EntityRecord | null>(null);

  useEffect(() => {
    fetchEntities();
  }, [sdk]);

  useEffect(() => {
    if (selectedEntity) {
      // Reset pagination when entity changes
      setCurrentCursor(undefined);
      setCursorHistory([]);
      fetchRecords();
    }
  }, [selectedEntity, pageSize, expansionLevel]);

  const fetchEntities = async () => {
    setLoadingEntities(true);
    try {
      const response = await sdk.entities.getAll();
      // Filter only Entity type (exclude ChoiceSet, SystemEntity, etc.)
      const entityTypes = response.filter(e => e.entityType === 'Entity');
      setEntities(entityTypes);
    } catch (err) {
      console.error('Failed to fetch entities:', err);
    } finally {
      setLoadingEntities(false);
    }
  };

  const fetchRecords = async (cursor?: PaginationCursor) => {
    if (!selectedEntity) return;

    setLoading(true);
    setError(null);
    try {
      // Only include cursor in options when it's defined to avoid undefined value errors
      const options = cursor
        ? { pageSize, cursor, expansionLevel }
        : { pageSize, expansionLevel };
      const response = await sdk.entities.getRecordsById(selectedEntity.id, options) as PaginatedResponse<EntityRecord>;

      setRecords(response.items || []);
      setHasNextPage(response.hasNextPage || false);
      setHasPreviousPage(cursorHistory.length > 0);
      setTotalCount(response.totalCount || 0);
    } catch (err) {
      console.error('Failed to fetch records:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch records');
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  const handleNextPage = async () => {
    if (!hasNextPage) return;

    // Only include cursor in options when it's defined
    const options = currentCursor
      ? { pageSize, cursor: currentCursor, expansionLevel }
      : { pageSize, expansionLevel };
    const response = await sdk.entities.getRecordsById(selectedEntity!.id, options) as PaginatedResponse<EntityRecord>;

    if (response.nextCursor) {
      setCursorHistory([...cursorHistory, currentCursor]);
      setCurrentCursor(response.nextCursor);
      fetchRecords(response.nextCursor);
    }
  };

  const handlePreviousPage = () => {
    if (cursorHistory.length === 0) return;

    const newHistory = [...cursorHistory];
    const previousCursor = newHistory.pop();
    setCursorHistory(newHistory);
    setCurrentCursor(previousCursor);
    fetchRecords(previousCursor);
  };

  const handleEntitySelect = (entity: EntityGetResponse) => {
    setSelectedEntity(entity);
    setSelectedRecord(null);
  };

  const getFieldColumns = () => {
    if (!selectedEntity?.fields) return [];
    return selectedEntity.fields
      .filter(f => !f.isSystemField || f.name === 'Id')
      .slice(0, 12); // Limit to 12 columns for readability
  };

  const renderCellValue = (record: EntityRecord, fieldName: string) => {
    const value = record[fieldName];
    if (value === null || value === undefined) return <span className="text-gray-400">null</span>;
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'object') return <span className="text-gray-500 text-xs">Object</span>;
    if (typeof value === 'string' && value.length > 50) return truncateId(value, 50);
    return String(value);
  };

  const attachmentFields = selectedEntity?.fields?.filter(f => f.isAttachment) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Records</h2>
        <p className="text-gray-600 mt-1">Browse and view entity records with pagination</p>
      </div>

      {/* Entity Selector */}
      <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Entity</label>
            <select
              value={selectedEntity?.id || ''}
              onChange={(e) => {
                const entity = entities.find(ent => ent.id === e.target.value);
                if (entity) handleEntitySelect(entity);
              }}
              disabled={loadingEntities}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">Select an entity...</option>
              {entities.map(entity => (
                <option key={entity.id} value={entity.id}>
                  {entity.displayName} ({entity.recordCount?.toLocaleString() || 0} records)
                </option>
              ))}
            </select>
          </div>
          <div className="w-32">
            <label className="block text-sm font-medium text-gray-700 mb-1">Page Size</label>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
          <div className="w-40">
            <label className="block text-sm font-medium text-gray-700 mb-1">Expansion Level</label>
            <select
              value={expansionLevel}
              onChange={(e) => setExpansionLevel(Number(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value={0}>0 (None)</option>
              <option value={1}>1 (Direct refs)</option>
              <option value={2}>2 (Nested refs)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span className="text-red-800">{error}</span>
          </div>
        </div>
      )}

      {/* No Entity Selected */}
      {!selectedEntity && !loadingEntities && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <svg className="w-16 h-16 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="text-gray-500 mt-4">Select an entity to view its records</p>
        </div>
      )}

      {/* Records Table */}
      {selectedEntity && (
        <div className="bg-white rounded-lg shadow border border-gray-200">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{selectedEntity.displayName} Records</h3>
              <p className="text-sm text-gray-500">
                {totalCount > 0 ? `${totalCount.toLocaleString()} total records` : 'No records found'}
              </p>
            </div>
            <button
              onClick={() => fetchRecords(currentCursor)}
              disabled={loading}
              className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-purple-400 transition-colors"
            >
              <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Refresh</span>
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="flex items-center space-x-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                <span className="text-gray-600 font-medium">Loading records...</span>
              </div>
            </div>
          ) : records.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <p className="text-gray-500 mt-4">No records found in this entity</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      {getFieldColumns().map(field => (
                        <th key={field.id} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {field.displayName}
                        </th>
                      ))}
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {records.map((record, idx) => (
                      <tr key={record.id || idx} className="hover:bg-gray-50">
                        {getFieldColumns().map(field => (
                          <td key={field.id} className="px-4 py-3 text-sm text-gray-900">
                            {renderCellValue(record, field.name)}
                          </td>
                        ))}
                        <td className="px-4 py-3">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => setSelectedRecord(record)}
                              className="text-purple-600 hover:text-purple-800 text-sm font-medium"
                            >
                              View
                            </button>
                            {attachmentFields.length > 0 && (
                              <div className="relative group">
                                <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                                  Download
                                </button>
                                <div className="absolute hidden group-hover:block z-10 bg-white border border-gray-200 rounded shadow-lg py-1 min-w-[120px]">
                                  {attachmentFields.map(field => (
                                    <button
                                      key={field.id}
                                      onClick={() => onDownloadAttachment(selectedEntity.name, record.id, field.name)}
                                      className="block w-full text-left px-3 py-1 text-sm text-gray-700 hover:bg-gray-100"
                                    >
                                      {field.displayName}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="p-4 border-t border-gray-200 flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  Showing {records.length} of {totalCount.toLocaleString()} records
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
        </div>
      )}

      {/* Record Detail Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Record Details</h3>
              <button
                onClick={() => setSelectedRecord(null)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4">
              <div className="space-y-3">
                {Object.entries(selectedRecord).map(([key, value]) => (
                  <div key={key} className="flex border-b border-gray-100 pb-2">
                    <span className="font-medium text-gray-700 w-1/3">{key}:</span>
                    <span className="text-gray-900 w-2/3 break-all">
                      {value === null || value === undefined ? (
                        <span className="text-gray-400">null</span>
                      ) : typeof value === 'object' ? (
                        <pre className="text-xs bg-gray-50 p-2 rounded overflow-auto max-h-32">
                          {JSON.stringify(value, null, 2)}
                        </pre>
                      ) : typeof value === 'boolean' ? (
                        value ? 'Yes' : 'No'
                      ) : (
                        String(value)
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
