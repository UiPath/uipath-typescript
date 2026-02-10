import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { InstanceList } from './InstanceList';
import { InstanceDetails } from './InstanceDetails';
import { formatProcessName } from '../utils/formatters';
import { MaestroProcesses, ProcessInstances as ProcessInstancesService } from '@uipath/uipath-typescript/maestro-processes';
import { Entities } from '@uipath/uipath-typescript/entities';
import type {
  ProcessInstanceGetResponse,
  MaestroProcessGetAllResponse,
  ProcessInstanceGetVariablesResponse,
  ProcessInstanceExecutionHistoryResponse,
  BpmnXmlString
} from '@uipath/uipath-typescript/maestro-processes';
import type {
  EntityRecord,
  EntityGetResponse
} from '@uipath/uipath-typescript/entities';
import type { PaginatedResponse } from '@uipath/uipath-typescript/core';

export const ProcessInstances = () => {
  const { sdk, isAuthenticated } = useAuth();
  const [instances, setInstances] = useState<ProcessInstanceGetResponse[]>([]);
  const [processes, setProcesses] = useState<MaestroProcessGetAllResponse[]>([]);
  const [selectedProcess, setSelectedProcess] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modular pattern: Create service instances directly with SDK
  const maestroProcesses = useMemo(() => {
    if (sdk) return new MaestroProcesses(sdk);
    return null;
  }, [sdk]);

  const processInstances = useMemo(() => {
    if (sdk) return new ProcessInstancesService(sdk);
    return null;
  }, [sdk]);

  const entities = useMemo(() => {
    if (sdk) return new Entities(sdk);
    return null;
  }, [sdk]);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [nextCursor, setNextCursor] = useState<{ value: string } | undefined>();
  const [previousCursor, setPreviousCursor] = useState<{ value: string } | undefined>();
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPreviousPage, setHasPreviousPage] = useState(false);
  const pageSize = 25;
  const [selectedInstance, setSelectedInstance] = useState<ProcessInstanceGetResponse | null>(null);
  const [selectedInstanceDetails, setSelectedInstanceDetails] = useState<{
    requestor?: string;
    endDate?: string;
    activityType?: string;
    attachment?: { name: string; url: string };
    taskLink?: string;
    variables?: Record<string, Array<{ name: string; value: string; type: string }>>;
    loading: boolean;
    error?: string;
  }>({ loading: false });


  useEffect(() => {
    if (isAuthenticated && maestroProcesses && processInstances) {
      fetchData();
    }
  }, [isAuthenticated, maestroProcesses, processInstances]);

  // Reset pagination when process filter changes
  useEffect(() => {
    if (isAuthenticated && processInstances) {
      setCurrentPage(1);
      setNextCursor(undefined);
      setPreviousCursor(undefined);
      fetchInstancesPage();
    }
  }, [selectedProcess]);

  const fetchInstancesPage = async (cursor?: { value: string }) => {
    if (!processInstances) return;

    setLoading(true);
    setError(null);

    try {
      // Build options with filtering and pagination
      const options = {
        pageSize,
        ...(cursor && { cursor }),
        ...(selectedProcess !== 'all' && { packageId: selectedProcess })
      };

      const response = await processInstances.getAll(options);
      const paginatedResponse = response as PaginatedResponse<ProcessInstanceGetResponse>;
      
      // Set instances for current page only
      setInstances(paginatedResponse.items);
      
      // Update pagination state
      setHasNextPage(paginatedResponse.hasNextPage);
      setNextCursor(paginatedResponse.nextCursor);
      setPreviousCursor(paginatedResponse.previousCursor);
      setHasPreviousPage(!!paginatedResponse.previousCursor);
      
      // Update total count if available
      if (paginatedResponse.totalCount) {
        setTotalCount(paginatedResponse.totalCount);
        setTotalPages(Math.ceil(paginatedResponse.totalCount / pageSize));
      }
      
      // Update current page if available
      if (paginatedResponse.currentPage) {
        setCurrentPage(paginatedResponse.currentPage);
      }
        
    } catch (err) {
      console.error('Error fetching instances page:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch instances');
      setInstances([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchData = async () => {
    if (!maestroProcesses) return;

    try {
      // Use modular service directly instead of sdk.maestro.processes
      const processesResponse = await maestroProcesses.getAll();
      setProcesses(processesResponse);
      
      // Fetch first page of instances
      await fetchInstancesPage();
      
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
      setInstances([]);
      setProcesses([]);
    }
  };

  // Pagination navigation functions
  const goToNextPage = () => {
    if (hasNextPage && nextCursor) {
      setCurrentPage(prev => prev + 1);
      fetchInstancesPage(nextCursor);
    }
  };

  const goToPreviousPage = () => {
    if (hasPreviousPage && previousCursor) {
      setCurrentPage(prev => prev - 1);
      fetchInstancesPage(previousCursor);
    }
  };



  const fetchInstanceDetails = async (instance: ProcessInstanceGetResponse) => {
    if (!processInstances) return;

    setSelectedInstanceDetails({ loading: true });

    // Initialize result object with basic info
    const result: {
      requestor?: string;
      endDate?: string;
      activityType?: string;
      attachment?: { name: string; url: string };
      taskLink?: string;
      variables?: Record<string, Array<{ name: string; value: string; type: string }>>;
      loading: boolean;
      error?: string;
    } = {
      loading: false,
      requestor: instance.startedByUser,
      endDate: instance.completedTime || 'Not Completed',
    };

    // Fetch variables (with error handling)
    let elementId: string | undefined;
    try {
      // Use modular ProcessInstances service directly
      const variables: ProcessInstanceGetVariablesResponse = await processInstances.getVariables(instance.instanceId, instance.folderKey);
      console.log('Variables:', variables);
      const lastElement = variables.elements[variables.elements.length - 1];
      elementId = lastElement?.elementId;

      // Group variables by source, excluding certain types
      const groupedVariables: Record<string, Array<{ name: string; value: string; type: string }>> = {};

      variables.globalVariables
        .filter(variable => {
          // Filter out variables with unwanted types
          const type = variable.type?.toLowerCase();
          return type !== 'any' && type !== 'jsonschema' && type !== 'object';
        })
        .filter(variable => {
          // Filter out variables with null, empty, or 'null' string values
          const value = String(variable.value).trim().toLowerCase();
          return variable.value !== null &&
                 variable.value !== undefined &&
                 value !== '' &&
                 value !== 'null' &&
                 value !== 'undefined';
        })
        .forEach(variable => {
          const source = variable.source || 'Unknown';
          if (!groupedVariables[source]) {
            groupedVariables[source] = [];
          }
          groupedVariables[source].push({
            name: variable.name,
            value: String(variable.value),
            type: variable.type
          });
        });

      // Remove sources that have no valid variables after filtering
      Object.keys(groupedVariables).forEach(source => {
        if (groupedVariables[source].length === 0) {
          delete groupedVariables[source];
        }
      });

      result.variables = groupedVariables;
    } catch (err) {
      console.error('Error fetching variables:', err);
      // Continue with other data fetching
    }

    // Fetch BPMN and execution history (with individual error handling)
    let bpmnXml: BpmnXmlString | null = null;
    let executionHistory: ProcessInstanceExecutionHistoryResponse[] = [];

    try {
      // Use modular ProcessInstances service directly
      bpmnXml = await processInstances.getBpmn(instance.instanceId, instance.folderKey);
    } catch (err) {
      console.error('Error fetching BPMN:', err);
      // Continue without BPMN data
    }

    try {
      // Use modular ProcessInstances service directly
      executionHistory = await processInstances.getExecutionHistory(instance.instanceId);
    } catch (err) {
      console.error('Error fetching execution history:', err);
      // Continue without execution history
    }

    // Parse BPMN XML to find activity type
    let activityType = 'Unknown';
    let taskLink = undefined;

    if (elementId && bpmnXml) {
      const match = bpmnXml.match(new RegExp(`<bpmn:(\\w+)\\s+id="${elementId}"`));
      if (match && match[1]) {
        activityType = match[1].replace(/([A-Z])/g, ' $1').trim(); // Add spaces between camelCase

        // If it's a user task, look for the action center task link
        if (activityType.toLowerCase() === 'user task' && executionHistory.length > 0) {
          // Find the history entry with matching elementId
          console.log('Looking for elementId:', elementId);
          console.log('Execution History:', executionHistory);
          const taskEntry = executionHistory.find((entry: ProcessInstanceExecutionHistoryResponse) => {
            // Parse attributes JSON if it's a string
            const attributes = typeof entry.attributes === 'string'
              ? JSON.parse(entry.attributes)
              : entry.attributes;
            return attributes?.elementId === elementId;
          });

          if (taskEntry) {
            const attributes = typeof taskEntry.attributes === 'string'
              ? JSON.parse(taskEntry.attributes)
              : taskEntry.attributes;
            taskLink = attributes?.actionCenterTaskLink;
            console.log('Found task link:', taskLink);
          }
        }
      }
    }

    result.activityType = activityType;
    result.taskLink = taskLink;

    // Fetch entity attachment (with error handling)
    const entityId = import.meta.env.VITE_UIPATH_ENTITY_ID;

    if (entityId && entities) {
      try {
        // Use modular Entities service directly
        const entity: EntityGetResponse = await entities.getById(entityId);
        const entityRecords = await entity.getAllRecords({expansionLevel: 2});

        if (entityRecords?.items && entityRecords.items.length > 0) {
          // Find the first record with an attachment
          const recordWithAttachment = entityRecords.items.find((record: EntityRecord) => record.attatchments);
          console.log('Record with attachment:', recordWithAttachment);

          if (recordWithAttachment?.attatchments) {
            result.attachment = {
              name: recordWithAttachment.attatchments.name,
              url: recordWithAttachment.attatchments.path
            };
          }
        }
      } catch (err) {
        console.error('Error fetching entity attachments:', err);
        // Don't set attachment - will show "No attachments" message in UI
      }
    }

    setSelectedInstanceDetails(result);
  };


  return (
    <div className="space-y-4 p-4 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center bg-white rounded-xl shadow-sm p-4 border border-gray-200">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
            Process Instances
          </h2>
          <p className="text-gray-600 mt-1">Monitor and manage your UiPath process executions</p>
        </div>
        <button
          onClick={fetchData}
          className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2"
          disabled={loading}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="bg-gradient-to-r from-red-50 to-red-100 border border-red-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-start">
            <div className="p-2 bg-red-100 rounded-lg">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-red-800">Error loading process instances</h3>
              <p className="text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.414A1 1 0 013 6.707V4z" />
              </svg>
              <label htmlFor="process-filter" className="text-sm font-semibold text-gray-700">
                Filter by Process:
              </label>
            </div>
            <select
              id="process-filter"
              value={selectedProcess}
              onChange={(e) => setSelectedProcess(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[200px] shadow-sm"
              disabled={loading}
            >
              <option value="all">All Processes</option>
              {processes.map((process) => {
                return (
                <option key={process.processKey} value={process.packageId}>
                  {formatProcessName(process.packageId)}
                </option>
                );
              })}
            </select>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-lg">
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span className="text-sm font-semibold text-blue-900">
                {totalCount > 0 ? `${totalCount} total` : `${instances.length} instance${instances.length !== 1 ? 's' : ''}`}
              </span>
            </div>
            
            {/* Pagination Info */}
            {totalPages > 1 && (
              <div className="text-sm text-gray-600">
                Total Pages: {totalPages}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex gap-4 h-[calc(100vh-250px)]">
        {/* Left Side - Instance Cards (35% width) */}
        <div className="w-[35%] space-y-4 overflow-y-auto bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-4 pb-4 border-b border-gray-100">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <h3 className="font-semibold text-gray-900">Process Instances</h3>
          </div>
          
          <InstanceList
            instances={instances}
            loading={loading}
            selectedProcess={selectedProcess}
            selectedInstance={selectedInstance}
            currentPage={currentPage}
            totalPages={totalPages}
            totalCount={totalCount}
            hasNextPage={hasNextPage}
            hasPreviousPage={hasPreviousPage}
            onInstanceSelect={(instance) => {
              setSelectedInstance(instance);
              fetchInstanceDetails(instance);
            }}
            onInstanceDoubleClick={async (instance) => {
              // Example of using SDK instance methods directly
              if (instance.latestRunStatus?.toLowerCase() === 'faulted') {
                try {
                  const result = await instance.cancel({ comment: 'Cancelled from UI' });
                  if (result.success) {
                    console.log('Instance cancelled successfully');
                    fetchData(); // Refresh the data
                  }
                } catch (error) {
                  console.error('Failed to cancel instance:', error);
                }
              }
            }}
            onNextPage={goToNextPage}
            onPreviousPage={goToPreviousPage}
          />
        </div>

        {/* Right Side - Instance Overview (65% width) */}
        <div className="w-[65%] bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <InstanceDetails
            selectedInstance={selectedInstance}
            instanceDetails={selectedInstanceDetails}
            onRefreshData={fetchData}
          />
        </div>
      </div>
    </div>
  );
};