import { useState, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';

// Modular imports - each service from its own module
import { Tasks } from '@uipath/uipath-typescript/tasks';
import { Assets } from '@uipath/uipath-typescript/assets';
import { Queues } from '@uipath/uipath-typescript/queues';
import { Buckets } from '@uipath/uipath-typescript/buckets';
import { Processes } from '@uipath/uipath-typescript/processes';
import { Cases, CaseInstances } from '@uipath/uipath-typescript/cases';
import { Entities, ChoiceSets } from '@uipath/uipath-typescript/entities';

// Types from each module
import type { TaskGetResponse } from '@uipath/uipath-typescript/tasks';
import type { AssetGetResponse } from '@uipath/uipath-typescript/assets';
import type { QueueGetResponse } from '@uipath/uipath-typescript/queues';
import type { BucketGetResponse } from '@uipath/uipath-typescript/buckets';
import type { ProcessGetResponse } from '@uipath/uipath-typescript/processes';
import type { CaseGetAllResponse, CaseInstanceGetResponse } from '@uipath/uipath-typescript/cases';
import type { EntityGetResponse, ChoiceSetGetAllResponse } from '@uipath/uipath-typescript/entities';

// Test entity ID for Entities service
const TEST_ENTITY_ID = '7b3473d6-f2d1-ef11-8474-6045bd07d9c3';

interface ServiceTestResult {
  service: string;
  module: string;
  status: 'idle' | 'loading' | 'success' | 'error';
  data?: unknown;
  error?: string;
  count?: number;
}

export const ModularServicesTest = () => {
  const { sdk } = useAuth();
  const [results, setResults] = useState<Record<string, ServiceTestResult>>({
    entities: { service: 'Entities', module: '/entities', status: 'idle' },
    entitiesGetById: { service: 'Entities.getById', module: '/entities', status: 'idle' },
    entitiesGetRecords: { service: 'Entities.getRecordsById', module: '/entities', status: 'idle' },
    choiceSets: { service: 'ChoiceSets', module: '/entities', status: 'idle' },
    tasks: { service: 'Tasks', module: '/tasks', status: 'idle' },
    assets: { service: 'Assets', module: '/assets', status: 'idle' },
    queues: { service: 'Queues', module: '/queues', status: 'idle' },
    buckets: { service: 'Buckets', module: '/buckets', status: 'idle' },
    processes: { service: 'Processes', module: '/processes', status: 'idle' },
    cases: { service: 'Cases', module: '/cases', status: 'idle' },
    caseInstances: { service: 'CaseInstances', module: '/cases', status: 'idle' },
  });

  // Create service instances using modular pattern
  const entities = useMemo(() => sdk ? new Entities(sdk) : null, [sdk]);
  const choiceSets = useMemo(() => sdk ? new ChoiceSets(sdk) : null, [sdk]);
  const tasks = useMemo(() => sdk ? new Tasks(sdk) : null, [sdk]);
  const assets = useMemo(() => sdk ? new Assets(sdk) : null, [sdk]);
  const queues = useMemo(() => sdk ? new Queues(sdk) : null, [sdk]);
  const buckets = useMemo(() => sdk ? new Buckets(sdk) : null, [sdk]);
  const processes = useMemo(() => sdk ? new Processes(sdk) : null, [sdk]);
  const cases = useMemo(() => sdk ? new Cases(sdk) : null, [sdk]);
  const caseInstances = useMemo(() => sdk ? new CaseInstances(sdk) : null, [sdk]);

  const updateResult = (key: string, update: Partial<ServiceTestResult>) => {
    setResults(prev => ({
      ...prev,
      [key]: { ...prev[key], ...update }
    }));
  };

  const testEntities = async () => {
    if (!entities) return;
    updateResult('entities', { status: 'loading' });
    try {
      const response = await entities.getAll();
      const items = response as EntityGetResponse[];
      updateResult('entities', {
        status: 'success',
        data: items.slice(0, 3),
        count: items.length
      });
    } catch (error) {
      updateResult('entities', {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  const testEntitiesGetById = async () => {
    if (!entities) return;
    updateResult('entitiesGetById', { status: 'loading' });
    try {
      const entity = await entities.getById(TEST_ENTITY_ID);
      updateResult('entitiesGetById', {
        status: 'success',
        data: { id: entity.id, name: entity.name, displayName: entity.displayName },
        count: 1
      });
    } catch (error) {
      updateResult('entitiesGetById', {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  const testEntitiesGetRecords = async () => {
    if (!entities) return;
    updateResult('entitiesGetRecords', { status: 'loading' });
    try {
      const response = await entities.getRecordsById(TEST_ENTITY_ID, { pageSize: 10 });
      updateResult('entitiesGetRecords', {
        status: 'success',
        data: response.items?.slice(0, 3),
        count: response.items?.length || 0
      });
    } catch (error) {
      updateResult('entitiesGetRecords', {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  const testChoiceSets = async () => {
    if (!choiceSets) return;
    updateResult('choiceSets', { status: 'loading' });
    try {
      const response = await choiceSets.getAll();
      const items = response as ChoiceSetGetAllResponse[];
      updateResult('choiceSets', {
        status: 'success',
        data: items.slice(0, 3),
        count: items.length
      });
    } catch (error) {
      updateResult('choiceSets', {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  const testTasks = async () => {
    if (!tasks) return;
    updateResult('tasks', { status: 'loading' });
    try {
      const response = await tasks.getAll();
      const items = response.items as TaskGetResponse[];
      updateResult('tasks', {
        status: 'success',
        data: items.slice(0, 3),
        count: items.length
      });
    } catch (error) {
      updateResult('tasks', {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  const testAssets = async () => {
    if (!assets) return;
    updateResult('assets', { status: 'loading' });
    try {
      const response = await assets.getAll();
      const items = response.items as AssetGetResponse[];
      updateResult('assets', {
        status: 'success',
        data: items.slice(0, 3),
        count: items.length
      });
    } catch (error) {
      updateResult('assets', {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  const testQueues = async () => {
    if (!queues) return;
    updateResult('queues', { status: 'loading' });
    try {
      const response = await queues.getAll();
      const items = response.items as QueueGetResponse[];
      updateResult('queues', {
        status: 'success',
        data: items.slice(0, 3),
        count: items.length
      });
    } catch (error) {
      updateResult('queues', {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  const testBuckets = async () => {
    if (!buckets) return;
    updateResult('buckets', { status: 'loading' });
    try {
      const response = await buckets.getAll();
      const items = response.items as BucketGetResponse[];
      updateResult('buckets', {
        status: 'success',
        data: items.slice(0, 3),
        count: items.length
      });
    } catch (error) {
      updateResult('buckets', {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  const testProcesses = async () => {
    if (!processes) return;
    updateResult('processes', { status: 'loading' });
    try {
      const response = await processes.getAll();
      const items = response.items as ProcessGetResponse[];
      updateResult('processes', {
        status: 'success',
        data: items.slice(0, 3),
        count: items.length
      });
    } catch (error) {
      updateResult('processes', {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  const testCases = async () => {
    if (!cases) return;
    updateResult('cases', { status: 'loading' });
    try {
      const response = await cases.getAll();
      const items = response as CaseGetAllResponse[];
      updateResult('cases', {
        status: 'success',
        data: items.slice(0, 3),
        count: items.length
      });
    } catch (error) {
      updateResult('cases', {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  const testCaseInstances = async () => {
    if (!caseInstances) return;
    updateResult('caseInstances', { status: 'loading' });
    try {
      const response = await caseInstances.getAll();
      const items = response.items as CaseInstanceGetResponse[];
      updateResult('caseInstances', {
        status: 'success',
        data: items.slice(0, 3),
        count: items.length
      });
    } catch (error) {
      updateResult('caseInstances', {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  const testAllServices = async () => {
    await Promise.all([
      testEntities(),
      testEntitiesGetById(),
      testEntitiesGetRecords(),
      testChoiceSets(),
      testTasks(),
      testAssets(),
      testQueues(),
      testBuckets(),
      testProcesses(),
      testCases(),
      testCaseInstances(),
    ]);
  };

  const getStatusColor = (status: ServiceTestResult['status']) => {
    switch (status) {
      case 'loading': return 'bg-yellow-100 text-yellow-800';
      case 'success': return 'bg-green-100 text-green-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: ServiceTestResult['status']) => {
    switch (status) {
      case 'loading':
        return (
          <svg className="animate-spin h-5 w-5 text-yellow-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        );
      case 'success':
        return (
          <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'error':
        return (
          <svg className="h-5 w-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      default:
        return (
          <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  const serviceTests = [
    { key: 'entities', test: testEntities, description: 'Data Fabric Entities (getAll)' },
    { key: 'entitiesGetById', test: testEntitiesGetById, description: `Entity by ID: ${TEST_ENTITY_ID.slice(0, 8)}...` },
    { key: 'entitiesGetRecords', test: testEntitiesGetRecords, description: 'Entity Records (getRecordsById)' },
    { key: 'choiceSets', test: testChoiceSets, description: 'Data Fabric ChoiceSets' },
    { key: 'tasks', test: testTasks, description: 'Action Center Tasks' },
    { key: 'assets', test: testAssets, description: 'Orchestrator Assets' },
    { key: 'queues', test: testQueues, description: 'Orchestrator Queues' },
    { key: 'buckets', test: testBuckets, description: 'Orchestrator Buckets' },
    { key: 'processes', test: testProcesses, description: 'Orchestrator Processes' },
    { key: 'cases', test: testCases, description: 'Maestro Cases' },
    { key: 'caseInstances', test: testCaseInstances, description: 'Maestro Case Instances' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow-sm rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Modular Services Test</h1>
            <p className="mt-1 text-sm text-gray-500">
              Test all SDK services using modular imports pattern
            </p>
          </div>
          <button
            onClick={testAllServices}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Test All Services</span>
          </button>
        </div>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {serviceTests.map(({ key, test, description }) => {
          const result = results[key];
          return (
            <div key={key} className="bg-white shadow-sm rounded-lg p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(result.status)}
                    <h3 className="text-lg font-semibold text-gray-900">{result.service}</h3>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{description}</p>
                  <code className="text-xs bg-gray-100 px-2 py-1 rounded mt-2 inline-block">
                    @uipath/uipath-typescript{result.module}
                  </code>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(result.status)}`}>
                  {result.status}
                </span>
              </div>

              {result.status === 'success' && (
                <div className="mt-4 p-3 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-800">
                    Found <span className="font-semibold">{result.count}</span> items
                  </p>
                </div>
              )}

              {result.status === 'error' && (
                <div className="mt-4 p-3 bg-red-50 rounded-lg">
                  <p className="text-sm text-red-800 break-words">{result.error}</p>
                </div>
              )}

              <button
                onClick={test}
                disabled={result.status === 'loading'}
                className="mt-4 w-full px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {result.status === 'loading' ? 'Testing...' : 'Test Service'}
              </button>
            </div>
          );
        })}
      </div>

      {/* Code Example */}
      <div className="bg-white shadow-sm rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Modular Import Pattern</h2>
        <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
{`// Import each service from its dedicated module
import { Entities, ChoiceSets } from '@uipath/uipath-typescript/entities';
import { Tasks } from '@uipath/uipath-typescript/tasks';
import { Assets } from '@uipath/uipath-typescript/assets';
import { Queues } from '@uipath/uipath-typescript/queues';
import { Buckets } from '@uipath/uipath-typescript/buckets';
import { Processes } from '@uipath/uipath-typescript/processes';
import { Cases, CaseInstances } from '@uipath/uipath-typescript/cases';

// Create service instances with SDK
const entities = new Entities(sdk);
const choiceSets = new ChoiceSets(sdk);
const tasks = new Tasks(sdk);
const assets = new Assets(sdk);
// ... other services

// Use Entities service
const allEntities = await entities.getAll();
const entity = await entities.getById('${TEST_ENTITY_ID}');
const records = await entities.getRecordsById('${TEST_ENTITY_ID}');

// Use ChoiceSets service
const allChoiceSets = await choiceSets.getAll();`}
        </pre>
      </div>
    </div>
  );
};
