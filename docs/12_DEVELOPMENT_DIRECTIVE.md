**Project Codename:** `data-vis` (Data Visualizer)  
**Version:** 1.0.0-rc  
**Status:** APPROVED (Source of Truth)  
**License:** GNU Affero General Public License v3.0 (AGPLv3) 

## The Development Directive

All contributors and/or AI pairing agents must strictly adhere to the project's development principles:

1.  **Docs Before Code**: No feature, route, database entity, or component is authored without an approved specification in the `docs/` tree.
2.  **`docs/` is the Single Source of Truth**: The 12 numbered markdown files in `docs/` (`00_PROJECT_OVERVIEW.md` through `11_PRODUCTION_CHECKLIST.md`) define the complete system architecture.
3.  **No Ghost Routes or Dead Functions**:
      - Every API endpoint, UI route, component, and database entity described in `docs/` must exist in code.
      - Every major module in code must appear in `docs/`.
      - If you introduce a new module, update the relevant `docs/*.md` spec first.
4. **Self-Document As You Go**: When making a meaningful design choice or refactor, update the corresponding `docs/` files in the same pull request.

---
