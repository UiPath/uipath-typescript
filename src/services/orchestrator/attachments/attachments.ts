import { ValidationError, ServerError } from '../../../core/errors';
import { ErrorFactory } from '../../../core/errors/error-factory';
import { errorResponseParser } from '../../../core/errors/parser';
import {
  AttachmentResponse,
  AttachmentGetByIdOptions,
  AttachmentCreateOptions,
  AttachmentCreateResponse,
} from '../../../models/orchestrator/attachments.types';
import { BucketGetUriResponse } from '../../../models/orchestrator/buckets.types';
import { AttachmentServiceModel } from '../../../models/orchestrator/attachments.models';
import {
  pascalToCamelCaseKeys,
  camelToPascalCaseKeys,
  addPrefixToKeys,
  transformData,
  transformOptions,
  arrayDictionaryToRecord,
} from '../../../utils/transform';
import { ORCHESTRATOR_ATTACHMENT_ENDPOINTS } from '../../../utils/constants/endpoints';
import { ODATA_PREFIX } from '../../../utils/constants/common';
import { createHeaders } from '../../../utils/http/headers';
import { FOLDER_ID } from '../../../utils/constants/headers';
import { track } from '../../../core/telemetry';
import { AttachmentsMap } from '../../../models/orchestrator/attachments.constants';
import { BaseService } from '../../../services/base';
import { BucketMap } from '../../../models/orchestrator/buckets.constants';

export class AttachmentService extends BaseService implements AttachmentServiceModel {
  @track('Attachments.GetById')
  async getById(id: string, options: AttachmentGetByIdOptions = {}): Promise<AttachmentResponse> {
    if (!id) {
      throw new ValidationError({ message: 'id is required for getById' });
    }

    // Response applies both maps (BucketMap on blobFileAccess, AttachmentsMap on top-level);
    // merge so SDK names from either are rewritten in one pass.
    const apiFieldOptions = transformOptions(options, { ...AttachmentsMap, ...BucketMap });
    const apiOptions = addPrefixToKeys(apiFieldOptions, ODATA_PREFIX, Object.keys(apiFieldOptions));

    const response = await this.get<AttachmentResponse>(
      ORCHESTRATOR_ATTACHMENT_ENDPOINTS.GET_BY_ID(id),
      {
        params: apiOptions,
      }
    );

    // Transform response from PascalCase to camelCase, then apply field maps
    const camelCased = pascalToCamelCaseKeys(response.data) as AttachmentResponse;
    camelCased.blobFileAccess = transformData(camelCased.blobFileAccess, BucketMap);
    return transformData(camelCased, AttachmentsMap);
  }

  @track('Attachments.Create')
  async create(
    name: string,
    content: Blob | Uint8Array<ArrayBuffer> | File,
    options?: AttachmentCreateOptions
  ): Promise<AttachmentCreateResponse> {
    if (!name) {
      throw new ValidationError({ message: 'name is required for create' });
    }
    if (!content) {
      throw new ValidationError({ message: 'content is required for create' });
    }

    // Built with the API's own field names — AttachmentsMap only covers the two
    // timestamp renames, so running this through it would be a no-op.
    // Passing jobKey links the attachment to the job as part of creation.
    const response = await this.post<Record<string, unknown>>(
      ORCHESTRATOR_ATTACHMENT_ENDPOINTS.CREATE,
      camelToPascalCaseKeys({
        name,
        jobKey: options?.jobKey,
        attachmentCategory: options?.category,
      }),
      { headers: createHeaders({ [FOLDER_ID]: options?.folderId }) }
    );

    const camelCased = pascalToCamelCaseKeys(response.data) as AttachmentResponse;
    camelCased.blobFileAccess = transformData(camelCased.blobFileAccess, BucketMap);
    const attachment = transformData(camelCased, AttachmentsMap);

    await this.uploadContent(attachment.blobFileAccess, content);

    // The write URI is a short-lived credential and is spent by this point;
    // the OData context is transport metadata that callers never need.
    const {
      blobFileAccess: _blobFileAccess,
      '@odata.context': _odataContext,
      ...created
    } = attachment as AttachmentResponse & { '@odata.context'?: string };
    return created;
  }

  /**
   * Uploads content to the short-lived URI returned alongside a new attachment.
   * The URI carries its own credential, so no SDK auth header is added unless
   * the response explicitly asks for one.
   */
  private async uploadContent(
    blobFileAccess: BucketGetUriResponse,
    content: Blob | Uint8Array<ArrayBuffer> | File
  ): Promise<void> {
    if (!blobFileAccess?.uri) {
      throw new ServerError({ message: 'Attachment upload URI missing from the create response' });
    }

    // Storage returns its required headers (e.g. x-ms-blob-type) as parallel
    // key/value arrays; sending them unconverted drops them and the PUT is rejected.
    const rawHeaders = blobFileAccess.headers;
    const requestHeaders: Record<string, string> =
      rawHeaders && 'keys' in rawHeaders && 'values' in rawHeaders
        ? arrayDictionaryToRecord(rawHeaders as unknown as { keys: string[]; values: string[] })
        : { ...rawHeaders };

    if (blobFileAccess.requiresAuth) {
      requestHeaders['Authorization'] = `Bearer ${await this.getValidAuthToken()}`;
    }

    const response = await fetch(blobFileAccess.uri, {
      method: 'PUT',
      body: content,
      headers: createHeaders(requestHeaders),
    });

    if (!response.ok) {
      // Reported from the response body — the URI itself is a credential and is never echoed.
      const errorInfo = await errorResponseParser.parse(response);
      throw ErrorFactory.createFromHttpStatus(response.status, errorInfo);
    }
  }
}
