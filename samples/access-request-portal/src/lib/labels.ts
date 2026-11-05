/**
 * Display labels for request targets. A request stores the label shown when it was
 * submitted, and the approval screen recomputes it from the platform to detect a row
 * that was edited afterwards — so both sides must build it the same way.
 */
export function groupLabel(group: { name: string; displayName: string }): string {
  return group.displayName || group.name;
}

export function roleLabel(role: { name: string }): string {
  return role.name;
}
