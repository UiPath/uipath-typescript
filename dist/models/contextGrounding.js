"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContextGroundingQueryResponseSchema = void 0;
const zod_1 = require("zod");
exports.ContextGroundingQueryResponseSchema = zod_1.z.object({
    content: zod_1.z.string(),
    score: zod_1.z.number(),
    metadata: zod_1.z.record(zod_1.z.unknown())
});
