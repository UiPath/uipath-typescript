import { Config, ConfigSchema } from './config';
import { ExecutionContext } from './executionContext';
import { ActionsService } from './services/actionsService';
import { ApiClient } from './services/apiClient';
import { ProcessesService } from './services/processesService';
import { AssetsService } from './services/assetsService';
import { BucketsService } from './services/bucketsService';
import { ConnectionsService } from './services/connectionsService';
import { ContextGroundingService } from './services/contextGroundingService';
import { JobsService } from './services/jobsService';
import { QueuesService } from './services/queuesService';
import { FolderService } from './services/folderService';
import { logger } from './utils/logger';
import { UiPathOpenAIService } from './services/llmGatewayService';

export interface UiPathOptions {
  baseUrl?: string;
  secret?: string;
  debug?: boolean;
}

export class UiPath {
  private readonly config: Config;
  private readonly executionContext: ExecutionContext;
  
  private _apiClient?: ApiClient;
  private _assetsService?: AssetsService;
  private _processesService?: ProcessesService;
  private _bucketsService?: BucketsService;
  private _connectionsService?: ConnectionsService;
  private _contextGroundingService?: ContextGroundingService;
  private _jobsService?: JobsService;
  private _queuesService?: QueuesService;
  private _actionsService?: ActionsService;
  private _folderService?: FolderService;
  private _llmGatewayService?: UiPathOpenAIService;

  constructor(options?: UiPathOptions) {
    const baseUrl = options?.baseUrl ?? process.env.UIPATH_URL;
    const secret = options?.secret ?? 
      process.env.UIPATH_UNATTENDED_USER_ACCESS_TOKEN ?? 
      process.env.UIPATH_ACCESS_TOKEN;

    try {
      this.config = ConfigSchema.parse({ baseUrl, secret });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('baseUrl')) {
          throw new Error('Base URL is missing');
        } else if (error.message.includes('secret')) {
          throw new Error('Secret is missing');
        }
      }
      throw error;
    }

    // Setup logging before initializing services
    logger.setup({ debug: options?.debug });

    this.executionContext = new ExecutionContext();
  }

  get apiClient(): ApiClient {
    if (!this._apiClient) {
      this._apiClient = new ApiClient(this.config, this.executionContext);
    }
    return this._apiClient;
  }

  get assets(): AssetsService {
    if (!this._assetsService) {
      this._assetsService = new AssetsService(this.config, this.executionContext);
    }
    return this._assetsService;
  }

  get processes(): ProcessesService {
    if (!this._processesService) {
      this._processesService = new ProcessesService(this.config, this.executionContext);
    }
    return this._processesService;
  }

  get actions(): ActionsService {
    if (!this._actionsService) {
      this._actionsService = new ActionsService(this.config, this.executionContext);
    }
    return this._actionsService;
  }

  get buckets(): BucketsService {
    if (!this._bucketsService) {
      this._bucketsService = new BucketsService(this.config, this.executionContext);
    }
    return this._bucketsService;
  }

  get connections(): ConnectionsService {
    if (!this._connectionsService) {
      this._connectionsService = new ConnectionsService(this.config, this.executionContext);
    }
    return this._connectionsService;
  }

  get contextGrounding(): ContextGroundingService {
    if (!this._folderService) {
      this._folderService = new FolderService(this.config, this.executionContext);
    }
    if (!this._bucketsService) {
      this._bucketsService = new BucketsService(this.config, this.executionContext);
    }
    if (!this._contextGroundingService) {
      this._contextGroundingService = new ContextGroundingService(
        this.config,
        this.executionContext,
        this._folderService,
        this._bucketsService
      );
    }
    return this._contextGroundingService;
  }

  get queues(): QueuesService {
    if (!this._queuesService) {
      this._queuesService = new QueuesService(this.config, this.executionContext);
    }
    return this._queuesService;
  }

  get jobs(): JobsService {
    if (!this._jobsService) {
      this._jobsService = new JobsService(this.config, this.executionContext);
    }
    return this._jobsService;
  }

  get folders(): FolderService {
    if (!this._folderService) {
      this._folderService = new FolderService(this.config, this.executionContext);
    }
    return this._folderService;
  }

  get llmGateway(): UiPathOpenAIService {
    if (!this._llmGatewayService) {
      this._llmGatewayService = new UiPathOpenAIService(this.config, this.executionContext);
    }
    return this._llmGatewayService;
  }
}
