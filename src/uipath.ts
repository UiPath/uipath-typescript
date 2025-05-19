import { Config, ConfigSchema } from './config';
import { ExecutionContext, ExecutionContextConfig } from './executionContext';
import { ActionsService } from './services/actionsService';
import { ApiClient, ApiClientConfig } from './services/apiClient';
import { ProcessesService } from './services/processesService';
import { AssetsService } from './services/assetsService';
import { BucketsService } from './services/bucketsService';
import { ConnectionsService } from './services/connectionsService';
import { ContextGroundingService } from './services/contextGroundingService';
import { JobsService } from './services/jobsService';
import { QueuesService } from './services/queuesService';
import { FolderService } from './services/folderService';
import { EntityService } from './services/entityService';
import { logger } from './utils/logger';
import { UiPathOpenAIService } from './services/llmGatewayService';
import { FolderContextConfig } from './folderContext';

export interface UiPathOptions {
  baseUrl: string;
  secret: string;
  debug?: boolean;
  executionContext?: ExecutionContextConfig;
  apiConfig?: ApiClientConfig;
  folderConfig?: FolderContextConfig;
}

export class UiPath {
  private readonly config: Config;
  private readonly executionContext: ExecutionContext;
  private readonly apiConfig: ApiClientConfig;
  private readonly folderConfig: FolderContextConfig;
  
  private _apiClient?: ApiClient;
  private _assetsService?: AssetsService;
  private _processesService?: ProcessesService;
  private _bucketsService?: BucketsService;
  private _connectionsService?: ConnectionsService;
  private _contextGroundingService?: ContextGroundingService;
  private _entityService?: EntityService;
  private _jobsService?: JobsService;
  private _queuesService?: QueuesService;
  private _actionsService?: ActionsService;
  private _folderService?: FolderService;
  private _llmGatewayService?: UiPathOpenAIService;

  constructor(options: UiPathOptions) {
    try {
      this.config = ConfigSchema.parse({ 
        baseUrl: options.baseUrl,
        secret: options.secret
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('baseUrl')) {
          throw new Error('Base URL is required and must be a valid URL');
        } else if (error.message.includes('secret')) {
          throw new Error('Secret is required and must not be empty');
        }
      }
      throw error;
    }

    // Setup logging before initializing services
    logger.setup({ debug: options.debug });

    this.executionContext = new ExecutionContext(options.executionContext);
    this.apiConfig = options.apiConfig ?? {};
    this.folderConfig = options.folderConfig ?? {};
  }

  get apiClient(): ApiClient {
    if (!this._apiClient) {
      this._apiClient = new ApiClient(this.config, this.executionContext, this.apiConfig);
    }
    return this._apiClient;
  }

  get assets(): AssetsService {
    if (!this._assetsService) {
      this._assetsService = new AssetsService(this.config, this.executionContext);
    }
    return this._assetsService;
  }

  get entity(): EntityService {
    if (!this._entityService) {
      this._entityService = new EntityService(this.config, this.executionContext);
    }
    return this._entityService;
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
