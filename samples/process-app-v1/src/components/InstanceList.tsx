// Modular import - import types from maestro-processes module
import type { ProcessInstanceGetResponse } from '@uipath/uipath-typescript/maestro-processes';
import { getStatusColor, formatDuration, formatProcessName } from '../utils/formatters';

interface InstanceListProps {
  instances: ProcessInstanceGetResponse[];
  loading: boolean;
  selectedProcess: string;
  selectedInstance: ProcessInstanceGetResponse | null;
  currentPage: number;
  totalPages: number;
  totalCount: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  onInstanceSelect: (instance: ProcessInstanceGetResponse) => void;
  onInstanceDoubleClick: (instance: ProcessInstanceGetResponse) => void;
  onNextPage: () => void;
  onPreviousPage: () => void;
}

export const InstanceList = ({
  instances,
  loading,
  selectedProcess,
  selectedInstance,
  totalPages,
  totalCount,
  hasNextPage,
  hasPreviousPage,
  onInstanceSelect,
  onInstanceDoubleClick,
  onNextPage,
  onPreviousPage
}: InstanceListProps) => {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 mb-4"></div>
        <span className="text-gray-600 font-medium">Loading process instances...</span>
        <span className="text-gray-400 text-sm mt-1">Please wait while we fetch your data</span>
      </div>
    );
  }

  if (!Array.isArray(instances) || instances.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="p-6 bg-gray-50 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
          <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No instances found</h3>
        <p className="text-gray-500 max-w-sm mx-auto">
          {selectedProcess === 'all' 
            ? 'No process instances have been executed yet. Start a process to see instances here.' 
            : 'No instances found for the selected process. Try selecting a different process.'}
        </p>
      </div>
    );
  }

  return (
    <>
      {instances.map((instance) => (
        <div
          key={instance.instanceId}
          className={`relative group cursor-pointer transition-all duration-200 ${
            selectedInstance?.instanceId === instance.instanceId 
              ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 shadow-lg transform scale-[1.02]' 
              : 'bg-white border border-gray-200 hover:border-blue-300 hover:shadow-md hover:bg-gray-50'
          } rounded-xl p-5`}
          onClick={() => onInstanceSelect(instance)}
          onDoubleClick={() => onInstanceDoubleClick(instance)}
        >
          {/* Status indicator line */}
          <div className={`absolute left-0 top-4 bottom-4 w-1 rounded-r-full ${
            instance.latestRunStatus?.toLowerCase() === 'completed' ? 'bg-green-400' :
            instance.latestRunStatus?.toLowerCase() === 'running' ? 'bg-blue-400' :
            instance.latestRunStatus?.toLowerCase() === 'failed' ? 'bg-red-400' :
            'bg-gray-300'
          }`}></div>

          {/* Instance Header */}
          <div className="flex items-start justify-between mb-3 ml-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-gray-100 rounded-lg group-hover:bg-blue-100 transition-colors">
                <svg className="w-4 h-4 text-gray-600 group-hover:text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="font-mono text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                #{instance.instanceId.substring(0, 8)}
              </div>
            </div>
            <span className={`px-3 py-1 text-xs font-semibold rounded-full shadow-sm ${getStatusColor(instance.latestRunStatus || 'unknown')}`}>
              {instance.latestRunStatus || 'Unknown'}
            </span>
          </div>

          {/* Process Name */}
          <h3 className="font-semibold text-gray-900 text-base mb-3 ml-3 group-hover:text-blue-900 transition-colors line-clamp-2">
            {formatProcessName(instance.packageId)}
          </h3>

          {/* Instance Details */}
          <div className="space-y-2 text-sm text-gray-600 ml-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-xs font-medium">Started:</span>
              </div>
              <span className="text-xs font-mono">{new Date(instance.startedTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} {new Date(instance.startedTime).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span className="text-xs font-medium">Duration:</span>
              </div>
              <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">{formatDuration(instance.startedTime, instance.completedTime || undefined)}</span>
            </div>
            {instance.completedTime && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-xs font-medium">Completed:</span>
                </div>
                <span className="text-xs font-mono">{new Date(instance.completedTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} {new Date(instance.completedTime).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}</span>
              </div>
            )}
          </div>
          
          {/* Hover indicator */}
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
            <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      ))}
      
      {/* Pagination Controls */}
      {(hasNextPage || hasPreviousPage) && (
        <div className="flex items-center justify-between py-4 px-2 bg-white border-t border-gray-100">
          <button
            onClick={onPreviousPage}
            disabled={!hasPreviousPage}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Previous
          </button>
          
          <div className="flex items-center gap-2 text-sm text-gray-600">
            {totalPages > 1 && <span>of {totalPages}</span>}
            {totalCount > 0 && <span>({totalCount} total)</span>}
          </div>
          
          <button
            onClick={onNextPage}
            disabled={!hasNextPage}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}
    </>
  );
};