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
import { UiPathOpenAIService } from './services/llmGatewayService';
export interface UiPathOptions {
    baseUrl?: string;
    secret?: string;
    debug?: boolean;
}
export declare class UiPath {
    private readonly config;
    private readonly executionContext;
    private _apiClient?;
    private _assetsService?;
    private _processesService?;
    private _bucketsService?;
    private _connectionsService?;
    private _contextGroundingService?;
    private _jobsService?;
    private _queuesService?;
    private _actionsService?;
    private _folderService?;
    private _llmGatewayService?;
    constructor(options?: UiPathOptions);
    get apiClient(): ApiClient;
    get assets(): AssetsService;
    get processes(): ProcessesService;
    get actions(): ActionsService;
    get buckets(): BucketsService;
    get connections(): ConnectionsService;
    get contextGrounding(): ContextGroundingService;
    get queues(): QueuesService;
    get jobs(): JobsService;
    get folders(): FolderService;
    get llmGateway(): UiPathOpenAIService;
}
