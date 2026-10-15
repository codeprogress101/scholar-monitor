/** Recovery authorizes existing immutable owners; it never rewrites their scope pointers. */
export function scopeAcceptsOwner(scope: Record<string, unknown>, ownerScopeId: string) {
  if (scope.mode !== "enabled") return false;
  if (scope.id === ownerScopeId) return true;
  const recorded = typeof scope.rules === "string" ? JSON.parse(scope.rules) : scope.rules;
  if (Array.isArray(recorded?.retainedScopeIds) && recorded.retainedScopeIds.includes(ownerScopeId)) return true;
  const rules = typeof scope.rules === "string" ? JSON.parse(scope.rules) as { recovery?: { kind?: string; scopeIds?: unknown } } : scope.rules as { recovery?: { kind?: string; scopeIds?: unknown } };
  return rules?.recovery?.kind === "resume_same_policy" && Array.isArray(rules.recovery.scopeIds) && rules.recovery.scopeIds.includes(ownerScopeId);
}
