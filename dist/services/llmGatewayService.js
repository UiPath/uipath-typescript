"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UiPathOpenAIService = exports.EmbeddingModels = exports.ChatModels = void 0;
const baseService_1 = require("./baseService");
const zod_1 = require("zod");
// Common constants
const API_VERSION = '2024-10-21';
const NORMALIZED_API_VERSION = '2024-08-01-preview';
// Common headers
const DEFAULT_LLM_HEADERS = {
    'X-UIPATH-STREAMING-ENABLED': 'false',
    'X-UiPath-LlmGateway-RequestingProduct': 'uipath-typescript-sdk',
    'X-UiPath-LlmGateway-RequestingFeature': 'langgraph-agent',
};
class ChatModels {
}
exports.ChatModels = ChatModels;
ChatModels.gpt_4 = 'gpt-4';
ChatModels.gpt_4_1106_Preview = 'gpt-4-1106-Preview';
ChatModels.gpt_4_32k = 'gpt-4-32k';
ChatModels.gpt_4_turbo_2024_04_09 = 'gpt-4-turbo-2024-04-09';
ChatModels.gpt_4_vision_preview = 'gpt-4-vision-preview';
ChatModels.gpt_4o_2024_05_13 = 'gpt-4o-2024-05-13';
ChatModels.gpt_4o_2024_08_06 = 'gpt-4o-2024-08-06';
ChatModels.gpt_4o_mini_2024_07_18 = 'gpt-4o-mini-2024-07-18';
ChatModels.o3_mini = 'o3-mini-2025-01-31';
class EmbeddingModels {
}
exports.EmbeddingModels = EmbeddingModels;
EmbeddingModels.text_embedding_3_large = 'text-embedding-3-large';
EmbeddingModels.text_embedding_ada_002 = 'text-embedding-ada-002';
// Zod schemas for validation
const UsageInfoSchema = zod_1.z.object({
    prompt_tokens: zod_1.z.number(),
    completion_tokens: zod_1.z.number().optional(),
    total_tokens: zod_1.z.number()
});
const TextEmbeddingSchema = zod_1.z.object({
    object: zod_1.z.string(),
    data: zod_1.z.array(zod_1.z.object({
        object: zod_1.z.string(),
        embedding: zod_1.z.array(zod_1.z.number()),
        index: zod_1.z.number()
    })),
    model: zod_1.z.string(),
    usage: UsageInfoSchema
});
const ChatCompletionSchema = zod_1.z.object({
    id: zod_1.z.string(),
    object: zod_1.z.string(),
    created: zod_1.z.number(),
    model: zod_1.z.string(),
    choices: zod_1.z.array(zod_1.z.object({
        index: zod_1.z.number(),
        message: zod_1.z.object({
            role: zod_1.z.string(),
            content: zod_1.z.string()
        }),
        finish_reason: zod_1.z.string()
    })),
    usage: UsageInfoSchema
});
class UiPathOpenAIService extends baseService_1.BaseService {
    constructor(config, executionContext) {
        super(config, executionContext);
    }
    /**
     * Get embeddings usage information for input text.
     *
     * @param input - The input text to embed
     * @param embeddingModel - The embedding model to use
     * @returns The embedding usage information
     */
    async embeddingsUsage(input, embeddingModel = EmbeddingModels.text_embedding_ada_002) {
        const response = await this.request('POST', `/llmgateway_/openai/deployments/${embeddingModel}/embeddings/usage`, {
            data: { input },
            params: { 'api-version': API_VERSION },
            headers: DEFAULT_LLM_HEADERS
        });
        return UsageInfoSchema.parse(response.data);
    }
    /**
     * Get embeddings for input text.
     *
     * @param input - The input text to embed
     * @param embeddingModel - The embedding model to use
     * @returns The text embedding response
     */
    async embeddings(input, embeddingModel = EmbeddingModels.text_embedding_ada_002) {
        const response = await this.request('POST', `/llmgateway_/openai/deployments/${embeddingModel}/embeddings`, {
            data: { input },
            params: { 'api-version': API_VERSION },
            headers: DEFAULT_LLM_HEADERS
        });
        return TextEmbeddingSchema.parse(response.data);
    }
    /**
     * Get chat completions using the LLM gateway service.
     *
     * @param messages - List of message objects with 'role' and 'content'
     * @param model - The model to use for chat completion
     * @param maxTokens - Maximum number of tokens to generate
     * @param temperature - Temperature for sampling (0-1)
     * @returns The chat completion response
     */
    async chatCompletions(messages, model = ChatModels.gpt_4o_mini_2024_07_18, maxTokens = 50, temperature = 0) {
        const response = await this.request('POST', `/llmgateway_/openai/deployments/${model}/chat/completions`, {
            data: {
                messages,
                max_tokens: maxTokens,
                temperature
            },
            params: { 'api-version': API_VERSION },
            headers: DEFAULT_LLM_HEADERS
        });
        return ChatCompletionSchema.parse(response.data);
    }
    /**
     * Get chat completions usage information.
     *
     * @param messages - List of message objects with 'role' and 'content'
     * @param model - The model to use for chat completion
     * @param maxTokens - Maximum number of tokens to generate
     * @param temperature - Temperature for sampling (0-1)
     * @returns The chat completion usage information
     */
    async chatCompletionsUsage(messages, model = ChatModels.gpt_4o_mini_2024_07_18, maxTokens = 50, temperature = 0) {
        const response = await this.request('POST', `/llmgateway_/openai/deployments/${model}/chat/completions/usage`, {
            data: {
                messages,
                max_tokens: maxTokens,
                temperature
            },
            params: { 'api-version': API_VERSION },
            headers: DEFAULT_LLM_HEADERS
        });
        return UsageInfoSchema.parse(response.data);
    }
}
exports.UiPathOpenAIService = UiPathOpenAIService;
