import { ErrorFactory } from '../errors/error-factory';
import { errorResponseParser } from '../errors/parser';
import { CONTENT_TYPES } from '../../utils/constants/headers';

const APPS_API_BASE = 'apps_/default/api/v1/default';

const PUBLIC_ROUTE_PREFIX = 'integrations/codedapp/';

export const PUBLIC_APP_ENDPOINTS = {
  ENTITY_RECORDS: (entityName: string) => `${PUBLIC_ROUTE_PREFIX}datafabric/entities/${encodeURIComponent(entityName)}/records`,
  ENTITY_RECORD: (entityName: string, recordId: string) =>
    `${PUBLIC_ROUTE_PREFIX}datafabric/entities/${encodeURIComponent(entityName)}/records/${encodeURIComponent(recordId)}`,
};

const APP_KEY_HEADER = 'X-UiPath-App-Key';

export function publicBindingKey(name: string, folderPath?: string): string {
  return folderPath ? `${name}.${folderPath}` : name;
}

export class PublicAppClient {
  private readonly appsBase: string;
  private readonly appKey: string;
  private sessionBootstrap: Promise<void> | null = null;

  constructor(baseUrl: string, orgName: string, appKey: string) {
    this.appsBase = `${baseUrl.replace(/\/$/, '')}/${orgName}/${APPS_API_BASE}`;
    this.appKey = appKey;
  }

  serves(path: string): boolean {
    return path.startsWith(PUBLIC_ROUTE_PREFIX);
  }

  async startProcess(bindingKey: string, inputArguments?: unknown): Promise<unknown> {
    return this.request('POST', `${PUBLIC_ROUTE_PREFIX}orchestrator/processes/${encodeURIComponent(bindingKey)}/jobs`, { body: { inputArguments } });
  }

  async getJob(jobKey: string): Promise<unknown> {
    return this.request('GET', `${PUBLIC_ROUTE_PREFIX}orchestrator/jobs/${encodeURIComponent(jobKey)}/output`);
  }

  async uploadFile(bucketKey: string, fileName: string, content: Blob | Uint8Array<ArrayBuffer> | File): Promise<{ path: string }> {
    const contentType = content instanceof Blob && content.type ? content.type : 'application/octet-stream';
    return this.request('POST', `${PUBLIC_ROUTE_PREFIX}orchestrator/buckets/${encodeURIComponent(bucketKey)}/files`, {
      params: { fileName },
      raw: { body: content, contentType },
    }) as Promise<{ path: string }>;
  }

  async ensureSession(): Promise<void> {
    if (!this.sessionBootstrap) {
      this.sessionBootstrap = (async () => {
        const response = await fetch(`${this.appsBase}/${PUBLIC_ROUTE_PREFIX}session`, {
          method: 'POST',
          credentials: 'include',
          headers: { [APP_KEY_HEADER]: this.appKey },
        });
        if (!response.ok) {
          const errorInfo = await errorResponseParser.parse(response);
          throw ErrorFactory.createFromHttpStatus(response.status, errorInfo);
        }
      })();
      this.sessionBootstrap.catch(() => undefined).finally(() => {
        this.sessionBootstrap = null;
      });
    }
    return this.sessionBootstrap;
  }

  async request(
    method: string,
    path: string,
    { body, params, raw }: { body?: unknown; params?: Record<string, unknown>; raw?: { body: BodyInit; contentType: string } } = {},
  ): Promise<unknown> {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params ?? {})) {
      if (value !== undefined && value !== null) query.set(key, String(value));
    }
    const url = `${this.appsBase}/${path}${query.size ? `?${query}` : ''}`;
    const contentType = raw?.contentType ?? (body === undefined ? undefined : CONTENT_TYPES.JSON);
    const doFetch = () =>
      fetch(url, {
        method,
        credentials: 'include',
        headers: {
          [APP_KEY_HEADER]: this.appKey,
          ...(contentType ? { 'Content-Type': contentType } : {}),
        },
        body: raw ? raw.body : body === undefined ? undefined : JSON.stringify(body),
      });

    let response: Response;
    try {
      response = await doFetch();
      if (response.status === 401) {
        await this.ensureSession();
        response = await doFetch();
      }
    } catch (error) {
      throw ErrorFactory.createNetworkError(error);
    }

    if (!response.ok) {
      const errorInfo = await errorResponseParser.parse(response);
      throw ErrorFactory.createFromHttpStatus(response.status, errorInfo);
    }
    if (response.status === 204) {
      return undefined;
    }
    const text = await response.text();
    return text ? JSON.parse(text) : undefined;
  }
}
