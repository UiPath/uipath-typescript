/**
 * Encapsulates the configuration for making an HTTP request.
 * 
 * This interface contains all necessary parameters to construct and send an HTTP request,
 * including the HTTP method, URL, query parameters, headers, and various forms
 * of request body data (content, JSON, form data).
 */
export interface RequestSpec {
  /** The HTTP method to use (GET, POST, PUT, DELETE, etc.) */
  method: string;
  
  /** The URL endpoint for the request */
  url: string;
  
  /** Query parameters to append to the URL */
  params?: Record<string, string | number | boolean>;
  
  /** HTTP headers to include with the request */
  headers?: Record<string, string>;
  
  /** Raw content to send as the request body */
  content?: unknown;
  
  /** JSON data to send as the request body */
  data?: unknown;
  
  /** Form data to send as the request body */
  formData?: FormData;
  
  /** Request timeout in milliseconds */
  timeout?: number;
  
  /** Response type expected from the request */
  responseType?: 'json' | 'text' | 'blob' | 'arraybuffer';
} 