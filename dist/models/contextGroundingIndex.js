"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContextGroundingIndexSchema = exports.ContextGroundingDataSourceSchema = void 0;
const zod_1 = require("zod");
exports.ContextGroundingDataSourceSchema = zod_1.z.object({
    '@odata.type': zod_1.z.string(),
    folder: zod_1.z.string(),
    bucketName: zod_1.z.string(),
    fileNameGlob: zod_1.z.string(),
    directoryPath: zod_1.z.string()
});
exports.ContextGroundingIndexSchema = zod_1.z.object({
    id: zod_1.z.string().optional(),
    name: zod_1.z.string(),
    description: zod_1.z.string().optional(),
    dataSource: exports.ContextGroundingDataSourceSchema.optional(),
    status: zod_1.z.string().optional(),
    lastIngestionTime: zod_1.z.string().optional(),
    ingestionInProgress: zod_1.z.boolean().optional()
});
