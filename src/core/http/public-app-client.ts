import { ErrorFactory } from '../errors/error-factory';
import { errorResponseParser } from '../errors/parser';
import { CONTENT_TYPES } from '../../utils/constants/headers';

const APPS_INTEGRATION_BASE = 'apps_/default/api/v1/default/integrations/codedapp';

const APP_KEY_HEADER = 'X-UiPath-App-Key';

export function publicBindingKey(name: string, folderPath?: string): string {
  return folderPath ? `${name}.${folderPath}` : name;
}

export class PublicAppClient {
  private readonly integrationBase: string;
  private readonly appKey: string;
  private sessionBootstrap: Promise<void> | null = null;

  constructor(baseUrl: string, orgName: string, appKey: string) {
    this.integrationBase = `${baseUrl.replace(/\/$/, '')}/${orgName}/${APPS_INTEGRATION_BASE}`;
    this.appKey = appKey;
  }

  async startProcess(bindingKey: string, inputArguments?: unknown): Promise<unknown> {
    return this.request('POST', `/orchestrator/processes/${encodeURIComponent(bindingKey)}/jobs`, { inputArguments });
  }

  async getJob(jobKey: string): Promise<unknown> {
    return this.request('GET', `/orchestrator/jobs/${encodeURIComponent(jobKey)}/output`);
  }

  async insertRecord(entityKey: string, data: Record<string, unknown>): Promise<unknown> {
    return this.request('POST', `${this.entityRecords(entityKey)}`, data);
  }

  async getRecord(entityKey: string, recordId: string): Promise<unknown> {
    return this.request('GET', `${this.entityRecords(entityKey)}/${encodeURIComponent(recordId)}`);
  }

  async listRecords(entityKey: string, page: { start?: number; limit?: number } = {}): Promise<unknown> {
    const query = new URLSearchParams();
    if (page.start !== undefined) query.set('start', String(page.start));
    if (page.limit !== undefined) query.set('limit', String(page.limit));
    const search = query.toString();
    return this.request('GET', `${this.entityRecords(entityKey)}${search ? `?${search}` : ''}`);
  }

  async uploadFile(bucketKey: string, fileName: string, content: Blob | Uint8Array<ArrayBuffer> | File): Promise<{ path: string }> {
    const contentType = content instanceof Blob && content.type ? content.type : 'application/octet-stream';
    return this.request(
      'POST',
      `/orchestrator/buckets/${encodeURIComponent(bucketKey)}/files?fileName=${encodeURIComponent(fileName)}`,
      undefined,
      { body: content, contentType },
    ) as Promise<{ path: string }>;
  }

  private entityRecords(entityKey: string): string {
    return `/datafabric/entities/${encodeURIComponent(entityKey)}/records`;
  }

  async ensureSession(): Promise<void> {
    if (!this.sessionBootstrap) {
      this.sessionBootstrap = (async () => {
        const response = await fetch(`${this.integrationBase}/session`, {
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

  private async request(
    method: string,
    subPath: string,
    body?: unknown,
    raw?: { body: BodyInit; contentType: string },
  ): Promise<unknown> {
    const contentType = raw?.contentType ?? (body === undefined ? undefined : CONTENT_TYPES.JSON);
    const doFetch = () =>
      fetch(`${this.integrationBase}${subPath}`, {
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
