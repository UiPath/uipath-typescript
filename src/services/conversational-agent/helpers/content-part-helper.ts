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
export class ContentPartGetResponse implements ContentPart {
  public contentPartId: string;
  public mimeType: string;
  public data: InlineOrExternalValue<string>;
  public citations: Citation[];
  public isTranscript?: boolean;
  public isIncomplete?: boolean;
  public name?: string;
  public createdTime: string;
  public updatedTime: string;

  constructor(contentPart: ContentPart) {
    this.contentPartId = contentPart.contentPartId;
    this.mimeType = contentPart.mimeType;
    this.data = contentPart.data;
    this.citations = contentPart.citations;
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
