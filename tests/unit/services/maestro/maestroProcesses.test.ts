// sample test file, need to update
import { MaestroProcessesService } from '../../../../src/services/maestro/maestroProcesses';
import { UiPathConfig } from '../../../../src/core/config/config';
import { ExecutionContext } from '../../../../src/core/context/executionContext';
import { MaestroProcess } from '../../../../src/models/maestro/maestroProcess';

// Mock the global fetch function
global.fetch = jest.fn();

describe('MaestroProcessesService', () => {
  let service: MaestroProcessesService;

  beforeEach(() => {
    // Reset mocks before each test
    (fetch as jest.Mock).mockClear();
    
    // Setup required dependencies
    const config = new UiPathConfig({ 
      baseUrl: 'https://cloud.uipath.com',
      orgName: 'myOrg',
      tenantName: 'myTenant'
     });
    const context = new ExecutionContext();
    context.set('tokenInfo', { token: 'fake-token' });
    
    service = new MaestroProcessesService(config, context);
  });

  it('should fetch and transform processes correctly', async () => {
    // Arrange: Mock the API response in its raw format
    const mockApiResponse = {
      processes: [{ 
        processKey: 'test.process',
        packageId: 'pkgid',
        folderKey: 'fkey',
        folderName: 'fname',
        packageVersions: ['1.0'],
        versionCount: 1,
        pendingCount: 0,
        runningCount: 1,
        completedCount: 0,
        pausedCount: 0,
        cancelledCount: 0,
        faultedCount: 0,
        retryingCount: 0,
        resumingCount: 0,
        pausingCount: 0,
        cancelingCount: 0
      }],
    };
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockApiResponse),
    });

    // Act: Call the method being tested
    const processes: MaestroProcess[] = await service.getAll();

    // Assert: Check the result
    expect(processes).toHaveLength(1);
    expect(processes[0].processKey).toBe('test.process');
    expect(processes[0].instanceCounts.running).toBe(1); // Check for the transformed property
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(
      'https://cloud.uipath.com/myOrg/myTenant/pims_/api/v1/processes/summary',
      expect.any(Object)
    );
  });

  it('should handle API errors gracefully', async () => {
    // Arrange: Mock a failed API response
    (fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: () => Promise.resolve({ message: 'Something went wrong' }),
    });

    // Act & Assert: Ensure the promise rejects with an error
    await expect(service.getAll()).rejects.toThrow('HTTP 500: Something went wrong');
  });
}); 