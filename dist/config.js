"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigSchema = void 0;
const zod_1 = require("zod");
exports.ConfigSchema = zod_1.z.object({
    baseUrl: zod_1.z.string().url(),
    secret: zod_1.z.string().min(1)
});
