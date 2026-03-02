import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { MaestroProcesses, ProcessInstances } from '@uipath/uipath-typescript/maestro-processes';
import type {
  MaestroProcessGetAllResponse,
  ProcessInstanceGetResponse
} from '@uipath/uipath-typescript/maestro-processes';

interface DashboardStats {
  totalProcesses: number;
  runningInstances: number;
  completedToday: number;
  failedToday: number;
}

export const ProcessList = () => {
  const { sdk, isAuthenticated } = useAuth();
  const [processes, setProcesses] = useState<MaestroProcessGetAllResponse[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalProcesses: 0,
    runningInstances: 0,
    completedToday: 0,
    failedToday: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const maestroProcesses = useMemo(() => {
    if (sdk) return new MaestroProcesses(sdk);
    return null;
  }, [sdk]);

  const processInstances = useMemo(() => {
    if (sdk) return new ProcessInstances(sdk);
    return null;
  }, [sdk]);

  useEffect(() => {
    if (isAuthenticated && maestroProcesses && processInstances) {
      fetchProcesses();
    }
  }, [isAuthenticated, maestroProcesses, processInstances]);

  const fetchProcesses = async () => {
    if (!maestroProcesses || !processInstances) return;

    setLoading(true);
    setError(null);

    try {
      // Use modular services directly - ProcessInstances is a separate service
      const [processesResponse, instancesResponse] = await Promise.all([
        maestroProcesses.getAll(),
        processInstances.getAll()
      ]);

      console.log('Processes response:', processesResponse);
      console.log('Instances response:', instancesResponse);

      // processesResponse is already MaestroProcessGetAllResponse[] from the SDK
      const processes: MaestroProcessGetAllResponse[] = processesResponse;
      
      // instancesResponse can be either PaginatedResponse or NonPaginatedResponse
      let instances: ProcessInstanceGetResponse[];
      if ('items' in instancesResponse) {
        instances = instancesResponse.items;
      } else {
        instances = [];
      }
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const todayInstances = instances.filter((instance: any) => 
        new Date(instance.startedTime) >= today
      );

      setStats({
        totalProcesses: processes.length,
        runningInstances: instances.filter((i: any) => 
          (i.latestRunStatus || '').toLowerCase() === 'running' || 
          (i.latestRunStatus || '').toLowerCase() === 'in progress'
        ).length,
        completedToday: todayInstances.filter((i: any) => 
          (i.latestRunStatus || '').toLowerCase() === 'completed' || 
          (i.latestRunStatus || '').toLowerCase() === 'successful'
        ).length,
        failedToday: todayInstances.filter((i: any) => 
          (i.latestRunStatus || '').toLowerCase() === 'failed' || 
          (i.latestRunStatus || '').toLowerCase() === 'faulted'
        ).length,
      });
      
      setProcesses(processes);
    } catch (err) {
      console.error('Failed to fetch processes:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch processes');
      setProcesses([]); // Ensure processes is always an array
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading processes...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 m-4">
        <div className="flex">
          <div className="text-red-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error loading processes</h3>
            <p className="text-sm text-red-600 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Processes',
      value: stats.totalProcesses,
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      ),
      color: 'bg-blue-500',
      textColor: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Running Instances',
      value: stats.runningInstances,
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      color: 'bg-yellow-500',
      textColor: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
    },
    {
      title: 'Completed Today',
      value: stats.completedToday,
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'bg-green-500',
      textColor: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Failed Today',
      value: stats.failedToday,
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'bg-red-500',
      textColor: 'text-red-600',
      bgColor: 'bg-red-50',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Maestro Processes</h2>
          <p className="text-gray-600 mt-1">Manage and monitor your UiPath processes</p>
        </div>
        <button
          onClick={fetchProcesses}
          className="inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm hover:shadow-md"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, index) => (
          <div
            key={index}
            className={`${card.bgColor} rounded-lg p-6 border border-gray-200 hover:shadow-lg transition-shadow`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${card.textColor}`}>{card.title}</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{card.value}</p>
              </div>
              <div className={card.textColor}>{card.icon}</div>
            </div>
          </div>
        ))}
      </div>

      {!Array.isArray(processes) || processes.length === 0 ? (
        <div className="text-center py-12">
          <div className="p-6 bg-gray-50 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
            <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No processes found</h3>
          <p className="text-gray-500">No Maestro processes are available in your tenant.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {processes
            .sort((a, b) => {
              // Sort by faulted count (descending), then by total activity (descending)
              const aTotal = a.runningCount + a.completedCount + a.faultedCount + a.pendingCount;
              const bTotal = b.runningCount + b.completedCount + b.faultedCount + b.pendingCount;
              
              if (b.faultedCount !== a.faultedCount) {
                return b.faultedCount - a.faultedCount;
              }
              return bTotal - aTotal;
            })
            .map((process) => {
              const total = process.runningCount + process.completedCount + process.faultedCount + process.pendingCount;
              const getStatusColor = () => {
                if (process.faultedCount > 0) return 'border-l-rose-400';
                if (process.runningCount > 0) return 'border-l-amber-400';
                if (process.completedCount > 0) return 'border-l-emerald-400';
                return 'border-l-slate-300';
              };

              return (
                <div
                  key={process.processKey}
                  className={`bg-white border border-slate-200/60 rounded-lg p-3 hover:shadow-md hover:border-slate-300/60 transition-all duration-200 ${getStatusColor()} border-l-3`}
                >
                  {/* Compact Header with Stats */}
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-slate-700 text-base mb-2">
                        {process.packageId
                          .replace(/\./g, ' ')
                          .replace(/_/g, ' ')
                          .replace(/([a-z])([A-Z])/g, '$1 $2')
                          .split(' ')
                          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                          .join(' ')
                        }
                      </h3>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <svg className="w-3 h-3 text-slate-400" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4l2 2h4a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
                            </svg>
                            {process.folderName}
                          </span>
                          <span className="text-slate-600 font-medium bg-slate-100 px-1.5 py-0.5 rounded text-xs">v{process.versionCount}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs">
                          {process.completedCount > 0 && (
                            <div className="flex items-center gap-1.5 bg-green-50 px-2 py-1 rounded-full">
                              <div className="w-2.5 h-2.5 bg-green-500 rounded-full shadow-sm"></div>
                              <span className="font-semibold text-green-700">{process.completedCount}</span>
                              <span className="text-green-600 text-xs">completed</span>
                            </div>
                          )}
                          {process.runningCount > 0 && (
                            <div className="flex items-center gap-1.5 bg-orange-50 px-2 py-1 rounded-full">
                              <div className="w-2.5 h-2.5 bg-orange-500 rounded-full shadow-sm animate-pulse"></div>
                              <span className="font-semibold text-orange-700">{process.runningCount}</span>
                              <span className="text-orange-600 text-xs">running</span>
                            </div>
                          )}
                          {process.faultedCount > 0 && (
                            <div className="flex items-center gap-1.5 bg-red-50 px-2 py-1 rounded-full">
                              <div className="w-2.5 h-2.5 bg-red-500 rounded-full shadow-sm"></div>
                              <span className="font-semibold text-red-700">{process.faultedCount}</span>
                              <span className="text-red-600 text-xs">faulted</span>
                            </div>
                          )}
                          {process.pendingCount > 0 && (
                            <div className="flex items-center gap-1.5 bg-blue-50 px-2 py-1 rounded-full">
                              <div className="w-2.5 h-2.5 bg-blue-500 rounded-full shadow-sm"></div>
                              <span className="font-semibold text-blue-700">{process.pendingCount}</span>
                              <span className="text-blue-600 text-xs">pending</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Progress Bar */}
                      <div className="mt-3">
                        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden shadow-inner">
                          <div className="h-full flex rounded-full">
                            {process.completedCount > 0 && (
                              <div 
                                className="bg-gradient-to-r from-green-400 to-green-500 transition-all duration-300" 
                                style={{ width: `${(process.completedCount / total) * 100}%` }}
                              />
                            )}
                            {process.runningCount > 0 && (
                              <div 
                                className="bg-gradient-to-r from-orange-400 to-orange-500 transition-all duration-300" 
                                style={{ width: `${(process.runningCount / total) * 100}%` }}
                              />
                            )}
                            {process.faultedCount > 0 && (
                              <div 
                                className="bg-gradient-to-r from-red-400 to-red-500 transition-all duration-300" 
                                style={{ width: `${(process.faultedCount / total) * 100}%` }}
                              />
                            )}
                            {process.pendingCount > 0 && (
                              <div 
                                className="bg-gradient-to-r from-blue-400 to-blue-500 transition-all duration-300" 
                                style={{ width: `${(process.pendingCount / total) * 100}%` }}
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Additional Info */}
                  {(process.pausedCount > 0 || process.cancelledCount > 0) && (
                    <div className="flex gap-2 mt-2 pt-2 border-t border-slate-100/70">
                      {process.pausedCount > 0 && (
                        <span className="inline-flex items-center gap-1 bg-yellow-50/50 text-yellow-600 text-xs px-2 py-1 rounded font-medium">
                          <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full"></div>
                          {process.pausedCount} paused
                        </span>
                      )}
                      {process.cancelledCount > 0 && (
                        <span className="inline-flex items-center gap-1 bg-slate-50/50 text-slate-500 text-xs px-2 py-1 rounded font-medium">
                          <div className="w-1.5 h-1.5 bg-slate-400 rounded-full"></div>
                          {process.cancelledCount} cancelled
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
};