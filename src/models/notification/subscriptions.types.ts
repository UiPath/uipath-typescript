/**
 * Subscription service types — request/response shapes for user subscription preferences.
 */

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
 * A topic that the user can subscribe to.
 *
 * Note: the discovery endpoint (`getPublishers()`) returns a subset of these fields —
 * only `id`, `name`, `displayName`, `description`, `group`. Subscription-state fields
 * (`isSubscribed`, `modes`, etc.) appear only on `getAll()`.
 */
export interface SubscriptionTopic {
  /** Topic GUID. */
  id: string;
  /** Stable topic identifier (e.g. `Process.JobExecution.Faulted`). */
  name: string;
  /** Human-readable topic name. */
  displayName: string | null;
  /** Topic description. */
  description: string | null;
  /** Severity category. Only populated on `getAll()`. */
  category?: NotificationCategory;
  /** Topic group name. */
  group: string | null;
  /** Parent topic group name. Often `null`. */
  parentGroup?: string | null;
  /** Whether the user is currently subscribed to this topic. Only populated on `getAll()`. */
  isSubscribed?: boolean;
  /** Whether the topic is mandatory — cannot be unsubscribed. Only populated on `getAll()`. */
  isMandatory?: boolean;
  /** Whether the topic should be visible in the user-facing subscription UI. */
  isVisible?: boolean;
  /** Whether the topic is subscribed by default for new users. */
  isDefault?: boolean;
  /** Whether notifications for this topic can be batched. */
  isAllowedToBeDispatchedInBatch?: boolean;
  /** Whether the topic is marked as infrequent (lower-priority delivery). */
  isInfrequent?: boolean;
  /** Number of days notifications for this topic are retained. */
  retentionDays?: number;
  /** Display ordering hint. */
  orderingSequence?: number;
  /** Per-channel subscription state. Only populated on `getAll()`. */
  modes?: SubscriptionMode[];
}

/**
 * An entity reference used in publisher / topic-group subscription requests.
 */
export interface SubscriptionEntity {
  /** Entity GUID. */
  id?: string;
  /** Entity name. */
  name?: string;
  /** Entity type. */
  type?: string;
  /** Parent name (e.g. folder name for a sub-folder). */
  parentName?: string;
  /** Whether the user is subscribed to notifications for this entity. */
  isSubscribed?: boolean;
}

/**
 * Group of entities that belong to a topic group.
 */
export interface TopicGroupEntity {
  /** Topic group name. */
  name?: string;
  /** Entities belonging to this group. */
  entities?: SubscriptionEntity[];
}

/**
 * Entity types supported by a topic group.
 */
export interface TopicGroupEntityType {
  /** Topic group name. */
  name?: string;
  /** Entity type names. */
  entityTypes?: string[];
}

/**
 * A publisher with its topics, channels, and (when retrieved via `getAll()`) subscription state.
 *
 * The discovery endpoint (`getPublishers()`) populates only `id`, `name`, `displayName`,
 * and `topics` — subscription-state fields (`isUserOptin`, `modes`, `entities`, etc.)
 * appear only on `getAll()`.
 */
export interface SubscriptionPublisher {
  /** Publisher GUID. */
  id: string;
  /** Stable publisher name (e.g. `Orchestrator`, `Actions`). */
  name: string;
  /** Human-readable publisher name. */
  displayName: string | null;
  /** URL to navigate to when a publisher notification is clicked. */
  redirectionUrl?: string | null;
  /** Number of days notifications from this publisher are retained. */
  retentionDays?: number;
  /** Whether notifications from this publisher are included in summary digests. */
  addToSummary?: boolean;
  /** Whether the user has opted in to receive notifications from this publisher. */
  isUserOptin?: boolean;
  /** Channels available for this publisher and their activation state. */
  modes?: AllowedMode[];
  /** Topics published under this publisher. */
  topics: SubscriptionTopic[];
  /** Entities (e.g. folders) that the publisher exposes. */
  entities?: SubscriptionEntity[];
  /** Entity types the publisher exposes. */
  entityTypes?: string[];
  /** Topic-group entity sets. */
  topicGroupEntities?: TopicGroupEntity[];
  /** Topic-group entity types. */
  topicGroupEntityTypes?: TopicGroupEntityType[];
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
