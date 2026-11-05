/**
 * Data Fabric entity backing the shared request store, addressed by name so the
 * same build works in any tenant that has the entity.
 *
 * Create it once at tenant level with text fields mirroring `AccessRequest`:
 * kind, targetId, targetName, justification (multiline), requestedById,
 * requestedByName, status, createdTime, resolvedByName, resolvedTime.
 */
export const ACCESS_REQUESTS_ENTITY_NAME = 'AccessRequests';
