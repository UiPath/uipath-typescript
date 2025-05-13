/**
 * Environment variables
 */
export declare const ENV: {
    readonly BASE_URL: "UIPATH_URL";
    readonly UNATTENDED_USER_ACCESS_TOKEN: "UNATTENDED_USER_ACCESS_TOKEN";
    readonly UIPATH_ACCESS_TOKEN: "UIPATH_ACCESS_TOKEN";
    readonly FOLDER_KEY: "UIPATH_FOLDER_KEY";
    readonly FOLDER_PATH: "UIPATH_FOLDER_PATH";
    readonly JOB_KEY: "UIPATH_JOB_KEY";
    readonly JOB_ID: "UIPATH_JOB_ID";
    readonly ROBOT_KEY: "UIPATH_ROBOT_KEY";
    readonly TENANT_ID: "UIPATH_TENANT_ID";
    readonly ORGANIZATION_ID: "UIPATH_ORGANIZATION_ID";
    readonly TELEMETRY_ENABLED: "TELEMETRY_ENABLED";
};
/**
 * Headers
 */
export declare const HEADERS: {
    readonly FOLDER_KEY: "X-UIPATH-FolderKey";
    readonly FOLDER_PATH: "X-UIPATH-FolderPath";
    readonly USER_AGENT: "X-UIPATH-UserAgent";
    readonly TENANT_ID: "X-UIPATH-TenantId";
    readonly JOB_KEY: "X-UIPATH-JobKey";
    readonly ORGANIZATION_UNIT_ID: "X-UIPATH-OrganizationUnitId";
    readonly INSTANCE_ID: "X-UIPATH-InstanceId";
};
/**
 * Entrypoint for plugins
 */
export declare const ENTRYPOINT = "uipath.connectors";
/**
 * Data sources
 */
export declare const DATA_SOURCES: {
    readonly ORCHESTRATOR_STORAGE_BUCKET: "#UiPath.Vdbs.Domain.Api.V20Models.StorageBucketDataSourceRequest";
};
/**
 * API Endpoints
 */
export declare const ENDPOINTS: {
    readonly CONTEXT_GROUNDING: {
        readonly INDEXES: "/ecs_/v2/indexes";
        readonly SEARCH: "/ecs_/v1/search";
        readonly CREATE: "/ecs_/v2/indexes/create";
    };
};
