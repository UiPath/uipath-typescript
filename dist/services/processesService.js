"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProcessesService = void 0;
const baseService_1 = require("./baseService");
const folderContext_1 = require("../folderContext");
const headers_1 = require("../utils/headers");
const constants_1 = require("../utils/constants");
/**
 * Service for managing and executing UiPath automation processes.
 *
 * Processes (also known as automations or workflows) are the core units of
 * automation in UiPath, representing sequences of activities that perform
 * specific business tasks.
 */
class ProcessesService extends baseService_1.BaseService {
    constructor(config, executionContext) {
        super(config, executionContext);
        this.folderContext = new folderContext_1.FolderContext(config, executionContext);
    }
    /**
     * Start execution of a process by its name.
     *
     * @param options - Process execution options
     * @returns A promise that resolves to the job execution details
     */
    async invoke({ name, inputArguments, folderKey, folderPath }) {
        const spec = this.getInvokeRequestConfig({
            name,
            inputArguments,
            folderKey,
            folderPath
        });
        const response = await this.requestWithSpec(spec);
        return response.data.value[0];
    }
    getInvokeRequestConfig({ name, inputArguments, folderKey, folderPath }) {
        const headers = {
            ...(0, headers_1.headerFolder)(folderKey, folderPath)
        };
        const jobId = process.env.UIPATH_JOB_ID;
        if (jobId) {
            headers[constants_1.HEADERS.JOB_KEY] = jobId;
        }
        return {
            method: 'POST',
            url: '/orchestrator_/odata/Jobs/UiPath.Server.Configuration.OData.StartJobs',
            data: {
                startInfo: {
                    ReleaseName: name,
                    InputArguments: inputArguments ? JSON.stringify(inputArguments) : '{}',
                },
            },
            headers,
        };
    }
    /**
     * List all available processes.
     *
     * @returns A promise that resolves to an array of processes
     */
    async list() {
        const response = await this.request('GET', '/orchestrator_/odata/Processes', {
            headers: {
                ...this.folderContext.folderHeaders
            }
        });
        return response.data.value;
    }
}
exports.ProcessesService = ProcessesService;
