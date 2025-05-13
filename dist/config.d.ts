import { z } from 'zod';
export declare const ConfigSchema: z.ZodObject<{
    baseUrl: z.ZodString;
    secret: z.ZodString;
}, "strip", z.ZodTypeAny, {
    baseUrl: string;
    secret: string;
}, {
    baseUrl: string;
    secret: string;
}>;
export type Config = z.infer<typeof ConfigSchema>;
