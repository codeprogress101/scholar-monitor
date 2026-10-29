# SVG exports

Start with [the overview](LDSS_SYSTEM_OVERVIEW.svg), then open a module at its native size. The overview shows selected cross-domain FK groups; the full ERD and relationship inventory retain every FK.

The complete ERD is approximately **5,745 × 31,277 SVG units**. It is a zoomable technical reference, not a single readable printed page. Module exports range from small reference diagrams to long payment/audit diagrams. Pan and zoom rather than shrinking every entity to fit one screen. Dense relationship labels can overlap; the exact column mapping, key and referential actions remain unambiguous in [the relationship inventory](../LDSS_RELATIONSHIPS.md).

There are **15 SVGs**: overview, complete ERD and 13 modules. Their Mermaid sources are retained alongside the dictionary. No raster resizing is used in the SVG exports. No enormous fit-to-page PDF is supplied as a substitute for the modular documentation.

Mermaid 10.9.3 rendered the diagrams through the installed Playwright CLI and Chrome, using an offline blank document. The renderer is task-local tooling, not an LDSS dependency or installed application component. Its provenance and source hashes are recorded in [render evidence](../../../../output/db-erd-1-20261029/render-results.json).

Every exported ER entity name was compared with its complete-schema or module membership. Parser success alone was insufficient: visual review caught an older-renderer interpretation of a layout directive as extra entities; that directive was removed and all exports were regenerated and revalidated.
