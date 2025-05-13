"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UiPath = void 0;
const config_1 = require("./config");
const executionContext_1 = require("./executionContext");
const actionsService_1 = require("./services/actionsService");
const apiClient_1 = require("./services/apiClient");
const processesService_1 = require("./services/processesService");
const assetsService_1 = require("./services/assetsService");
const bucketsService_1 = require("./services/bucketsService");
const connectionsService_1 = require("./services/connectionsService");
const contextGroundingService_1 = require("./services/contextGroundingService");
const jobsService_1 = require("./services/jobsService");
const queuesService_1 = require("./services/queuesService");
const folderService_1 = require("./services/folderService");
const logger_1 = require("./utils/logger");
const llmGatewayService_1 = require("./services/llmGatewayService");
class UiPath {
    constructor(options) {
        const baseUrl = options?.baseUrl ?? process.env.UIPATH_URL;
        const secret = options?.secret ??
            process.env.UIPATH_UNATTENDED_USER_ACCESS_TOKEN ??
            process.env.UIPATH_ACCESS_TOKEN;
        try {
            this.config = config_1.ConfigSchema.parse({ baseUrl, secret });
        }
        catch (error) {
            if (error instanceof Error) {
                if (error.message.includes('baseUrl')) {
                    throw new Error('Base URL is missing');
                }
                else if (error.message.includes('secret')) {
                    throw new Error('Secret is missing');
                }
            }
            throw error;
        }
        // Setup logging before initializing services
        logger_1.logger.setup({ debug: options?.debug });
        this.executionContext = new executionContext_1.ExecutionContext();
    }
    get apiClient() {
        if (!this._apiClient) {
            this._apiClient = new apiClient_1.ApiClient(this.config, this.executionContext);
        }
        return this._apiClient;
    }
    get assets() {
        if (!this._assetsService) {
            this._assetsService = new assetsService_1.AssetsService(this.config, this.executionContext);
        }
        return this._assetsService;
    }
    get processes() {
        if (!this._processesService) {
            this._processesService = new processesService_1.ProcessesService(this.config, this.executionContext);
        }
        return this._processesService;
    }
    get actions() {
        if (!this._actionsService) {
            this._actionsService = new actionsService_1.ActionsService(this.config, this.executionContext);
        }
        return this._actionsService;
    }
    get buckets() {
        if (!this._bucketsService) {
            this._bucketsService = new bucketsService_1.BucketsService(this.config, this.executionContext);
        }
        return this._bucketsService;
    }
    get connections() {
        if (!this._connectionsService) {
            this._connectionsService = new connectionsService_1.ConnectionsService(this.config, this.executionContext);
        }
        return this._connectionsService;
    }
    get contextGrounding() {
        if (!this._folderService) {
            this._folderService = new folderService_1.FolderService(this.config, this.executionContext);
        }
        if (!this._bucketsService) {
            this._bucketsService = new bucketsService_1.BucketsService(this.config, this.executionContext);
        }
        if (!this._contextGroundingService) {
            this._contextGroundingService = new contextGroundingService_1.ContextGroundingService(this.config, this.executionContext, this._folderService, this._bucketsService);
        }
        return this._contextGroundingService;
    }
    get queues() {
        if (!this._queuesService) {
            this._queuesService = new queuesService_1.QueuesService(this.config, this.executionContext);
        }
        return this._queuesService;
    }
    get jobs() {
        if (!this._jobsService) {
            this._jobsService = new jobsService_1.JobsService(this.config, this.executionContext);
        }
        return this._jobsService;
    }
    get folders() {
        if (!this._folderService) {
            this._folderService = new folderService_1.FolderService(this.config, this.executionContext);
        }
        return this._folderService;
    }
    get llmGateway() {
        if (!this._llmGatewayService) {
            this._llmGatewayService = new llmGatewayService_1.UiPathOpenAIService(this.config, this.executionContext);
        }
        return this._llmGatewayService;
    }
}
exports.UiPath = UiPath;
