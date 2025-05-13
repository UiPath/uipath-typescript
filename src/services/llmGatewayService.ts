import { Config } from '../config';
import { ExecutionContext } from '../executionContext';
import { BaseService } from './baseService';
import { z } from 'zod';

// Common constants
const API_VERSION = '2024-10-21';
const NORMALIZED_API_VERSION = '2024-08-01-preview';

// Common headers
const DEFAULT_LLM_HEADERS = {
  'X-UIPATH-STREAMING-ENABLED': 'false',
  'X-UiPath-LlmGateway-RequestingProduct': 'uipath-typescript-sdk',
  'X-UiPath-LlmGateway-RequestingFeature': 'langgraph-agent',
} as const;

export class ChatModels {
  static readonly gpt_4 = 'gpt-4';
  static readonly gpt_4_1106_Preview = 'gpt-4-1106-Preview';
  static readonly gpt_4_32k = 'gpt-4-32k';
  static readonly gpt_4_turbo_2024_04_09 = 'gpt-4-turbo-2024-04-09';
  static readonly gpt_4_vision_preview = 'gpt-4-vision-preview';
  static readonly gpt_4o_2024_05_13 = 'gpt-4o-2024-05-13';
  static readonly gpt_4o_2024_08_06 = 'gpt-4o-2024-08-06';
  static readonly gpt_4o_mini_2024_07_18 = 'gpt-4o-mini-2024-07-18';
  static readonly o3_mini = 'o3-mini-2025-01-31';
}

export class EmbeddingModels {
  static readonly text_embedding_3_large = 'text-embedding-3-large';
  static readonly text_embedding_ada_002 = 'text-embedding-ada-002';
}

// Zod schemas for validation
const UsageInfoSchema = z.object({
  prompt_tokens: z.number(),
  completion_tokens: z.number().optional(),
  total_tokens: z.number()
});

const TextEmbeddingSchema = z.object({
  object: z.string(),
  data: z.array(z.object({
    object: z.string(),
    embedding: z.array(z.number()),
    index: z.number()
  })),
  model: z.string(),
  usage: UsageInfoSchema
});

const ChatCompletionSchema = z.object({
  id: z.string(),
  object: z.string(),
  created: z.number(),
  model: z.string(),
  choices: z.array(z.object({
    index: z.number(),
    message: z.object({
      role: z.string(),
      content: z.string()
    }),
    finish_reason: z.string()
  })),
  usage: UsageInfoSchema
});

export type UsageInfo = z.infer<typeof UsageInfoSchema>;
export type TextEmbedding = z.infer<typeof TextEmbeddingSchema>;
export type ChatCompletion = z.infer<typeof ChatCompletionSchema>;

export class UiPathOpenAIService extends BaseService {
  constructor(config: Config, executionContext: ExecutionContext) {
    super(config, executionContext);
  }

  /**
   * Get embeddings usage information for input text.
   * 
   * @param input - The input text to embed
   * @param embeddingModel - The embedding model to use
   * @returns The embedding usage information
   */
  async embeddingsUsage(
    input: string,
    embeddingModel: string = EmbeddingModels.text_embedding_ada_002
  ): Promise<UsageInfo> {
    const response = await this.request(
      'POST',
      `/llmgateway_/openai/deployments/${embeddingModel}/embeddings/usage`,
      {
        data: { input },
        params: { 'api-version': API_VERSION },
        headers: DEFAULT_LLM_HEADERS
      }
    );

    return UsageInfoSchema.parse(response.data);
  }

  /**
   * Get embeddings for input text.
   * 
   * @param input - The input text to embed
   * @param embeddingModel - The embedding model to use
   * @returns The text embedding response
   */
  async embeddings(
    input: string,
    embeddingModel: string = EmbeddingModels.text_embedding_ada_002
  ): Promise<TextEmbedding> {
    const response = await this.request(
      'POST',
      `/llmgateway_/openai/deployments/${embeddingModel}/embeddings`,
      {
        data: { input },
        params: { 'api-version': API_VERSION },
        headers: DEFAULT_LLM_HEADERS
      }
    );

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
  async chatCompletions(
    messages: Array<{ role: string; content: string }>,
    model: string = ChatModels.gpt_4o_mini_2024_07_18,
    maxTokens: number = 50,
    temperature: number = 0
  ): Promise<ChatCompletion> {
    const response = await this.request(
      'POST',
      `/llmgateway_/openai/deployments/${model}/chat/completions`,
      {
        data: {
          messages,
          max_tokens: maxTokens,
          temperature
        },
        params: { 'api-version': API_VERSION },
        headers: DEFAULT_LLM_HEADERS
      }
    );

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
  async chatCompletionsUsage(
    messages: Array<{ role: string; content: string }>,
    model: string = ChatModels.gpt_4o_mini_2024_07_18,
    maxTokens: number = 50,
    temperature: number = 0
  ): Promise<UsageInfo> {
    const response = await this.request(
      'POST',
      `/llmgateway_/openai/deployments/${model}/chat/completions/usage`,
      {
        data: {
          messages,
          max_tokens: maxTokens,
          temperature
        },
        params: { 'api-version': API_VERSION },
        headers: DEFAULT_LLM_HEADERS
      }
    );

    return UsageInfoSchema.parse(response.data);
  }
} 