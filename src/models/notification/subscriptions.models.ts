/**
 * Subscription service model — public response shapes and the ServiceModel interface
 * that drives generated API documentation.
 */

import type { OperationResponse } from '../common/types';

import type {
  AllowedMode,
  CategorySubscriptionUpdate,
  PublisherSubscriptionUpdate,
  SubscriptionGetAllOptions,
  SubscriptionGetPublishersOptions,
  SubscriptionPublisher,
  SupportedChannel,
  TopicGroupSubscriptionUpdate,
  TopicSubscriptionUpdate,
} from './subscriptions.types';

/**
 * Response from `getAll()`, `getPublishers()` and `reset()` — a list of publishers
 * with their topics, channels, and subscription state.
 *
 * Note: when returned from `getPublishers()`, publisher and topic objects only carry
 * identity/discovery fields (no subscription-state). Use `getAll()` to inspect state.
 */
export interface SubscriptionGetResponse {
  /** Publishers with their topics and subscription state. */
  publishers: SubscriptionPublisher[];
}

/**
 * Response from `getSupportedChannels()`.
 */
export interface SubscriptionGetSupportedChannelsResponse {
  /** Notification channels supported in the current tenant. `InApp` is not listed — it is always available. */
  channels: SupportedChannel[];
}

/** Response from `updateTopic()`. */
export type SubscriptionUpdateTopicResponse = OperationResponse<{
  subscriptions: TopicSubscriptionUpdate[];
}>;

/** Response from `updateCategory()`. */
export type SubscriptionUpdateCategoryResponse = OperationResponse<{
  subscriptions: CategorySubscriptionUpdate[];
}>;

/** Response from `updatePublisher()`. */
export type SubscriptionUpdatePublisherResponse = OperationResponse<{
  subscriptions: PublisherSubscriptionUpdate[];
}>;

/** Response from `updateTopicGroup()`. */
export type SubscriptionUpdateTopicGroupResponse = OperationResponse<{
  subscriptions: TopicGroupSubscriptionUpdate[];
}>;

/** Response from `updateMode()`. */
export type SubscriptionUpdateModeResponse = OperationResponse<{
  publisherId: string;
  mode: AllowedMode;
}>;

/**
 * Public surface of the Subscriptions service. JSDoc on this interface drives
 * the generated API reference documentation.
 *
 * Every method takes the tenant GUID as the first argument — the subscription
 * API identifies the acting tenant via the `X-UIPATH-Internal-TenantId` header
 * and the SDK forwards `tenantId` into that header on each call.
 */
export interface SubscriptionServiceModel {
  /**
   * Gets the current user's subscription preferences, optionally filtered to a set of
   * publisher names.
   *
   * Returns the full list of publishers (their topics, channels, and current subscription
   * state) the user has access to. Use {@link SubscriptionGetAllOptions.publishers} to
   * narrow to specific publishers.
   *
   * @param tenantId - Tenant GUID (sent via `X-UIPATH-Internal-TenantId`)
   * @param options - Optional publisher-name filter
   * @returns Full subscription state for the matched publishers
   * {@link SubscriptionGetResponse}
   *
   * @example Basic usage
   * ```typescript
   * import { Subscriptions } from '@uipath/uipath-typescript/notifications';
   *
   * const subscriptions = new Subscriptions(sdk);
   * const { publishers } = await subscriptions.getAll('<tenantId>');
   * ```
   *
   * @example Filter to specific publishers
   * ```typescript
   * const { publishers } = await subscriptions.getAll('<tenantId>', {
   *   publishers: ['Orchestrator', 'Actions'],
   * });
   * ```
   */
  getAll(tenantId: string, options?: SubscriptionGetAllOptions): Promise<SubscriptionGetResponse>;

  /**
   * Lists available publishers and their topics, regardless of the user's current subscription.
   *
   * Used for discovery — pair with {@link getAll} to inspect what's subscribable, then
   * call {@link updateTopic}, {@link updatePublisher}, or {@link updateMode} to change preferences.
   *
   * Note: the response from this endpoint carries only identity/discovery fields on
   * publishers and topics (no subscription state). Use {@link getAll} to inspect state.
   *
   * @param tenantId - Tenant GUID (sent via `X-UIPATH-Internal-TenantId`)
   * @param options - Optional publisher-name filter
   * @returns Publishers and their full topic catalogue
   * {@link SubscriptionGetResponse}
   *
   * @example Basic usage
   * ```typescript
   * const { publishers } = await subscriptions.getPublishers('<tenantId>');
   * ```
   *
   * @example Filter to a single publisher
   * ```typescript
   * const { publishers } = await subscriptions.getPublishers('<tenantId>', { name: 'Orchestrator' });
   * ```
   */
  getPublishers(tenantId: string, options?: SubscriptionGetPublishersOptions): Promise<SubscriptionGetResponse>;

  /**
   * Gets the notification channels supported in the current tenant.
   *
   * Check the `isEnabled` field on each {@link SupportedChannel} before attempting to subscribe to a
   * channel via {@link updateMode} — disabled channels will be rejected by the server.
   *
   * Note: `InApp` is always available and is not included in the response.
   *
   * @param tenantId - Tenant GUID (sent via `X-UIPATH-Internal-TenantId`)
   * @returns Supported channels with enabled status
   * {@link SubscriptionGetSupportedChannelsResponse}
   *
   * @example
   * ```typescript
   * const { channels } = await subscriptions.getSupportedChannels('<tenantId>');
   * const slack = channels.find(c => c.name === 'Slack');
   * if (slack?.isEnabled) {
   *   // safe to subscribe to Slack
   * }
   * ```
   */
  getSupportedChannels(tenantId: string): Promise<SubscriptionGetSupportedChannelsResponse>;

  /**
   * Updates topic-level subscription preferences. Each entry sets the subscription state
   * (`isSubscribed`) for a single (topic, mode) pair.
   *
   * @param tenantId - Tenant GUID (sent via `X-UIPATH-Internal-TenantId`)
   * @param subscriptions - Topic subscription updates
   * @returns Operation result echoing the submitted updates
   * {@link SubscriptionUpdateTopicResponse}
   *
   * @example Unsubscribe a topic from a single channel
   * ```typescript
   * import { NotificationMode } from '@uipath/uipath-typescript/notifications';
   *
   * await subscriptions.updateTopic('<tenantId>', [
   *   { topicId: '<topicId>', isSubscribed: false, notificationMode: NotificationMode.Email },
   * ]);
   * ```
   */
  updateTopic(tenantId: string, subscriptions: TopicSubscriptionUpdate[]): Promise<SubscriptionUpdateTopicResponse>;

  /**
   * Updates category-level subscription preferences for a publisher. Each entry sets
   * the subscription state for all topics of a given category via a given mode.
   *
   * @param tenantId - Tenant GUID (sent via `X-UIPATH-Internal-TenantId`)
   * @param subscriptions - Category subscription updates
   * @returns Operation result echoing the submitted updates
   * {@link SubscriptionUpdateCategoryResponse}
   *
   * @example Unsubscribe from all `Error` topics via email for one publisher
   * ```typescript
   * import { NotificationCategory, NotificationMode } from '@uipath/uipath-typescript/notifications';
   *
   * await subscriptions.updateCategory('<tenantId>', [
   *   {
   *     publisherId: '<publisherId>',
   *     category: NotificationCategory.Error,
   *     isSubscribed: false,
   *     notificationMode: NotificationMode.Email,
   *   },
   * ]);
   * ```
   */
  updateCategory(tenantId: string, subscriptions: CategorySubscriptionUpdate[]): Promise<SubscriptionUpdateCategoryResponse>;

  /**
   * Updates publisher-level opt-in / opt-out. Each entry toggles the user's overall
   * opt-in for a publisher and optionally scopes the change to specific entities.
   *
   * @param tenantId - Tenant GUID (sent via `X-UIPATH-Internal-TenantId`)
   * @param subscriptions - Publisher subscription updates
   * @returns Operation result echoing the submitted updates
   * {@link SubscriptionUpdatePublisherResponse}
   *
   * @example Opt out of a publisher entirely
   * ```typescript
   * await subscriptions.updatePublisher('<tenantId>', [
   *   { publisherId: '<publisherId>', isUserOptIn: false },
   * ]);
   * ```
   */
  updatePublisher(tenantId: string, subscriptions: PublisherSubscriptionUpdate[]): Promise<SubscriptionUpdatePublisherResponse>;

  /**
   * Updates topic-group subscription preferences. Each entry scopes a topic group to
   * a specific set of entities.
   *
   * @param tenantId - Tenant GUID (sent via `X-UIPATH-Internal-TenantId`)
   * @param subscriptions - Topic-group subscription updates
   * @returns Operation result echoing the submitted updates
   * {@link SubscriptionUpdateTopicGroupResponse}
   *
   * @example Subscribe a topic group to two folders
   * ```typescript
   * await subscriptions.updateTopicGroup('<tenantId>', [
   *   {
   *     publisherId: '<publisherId>',
   *     topicGroupName: 'JobNotifications',
   *     entities: [
   *       { id: '<folderId1>', type: 'Folder', isSubscribed: true },
   *       { id: '<folderId2>', type: 'Folder', isSubscribed: true },
   *     ],
   *   },
   * ]);
   * ```
   */
  updateTopicGroup(tenantId: string, subscriptions: TopicGroupSubscriptionUpdate[]): Promise<SubscriptionUpdateTopicGroupResponse>;

  /**
   * Activates or deactivates a notification channel for a publisher.
   *
   * Use {@link getSupportedChannels} first to check whether the channel is enabled in the tenant.
   *
   * @param tenantId - Tenant GUID (sent via `X-UIPATH-Internal-TenantId`)
   * @param publisherId - Publisher GUID
   * @param mode - Channel and target activation state
   * @returns Operation result echoing the new mode state
   * {@link SubscriptionUpdateModeResponse}
   *
   * @example Activate email delivery for a publisher
   * ```typescript
   * import { NotificationMode } from '@uipath/uipath-typescript/notifications';
   *
   * await subscriptions.updateMode('<tenantId>', '<publisherId>', {
   *   name: NotificationMode.Email,
   *   isActive: true,
   * });
   * ```
   */
  updateMode(tenantId: string, publisherId: string, mode: AllowedMode): Promise<SubscriptionUpdateModeResponse>;

  /**
   * Resets the current user's subscriptions for a publisher to the publisher's defaults.
   *
   * @param tenantId - Tenant GUID (sent via `X-UIPATH-Internal-TenantId`)
   * @param publisherId - Publisher GUID
   * @returns The publisher's full subscription state after reset
   * {@link SubscriptionGetResponse}
   *
   * @example
   * ```typescript
   * const { publishers } = await subscriptions.reset('<tenantId>', '<publisherId>');
   * ```
   */
  reset(tenantId: string, publisherId: string): Promise<SubscriptionGetResponse>;
}
