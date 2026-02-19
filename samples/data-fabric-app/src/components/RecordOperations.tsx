import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getOperationStatusColor } from '../utils/formatters';
import type { EntityGetResponse, EntityInsertResponse, EntityBatchInsertResponse, EntityUpdateResponse, EntityDeleteResponse } from '@uipath/uipath-typescript';

type OperationType = 'insert' | 'batchInsert' | 'update' | 'delete';

interface OperationResult {
  type: OperationType;
  success: boolean;
  timestamp: Date;
  data?: EntityInsertResponse | EntityBatchInsertResponse | EntityUpdateResponse | EntityDeleteResponse;
  error?: string;
}

export const RecordOperations = () => {
  const { sdk } = useAuth();
  const [entities, setEntities] = useState<EntityGetResponse[]>([]);
  const [selectedEntity, setSelectedEntity] = useState<EntityGetResponse | null>(null);
  const [loadingEntities, setLoadingEntities] = useState(true);
  const [operationType, setOperationType] = useState<OperationType>('insert');
  const [jsonInput, setJsonInput] = useState('');
  const [recordIds, setRecordIds] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<OperationResult[]>([]);
  const [failOnFirst, setFailOnFirst] = useState(false);
  const [expansionLevel, setExpansionLevel] = useState(0);

  useEffect(() => {
    fetchEntities();
  }, [sdk]);

  useEffect(() => {
    // Reset inputs when operation type changes
    setJsonInput('');
    setRecordIds('');
    updatePlaceholder();
  }, [operationType]);

  const fetchEntities = async () => {
    setLoadingEntities(true);
    try {
      const response = await sdk.entities.getAll();
      const entityTypes = response.filter(e => e.entityType === 'Entity');
      setEntities(entityTypes);
    } catch (err) {
      console.error('Failed to fetch entities:', err);
    } finally {
      setLoadingEntities(false);
    }
  };

  const updatePlaceholder = () => {
    switch (operationType) {
      case 'insert':
        setJsonInput('{\n  "fieldName": "value"\n}');
        break;
      case 'batchInsert':
        setJsonInput('[\n  {\n    "fieldName": "value1"\n  },\n  {\n    "fieldName": "value2"\n  }\n]');
        break;
      case 'update':
        setJsonInput('[\n  {\n    "Id": "record-uuid-here",\n    "fieldName": "newValue"\n  }\n]');
        break;
      case 'delete':
        setRecordIds('record-uuid-1\nrecord-uuid-2');
        break;
    }
  };

  const executeOperation = async () => {
    if (!selectedEntity) {
      alert('Please select an entity first');
      return;
    }

    setLoading(true);
    const startTime = new Date();

    try {
      let result: OperationResult;

      switch (operationType) {
        case 'insert': {
          const data = JSON.parse(jsonInput);
          const response = await sdk.entities.insertById(selectedEntity.id, data, { expansionLevel });
          result = {
            type: 'insert',
            success: true,
            timestamp: startTime,
            data: response
          };
          break;
        }
        case 'batchInsert': {
          const data = JSON.parse(jsonInput);
          const response = await sdk.entities.batchInsertById(selectedEntity.id, data, {
            expansionLevel,
            failOnFirst
          });
          result = {
            type: 'batchInsert',
            success: response.failureRecords?.length === 0,
            timestamp: startTime,
            data: response
          };
          break;
        }
        case 'update': {
          const data = JSON.parse(jsonInput);
          const response = await sdk.entities.updateById(selectedEntity.id, data, {
            expansionLevel,
            failOnFirst
          });
          result = {
            type: 'update',
            success: response.failureRecords?.length === 0,
            timestamp: startTime,
            data: response
          };
          break;
        }
        case 'delete': {
          const ids = recordIds.split('\n').map(id => id.trim()).filter(id => id);
          const response = await sdk.entities.deleteById(selectedEntity.id, ids, { failOnFirst });
          result = {
            type: 'delete',
            success: response.failureRecords?.length === 0,
            timestamp: startTime,
            data: response
          };
          break;
        }
      }

      setResults([result!, ...results.slice(0, 9)]);
    } catch (err) {
      const result: OperationResult = {
        type: operationType,
        success: false,
        timestamp: startTime,
        error: err instanceof Error ? err.message : 'Operation failed'
      };
      setResults([result, ...results.slice(0, 9)]);
    } finally {
      setLoading(false);
    }
  };

  const getOperationDescription = (type: OperationType) => {
    switch (type) {
      case 'insert':
        return 'Insert a single record into the entity. Triggers Data Fabric events.';
      case 'batchInsert':
        return 'Insert multiple records at once. Does NOT trigger Data Fabric events.';
      case 'update':
        return 'Update existing records. Each record MUST include the Id field.';
      case 'delete':
        return 'Delete records by their IDs. Enter one record ID per line.';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Operations</h2>
        <p className="text-gray-600 mt-1">Insert, update, and delete entity records</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Operation Form */}
        <div className="space-y-4">
          {/* Entity Selector */}
          <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-2">Target Entity</label>
            <select
              value={selectedEntity?.id || ''}
              onChange={(e) => {
                const entity = entities.find(ent => ent.id === e.target.value);
                setSelectedEntity(entity || null);
              }}
              disabled={loadingEntities}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">Select an entity...</option>
              {entities.map(entity => (
                <option key={entity.id} value={entity.id}>{entity.displayName}</option>
              ))}
            </select>
          </div>

          {/* Operation Type Selector */}
          <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-2">Operation Type</label>
            <div className="grid grid-cols-2 gap-2">
              {(['insert', 'batchInsert', 'update', 'delete'] as OperationType[]).map(type => (
                <button
                  key={type}
                  onClick={() => setOperationType(type)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    operationType === type
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {type === 'batchInsert' ? 'Batch Insert' : type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
            <p className="text-sm text-gray-500 mt-2">{getOperationDescription(operationType)}</p>
          </div>

          {/* Options */}
          <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Options</h3>
            <div className="space-y-3">
              {operationType !== 'delete' && (
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Expansion Level</label>
                  <select
                    value={expansionLevel}
                    onChange={(e) => setExpansionLevel(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value={0}>0 (None)</option>
                    <option value={1}>1 (Direct references)</option>
                    <option value={2}>2 (Nested references)</option>
                  </select>
                </div>
              )}
              {(operationType === 'batchInsert' || operationType === 'update' || operationType === 'delete') && (
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={failOnFirst}
                    onChange={(e) => setFailOnFirst(e.target.checked)}
                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-sm text-gray-600">Fail on first error</span>
                </label>
              )}
            </div>
          </div>

          {/* Input Area */}
          <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
            {operationType === 'delete' ? (
              <>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Record IDs (one per line)
                </label>
                <textarea
                  value={recordIds}
                  onChange={(e) => setRecordIds(e.target.value)}
                  rows={8}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Enter record UUIDs, one per line"
                />
              </>
            ) : (
              <>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  JSON Data
                </label>
                <textarea
                  value={jsonInput}
                  onChange={(e) => setJsonInput(e.target.value)}
                  rows={12}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Enter JSON data..."
                />
              </>
            )}
          </div>

          {/* Execute Button */}
          <button
            onClick={executeOperation}
            disabled={loading || !selectedEntity}
            className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:bg-purple-400 transition-colors flex items-center justify-center space-x-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Executing...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Execute {operationType === 'batchInsert' ? 'Batch Insert' : operationType.charAt(0).toUpperCase() + operationType.slice(1)}</span>
              </>
            )}
          </button>
        </div>

        {/* Results Panel */}
        <div className="bg-white rounded-lg shadow border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Operation Results</h3>
            <p className="text-sm text-gray-500">Recent operation history (last 10)</p>
          </div>
          <div className="p-4 space-y-4 max-h-[600px] overflow-y-auto">
            {results.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <svg className="w-12 h-12 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="mt-2">No operations executed yet</p>
              </div>
            ) : (
              results.map((result, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-lg border ${getOperationStatusColor(result.success)}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      {result.success ? (
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                      <span className="font-medium">
                        {result.type === 'batchInsert' ? 'Batch Insert' : result.type.charAt(0).toUpperCase() + result.type.slice(1)}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {result.timestamp.toLocaleTimeString()}
                    </span>
                  </div>

                  {result.error && (
                    <p className="text-sm text-red-700 mb-2">{result.error}</p>
                  )}

                  {result.data && (
                    <div className="mt-2">
                      {/* Insert result */}
                      {'id' in result.data && result.type === 'insert' && (
                        <div className="text-sm">
                          <span className="text-gray-600">Created record ID:</span>
                          <code className="ml-2 px-2 py-1 bg-gray-100 rounded text-xs">
                            {(result.data as EntityInsertResponse).id}
                          </code>
                        </div>
                      )}

                      {/* Batch operation results */}
                      {'successRecords' in result.data && (
                        <div className="text-sm space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-green-700">Success:</span>
                            <span className="font-medium">{result.data.successRecords?.length || 0}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-red-700">Failed:</span>
                            <span className="font-medium">{result.data.failureRecords?.length || 0}</span>
                          </div>
                          {result.data.failureRecords && result.data.failureRecords.length > 0 && (
                            <details className="mt-2">
                              <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-800">
                                View failure details
                              </summary>
                              <pre className="mt-2 text-xs bg-gray-50 p-2 rounded overflow-auto max-h-32">
                                {JSON.stringify(result.data.failureRecords, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Field Reference */}
      {selectedEntity && (
        <div className="bg-white rounded-lg shadow border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Field Reference: {selectedEntity.displayName}</h3>
            <p className="text-sm text-gray-500">Available fields for this entity</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Field Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Display Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Required</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {selectedEntity.fields?.filter(f => !f.isSystemField || f.name === 'Id').map(field => (
                  <tr key={field.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm font-mono text-gray-900">{field.name}</td>
                    <td className="px-4 py-2 text-sm text-gray-600">{field.displayName}</td>
                    <td className="px-4 py-2 text-sm text-gray-600">{field.fieldDataType?.name}</td>
                    <td className="px-4 py-2 text-sm">
                      {field.isRequired ? (
                        <span className="text-red-600">Yes</span>
                      ) : (
                        <span className="text-gray-400">No</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
