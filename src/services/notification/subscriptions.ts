/**
 * SubscriptionService — manages the current user's notification preferences.
 */

import { track } from '../../core/telemetry';
import { BaseService } from '../base';

import type {
  CategorySubscriptionUpdate,
  SubscriptionGetAllOptions,
  SubscriptionGetPublishersOptions,
  TopicSubscriptionUpdate,
} from '../../models/notification/subscriptions.types';
import type {
  SubscriptionGetResponse,
  SubscriptionGetSupportedChannelsResponse,
  SubscriptionServiceModel,
  SubscriptionUpdateCategoryResponse,
  SubscriptionUpdateTopicResponse,
} from '../../models/notification/subscriptions.models';

import { SUBSCRIPTION_ENDPOINTS } from '../../utils/constants/endpoints';
import { TENANT_ID } from '../../utils/constants/headers';
import { createHeaders } from '../../utils/http/headers';

/**
 * Service for managing the current user's notification subscription preferences.
 *
 * Subscriptions are scoped to publishers (e.g. `Orchestrator`, `Actions`) and topics
 * within them. Each topic can be activated per notification channel (InApp, Email,
 * Slack, Teams) — see {@link NotificationMode}.
 *
 * Every public method takes the acting tenant GUID as the first argument — the
 * subscription API identifies the tenant via the `X-UIPATH-Internal-TenantId`
 * header and the SDK forwards `tenantId` into that header on each call.
 *
 * This PR ships the three read methods (`getAll`, `getPublishers`,
 * `getSupportedChannels`). Mutation methods land in follow-up PRs.
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
  @track('Subscriptions.GetAll')
  async getAll(tenantId: string, options?: SubscriptionGetAllOptions): Promise<SubscriptionGetResponse> {
    const response = await this.get<SubscriptionGetResponse>(
      SUBSCRIPTION_ENDPOINTS.GET_ALL,
      {
        headers: createHeaders({ [TENANT_ID]: tenantId }),
        ...(options?.publishers ? { params: { Publishers: options.publishers } } : {}),
      }
    );
    return response.data;
  }

  /**
   * Lists available publishers and their topics, regardless of the user's current subscription.
   *
   * Used for discovery — pair with {@link getAll} to inspect what's subscribable.
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
  @track('Subscriptions.GetPublishers')
  async getPublishers(tenantId: string, options?: SubscriptionGetPublishersOptions): Promise<SubscriptionGetResponse> {
    const response = await this.get<SubscriptionGetResponse>(
      SUBSCRIPTION_ENDPOINTS.GET_PUBLISHERS,
      {
        headers: createHeaders({ [TENANT_ID]: tenantId }),
        ...(options?.name ? { params: { PublisherName: options.name } } : {}),
      }
    );
    return response.data;
  }

  /**
   * Gets the notification channels supported in the current tenant.
   *
   * Check {@link SupportedChannel.isEnabled} before attempting to subscribe to a channel —
   * disabled channels will be rejected by the server.
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
  @track('Subscriptions.GetSupportedChannels')
  async getSupportedChannels(tenantId: string): Promise<SubscriptionGetSupportedChannelsResponse> {
    const response = await this.get<SubscriptionGetSupportedChannelsResponse>(
      SUBSCRIPTION_ENDPOINTS.GET_SUPPORTED_CHANNELS,
      { headers: createHeaders({ [TENANT_ID]: tenantId }) }
    );
    return response.data;
  }

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
   * @internal
   */
  @track('Subscriptions.UpdateTopic')
  async updateTopic(tenantId: string, subscriptions: TopicSubscriptionUpdate[]): Promise<SubscriptionUpdateTopicResponse> {
    await this.post(SUBSCRIPTION_ENDPOINTS.UPDATE_TOPIC, {
      userSubscriptions: subscriptions,
    }, { headers: createHeaders({ [TENANT_ID]: tenantId }) });
    return { success: true, data: { subscriptions } };
  }

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
   * @internal
   */
  @track('Subscriptions.UpdateCategory')
  async updateCategory(tenantId: string, subscriptions: CategorySubscriptionUpdate[]): Promise<SubscriptionUpdateCategoryResponse> {
    await this.post(SUBSCRIPTION_ENDPOINTS.UPDATE_CATEGORY, {
      categorySubscriptions: subscriptions,
    }, { headers: createHeaders({ [TENANT_ID]: tenantId }) });
    return { success: true, data: { subscriptions } };
  }
}
