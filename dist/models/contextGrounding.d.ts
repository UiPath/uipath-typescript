import { z } from 'zod';
/**
 * Response from a context grounding query search.
 */
export interface ContextGroundingQueryResponse {
    /** The content that matched the search query */
    content: string;
    /** The score/relevance of this match */
    score: number;
    /** Metadata about the matched content */
    metadata: Record<string, unknown>;
}
export declare const ContextGroundingQueryResponseSchema: z.ZodObject<{
    content: z.ZodString;
    score: z.ZodNumber;
    metadata: z.ZodRecord<z.ZodString, z.ZodUnknown>;
}, "strip", z.ZodTypeAny, {
    content: string;
    score: number;
    metadata: Record<string, unknown>;
}, {
    content: string;
    score: number;
    metadata: Record<string, unknown>;
}>;
export interface ContextGroundingMetadata {
    operation_id: string;
    strategy: string;
}
