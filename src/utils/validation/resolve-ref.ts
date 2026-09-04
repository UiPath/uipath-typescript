import { ValidationError } from '../../core/errors';
import type { ResourceRef } from '../../models/common/types';

/**
 * The folder a resolved resource actually lives in, when the ref branch was `{name}` or `{key}`.
 * Populated from the lookup response so operational methods (updates, deletes) target the correct
 * folder even when a runtime override redirects the lookup across folders.
 *
 * All three shapes are carried so callers can forward whichever variant the underlying lookup
 * actually confirmed against — override redirects change `folderPath`, while `folderId`/`folderKey`
 * are echoed back unchanged.
 *
 * For the `{id}` branch, every field is `undefined` — the caller's folder options remain
 * authoritative because no lookup ran.
 */
export interface EffectiveFolder {
  folderId?: number;
  folderKey?: string;
  folderPath?: string;
}

/**
 * The canonical id from a `ResourceRef`, plus the folder the resolved resource actually lives in
 * when the ref carried a name or key. Operational methods should prefer any populated
 * `effectiveFolder` field over the caller-supplied folder option of the same kind — otherwise a
 * name/key lookup that got redirected by a runtime override would produce a folder mismatch on
 * the follow-up call.
 */
export interface ResolvedRef<TId> {
  id: TId;
  effectiveFolder: EffectiveFolder;
}

/**
 * Service-supplied lookup that turns a name or key into `{ id, ...effectiveFolder }`. Folder
 * fields are optional — non-folder-scoped services (Data Fabric) can omit them — but folder-scoped
 * services should carry them through so downstream operational calls use the actual folder of
 * record (including any redirect an override applied).
 */
export type RefLookup<TId> = (
  identifier: string,
) => Promise<{ id: TId } & EffectiveFolder>;

/**
 * The set of lookups a service supports. Only variants for which a lookup is supplied are
 * legal — e.g., a service without a name endpoint declares `{ byKey }`, and callers supplying
 * `{ name: ... }` receive a `ValidationError` naming both the method and the unsupported variant.
 */
export interface RefResolvers<TId> {
  byName?: RefLookup<TId>;
  byKey?: RefLookup<TId>;
}

/**
 * Selects the API's canonical id from a `ResourceRef<TId>` and reports the folder the resolved
 * resource actually lives in. When the caller supplied `{id}`, returns it directly with an
 * empty `effectiveFolder` — no lookup runs. When `{name}` or `{key}`, invokes the matching
 * service-supplied lookup; the returned folder id (when the lookup carries one) supersedes any
 * caller-supplied folder options for the operational call that follows.
 *
 * Throws `ValidationError` when the ref is missing, empty, or names a variant the service does
 * not declare a resolver for. The discriminated union on `ResourceRef` rejects the
 * `{ id, name }` / `{ id, key }` / `{ name, key }` shapes at compile time, so those combinations
 * are not defended against here.
 *
 * @param ref - Identifier the caller supplied
 * @param resolvers - Bag of service-supplied lookups for the variants this service supports
 * @param callerLabel - `ServiceName.methodName` label included in every error message
 */
export async function resolveRefToId<TId>(
  ref: ResourceRef<TId> | undefined,
  resolvers: RefResolvers<TId>,
  callerLabel: string,
): Promise<ResolvedRef<TId>> {
  if (!ref) {
    throw new ValidationError({
      message: `${callerLabel}: ref must supply exactly one of 'id', 'name', or 'key'.`,
    });
  }

  if ('id' in ref && ref.id != null) {
    return { id: ref.id, effectiveFolder: {} };
  }

  // Name and key branches share the same shape — pick the field the caller supplied, then
  // dispatch to the matching resolver. A ref with neither falls through to the ValidationError.
  const stringVariants: ReadonlyArray<{ variant: 'name' | 'key'; resolver: RefLookup<TId> | undefined }> = [
    { variant: 'name', resolver: resolvers.byName },
    { variant: 'key', resolver: resolvers.byKey },
  ];

  for (const { variant, resolver } of stringVariants) {
    const value = (ref as { name?: string; key?: string })[variant];
    if (!value) continue;
    if (!resolver) {
      throw new ValidationError({
        message: `${callerLabel}: this method does not support lookup by '${variant}'.`,
      });
    }
    const { id, folderId, folderKey, folderPath } = await resolver(value);
    return { id, effectiveFolder: { folderId, folderKey, folderPath } };
  }

  throw new ValidationError({
    message: `${callerLabel}: ref must supply exactly one of 'id', 'name', or 'key'.`,
  });
}
