/**
 * Types for Feature Flags
 */

// ==================== Feature Flags ====================

/**
 * Feature flags for conversational agent capabilities
 *
 * Common flags include:
 * - audioStreamingEnabled: Whether audio streaming is available
 * - fileAttachmentEnabled: Whether file attachments are allowed
 *
 * @example
 * ```typescript
 * const flags = await conversationalAgentService.getFeatureFlags();
 * if (flags.audioStreamingEnabled) {
 *   // Enable audio UI
 * }
 * ```
 */
export type FeatureFlags = Record<string, unknown>;
