/**
 * SubscriptionService — manages the current user's notification preferences.
 */

import { track } from '../../core/telemetry';
import { BaseService } from '../base';

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
} from '../../models/notification/subscriptions.types';
import type { SubscriptionServiceModel } from '../../models/notification/subscriptions.models';

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
 * Every public method takes the acting tenant GUID as the first argument, which the
 * SDK forwards to the subscription API on each call.
 */
export class SubscriptionService extends BaseService implements SubscriptionServiceModel {
  @track('Subscriptions.GetAll')
  async getAll(tenantId: string, options?: SubscriptionGetAllOptions): Promise<SubscriptionGetResponse> {
    const response = await this.get<SubscriptionGetResponse>(
      SUBSCRIPTION_ENDPOINTS.GET_ALL,
      {
        headers: createHeaders({ [TENANT_ID]: tenantId }),
        ...(options?.publishers?.length ? { params: { Publishers: options.publishers } } : {}),
      }
    );
    return response.data;
  }

  @track('Subscriptions.GetPublishers')
  async getPublishers(tenantId: string, options?: SubscriptionGetPublishersOptions): Promise<SubscriptionGetPublishersResponse> {
    const response = await this.get<SubscriptionGetPublishersResponse>(
      SUBSCRIPTION_ENDPOINTS.GET_PUBLISHERS,
      {
        headers: createHeaders({ [TENANT_ID]: tenantId }),
        ...(options?.name ? { params: { PublisherName: options.name } } : {}),
      }
    );
    return response.data;
  }

  @track('Subscriptions.GetSupportedChannels')
  async getSupportedChannels(tenantId: string): Promise<SubscriptionGetSupportedChannelsResponse> {
    const response = await this.get<SubscriptionGetSupportedChannelsResponse>(
      SUBSCRIPTION_ENDPOINTS.GET_SUPPORTED_CHANNELS,
      { headers: createHeaders({ [TENANT_ID]: tenantId }) }
    );
    return response.data;
  }

  @track('Subscriptions.UpdateTopics')
  async updateTopics(tenantId: string, subscriptions: TopicSubscriptionUpdate[]): Promise<SubscriptionUpdateTopicsResponse> {
    await this.post(SUBSCRIPTION_ENDPOINTS.UPDATE_TOPIC, {
      userSubscriptions: subscriptions,
    }, { headers: createHeaders({ [TENANT_ID]: tenantId }) });
    return { success: true, data: { subscriptions } };
  }

  @track('Subscriptions.UpdateCategories')
  async updateCategories(tenantId: string, subscriptions: CategorySubscriptionUpdate[]): Promise<SubscriptionUpdateCategoriesResponse> {
    await this.post(SUBSCRIPTION_ENDPOINTS.UPDATE_CATEGORY, {
      categorySubscriptions: subscriptions,
    }, { headers: createHeaders({ [TENANT_ID]: tenantId }) });
    return { success: true, data: { subscriptions } };
  }

  @track('Subscriptions.UpdatePublishers')
  async updatePublishers(tenantId: string, subscriptions: PublisherSubscriptionUpdate[]): Promise<SubscriptionUpdatePublishersResponse> {
    // API field is misspelled `publisherID` — map at send time.
    await this.post(SUBSCRIPTION_ENDPOINTS.UPDATE_PUBLISHER, {
      publisherSubscriptions: subscriptions.map(({ publisherId, isUserOptIn, entities }) => ({
        publisherID: publisherId,
        isUserOptIn,
        entities,
      })),
    }, { headers: createHeaders({ [TENANT_ID]: tenantId }) });
    return { success: true, data: { subscriptions } };
  }

  @track('Subscriptions.UpdateTopicGroups')
  async updateTopicGroups(tenantId: string, subscriptions: TopicGroupSubscriptionUpdate[]): Promise<SubscriptionUpdateTopicGroupsResponse> {
    await this.post(SUBSCRIPTION_ENDPOINTS.UPDATE_TOPIC_GROUP, {
      topicGroupSubscriptions: subscriptions,
    }, { headers: createHeaders({ [TENANT_ID]: tenantId }) });
    return { success: true, data: { subscriptions } };
  }
}
