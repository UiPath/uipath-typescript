/**
 * Attachments Module
 *
 * Provides access to UiPath Orchestrator for attachements.
 *
 * @example
 * ```typescript
 * import { Attachments } from '@uipath/uipath-typescript/attachments';
 *
 * const attachments = new Attachments(sdk);
 * const attachment = await attachments.getById(<attachmentId>);
 * ```
 *
 * @module
 */

export { AttachmentService as Attachments, AttachmentService } from './attachments';

export * from '../../../models/orchestrator/attachments.types';
export * from '../../../models/orchestrator/attachments.models';
