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

export const ContextGroundingQueryResponseSchema = z.object({
  content: z.string(),
  score: z.number(),
  metadata: z.record(z.unknown())
});

export interface ContextGroundingMetadata {
  operation_id: string;
  strategy: string;
} 