/**
 * Helpers for classifying and describing entity types.
 *
 * The SDK's documented `EntityType` enum is
 *   `Entity | ChoiceSet | InternalEntity | SystemEntity`
 * but at runtime the API also returns values not in the enum (e.g. `Case`).
 * We treat the API's `entityType` as a plain string and centralise the
 * "what does this mean / can I query records on it" logic here so the rest
 * of the app stays decoupled from the schema variations.
 */

export interface EntityTypeIndicators {
  entityType?: string
  externalFields?: unknown[]
  sourceJoinCriterias?: unknown[]
}

/**
 * Returns true if the entity sources its data from external systems
 * (a Virtual Data Object). Detected via metadata, not the entityType enum,
 * because the API doesn't expose a `VDO` enum value.
 */
export function isVirtualDataObject(entity: EntityTypeIndicators): boolean {
  if ((entity.externalFields?.length ?? 0) > 0) return true
  if ((entity.sourceJoinCriterias?.length ?? 0) > 0) return true
  return false
}

/**
 * Human-readable hover description for a given entityType value.
 */
export function entityTypeTooltip(entityType: string | undefined): string {
  switch (entityType) {
    case 'ChoiceSet':
      return 'Choice Set — a lookup list used by other entities. View via the ChoiceSets service.'
    case 'InternalEntity':
      return "Internal UiPath entity. Not accessible via the SDK's standard endpoints."
    case 'SystemEntity':
      return 'System-managed entity (e.g. Users, Roles). Read-only here.'
    case 'Case':
      return 'Case entity — a stateful record type backing Maestro case-management workflows.'
    default:
      return entityType ?? 'Unknown entity type'
  }
}

/**
 * Returns a reason string if this entity can't be browsed via `getAllRecords`,
 * or `null` if records can be fetched normally.
 *
 * `Case` is NOT in this list — Case entities are regular queryable records
 * with additional state-machine semantics. The standard CRUD endpoints work.
 */
export function entityNotSupportedReason(
  entity: EntityTypeIndicators,
): string | null {
  if (isVirtualDataObject(entity)) {
    return (
      'This is a Virtual Data Object — its data is sourced from external ' +
      "systems via joins rather than stored in Data Service. Direct record " +
      "listing isn't supported here."
    )
  }
  if (entity.entityType === 'InternalEntity') {
    return (
      "This is an internal UiPath entity. Records aren't accessible via the " +
      "SDK's standard endpoints."
    )
  }
  if (entity.entityType === 'SystemEntity') {
    return (
      "This is a system-managed entity (e.g. Users, Roles). Records aren't " +
      'editable from here.'
    )
  }
  if (entity.entityType === 'ChoiceSet') {
    return (
      'This is a Choice Set, not a regular entity. Use the ChoiceSets ' +
      'service to view its values.'
    )
  }
  return null
}
