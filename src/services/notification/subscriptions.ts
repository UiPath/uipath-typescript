/**
 * SubscriptionService — manages the current user's notification preferences.
 */

import { track } from '../../core/telemetry';
import { BaseService } from '../base';

import type {
  AllowedMode,
  CategorySubscriptionUpdate,
  PublisherSubscriptionUpdate,
  SubscriptionGetAllOptions,
  SubscriptionGetPublishersOptions,
  TopicGroupSubscriptionUpdate,
  TopicSubscriptionUpdate,
} from '../../models/notification/subscriptions.types';
import type {
  SubscriptionGetResponse,
  SubscriptionGetSupportedChannelsResponse,
  SubscriptionServiceModel,
  SubscriptionUpdateCategoryResponse,
  SubscriptionUpdateModeResponse,
  SubscriptionUpdatePublisherResponse,
  SubscriptionUpdateTopicGroupResponse,
  SubscriptionUpdateTopicResponse,
} from '../../models/notification/subscriptions.models';

import { SUBSCRIPTION_ENDPOINTS } from '../../utils/constants/endpoints';

/**
 * Service for managing the current user's notification subscription preferences.
 *
 * Subscriptions are scoped to publishers (e.g. `Orchestrator`, `Actions`) and topics
 * within them. Each topic can be activated per notification channel (InApp, Email,
 * Slack, Teams) — see {@link NotificationMode}.
 */
export class SubscriptionService extends BaseService implements SubscriptionServiceModel {
  /**
   * Gets the current user's subscription preferences, optionally filtered to a set of
   * publisher names.
   *
   * Returns the full list of publishers (their topics, channels, and current subscription
   * state) the user has access to. Use {@link SubscriptionGetAllOptions.publishers} to
   * narrow to specific publishers.
   *
   * @param options - Optional publisher-name filter
   * @returns Full subscription state for the matched publishers
   * {@link SubscriptionGetResponse}
   *
   * @example Basic usage
   * ```typescript
   * import { Subscriptions } from '@uipath/uipath-typescript/notifications';
   *
   * const subscriptions = new Subscriptions(sdk);
   * const { publishers } = await subscriptions.getAll();
   * ```
   *
   * @example Filter to specific publishers
   * ```typescript
   * const { publishers } = await subscriptions.getAll({
   *   publishers: ['Orchestrator', 'Actions'],
   * });
   * ```
   */
  @track('Subscriptions.GetAll')
  async getAll(options?: SubscriptionGetAllOptions): Promise<SubscriptionGetResponse> {
    const response = await this.get<SubscriptionGetResponse>(
      SUBSCRIPTION_ENDPOINTS.GET_ALL,
      options?.publishers ? { params: { Publishers: options.publishers } } : undefined
    );
    return response.data;
  }

  /**
   * Lists available publishers and their topics, regardless of the user's current subscription.
   *
   * Used for discovery — pair with {@link getAll} to inspect what's subscribable, then
   * call {@link updateTopic}, {@link updatePublisher}, or {@link updateMode} to change preferences.
   *
   * Note: the response from this endpoint carries only identity/discovery fields on
   * publishers and topics (no subscription state). Use {@link getAll} to inspect state.
   *
   * @param options - Optional publisher-name filter
   * @returns Publishers and their full topic catalogue
   * {@link SubscriptionGetResponse}
   *
   * @example Basic usage
   * ```typescript
   * const { publishers } = await subscriptions.getPublishers();
   * ```
   *
   * @example Filter to a single publisher
   * ```typescript
   * const { publishers } = await subscriptions.getPublishers({ name: 'Orchestrator' });
   * ```
   */
  @track('Subscriptions.GetPublishers')
  async getPublishers(options?: SubscriptionGetPublishersOptions): Promise<SubscriptionGetResponse> {
    const response = await this.get<SubscriptionGetResponse>(
      SUBSCRIPTION_ENDPOINTS.GET_PUBLISHERS,
      options?.name ? { params: { PublisherName: options.name } } : undefined
    );
    return response.data;
  }

  /**
   * Gets the notification channels supported in the current tenant.
   *
   * Check {@link SupportedChannel.isEnabled} before attempting to subscribe to a channel
   * via {@link updateMode} — disabled channels will be rejected by the server.
   *
   * Note: `InApp` is always available and is not included in the response.
   *
   * @returns Supported channels with enabled status
   * {@link SubscriptionGetSupportedChannelsResponse}
   *
   * @example
   * ```typescript
   * const { channels } = await subscriptions.getSupportedChannels();
   * const slack = channels.find(c => c.name === 'Slack');
   * if (slack?.isEnabled) {
   *   // safe to subscribe to Slack
   * }
   * ```
   */
  @track('Subscriptions.GetSupportedChannels')
  async getSupportedChannels(): Promise<SubscriptionGetSupportedChannelsResponse> {
    const response = await this.get<SubscriptionGetSupportedChannelsResponse>(
      SUBSCRIPTION_ENDPOINTS.GET_SUPPORTED_CHANNELS
    );
    return response.data;
  }

  /**
   * Updates topic-level subscription preferences. Each entry sets the subscription state
   * (`isSubscribed`) for a single (topic, mode) pair.
   *
   * @param subscriptions - Topic subscription updates
   * @returns Operation result echoing the submitted updates
   * {@link SubscriptionUpdateTopicResponse}
   *
   * @example Unsubscribe a topic from a single channel
   * ```typescript
   * import { NotificationMode } from '@uipath/uipath-typescript/notifications';
   *
   * await subscriptions.updateTopic([
   *   { topicId: '<topicId>', isSubscribed: false, notificationMode: NotificationMode.Email },
   * ]);
   * ```
   */
  @track('Subscriptions.UpdateTopic')
  async updateTopic(subscriptions: TopicSubscriptionUpdate[]): Promise<SubscriptionUpdateTopicResponse> {
    await this.post(SUBSCRIPTION_ENDPOINTS.UPDATE_TOPIC, {
      userSubscriptions: subscriptions,
    });
    return { success: true, data: { subscriptions } };
  }

  /**
   * Updates category-level subscription preferences for a publisher. Each entry sets
   * the subscription state for all topics of a given category via a given mode.
   *
   * @param subscriptions - Category subscription updates
   * @returns Operation result echoing the submitted updates
   * {@link SubscriptionUpdateCategoryResponse}
   *
   * @example Unsubscribe from all `Error` topics via email for one publisher
   * ```typescript
   * import { NotificationCategory, NotificationMode } from '@uipath/uipath-typescript/notifications';
   *
   * await subscriptions.updateCategory([
   *   {
   *     publisherId: '<publisherId>',
   *     category: NotificationCategory.Error,
   *     isSubscribed: false,
   *     notificationMode: NotificationMode.Email,
   *   },
   * ]);
   * ```
   */
  @track('Subscriptions.UpdateCategory')
  async updateCategory(subscriptions: CategorySubscriptionUpdate[]): Promise<SubscriptionUpdateCategoryResponse> {
    await this.post(SUBSCRIPTION_ENDPOINTS.UPDATE_CATEGORY, {
      categorySubscriptions: subscriptions,
    });
    return { success: true, data: { subscriptions } };
  }

  /**
   * Updates publisher-level opt-in / opt-out. Each entry toggles the user's overall
   * opt-in for a publisher and optionally scopes the change to specific entities.
   *
   * @param subscriptions - Publisher subscription updates
   * @returns Operation result echoing the submitted updates
   * {@link SubscriptionUpdatePublisherResponse}
   *
   * @example Opt out of a publisher entirely
   * ```typescript
   * await subscriptions.updatePublisher([
   *   { publisherId: '<publisherId>', isUserOptIn: false },
   * ]);
   * ```
   */
  @track('Subscriptions.UpdatePublisher')
  async updatePublisher(subscriptions: PublisherSubscriptionUpdate[]): Promise<SubscriptionUpdatePublisherResponse> {
    // API field is misspelled `publisherID` — map at send time.
    await this.post(SUBSCRIPTION_ENDPOINTS.UPDATE_PUBLISHER, {
      publisherSubscriptions: subscriptions.map(({ publisherId, isUserOptIn, entities }) => ({
        publisherID: publisherId,
        isUserOptIn,
        entities,
      })),
    });
    return { success: true, data: { subscriptions } };
  }

  /**
   * Updates topic-group subscription preferences. Each entry scopes a topic group to
   * a specific set of entities.
   *
   * @param subscriptions - Topic-group subscription updates
   * @returns Operation result echoing the submitted updates
   * {@link SubscriptionUpdateTopicGroupResponse}
   *
   * @example Subscribe a topic group to two folders
   * ```typescript
   * await subscriptions.updateTopicGroup([
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
  @track('Subscriptions.UpdateTopicGroup')
  async updateTopicGroup(subscriptions: TopicGroupSubscriptionUpdate[]): Promise<SubscriptionUpdateTopicGroupResponse> {
    await this.post(SUBSCRIPTION_ENDPOINTS.UPDATE_TOPIC_GROUP, {
      topicGroupSubscriptions: subscriptions,
    });
    return { success: true, data: { subscriptions } };
  }

  /**
   * Activates or deactivates a notification channel for a publisher.
   *
   * Use {@link getSupportedChannels} first to check whether the channel is enabled in the tenant.
   *
   * @param publisherId - Publisher GUID
   * @param mode - Channel and target activation state
   * @returns Operation result echoing the new mode state
   * {@link SubscriptionUpdateModeResponse}
   *
   * @example Activate email delivery for a publisher
   * ```typescript
   * import { NotificationMode } from '@uipath/uipath-typescript/notifications';
   *
   * await subscriptions.updateMode('<publisherId>', {
   *   name: NotificationMode.Email,
   *   isActive: true,
   * });
   * ```
   */
  @track('Subscriptions.UpdateMode')
  async updateMode(publisherId: string, mode: AllowedMode): Promise<SubscriptionUpdateModeResponse> {
    await this.post(SUBSCRIPTION_ENDPOINTS.UPDATE_MODE, {
      publisherId,
      publisherMode: mode,
    });
    return { success: true, data: { publisherId, mode } };
  }

  /**
   * Resets the current user's subscriptions for a publisher to the publisher's defaults.
   *
   * @param publisherId - Publisher GUID
   * @returns The publisher's full subscription state after reset
   * {@link SubscriptionGetResponse}
   *
   * @example
   * ```typescript
   * const { publishers } = await subscriptions.reset('<publisherId>');
   * ```
   */
  @track('Subscriptions.Reset')
  async reset(publisherId: string): Promise<SubscriptionGetResponse> {
    const response = await this.post<SubscriptionGetResponse>(SUBSCRIPTION_ENDPOINTS.RESET, {
      publisherId,
    });
    return response.data;
  }
}
