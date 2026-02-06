/**
 * Feedback Module
 *
 * Provides access to UiPath LLMOps for feedback management.
 *
 * @example
 * ```typescript
 * import { UiPath } from '@uipath/uipath-typescript/core';
 * import { Feedback } from '@uipath/uipath-typescript/feedback';
 *
 * const sdk = new UiPath(config);
 * await sdk.initialize();
 *
 * const feedback = new Feedback(sdk);
 * const allFeedback = await feedback.getAll();
 * ```
 *
 * @module
 */

export { FeedbackService as Feedback, FeedbackService } from './feedback';

export type * from '../../models/llmops/feedback.types';
export type * from '../../models/llmops/feedback.models';
