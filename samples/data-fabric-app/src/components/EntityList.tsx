import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getEntityTypeColor, formatDate, truncateId } from '../utils/formatters';
import type { EntityGetResponse } from '@uipath/uipath-typescript';

interface EntityListProps {
  onSelectEntity: (entity: EntityGetResponse) => void;
  selectedEntityId?: string;
}

export const EntityList = ({ onSelectEntity, selectedEntityId }: EntityListProps) => {
  const { sdk } = useAuth();
  const [entities, setEntities] = useState<EntityGetResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  useEffect(() => {
    fetchEntities();
  }, [sdk]);

  const fetchEntities = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await sdk.entities.getAll();
      setEntities(response);
    } catch (err) {
      console.error('Failed to fetch entities:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch entities');
    } finally {
      setLoading(false);
    }
  };

  const filteredEntities = entities.filter(entity => {
    const matchesSearch = entity.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entity.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || entity.entityType === filterType;
    return matchesSearch && matchesType;
  });

  const entityTypes = [...new Set(entities.map(e => e.entityType))];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          <span className="text-gray-600 font-medium">Loading entities...</span>
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
        <button
          onClick={fetchEntities}
          className="mt-3 text-sm text-red-600 hover:text-red-800 underline"
        >
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
          <h2 className="text-2xl font-bold text-gray-900">Entities</h2>
          <p className="text-gray-600 mt-1">Browse and manage your Data Fabric entities</p>
        </div>
        <button
          onClick={fetchEntities}
          className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>Refresh</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="text-sm text-gray-500">Total Entities</div>
          <div className="text-2xl font-bold text-gray-900">{entities.length}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="text-sm text-gray-500">Entities</div>
          <div className="text-2xl font-bold text-blue-600">
            {entities.filter(e => e.entityType === 'Entity').length}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="text-sm text-gray-500">Choice Sets</div>
          <div className="text-2xl font-bold text-purple-600">
            {entities.filter(e => e.entityType === 'ChoiceSet').length}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="text-sm text-gray-500">System Entities</div>
          <div className="text-2xl font-bold text-gray-600">
            {entities.filter(e => e.entityType === 'SystemEntity' || e.entityType === 'InternalEntity').length}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search entities..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        >
          <option value="all">All Types</option>
          {entityTypes.map(type => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
      </div>

      {/* Entity Grid */}
      {filteredEntities.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <svg className="w-16 h-16 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
          </svg>
          <p className="text-gray-500 mt-4">No entities found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEntities.map((entity) => (
            <div
              key={entity.id}
              onClick={() => onSelectEntity(entity)}
              className={`bg-white p-4 rounded-lg shadow border-2 cursor-pointer transition-all hover:shadow-lg ${
                selectedEntityId === entity.id
                  ? 'border-purple-500 ring-2 ring-purple-200'
                  : 'border-gray-200 hover:border-purple-300'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{entity.displayName}</h3>
                  <p className="text-sm text-gray-500 truncate">{entity.name}</p>
                </div>
                <span className={`ml-2 px-2 py-1 text-xs font-medium rounded-full ${getEntityTypeColor(entity.entityType)}`}>
                  {entity.entityType}
                </span>
              </div>

              {entity.description && (
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">{entity.description}</p>
              )}

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="text-gray-500">
                  <span className="font-medium">ID:</span> {truncateId(entity.id)}
                </div>
                <div className="text-gray-500">
                  <span className="font-medium">Fields:</span> {entity.fields?.length || 0}
                </div>
                {entity.recordCount !== undefined && (
                  <div className="text-gray-500">
                    <span className="font-medium">Records:</span> {entity.recordCount.toLocaleString()}
                  </div>
                )}
                <div className="text-gray-500">
                  <span className="font-medium">Created:</span> {formatDate(entity.createdTime).split(',')[0]}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
