/**
 * Resource Declarations Module
 *
 * Declare the Solution resources a coded project uses in a `resources.ts` at the
 * project root and pass the typed handles to the SDK. The `uip` CLI derives
 * `bindings_v2.json` from that file, so a resource is declared exactly once.
 * Keep declarations literal — the CLI reads the file as text, not by running it.
 *
 * @example
 * ```typescript
 * // resources.ts
 * import { resource } from '@uipath/uipath-typescript/resources';
 *
 * export class ProjectResources {
 *   static readonly invoiceThreshold =
 *     resource.asset({ name: 'InvoiceThreshold', folderPath: 'Finance/Shared', type: 'integer' });
 *   static readonly invoices = resource.bucket({ name: 'Invoices', folderPath: 'Finance/Shared' });
 *   static readonly review = resource.queue({ name: 'InvoiceReview' });   // no folder: the project's own
 *   static readonly nightly = resource.process({ name: 'Nightly Sync', folderPath: 'Finance/Shared' });
 *   static readonly customers = resource.entity({ name: 'Customers' });
 * }
 *
 * // anywhere in the project
 * import { Assets } from '@uipath/uipath-typescript/assets';
 *
 * const assets = new Assets(sdk);
 * const threshold = await assets.getByName(ProjectResources.invoiceThreshold);
 * ProjectResources.invoiceThreshold.value; // { name, folderPath } after overrides, no network
 * ```
 *
 * @module
 */
import { ValidationError } from '../core/errors';
import type { FolderScopedOptions } from '../models/common/types';
import { resolveOverride } from '../utils/overrides/resolve-override';

/** Kinds a project can declare. Each is the lowercase `resource` string written into `bindings_v2.json`. */
export type ResourceKind = 'asset' | 'bucket' | 'queue' | 'process' | 'entity';

/** Value types an Orchestrator asset can hold; becomes the binding's `SubType`. */
export type AssetType = 'text' | 'integer' | 'bool' | 'credential' | 'secret' | 'json';

/** Storage providers a bucket can use; becomes the binding's `SubType`. */
export type BucketType = 'orchestrator' | 'amazon' | 'azure';

/** The name and folder an SDK call actually targets once runtime overrides are applied. */
export interface ResolvedResource {
  name: string;
  folderPath?: string;
}

/**
 * Handle for a declared resource. Creating one does no I/O and reads no overrides,
 * so declaring handles at module level is safe even where overrides change per request.
 */
export interface ResourceHandle<K extends ResourceKind> {
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
export interface FolderScopedResource<K extends ResourceKind> extends ResourceHandle<K> {
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

function requireName(kind: ResourceKind, name: string): void {
  if (!name) {
    throw new ValidationError({ message: `resource.${kind}(): \`name\` must be a non-empty string.` });
  }
}

function resolve(kind: ResourceKind, name: string, folderPath?: string): ResolvedResource {
  const override = resolveOverride(kind, name, folderPath);
  const resolvedFolder = override?.folderPath ?? folderPath;
  return {
    name: override?.name ?? name,
    ...(resolvedFolder !== undefined && { folderPath: resolvedFolder }),
  };
}

function folderScoped<K extends ResourceKind, T>(
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
} as const;

/** True when `value` is a handle of the given kind produced by {@link resource}. */
export function isResourceHandle<K extends ResourceKind>(value: unknown, kind: K): value is ResourceHandle<K> {
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

/**
 * Splits a `getByName` input into the name and the options a lookup should use. A
 * handle contributes its `folderPath` only when the caller passed no folder option.
 *
 * @internal
 */
export function unpackFolderScopedHandle<T extends FolderScopedOptions>(
  nameOrHandle: string | FolderScopedResource<ResourceKind>,
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
