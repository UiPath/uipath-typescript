/**
 * Data Fabric entity backing the shared request store.
 *
 * Created once (tenant-level, PAT) with fields mirroring `AccessRequest`:
 * kind, targetId, targetName, justification (multiline), requestedById,
 * requestedByName, status, createdTime, resolvedByName, resolvedTime.
 *
 */
export const ACCESS_REQUESTS_ENTITY_ID = 'c6bcba7b-58a1-f111-9b33-0022482a9eea';
