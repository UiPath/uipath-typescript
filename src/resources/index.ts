/**
 * Resource Declarations Module
 *
 * Declare the Solution resources a coded project uses in a `uipath_resources.ts` at the
 * project root and pass the typed handles to the SDK. The `uip` CLI derives
 * `bindings_v2.json` from that file, so a resource is declared exactly once.
 * Keep declarations literal — the CLI reads the file as text, not by running it.
 *
 * @example
 * ```typescript
 * // uipath_resources.ts
 * import { resource } from '@uipath/uipath-typescript/resources';
 *
 * export class ProjectResources {
 *   static readonly invoiceThreshold =
 *     resource.asset({ name: 'InvoiceThreshold', folderPath: 'Finance/Shared', type: 'integer' });
 *   static readonly invoices = resource.bucket({ name: 'Invoices', folderPath: 'Finance/Shared' });
 *   static readonly review = resource.queue({ name: 'InvoiceReview' });   // no folder: the project's own
 *   static readonly nightly = resource.process({ name: 'Nightly Sync', folderPath: 'Finance/Shared' });
 *   static readonly customers = resource.entity({ name: 'Customers' });
 *   static readonly financeSlack =
 *     resource.connection({ id: '3121165f-ce9b-4503-8c10-289ae6b21bd8', connector: 'uipath-slack', name: 'Finance Slack' });
 * }
 *
 * // anywhere in the project
 * import { Assets } from '@uipath/uipath-typescript/assets';
 * import { Connections } from '@uipath/uipath-typescript/connections';
 *
 * const assets = new Assets(sdk);
 * const threshold = await assets.getByName(ProjectResources.invoiceThreshold);
 * ProjectResources.invoiceThreshold.value; // { name, folderPath } after overrides, no network
 *
 * const slack = await new Connections(sdk).getById(ProjectResources.financeSlack);
 * ProjectResources.financeSlack.value; // { id, folderKey? } after overrides, no network
 * ```
 *
 * @module
 */
import { ValidationError } from '../core/errors';
import type { FolderScopedOptions } from '../models/common/types';
import { resolveConnectionOverride, resolveOverride } from '../utils/overrides/resolve-override';
import { isCurrentFolderPath } from '../utils/folder/folder-headers';

/** Kinds a project can declare. Each is the lowercase `resource` string written into `bindings_v2.json`. */
export type ResourceKind = 'asset' | 'bucket' | 'queue' | 'process' | 'entity' | 'connection';

/** Kinds a declaration identifies by name. A connection is identified by its id instead. */
export type NamedResourceKind = Exclude<ResourceKind, 'connection'>;

/** Value types an Orchestrator asset can hold; becomes the binding's `SubType`. */
export type AssetType = 'text' | 'integer' | 'bool' | 'credential' | 'secret' | 'json';

/** Storage providers a bucket can use; becomes the binding's `SubType`. */
export type BucketType = 'orchestrator' | 'amazon' | 'azure';

/** The name and folder an SDK call actually targets once runtime overrides are applied. */
export interface ResolvedResource {
  name: string;
  /** Omitted when the resource lives in the folder the code runs in: declared without a folder, or overridden to `''` or `'.'`. */
  folderPath?: string;
}

/**
 * Handle for a declared resource. Creating one does no I/O and reads no overrides,
 * so declaring handles at module level is safe even where overrides change per request.
 */
export interface ResourceHandle<K extends NamedResourceKind> {
  readonly kind: K;
  readonly name: string;
  /**
   * Resolved name and folder after runtime overrides — the same lookup every SDK
   * method performs, so code outside the SDK sees exactly what a call would use.
   * Synchronous; never fetches the resource.
   */
  readonly value: ResolvedResource;
}

/** Handle for a resource identified by name within an Orchestrator folder. */
export interface FolderScopedResource<K extends NamedResourceKind> extends ResourceHandle<K> {
  /** Folder the resource was declared in. Omitted: the project's own folder. */
  readonly folderPath?: string;
}

/** Common declaration shape for folder-scoped resources. */
export interface FolderScopedDeclaration {
  name: string;
  folderPath?: string;
}

/** Declaration accepted by {@link resource.asset}. */
export interface AssetDeclaration<T extends AssetType = AssetType> extends FolderScopedDeclaration {
  type?: T;
}

/** Handle returned by {@link resource.asset}; accepted by `assets.getByName()`. */
export interface AssetResource<T extends AssetType = AssetType> extends FolderScopedResource<'asset'> {
  readonly type?: T;
}

/** Declaration accepted by {@link resource.bucket}. */
export interface BucketDeclaration<T extends BucketType = BucketType> extends FolderScopedDeclaration {
  type?: T;
}

/** Handle returned by {@link resource.bucket}; accepted by `buckets.getByName()`. */
export interface BucketResource<T extends BucketType = BucketType> extends FolderScopedResource<'bucket'> {
  readonly type?: T;
}

/** Declaration accepted by {@link resource.queue}. */
export interface QueueDeclaration extends FolderScopedDeclaration {}

/** Handle returned by {@link resource.queue}; accepted by `queues.getByName()`. */
export interface QueueResource extends FolderScopedResource<'queue'> {}

/** Declaration accepted by {@link resource.process}. `type` is the process kind (e.g. `process`, `agent`, `function`). */
export interface ProcessDeclaration extends FolderScopedDeclaration {
  type?: string;
}

/** Handle returned by {@link resource.process}; accepted by `processes.getByName()`. */
export interface ProcessResource extends FolderScopedResource<'process'> {
  readonly type?: string;
}

/** Declaration accepted by {@link resource.entity}. Data Fabric entities are not folder-scoped. */
export interface EntityDeclaration {
  name: string;
}

/** Handle returned by {@link resource.entity}; accepted by `entities.getByName()`. */
export interface EntityResource extends ResourceHandle<'entity'> {}

/** Declaration accepted by {@link resource.connection}. */
export interface ConnectionDeclaration {
  /** Connection GUID, the binding's key. Admins remap it to another connection at deployment. */
  id: string;
  /** Key of the connector the connection belongs to, e.g. `uipath-slack`. */
  connector: string;
  /** Display label for readers of the file; never used to look the connection up. */
  name?: string;
}

/** The connection an SDK call actually targets once runtime overrides are applied. */
export interface ResolvedConnection {
  id: string;
  /** Folder of the connection an override points to. Omitted when no override names one. */
  folderKey?: string;
}

/**
 * Handle returned by {@link resource.connection}; accepted wherever a connection id is,
 * e.g. `connections.getById()`, `execute()` and the `elements.getInstance*()` methods.
 */
export interface ConnectionResource {
  readonly kind: 'connection';
  readonly id: string;
  readonly connector: string;
  readonly name?: string;
  /**
   * Resolved connection id and folder after runtime overrides — the same lookup every
   * SDK method performs. Synchronous; never fetches the connection.
   */
  readonly value: ResolvedConnection;
}

function requireValue(kind: ResourceKind, field: string, value: string): void {
  if (!value) {
    throw new ValidationError({ message: `resource.${kind}(): \`${field}\` must be a non-empty string.` });
  }
}

function requireName(kind: NamedResourceKind, name: string): void {
  requireValue(kind, 'name', name);
}

function resolve(kind: NamedResourceKind, name: string, folderPath?: string): ResolvedResource {
  const override = resolveOverride(kind, name, folderPath);
  const resolvedFolder = override?.folderPath ?? folderPath;
  return {
    name: override?.name ?? name,
    ...(resolvedFolder !== undefined && !isCurrentFolderPath(resolvedFolder) && { folderPath: resolvedFolder }),
  };
}

/**
 * The connection a call targets for `connectionId`: the override published under
 * `connection.<connectionId>`, else the id as given.
 *
 * @internal
 */
export function resolveConnection(connectionId: string): ResolvedConnection {
  const override = resolveConnectionOverride(connectionId);
  return {
    id: override?.connectionId ?? connectionId,
    ...(override?.folderKey !== undefined && { folderKey: override.folderKey }),
  };
}

function folderScoped<K extends NamedResourceKind, T>(
  kind: K,
  declaration: FolderScopedDeclaration & { type?: T },
): FolderScopedResource<K> & { readonly type?: T } {
  const { name, folderPath, type } = declaration;
  requireName(kind, name);
  return Object.freeze({
    kind,
    name,
    ...(folderPath !== undefined && { folderPath }),
    ...(type !== undefined && { type }),
    get value(): ResolvedResource {
      return resolve(kind, name, folderPath);
    },
  });
}

/**
 * Factories for resource handles. They hang off one object so that no export
 * shadows Node's global `process`.
 */
export const resource = {
  /**
   * Declares an Orchestrator asset the project uses.
   *
   * @param declaration - Asset name, optional folder path and optional value type
   * @returns Frozen {@link AssetResource} handle to pass to the Assets service
   * @throws ValidationError when `name` is empty
   */
  asset<T extends AssetType = AssetType>(declaration: AssetDeclaration<T>): AssetResource<T> {
    return folderScoped('asset', declaration);
  },

  /**
   * Declares an Orchestrator storage bucket the project uses.
   *
   * @param declaration - Bucket name, optional folder path and optional storage provider
   * @returns Frozen {@link BucketResource} handle to pass to the Buckets service
   * @throws ValidationError when `name` is empty
   */
  bucket<T extends BucketType = BucketType>(declaration: BucketDeclaration<T>): BucketResource<T> {
    return folderScoped('bucket', declaration);
  },

  /**
   * Declares an Orchestrator queue the project uses.
   *
   * @param declaration - Queue name and optional folder path
   * @returns Frozen {@link QueueResource} handle to pass to the Queues service
   * @throws ValidationError when `name` is empty
   */
  queue(declaration: QueueDeclaration): QueueResource {
    return folderScoped('queue', declaration);
  },

  /**
   * Declares an Orchestrator process the project uses.
   *
   * @param declaration - Process name, optional folder path and optional process kind
   * @returns Frozen {@link ProcessResource} handle to pass to the Processes service
   * @throws ValidationError when `name` is empty
   */
  process(declaration: ProcessDeclaration): ProcessResource {
    return folderScoped('process', declaration);
  },

  /**
   * Declares a Data Fabric entity the project uses.
   *
   * @param declaration - Entity name
   * @returns Frozen {@link EntityResource} handle to pass to the Entities service
   * @throws ValidationError when `name` is empty
   */
  entity(declaration: EntityDeclaration): EntityResource {
    const { name } = declaration;
    requireName('entity', name);
    return Object.freeze({
      kind: 'entity' as const,
      name,
      get value(): ResolvedResource {
        return resolve('entity', name);
      },
    });
  },

  /**
   * Declares an Integration Service connection the project uses. A connection is
   * identified by its id, not its name: the binding is keyed by the id, and admins
   * remap that id to another connection at deployment.
   *
   * @param declaration - Connection id, connector key and optional display name
   * @returns Frozen {@link ConnectionResource} handle to pass to the Connections, Elements and execute APIs
   * @throws ValidationError when `id` or `connector` is empty
   */
  connection(declaration: ConnectionDeclaration): ConnectionResource {
    const { id, connector, name } = declaration;
    requireValue('connection', 'id', id);
    requireValue('connection', 'connector', connector);
    return Object.freeze({
      kind: 'connection' as const,
      id,
      connector,
      ...(name !== undefined && { name }),
      get value(): ResolvedConnection {
        return resolveConnection(id);
      },
    });
  },
} as const;

/** True when `value` is a handle of the given kind produced by {@link resource}. */
export function isResourceHandle<K extends NamedResourceKind>(value: unknown, kind: K): value is ResourceHandle<K> {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { kind?: unknown }).kind === kind &&
    typeof (value as { name?: unknown }).name === 'string'
  );
}

/** True when `value` was produced by {@link resource.asset}. */
export const isAssetResource = (value: unknown): value is AssetResource => isResourceHandle(value, 'asset');
/** True when `value` was produced by {@link resource.bucket}. */
export const isBucketResource = (value: unknown): value is BucketResource => isResourceHandle(value, 'bucket');
/** True when `value` was produced by {@link resource.queue}. */
export const isQueueResource = (value: unknown): value is QueueResource => isResourceHandle(value, 'queue');
/** True when `value` was produced by {@link resource.process}. */
export const isProcessResource = (value: unknown): value is ProcessResource => isResourceHandle(value, 'process');
/** True when `value` was produced by {@link resource.entity}. */
export const isEntityResource = (value: unknown): value is EntityResource => isResourceHandle(value, 'entity');
/** True when `value` was produced by {@link resource.connection}. */
export const isConnectionResource = (value: unknown): value is ConnectionResource =>
  typeof value === 'object' &&
  value !== null &&
  (value as { kind?: unknown }).kind === 'connection' &&
  typeof (value as { id?: unknown }).id === 'string';

/**
 * Splits a `getByName` input into the name and the options a lookup should use. A
 * handle contributes its `folderPath` only when the caller passed no folder option.
 *
 * @internal
 */
export function unpackFolderScopedHandle<T extends FolderScopedOptions>(
  nameOrHandle: string | FolderScopedResource<NamedResourceKind>,
  options: T,
): { name: string; options: T } {
  if (typeof nameOrHandle !== 'object' || nameOrHandle === null) return { name: nameOrHandle, options };
  const hasExplicitFolder =
    options.folderId !== undefined || options.folderKey !== undefined || options.folderPath !== undefined;
  return {
    name: nameOrHandle.name,
    options:
      nameOrHandle.folderPath !== undefined && !hasExplicitFolder
        ? { ...options, folderPath: nameOrHandle.folderPath }
        : options,
  };
}
