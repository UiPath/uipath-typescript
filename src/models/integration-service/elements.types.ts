/**
 * Integration Service — Elements (connector metadata) types.
 *
 * The Elements API returns deeply nested, connector-dependent shapes. We type
 * the well-known fields explicitly and leave the open extension points loose
 * (`Record<string, unknown>`) so the SDK doesn't force a false-positive failure
 * when a connector ships a new metadata field.
 */

import { LifeCycleStage } from './connectors.types';

/**
 * A parameter declared on a connector method (path, query, body, header, value).
 */
export interface ElementMethodParameter {
  /** Parameter name (e.g. `folderKey`, `limit`). */
  name: string;
  /** Where the parameter is sent. */
  type: string;
  /** Parameter primitive type (`string`, `integer`, ...). */
  dataType?: string;
  /** Whether the parameter is required. */
  required?: boolean;
  /** Caller-facing display name. */
  displayName?: string;
  /** Default value if any. */
  defaultValue?: unknown;
  /** Free-form description. */
  description?: string;
  /** Whether this parameter participates in curated UX. */
  curated?: boolean;
  /** Cross-object reference (lookup hints). */
  reference?: Record<string, unknown>;
  /** Design-time UX hints. */
  design?: Record<string, unknown>;
  /** Sort order in UX panels. */
  sortOrder?: number;
  /** Open-ended additional fields the API may ship per connector. */
  [key: string]: unknown;
}

/**
 * Describes a single HTTP method invocation on a connector object.
 */
export interface ElementMethodDefinition {
  /** Logical operation name (e.g. `Create`, `List`). */
  operation?: string;
  /** HTTP method. */
  method: string;
  /** API path template. */
  path?: string;
  /** Parameters consumed by the method. */
  parameters?: ElementMethodParameter[];
  /** OpenAPI operation ID. */
  operationId?: string;
  /** Curated activity descriptor. */
  curated?: Record<string, unknown>;
  /** Friendly response label. */
  responseDisplayName?: string;
  /** Design-time UX hints. */
  design?: Record<string, unknown>;
  /** Open-ended additional fields. */
  [key: string]: unknown;
}

/**
 * Connector object metadata block. The `method` map is keyed by HTTP verb.
 */
export interface ElementObjectMetadata {
  /** Whether the object exposes connector-specific custom fields. */
  hasCustomFieldDiscovery?: boolean;
  /** HTTP-verb-keyed map of methods supported on this object. */
  method?: Record<string, ElementMethodDefinition>;
  /** Whether the object exposes search-friendly fields. */
  hasSearchables?: boolean;
  /** Open-ended additional fields. */
  [key: string]: unknown;
}

/**
 * A connector object (resource).
 */
export interface ElementObject {
  /** Object name (e.g. `contacts`). */
  name: string;
  /** API path template. */
  path?: string;
  /** Object type (e.g. `standard`, `custom`). */
  type?: string;
  /** Object subtype. */
  subType?: string;
  /** Owning connector key. */
  elementKey?: string;
  /** Display name. */
  displayName?: string;
  /** Connector custom-ness marker. */
  custom?: string;
  /** Object metadata block. */
  metadata?: ElementObjectMetadata;
  /** Whether the object is featured as a priority. */
  isPriority?: boolean;
  /** Whether the object is hidden from UX. */
  isHidden?: boolean;
}

/**
 * A curated activity exposed by a connector.
 */
export interface ElementActivity {
  /** Activity name. */
  name: string;
  /** Display name. */
  displayName?: string;
  /** Description. */
  description?: string;
  /** Object the activity operates on. */
  objectName?: string;
  /** HTTP method name. */
  methodName?: string;
  /** Event operation (for triggers). */
  eventOperation?: string;
  /** Logical operation (e.g. `List`, `Create`). */
  operation?: string;
  /** Event delivery mode (e.g. `polling`, `webhooks`). */
  eventMode?: string;
  /** Lifecycle stage. */
  lifecycleStage?: LifeCycleStage;
  /** Project types this activity is compatible with. */
  compatibleProjectTypes?: string[];
  /** Tag list. */
  tags?: string[];
  /** Subtype. */
  subType?: string;
  /** Whether this activity is a trigger. */
  trigger?: boolean;
  /** Whether this activity is a curated UX element. */
  curated?: boolean;
  /** Trigger marker (legacy). */
  isTrigger?: boolean;
  /** Open-ended additional fields. */
  [key: string]: unknown;
}

/**
 * Field descriptor on a metadata response — the value in the `fields` map,
 * keyed by field name/path (e.g. `channel`, `attachment.image_url`).
 *
 * Shape is connector-dependent and very open-ended (type, sample value, HTTP
 * method usage, lookup references, UI hints). We keep it as a free-form record.
 */
export type ElementField = Record<string, unknown>;

/**
 * Object metadata response (returned by `getObjectMetadata` and `getInstanceObjectMetadata`).
 */
export interface ElementObjectMetadataResponse {
  /** Object name. */
  name: string;
  /** Path template. */
  path?: string;
  /** Object type. */
  type?: string;
  /** Object subtype. */
  subType?: string;
  /** Owning connector key. */
  elementKey?: string;
  /** Display name. */
  displayName?: string;
  /** Connector custom-ness marker. */
  custom?: string;
  /** Connector object metadata. */
  metadata?: ElementObjectMetadata;
  /** Field schema, keyed by field name/path. */
  fields?: Record<string, ElementField>;
  /** Whether the object is hidden from UX. */
  isHidden?: boolean;
  /** Whether the object is featured as a priority. */
  isPriority?: boolean;
}

/**
 * An event-source object (trigger root).
 */
export interface ElementEventObject {
  /** Event object name. */
  name: string;
  /** Event delivery mode (`polling`, `webhooks`). */
  eventMode?: string;
  /** Whether the event ID field is hidden in UX. */
  hideEventIDField?: boolean;
  /** Whether the event is debug-disabled. */
  debugDisabled?: boolean;
  /** Friendly display name. */
  displayName?: string;
  /** Whether the webhook URL is shown in the UX. */
  isWebhookUrlVisible?: boolean;
  /** Whether the event uses Bring-Your-Own-Auth. */
  byoaConnection?: boolean;
  /** Whether the left-operand filter builder is static. */
  hasStaticLeftOperandFilterBuilder?: boolean;
  /** Whether the event is hidden from UX. */
  isHidden?: boolean;
  /** Auth types this event supports. */
  supportedAuths?: string[];
  /** Event-source parameters. */
  parameters?: ElementMethodParameter[];
  /** Logical operation. */
  operation?: string;
  /** Bound object name (for events that resolve dynamically). */
  objectName?: string;
  /** Whether the object name is dynamic. */
  isDynamicObjectName?: boolean;
  /** Description. */
  description?: string;
  /** Open-ended additional fields. */
  [key: string]: unknown;
}

/**
 * Event-object metadata response.
 */
export interface ElementEventObjectMetadataResponse {
  /** Event object name. */
  name: string;
  /** Path template. */
  path?: string;
  /** Object type. */
  type?: string;
  /** Object subtype. */
  subType?: string;
  /** Owning connector key. */
  elementKey?: string;
  /** Display name. */
  displayName?: string;
  /** Connector custom-ness marker. */
  custom?: string;
  /** Event delivery mode. */
  eventMode?: string;
  /** Field schema, keyed by field name/path. */
  fields?: Record<string, ElementField>;
}

/**
 * Options for {@link ElementsServiceModel.getObjects}.
 */
export interface ElementObjectsGetOptions {
  /** Filter by object type (e.g. `standard`, `custom`). */
  type?: string;
  /** Filter by object subtype. */
  subType?: string;
  /** Limit to objects that support events. */
  hasEvents?: boolean;
  /** Limit to objects that support bulk operations. */
  hasBulk?: boolean;
}

/**
 * Options for {@link ElementsServiceModel.getActivities}.
 */
export interface ElementActivitiesGetOptions {
  /** Connector schema version (defaults to the latest published). */
  version?: string;
}

/**
 * Options for {@link ElementsServiceModel.getObjectMetadata}
 * and {@link ElementsServiceModel.getInstanceObjectMetadata}.
 */
export interface ElementObjectMetadataGetOptions {
  /** Connector schema version (defaults to the latest published). */
  version?: string;
  /** Hydrate parameters with values discovered from the connection. */
  hydrateParameters?: boolean;
  /** Include parent-array references in nested objects. */
  includeParentArray?: boolean;
}

/**
 * Options for {@link ElementsServiceModel.getEventObjects}
 * and {@link ElementsServiceModel.getInstanceEventObjects}.
 */
export interface ElementEventObjectsGetOptions {
  /** Connector schema version (defaults to the latest published). */
  version?: string;
}

/**
 * Options for {@link ElementsServiceModel.getEventObjectMetadata}
 * and {@link ElementsServiceModel.getInstanceEventObjectMetadata}.
 */
export interface ElementEventObjectMetadataGetOptions {
  /** Connector schema version (defaults to the latest published). */
  version?: string;
  /** Include all fields, not just curated. */
  allFields?: boolean;
  /** Include parent-array references in nested objects. */
  includeParentArray?: boolean;
}
