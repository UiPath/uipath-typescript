import { useState } from 'react';
// Modular import - import types from maestro-processes module
import type { ProcessInstanceGetResponse } from '@uipath/uipath-typescript/maestro-processes';
import { getStatusColor, formatDuration, formatProcessName, getEmbedTaskUrl } from '../utils/formatters';

interface InstanceDetailsProps {
  selectedInstance: ProcessInstanceGetResponse | null;
  instanceDetails: {
    requestor?: string;
    endDate?: string;
    activityType?: string;
    attachment?: { name: string; url: string };
    taskLink?: string;
    variables?: Record<string, Array<{ name: string; value: string; type: string }>>;
    loading: boolean;
    error?: string;
  };
  onRefreshData: () => void;
}

export const InstanceDetails = ({ selectedInstance, instanceDetails, onRefreshData }: InstanceDetailsProps) => {
  const [isTaskPopupOpen, setIsTaskPopupOpen] = useState(false);

  if (!selectedInstance) {
    return (
      <div className="flex items-center justify-center h-full text-center">
        <div className="max-w-md mx-auto p-8">
          <div className="p-6 bg-blue-50 rounded-full w-32 h-32 flex items-center justify-center mx-auto mb-6">
            <svg className="w-16 h-16 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Instance Details</h3>
          <p className="text-gray-500 leading-relaxed">Select a process instance from the left panel to view detailed information, execution data, and attached files.</p>
        </div>
      </div>
    );
  }

  if (instanceDetails.loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto mb-6"></div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Loading Instance Details</h3>
          <p className="text-gray-600">Fetching execution data and variables...</p>
        </div>
      </div>
    );
  }

  if (instanceDetails.error) {
    return (
      <div className="p-8">
        <div className="bg-gradient-to-r from-red-50 to-red-100 border border-red-200 rounded-xl p-6">
          <div className="flex items-start">
            <div className="p-2 bg-red-100 rounded-lg">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-red-800">Error loading instance details</h3>
              <p className="text-red-700 mt-1">{instanceDetails.error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="h-full overflow-y-auto">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100 p-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                Instance Overview
              </h2>
              <p className="text-blue-700 mt-2 font-medium">{formatProcessName(selectedInstance.packageId)}</p>
              <p className="text-blue-600 text-sm mt-1 font-mono">ID: {selectedInstance.instanceId}</p>
            </div>
            <span className={`px-4 py-2 text-sm font-semibold rounded-full shadow-sm ${getStatusColor(selectedInstance.latestRunStatus || 'unknown')}`}>
              {selectedInstance.latestRunStatus || 'Unknown'}
            </span>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h3 className="text-sm font-semibold text-green-800">Requestor</h3>
              </div>
              <p className="text-green-900 font-medium">{instanceDetails.requestor}</p>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-sm font-semibold text-blue-800">Duration</h3>
              </div>
              <p className="text-blue-900 font-medium">
                {formatDuration(selectedInstance.startedTime, selectedInstance.completedTime || undefined)}
              </p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-sm font-semibold text-purple-800">Activity Type</h3>
              </div>
              <p className="text-purple-900 font-medium">{instanceDetails.activityType}</p>
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-gray-50 rounded-xl p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Execution Timeline
            </h3>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                  <span className="text-sm font-medium text-gray-700">Started</span>
                </div>
                <span className="text-sm text-gray-600">
                  {new Date(selectedInstance.startedTime).toLocaleDateString('en-US', { 
                    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' 
                  })} at {new Date(selectedInstance.startedTime).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
                </span>
              </div>
              {selectedInstance.completedTime && (
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
                    <span className="text-sm font-medium text-gray-700">Completed</span>
                  </div>
                  <span className="text-sm text-gray-600">
                    {new Date(selectedInstance.completedTime).toLocaleDateString('en-US', { 
                      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' 
                    })} at {new Date(selectedInstance.completedTime).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* SDK Usage Example - Instance Operations */}
        {selectedInstance?.latestRunStatus?.toLowerCase() === 'faulted' && (
          <div className="px-4 pb-4">
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-red-50 to-orange-50 border-b border-red-100 p-4">
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  Faulted Instance Actions
                </h3>
                <p className="text-red-700 mt-1">Use SDK instance methods to manage process instances</p>
              </div>
              
              <div className="p-4">
                <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-red-100 rounded-lg">
                      <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-semibold text-red-900">Cancel Faulted Instance</h4>
                      <p className="text-red-700 text-sm">Use the SDK instance.cancel() method</p>
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        const result = await selectedInstance.cancel({ 
                          comment: 'Cancelled from sample app UI' 
                        });
                        if (result.success) {
                          alert('Instance cancelled successfully!');
                          onRefreshData();
                        }
                      } catch (error) {
                        console.error('Failed to cancel instance:', error);
                        alert('Failed to cancel instance');
                      }
                    }}
                    className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-medium transition-colors shadow-sm hover:shadow-md flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Cancel Instance
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tasks Section */}
        <div className="px-4 pb-4">
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-100 p-4">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                </div>
                Tasks
              </h3>
              <p className="text-green-700 mt-1">Active tasks and human interaction points</p>
            </div>
            
            <div className="p-4">
              {instanceDetails.activityType?.toLowerCase() === 'user task' ? (
                instanceDetails.taskLink ? (
                  <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-green-100 rounded-lg">
                        <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-semibold text-green-900">Active User Task</h4>
                      </div>
                    </div>
                    <button
                      onClick={() => setIsTaskPopupOpen(true)}
                      className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors shadow-sm hover:shadow-md flex items-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      Open Task
                    </button>
                  </div>
              ) : (
                <div className="flex items-center gap-4 p-4 bg-yellow-50 rounded-xl border border-yellow-200">
                  <div className="p-3 bg-yellow-100 rounded-lg">
                    <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-semibold text-yellow-900">Task Link Unavailable</h4>
                    <p className="text-yellow-700 text-sm">No action center link available for this user task</p>
                  </div>
                </div>
              )
            ) : (
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                <div className="p-3 bg-gray-100 rounded-lg">
                  <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Automated Process</h4>
                  <p className="text-gray-600 text-sm">No human tasks required for this process instance</p>
                </div>
              </div>
            )}
            </div>
          </div>
        </div>

        {/* Variables Section */}
        {instanceDetails.variables && Object.keys(instanceDetails.variables).length > 0 && (
          <div className="px-4 pb-4">
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-b border-purple-100 p-4">
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v1.586a1 1 0 00.293.707l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2h-5.586a1 1 0 01-.707-.293L7.707 21.707A1 1 0 017 21z" />
                    </svg>
                  </div>
                  Variables
                </h3>
                <p className="text-purple-700 mt-1">Process variables organized by source</p>
              </div>
              
              <div className="max-h-80 overflow-y-auto">
                {Object.entries(instanceDetails.variables).map(([source, variables]) => (
                  <div key={source} className="border-b border-gray-100 last:border-b-0">
                    <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                      <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                        <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                        {source}
                      </h4>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {variables.map((variable, index) => (
                        <div key={index} className="p-4 hover:bg-gray-50 transition-colors">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className="p-2 bg-purple-50 rounded-lg flex-shrink-0">
                                <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                                </svg>
                              </div>
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <h5 className="text-sm font-semibold text-gray-900">{variable.name}</h5>
                                  <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-full">
                                    {variable.type}
                                  </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="bg-gray-50 rounded-lg px-3 py-2">
                                    <span className="text-sm font-mono text-gray-800 break-all">{variable.value}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Attachments Section */}
        <div className="px-4 pb-4">
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100 p-4">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                </div>
                Attachments
              </h3>
              <p className="text-blue-700 mt-1">Documents and files associated with this process</p>
            </div>

            <div className="p-4">
              {instanceDetails.attachment ? (
                <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-semibold text-blue-900">{instanceDetails.attachment.name}</h4>
                    </div>
                  </div>
                  <a
                    href={`${import.meta.env.VITE_UIPATH_BASE_URL}/${import.meta.env.VITE_UIPATH_ORG_NAME}/${import.meta.env.VITE_UIPATH_TENANT_NAME}/dataservice_/entities/${import.meta.env.VITE_UIPATH_ENTITY_ID}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors shadow-sm hover:shadow-md flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    Open File
                  </a>
                </div>
              ) : (
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="p-3 bg-gray-100 rounded-lg">
                    <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">No Attachments</h4>
                    <p className="text-gray-600 text-sm">
                      {import.meta.env.VITE_UIPATH_ENTITY_ID
                        ? 'No attachments found for this process instance'
                        : 'Add VITE_UIPATH_ENTITY_ID to environment variables to fetch attachments from Data Fabric'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Task Popup */}
      {isTaskPopupOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-[90vw] h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-medium text-gray-900">Task Details</h3>
              <button
                onClick={() => setIsTaskPopupOpen(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 p-1">
              <iframe
                src={instanceDetails.taskLink ? getEmbedTaskUrl(instanceDetails.taskLink) : ''}
                className="w-full h-full rounded border-0"
                title="Task Details"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};