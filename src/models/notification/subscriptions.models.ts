/**
 * Subscription service model — public response shapes and the ServiceModel interface
 * that drives generated API documentation.
 */

import type {
  CategorySubscriptionUpdate,
  PublisherSubscriptionUpdate,
  SubscriptionGetAllOptions,
  SubscriptionGetPublishersOptions,
  SubscriptionGetPublishersResponse,
  SubscriptionGetResponse,
  SubscriptionGetSupportedChannelsResponse,
  SubscriptionUpdateCategoriesResponse,
  SubscriptionUpdatePublishersResponse,
  SubscriptionUpdateTopicGroupsResponse,
  SubscriptionUpdateTopicsResponse,
  TopicGroupSubscriptionUpdate,
  TopicSubscriptionUpdate,
} from './subscriptions.types';

/**
 * Public surface of the Subscriptions service. JSDoc on this interface drives
 * the generated API reference documentation.
 *
 * Every method takes the tenant GUID as the first argument, which the SDK
 * forwards to the subscription API on each call.
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
   * @param tenantId - Tenant GUID
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
   * @internal
   */
  getAll(tenantId: string, options?: SubscriptionGetAllOptions): Promise<SubscriptionGetResponse>;

  /**
   * Lists available publishers and their topics, regardless of the user's current subscription.
   *
   * Used for discovery — pair with {@link getAll} to inspect what's subscribable.
   *
   * Note: the response from this endpoint carries only identity/discovery fields on
   * publishers and topics (no subscription state). Use {@link getAll} to inspect state.
   *
   * @param tenantId - Tenant GUID
   * @param options - Optional publisher-name filter
   * @returns Publishers and their full topic catalogue (discovery fields only)
   * {@link SubscriptionGetPublishersResponse}
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
   * @internal
   */
  getPublishers(tenantId: string, options?: SubscriptionGetPublishersOptions): Promise<SubscriptionGetPublishersResponse>;

  /**
   * Gets the notification channels supported in the current tenant.
   *
   * Check the `isEnabled` field on each {@link SupportedChannel} before attempting to subscribe to a
   * channel — disabled channels will be rejected by the server.
   *
   * Note: `InApp` is always available and is not included in the response.
   *
   * @param tenantId - Tenant GUID
   * @returns Supported channels with enabled status
   * {@link SubscriptionGetSupportedChannelsResponse}
   *
   * @example
   * ```typescript
   * import { NotificationMode } from '@uipath/uipath-typescript/notifications';
   *
   * const { channels } = await subscriptions.getSupportedChannels('<tenantId>');
   * const slack = channels.find(c => c.name === NotificationMode.Slack);
   * if (slack?.isEnabled) {
   *   // safe to subscribe to Slack
   * }
   * ```
   * @internal
   */
  getSupportedChannels(tenantId: string): Promise<SubscriptionGetSupportedChannelsResponse>;

  /**
   * Updates topic-level subscription preferences. Each entry sets the subscription state
   * (`isSubscribed`) for a single (topic, mode) pair.
   *
   * @param tenantId - Tenant GUID
   * @param subscriptions - Topic subscription updates
   * @returns Operation result echoing the submitted updates
   * {@link SubscriptionUpdateTopicsResponse}
   *
   * @example Unsubscribe a topic from a single channel
   * ```typescript
   * import { NotificationMode } from '@uipath/uipath-typescript/notifications';
   *
   * await subscriptions.updateTopics('<tenantId>', [
   *   { topicId: '<topicId>', isSubscribed: false, notificationMode: NotificationMode.Email },
   * ]);
   * ```
   * @internal
   */
  updateTopics(tenantId: string, subscriptions: TopicSubscriptionUpdate[]): Promise<SubscriptionUpdateTopicsResponse>;

  /**
   * Updates category-level subscription preferences for a publisher. Each entry sets
   * the subscription state for all topics of a given category via a given mode.
   *
   * @param tenantId - Tenant GUID
   * @param subscriptions - Category subscription updates
   * @returns Operation result echoing the submitted updates
   * {@link SubscriptionUpdateCategoriesResponse}
   *
   * @example Unsubscribe from all `Error` topics via email for one publisher
   * ```typescript
   * import { NotificationCategory, NotificationMode } from '@uipath/uipath-typescript/notifications';
   *
   * await subscriptions.updateCategories('<tenantId>', [
   *   {
   *     publisherId: '<publisherId>',
   *     category: NotificationCategory.Error,
   *     isSubscribed: false,
   *     notificationMode: NotificationMode.Email,
   *   },
   * ]);
   * ```
   * @internal
   */
  updateCategories(tenantId: string, subscriptions: CategorySubscriptionUpdate[]): Promise<SubscriptionUpdateCategoriesResponse>;

  /**
   * Updates publisher-level opt-in / opt-out. Each entry toggles the user's overall
   * opt-in for a publisher and optionally scopes the change to specific entities.
   *
   * @param tenantId - Tenant GUID
   * @param subscriptions - Publisher subscription updates
   * @returns Operation result echoing the submitted updates
   * {@link SubscriptionUpdatePublishersResponse}
   *
   * @example Opt out of a publisher entirely
   * ```typescript
   * await subscriptions.updatePublishers('<tenantId>', [
   *   { publisherId: '<publisherId>', isUserOptIn: false },
   * ]);
   * ```
   * @internal
   */
  updatePublishers(tenantId: string, subscriptions: PublisherSubscriptionUpdate[]): Promise<SubscriptionUpdatePublishersResponse>;

  /**
   * Updates topic-group subscription preferences. Each entry scopes a topic group to
   * a specific set of entities.
   *
   * @param tenantId - Tenant GUID
   * @param subscriptions - Topic-group subscription updates
   * @returns Operation result echoing the submitted updates
   * {@link SubscriptionUpdateTopicGroupsResponse}
   *
   * @example Subscribe a topic group to two folders
   * ```typescript
   * await subscriptions.updateTopicGroups('<tenantId>', [
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
   * @internal
   */
  updateTopicGroups(tenantId: string, subscriptions: TopicGroupSubscriptionUpdate[]): Promise<SubscriptionUpdateTopicGroupsResponse>;
}
