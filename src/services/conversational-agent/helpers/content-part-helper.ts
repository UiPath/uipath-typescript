/**
 * ContentPartGetResponse - Response class for ContentPart with convenience methods
 */

import type {
  Citation,
  ContentPart,
  InlineOrExternalValue
} from '@/models/conversational-agent';
import { isExternalValue, isInlineValue } from './conversation-type-util';

/**
 * Response class that wraps ContentPart with convenience methods
 * for accessing inline/external data.
 */
export class ContentPartHelper implements ContentPart {
  /** Unique identifier for the content part (alias for contentPartId) */
  public id: string;
  /** Unique identifier for the content part */
  public contentPartId: string;
  /** The MIME type of the content */
  public mimeType: string;
  /** The actual content data (inline or external) */
  public data: InlineOrExternalValue<string>;
  /** Array of citations referenced in this content part */
  public citations: Citation[];
  /** Whether this content part is a transcript produced by the LLM */
  public isTranscript?: boolean;
  /** Whether this content part may be incomplete */
  public isIncomplete?: boolean;
  /** Optional name for the content part */
  public name?: string;
  /** Timestamp indicating when the content part was created */
  public createdTime: string;
  /** Timestamp indicating when the content part was last updated */
  public updatedTime: string;

  constructor(contentPart: ContentPart) {
    this.id = contentPart.contentPartId;
    this.contentPartId = contentPart.contentPartId;
    this.mimeType = contentPart.mimeType;
    this.data = contentPart.data;
    this.citations = (contentPart.citations ?? []).map(c => ({ ...c, id: c.citationId }));
    this.isTranscript = contentPart.isTranscript;
    this.isIncomplete = contentPart.isIncomplete;
    this.name = contentPart.name;
    this.createdTime = contentPart.createdTime;
    this.updatedTime = contentPart.updatedTime;
  }

  /**
   * Check if data is stored inline
   */
  get isDataInline(): boolean {
    return isInlineValue(this.data);
  }

  /**
   * Check if data is stored externally (URI)
   */
  get isDataExternal(): boolean {
    return isExternalValue(this.data);
  }

  /**
   * Get the data content.
   * Returns string for inline data, or fetches from URI for external data.
   */
  async getData(): Promise<string | Response> {
    if (isInlineValue(this.data)) {
      return this.data.inline;
    }
    return await fetch(this.data.uri);
  }
}
