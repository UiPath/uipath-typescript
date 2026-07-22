/**
 * Subscription service types — request/response shapes for user subscription preferences.
 */

import type { OperationResponse } from '../common/types';

import { NotificationCategory, NotificationMode } from './notifications.types';

/**
 * Status of a notification mode (channel) for a publisher — whether the user has
 * activated this channel.
 */
export interface AllowedMode {
  /** Notification channel. */
  name: NotificationMode;
  /** Whether the user has activated this channel for the publisher. */
  isActive: boolean;
}

/**
 * Per-mode subscription state for a topic.
 */
export interface SubscriptionMode {
  /** Notification channel. */
  name: NotificationMode;
  /** Whether the user is subscribed to this topic via this channel. */
  isSubscribed: boolean;
  /** Whether the topic is subscribed by default via this channel. */
  isSubscribedByDefault: boolean;
}

/**
 * Base topic shape — identity/discovery fields only, with no subscription state.
 */
export interface SubscriptionTopicBase {
  /** Topic GUID. */
  id: string;
  /** Stable topic identifier (e.g. `Process.JobExecution.Faulted`). */
  name: string;
  /** Human-readable topic name. */
  displayName: string | null;
  /** Topic description. */
  description: string | null;
  /** Topic group name. */
  group: string | null;
}

/**
 * A topic that the user can subscribe to, with full subscription state — as returned by `getAll()`.
 */
export interface SubscriptionTopic extends SubscriptionTopicBase {
  /** Severity category. */
  category: NotificationCategory;
  /** Parent topic group name. Often `null`. */
  parentGroup: string | null;
  /** Whether the user is currently subscribed to this topic. */
  isSubscribed: boolean;
  /** Whether the topic is mandatory — cannot be unsubscribed. */
  isMandatory: boolean;
  /** Whether the topic should be visible in the user-facing subscription UI. */
  isVisible: boolean;
  /** Whether the topic is subscribed by default for new users. */
  isDefault: boolean;
  /** Whether notifications for this topic can be batched. */
  isAllowedToBeDispatchedInBatch: boolean;
  /** Whether the topic is marked as infrequent (lower-priority delivery). */
  isInfrequent: boolean;
  /** Number of days notifications for this topic are retained. */
  retentionDays: number;
  /** Display ordering hint. */
  orderingSequence: number;
  /** Per-channel subscription state. */
  modes: SubscriptionMode[];
}

/**
 * An entity reference used in publisher / topic-group subscription requests.
 */
export interface SubscriptionEntity {
  /** Entity GUID. */
  id: string;
  /** Entity name. */
  name: string | null;
  /** Entity type. */
  type: string | null;
  /** Parent name (e.g. folder name for a sub-folder). */
  parentName: string | null;
  /** Whether the user is subscribed to notifications for this entity. */
  isSubscribed: boolean;
}

/**
 * Group of entities that belong to a topic group.
 */
export interface TopicGroupEntity {
  /** Topic group name. */
  name: string | null;
  /** Entities belonging to this group. */
  entities: SubscriptionEntity[] | null;
}

/**
 * Entity-sync operation an event maps to.
 */
export enum EntitySyncOperation {
  Add = 'Add',
  Delete = 'Delete',
}

/**
 * Event mapping that triggers entity synchronization for an entity type.
 */
export interface EntitySyncEvent {
  /** Source event name. */
  eventName: string | null;
  /** Sync operation the event maps to. */
  operation: EntitySyncOperation;
}

/**
 * Entity-type metadata declared by a publisher (e.g. folder entity registration).
 */
export interface SubscriptionEntityType {
  /** Entity type name. */
  type: string | null;
  /** URL template for resolving entity links. */
  urlTemplate: string | null;
  /** Property used to project the entity in publications. */
  projectionProperty: string | null;
  /** Publication payload property carrying the entity reference. */
  publicationPayloadProperty: string | null;
  /** Request type used for entity sync. */
  requestType: string | null;
  /** Payload template for entity sync requests. */
  payload: string | null;
  /** Events that trigger entity synchronization. */
  entitySyncEvents: EntitySyncEvent[] | null;
}

/**
 * Entity types supported by a topic group.
 */
export interface TopicGroupEntityType {
  /** Topic group name. */
  name: string | null;
  /** Entity type names. */
  entityTypes: string[] | null;
}

/**
 * Base publisher shape — identity/discovery fields and the topic catalogue, with no subscription state.
 */
export interface SubscriptionPublisherBase {
  /** Publisher GUID. */
  id: string;
  /** Stable publisher name (e.g. `Orchestrator`, `Actions`). */
  name: string;
  /** Human-readable publisher name. */
  displayName: string | null;
  /** Topics published under this publisher. */
  topics: SubscriptionTopicBase[];
}

/**
 * A publisher with its topics, channels, and subscription state — as returned by `getAll()`.
 */
export interface SubscriptionPublisher extends SubscriptionPublisherBase {
  /** Topics published under this publisher, with full per-topic subscription state. */
  topics: SubscriptionTopic[];
  /** URL to navigate to when a publisher notification is clicked. */
  redirectionUrl: string | null;
  /** Number of days notifications from this publisher are retained. */
  retentionDays: number;
  /** Whether notifications from this publisher are included in summary digests. */
  addToSummary: boolean;
  /** Whether the user has opted in to receive notifications from this publisher. */
  isUserOptin: boolean;
  /** Channels available for this publisher and their activation state. */
  modes: AllowedMode[];
  /** Entities (e.g. folders) the user has entity-level subscriptions for. */
  entities: SubscriptionEntity[] | null;
  /** Entity types the publisher exposes. */
  entityTypes: SubscriptionEntityType[] | null;
  /** Topic-group entity sets the user has entity-level subscriptions for. */
  topicGroupEntities: TopicGroupEntity[];
  /** Topic-group entity types. */
  topicGroupEntityTypes: TopicGroupEntityType[] | null;
}

/**
 * Channel availability returned by `getSupportedChannels()`.
 *
 * Note: `InApp` is never returned — it is always implicitly available.
 */
export interface SupportedChannel {
  /** Notification channel. */
  name: NotificationMode;
  /** Whether the channel is enabled for the current tenant. */
  isEnabled: boolean;
}

/**
 * Update payload for a topic-level subscription change.
 */
export interface TopicSubscriptionUpdate {
  /** Topic GUID. */
  topicId: string;
  /** Whether the user should be subscribed to this topic via the chosen mode. */
  isSubscribed: boolean;
  /** Notification channel this update applies to. */
  notificationMode: NotificationMode;
}

/**
 * Update payload for a category-level subscription change.
 */
export interface CategorySubscriptionUpdate {
  /** Publisher GUID. */
  publisherId: string;
  /** Category to update. */
  category: NotificationCategory;
  /** Whether the user should be subscribed to topics of this category via the chosen mode. */
  isSubscribed: boolean;
  /** Notification channel this update applies to. */
  notificationMode: NotificationMode;
}

/**
 * Entity reference supplied when scoping a subscription update to specific entities
 * (e.g. folders). Only the identity and desired subscription state are provided;
 * discovery fields (`name`, `parentName`) are resolved server-side.
 */
export interface SubscriptionEntityUpdate {
  /** Entity GUID. */
  id: string;
  /** Entity type (e.g. `Folder`). */
  type?: string;
  /** Whether the user should be subscribed to notifications for this entity. */
  isSubscribed: boolean;
}

/**
 * Update payload for a publisher-level opt-in / opt-out.
 */
export interface PublisherSubscriptionUpdate {
  /** Publisher GUID. */
  publisherId: string;
  /** Whether the user opts in to receive notifications from this publisher. */
  isUserOptIn: boolean;
  /** Optional entity scoping. */
  entities?: SubscriptionEntityUpdate[];
}

/**
 * Update payload for a topic-group-level subscription change.
 */
export interface TopicGroupSubscriptionUpdate {
  /** Publisher GUID. */
  publisherId: string;
  /** Topic group name. */
  topicGroupName: string;
  /** Optional entity scoping. */
  entities?: SubscriptionEntityUpdate[];
}

/**
 * Options for `Subscriptions.getAll()`.
 */
export interface SubscriptionGetAllOptions {
  /** Filter to specific publisher names. When omitted, all publishers are returned. */
  publishers?: string[];
}

/**
 * Options for `Subscriptions.getPublishers()`.
 */
export interface SubscriptionGetPublishersOptions {
  /** Filter to a specific publisher name. When omitted, all publishers are returned. */
  name?: string;
}

/**
 * Response from `getAll()` — publishers with their topics, channels, and full subscription state.
 */
export interface SubscriptionGetResponse {
  /** Publishers with their topics and subscription state. */
  publishers: SubscriptionPublisher[];
}

/**
 * Response from `getPublishers()` — the publisher/topic discovery catalogue.
 *
 * Publishers and topics carry only identity/discovery fields (no subscription state);
 * use `getAll()` to inspect subscription state.
 */
export interface SubscriptionGetPublishersResponse {
  /** Publishers with their topic catalogue. */
  publishers: SubscriptionPublisherBase[];
}

/**
 * Response from `getSupportedChannels()`.
 */
export interface SubscriptionGetSupportedChannelsResponse {
  /** Notification channels supported in the current tenant. `InApp` is not listed — it is always available. */
  channels: SupportedChannel[];
}

/** Response from `updateTopics()`. */
export type SubscriptionUpdateTopicsResponse = OperationResponse<{
  subscriptions: TopicSubscriptionUpdate[];
}>;

/** Response from `updateCategories()`. */
export type SubscriptionUpdateCategoriesResponse = OperationResponse<{
  subscriptions: CategorySubscriptionUpdate[];
}>;

/** Response from `updatePublishers()`. */
export type SubscriptionUpdatePublishersResponse = OperationResponse<{
  subscriptions: PublisherSubscriptionUpdate[];
}>;

/** Response from `updateTopicGroups()`. */
export type SubscriptionUpdateTopicGroupsResponse = OperationResponse<{
  subscriptions: TopicGroupSubscriptionUpdate[];
}>;
