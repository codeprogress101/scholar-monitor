// Never return grant statements: they can contain authentication metadata.
export function summarizeGrants(grants, database) {
  const applicable = [];
  for (const statement of grants) {
    const match = /^GRANT (.+?) ON (\*|`(?:``|[^`])+`)\.\* TO /i.exec(statement);
    if (!match) continue;
    const scope = match[2] === "*" ? "*" : match[2].slice(1, -1).replaceAll("``", "`").replace(/\\([_%])/g, "$1");
    if (scope !== "*" && scope !== database) continue;
    applicable.push({
      privileges: match[1].toUpperCase().split(/,\s*/),
      delegation: /\bWITH GRANT OPTION\s*$/i.test(statement),
    });
  }
  const permits = name => applicable.some(g => g.privileges.includes("ALL PRIVILEGES") || g.privileges.includes(name));
  return {
    matchedGrantScopes: applicable.length,
    canCreateTables: permits("CREATE"),
    canCreateViews: permits("CREATE VIEW"),
    canCreateTriggers: permits("TRIGGER"),
    canDelegateScopedPermissions: applicable.some(g => g.delegation),
  };
}
