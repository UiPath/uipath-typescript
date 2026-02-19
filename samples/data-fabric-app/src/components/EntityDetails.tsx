import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import {
  getEntityTypeColor,
  getFieldTypeColor,
  getFieldDisplayTypeColor,
  formatFieldDisplayType,
  formatDate,
  formatBytes,
  truncateId
} from '../utils/formatters';
import type { EntityGetResponse, FieldMetaData } from '@uipath/uipath-typescript';

interface EntityDetailsProps {
  entityId: string;
  onBack: () => void;
}

export const EntityDetails = ({ entityId, onBack }: EntityDetailsProps) => {
  const { sdk } = useAuth();
  const [entity, setEntity] = useState<EntityGetResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedField, setSelectedField] = useState<FieldMetaData | null>(null);
  const [showSystemFields, setShowSystemFields] = useState(false);

  useEffect(() => {
    fetchEntity();
  }, [entityId, sdk]);

  const fetchEntity = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await sdk.entities.getById(entityId);
      setEntity(response);
    } catch (err) {
      console.error('Failed to fetch entity:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch entity');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          <span className="text-gray-600 font-medium">Loading entity details...</span>
        </div>
      </div>
    );
  }

  if (error || !entity) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <span className="text-red-800">{error || 'Entity not found'}</span>
        </div>
        <button onClick={onBack} className="mt-3 text-sm text-red-600 hover:text-red-800 underline">
          Go back
        </button>
      </div>
    );
  }

  const visibleFields = showSystemFields
    ? entity.fields
    : entity.fields?.filter(f => !f.isSystemField);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <div className="flex items-center space-x-3">
              <h2 className="text-2xl font-bold text-gray-900">{entity.displayName}</h2>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getEntityTypeColor(entity.entityType)}`}>
                {entity.entityType}
              </span>
            </div>
            <p className="text-gray-500">{entity.name}</p>
          </div>
        </div>
        <button
          onClick={fetchEntity}
          className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>Refresh</span>
        </button>
      </div>

      {/* Entity Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="text-sm text-gray-500">Entity ID</div>
          <div className="text-sm font-mono text-gray-900 break-all">{entity.id}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="text-sm text-gray-500">Record Count</div>
          <div className="text-2xl font-bold text-gray-900">{entity.recordCount?.toLocaleString() || 'N/A'}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="text-sm text-gray-500">Storage Size</div>
          <div className="text-2xl font-bold text-gray-900">
            {entity.storageSizeInMB ? `${entity.storageSizeInMB.toFixed(2)} MB` : 'N/A'}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="text-sm text-gray-500">Attachment Size</div>
          <div className="text-2xl font-bold text-gray-900">{formatBytes(entity.attachmentSizeInByte)}</div>
        </div>
      </div>

      {/* Description */}
      {entity.description && (
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Description</h3>
          <p className="text-gray-600">{entity.description}</p>
        </div>
      )}

      {/* Metadata */}
      <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Metadata</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Created By:</span>
            <p className="font-medium">{entity.createdBy || 'N/A'}</p>
          </div>
          <div>
            <span className="text-gray-500">Created Time:</span>
            <p className="font-medium">{formatDate(entity.createdTime)}</p>
          </div>
          <div>
            <span className="text-gray-500">Updated By:</span>
            <p className="font-medium">{entity.updatedBy || 'N/A'}</p>
          </div>
          <div>
            <span className="text-gray-500">Updated Time:</span>
            <p className="font-medium">{formatDate(entity.updatedTime)}</p>
          </div>
          <div>
            <span className="text-gray-500">RBAC Enabled:</span>
            <p className="font-medium">{entity.isRbacEnabled ? 'Yes' : 'No'}</p>
          </div>
        </div>
      </div>

      {/* Fields Section */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            Fields ({visibleFields?.length || 0})
          </h3>
          <label className="flex items-center space-x-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={showSystemFields}
              onChange={(e) => setShowSystemFields(e.target.checked)}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <span>Show system fields</span>
          </label>
        </div>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Display Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Display Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Attributes</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {visibleFields?.map((field) => (
                <tr key={field.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{field.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{field.displayName}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getFieldTypeColor(field.fieldDataType?.name)}`}>
                      {field.fieldDataType?.name || 'N/A'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getFieldDisplayTypeColor(field.fieldDisplayType)}`}>
                      {formatFieldDisplayType(field.fieldDisplayType)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {field.isPrimaryKey && <span className="px-1.5 py-0.5 text-xs bg-yellow-100 text-yellow-800 rounded">PK</span>}
                      {field.isForeignKey && <span className="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-800 rounded">FK</span>}
                      {field.isRequired && <span className="px-1.5 py-0.5 text-xs bg-red-100 text-red-800 rounded">Required</span>}
                      {field.isUnique && <span className="px-1.5 py-0.5 text-xs bg-purple-100 text-purple-800 rounded">Unique</span>}
                      {field.isAttachment && <span className="px-1.5 py-0.5 text-xs bg-orange-100 text-orange-800 rounded">File</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setSelectedField(field)}
                      className="text-purple-600 hover:text-purple-800 text-sm font-medium"
                    >
                      Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Field Details Modal */}
      {selectedField && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Field Details: {selectedField.displayName}</h3>
              <button
                onClick={() => setSelectedField(null)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Field ID:</span>
                  <p className="font-mono text-xs break-all">{selectedField.id}</p>
                </div>
                <div>
                  <span className="text-gray-500">Name:</span>
                  <p className="font-medium">{selectedField.name}</p>
                </div>
                <div>
                  <span className="text-gray-500">Display Name:</span>
                  <p className="font-medium">{selectedField.displayName}</p>
                </div>
                <div>
                  <span className="text-gray-500">Data Type:</span>
                  <p className="font-medium">{selectedField.fieldDataType?.name}</p>
                </div>
                <div>
                  <span className="text-gray-500">Display Type:</span>
                  <p className="font-medium">{formatFieldDisplayType(selectedField.fieldDisplayType)}</p>
                </div>
                <div>
                  <span className="text-gray-500">Default Value:</span>
                  <p className="font-medium">{selectedField.defaultValue || 'None'}</p>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-2">Flags</h4>
                <div className="flex flex-wrap gap-2">
                  <span className={`px-2 py-1 text-xs rounded ${selectedField.isPrimaryKey ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                    Primary Key: {selectedField.isPrimaryKey ? 'Yes' : 'No'}
                  </span>
                  <span className={`px-2 py-1 text-xs rounded ${selectedField.isForeignKey ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                    Foreign Key: {selectedField.isForeignKey ? 'Yes' : 'No'}
                  </span>
                  <span className={`px-2 py-1 text-xs rounded ${selectedField.isRequired ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                    Required: {selectedField.isRequired ? 'Yes' : 'No'}
                  </span>
                  <span className={`px-2 py-1 text-xs rounded ${selectedField.isUnique ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                    Unique: {selectedField.isUnique ? 'Yes' : 'No'}
                  </span>
                  <span className={`px-2 py-1 text-xs rounded ${selectedField.isSystemField ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                    System Field: {selectedField.isSystemField ? 'Yes' : 'No'}
                  </span>
                  <span className={`px-2 py-1 text-xs rounded ${selectedField.isAttachment ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                    Attachment: {selectedField.isAttachment ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>

              {selectedField.fieldDataType && (
                <div className="border-t border-gray-200 pt-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">Type Constraints</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {selectedField.fieldDataType.lengthLimit && (
                      <div>
                        <span className="text-gray-500">Max Length:</span>
                        <p className="font-medium">{selectedField.fieldDataType.lengthLimit}</p>
                      </div>
                    )}
                    {selectedField.fieldDataType.minValue !== undefined && (
                      <div>
                        <span className="text-gray-500">Min Value:</span>
                        <p className="font-medium">{selectedField.fieldDataType.minValue}</p>
                      </div>
                    )}
                    {selectedField.fieldDataType.maxValue !== undefined && (
                      <div>
                        <span className="text-gray-500">Max Value:</span>
                        <p className="font-medium">{selectedField.fieldDataType.maxValue}</p>
                      </div>
                    )}
                    {selectedField.fieldDataType.decimalPrecision !== undefined && (
                      <div>
                        <span className="text-gray-500">Decimal Precision:</span>
                        <p className="font-medium">{selectedField.fieldDataType.decimalPrecision}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {selectedField.referenceEntity && (
                <div className="border-t border-gray-200 pt-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">Reference Entity</h4>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p><span className="text-gray-500">Name:</span> {selectedField.referenceEntity.displayName}</p>
                    <p><span className="text-gray-500">ID:</span> <span className="font-mono text-xs">{truncateId(selectedField.referenceEntity.id || '', 16)}</span></p>
                  </div>
                </div>
              )}

              {selectedField.referenceChoiceSet && (
                <div className="border-t border-gray-200 pt-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">Reference Choice Set</h4>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p><span className="text-gray-500">Name:</span> {selectedField.referenceChoiceSet.displayName}</p>
                    <p><span className="text-gray-500">ID:</span> <span className="font-mono text-xs">{truncateId(selectedField.referenceChoiceSet.id || '', 16)}</span></p>
                  </div>
                </div>
              )}

              <div className="border-t border-gray-200 pt-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-2">Timestamps</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-500">Created:</span>
                    <p className="font-medium">{formatDate(selectedField.createdTime)}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Updated:</span>
                    <p className="font-medium">{formatDate(selectedField.updatedTime)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
