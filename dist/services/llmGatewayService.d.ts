import { Config } from '../config';
import { ExecutionContext } from '../executionContext';
import { BaseService } from './baseService';
import { z } from 'zod';
export declare class ChatModels {
    static readonly gpt_4 = "gpt-4";
    static readonly gpt_4_1106_Preview = "gpt-4-1106-Preview";
    static readonly gpt_4_32k = "gpt-4-32k";
    static readonly gpt_4_turbo_2024_04_09 = "gpt-4-turbo-2024-04-09";
    static readonly gpt_4_vision_preview = "gpt-4-vision-preview";
    static readonly gpt_4o_2024_05_13 = "gpt-4o-2024-05-13";
    static readonly gpt_4o_2024_08_06 = "gpt-4o-2024-08-06";
    static readonly gpt_4o_mini_2024_07_18 = "gpt-4o-mini-2024-07-18";
    static readonly o3_mini = "o3-mini-2025-01-31";
}
export declare class EmbeddingModels {
    static readonly text_embedding_3_large = "text-embedding-3-large";
    static readonly text_embedding_ada_002 = "text-embedding-ada-002";
}
declare const UsageInfoSchema: z.ZodObject<{
    prompt_tokens: z.ZodNumber;
    completion_tokens: z.ZodOptional<z.ZodNumber>;
    total_tokens: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    prompt_tokens: number;
    total_tokens: number;
    completion_tokens?: number | undefined;
}, {
    prompt_tokens: number;
    total_tokens: number;
    completion_tokens?: number | undefined;
}>;
declare const TextEmbeddingSchema: z.ZodObject<{
    object: z.ZodString;
    data: z.ZodArray<z.ZodObject<{
        object: z.ZodString;
        embedding: z.ZodArray<z.ZodNumber, "many">;
        index: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        object: string;
        embedding: number[];
        index: number;
    }, {
        object: string;
        embedding: number[];
        index: number;
    }>, "many">;
    model: z.ZodString;
    usage: z.ZodObject<{
        prompt_tokens: z.ZodNumber;
        completion_tokens: z.ZodOptional<z.ZodNumber>;
        total_tokens: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        prompt_tokens: number;
        total_tokens: number;
        completion_tokens?: number | undefined;
    }, {
        prompt_tokens: number;
        total_tokens: number;
        completion_tokens?: number | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    object: string;
    data: {
        object: string;
        embedding: number[];
        index: number;
    }[];
    model: string;
    usage: {
        prompt_tokens: number;
        total_tokens: number;
        completion_tokens?: number | undefined;
    };
}, {
    object: string;
    data: {
        object: string;
        embedding: number[];
        index: number;
    }[];
    model: string;
    usage: {
        prompt_tokens: number;
        total_tokens: number;
        completion_tokens?: number | undefined;
    };
}>;
declare const ChatCompletionSchema: z.ZodObject<{
    id: z.ZodString;
    object: z.ZodString;
    created: z.ZodNumber;
    model: z.ZodString;
    choices: z.ZodArray<z.ZodObject<{
        index: z.ZodNumber;
        message: z.ZodObject<{
            role: z.ZodString;
            content: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            content: string;
            role: string;
        }, {
            content: string;
            role: string;
        }>;
        finish_reason: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        message: {
            content: string;
            role: string;
        };
        index: number;
        finish_reason: string;
    }, {
        message: {
            content: string;
            role: string;
        };
        index: number;
        finish_reason: string;
    }>, "many">;
    usage: z.ZodObject<{
        prompt_tokens: z.ZodNumber;
        completion_tokens: z.ZodOptional<z.ZodNumber>;
        total_tokens: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        prompt_tokens: number;
        total_tokens: number;
        completion_tokens?: number | undefined;
    }, {
        prompt_tokens: number;
        total_tokens: number;
        completion_tokens?: number | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    object: string;
    id: string;
    model: string;
    usage: {
        prompt_tokens: number;
        total_tokens: number;
        completion_tokens?: number | undefined;
    };
    created: number;
    choices: {
        message: {
            content: string;
            role: string;
        };
        index: number;
        finish_reason: string;
    }[];
}, {
    object: string;
    id: string;
    model: string;
    usage: {
        prompt_tokens: number;
        total_tokens: number;
        completion_tokens?: number | undefined;
    };
    created: number;
    choices: {
        message: {
            content: string;
            role: string;
        };
        index: number;
        finish_reason: string;
    }[];
}>;
export type UsageInfo = z.infer<typeof UsageInfoSchema>;
export type TextEmbedding = z.infer<typeof TextEmbeddingSchema>;
export type ChatCompletion = z.infer<typeof ChatCompletionSchema>;
export declare class UiPathOpenAIService extends BaseService {
    constructor(config: Config, executionContext: ExecutionContext);
    /**
     * Get embeddings usage information for input text.
     *
     * @param input - The input text to embed
     * @param embeddingModel - The embedding model to use
     * @returns The embedding usage information
     */
    embeddingsUsage(input: string, embeddingModel?: string): Promise<UsageInfo>;
    /**
     * Get embeddings for input text.
     *
     * @param input - The input text to embed
     * @param embeddingModel - The embedding model to use
     * @returns The text embedding response
     */
    embeddings(input: string, embeddingModel?: string): Promise<TextEmbedding>;
    /**
     * Get chat completions using the LLM gateway service.
     *
     * @param messages - List of message objects with 'role' and 'content'
     * @param model - The model to use for chat completion
     * @param maxTokens - Maximum number of tokens to generate
     * @param temperature - Temperature for sampling (0-1)
     * @returns The chat completion response
     */
    chatCompletions(messages: Array<{
        role: string;
        content: string;
    }>, model?: string, maxTokens?: number, temperature?: number): Promise<ChatCompletion>;
    /**
     * Get chat completions usage information.
     *
     * @param messages - List of message objects with 'role' and 'content'
     * @param model - The model to use for chat completion
     * @param maxTokens - Maximum number of tokens to generate
     * @param temperature - Temperature for sampling (0-1)
     * @returns The chat completion usage information
     */
    chatCompletionsUsage(messages: Array<{
        role: string;
        content: string;
    }>, model?: string, maxTokens?: number, temperature?: number): Promise<UsageInfo>;
}
export {};
