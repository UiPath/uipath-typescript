/**
 * SubscriptionService — manages the current user's notification preferences.
 */

import { track } from '../../core/telemetry';
import { BaseService } from '../base';

import type {
  CategorySubscriptionUpdate,
  SubscriptionGetAllOptions,
  SubscriptionGetPublishersOptions,
  SubscriptionGetPublishersResponse,
  SubscriptionGetResponse,
  SubscriptionGetSupportedChannelsResponse,
  SubscriptionUpdateCategoriesResponse,
  SubscriptionUpdateTopicsResponse,
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
}
