# Contributing Guidelines

**Project Codename:** `data-vis` (Data Visualizer)  
**Version:** 1.0.0-rc  
**Status:** APPROVED (Source of Truth)  
**License:** GNU Affero General Public License v3.0 (AGPLv3)  

---

Thank you for contributing to `data-vis`! We welcome contributions from developers, data scientists, researchers, and technical writers.

This document outlines our coding standards, branch strategies, test coverage requirements, pull request workflows, and the governing of this repository.

---

## 1. The Development Directive

All contributors and/or AI pairing agents must strictly adhere to the project's development principles:

1.  **Docs Before Code**: No feature, route, database entity, or component is authored without an approved specification in the `docs/` tree.
2.  **`docs/` is the Single Source of Truth**: The 12 numbered markdown files in `docs/` (`00_PROJECT_OVERVIEW.md` through `11_PRODUCTION_CHECKLIST.md`) define the complete system architecture.
3.  **No Ghost Routes or Dead Functions**:
   - Every API endpoint, UI route, component, and database entity described in `docs/` must exist in code.
   - Every major module in code must appear in `docs/`.
   - If you introduce a new module, update the relevant `docs/*.md` spec first.
4.  **Self-Document As You Go**: When making a meaningful design choice or refactor, update the corresponding `docs/` files in the same pull request.

---

## 2. Monorepo Structure & Package Conventions

Our codebase is organized as a lightweight monorepo:

```
data-vis/
├── apps/
│   └── desktop/                  # Tauri 2.0 native shell + React presentation client
│       ├── src-tauri/            # Rust native desktop shell & IPC sidecar host
│       ├── src/                  # React 18, TypeScript, Tailwind CSS, ECharts UI
│       ├── package.json          # Frontend dependencies
│       └── vite.config.ts        # Vite bundler configuration
├── packages/
│   └── backend/                  # Analytical compute engine & SQLite persistence
│       ├── api/                  # FastAPI routers, controllers, and Pydantic DTOs
│       ├── engine/               # Polars lazy evaluation, ingestion parsers, fingerprinting
│       ├── db/                   # SQLite repositories, WAL configuration & migrations
│       ├── pyproject.toml        # Backend dependencies & tool configurations (Ruff, Pytest)
│       └── main.py               # Local FastAPI service entrypoint
├── public/
│   └── fonts/                    # Fonts required for the custom look
│       ├── inter/                # Interface
│       ├── jetbrains-mono/       # Code/Technical Values
│       └── source-serif-4/       # Reading/content
|
├── docs/                         # The Bhagwad Gita: Immutable Source of Truth
├── pnpm-workspace.yaml           # Monorepo workspace configuration
├── package.json                  # Root orchestration & scripts
├── README.md                     # Project overview & developer quickstart
└── LICENSE                       # GNU Affero General Public License v3.0 (AGPLv3)
```

* **Frontend Edits**: Changes to the UI, canvas grid, ECharts renderers, or Zustand stores belong in `apps/desktop/src/`.
* **Desktop Shell Edits**: Changes to Tauri window management, native dialogs, or sidecar process supervision belong in `apps/desktop/src-tauri/`.
* **Backend Analytical Edits**: Changes to file parsers, Polars queries, SQLite persistence, or FastAPI routers belong in `packages/backend/`.
* **Documentation Edits**: Any architectural or schema updates belong in `docs/`.

---

## 3. Local Development Setup

### 3.1 Prerequisites
- **Node.js**: `v18.18+` or `v20.x` LTS
- **Package Manager**: `pnpm` (`v9.x`)
- **Rust Toolchain**: `cargo` / `rustc` $\ge 1.77$ (`rustup default stable`)
- **Python**: `3.11.x` or `3.12.x` with `uv` (recommended) or `poetry`

### 3.2 Setup Commands
```bash
# 1. Install frontend dependencies
pnpm install

# 2. Setup Python virtual environment
cd packages/backend
uv venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
uv pip install -e ".[dev]"
cd ../..

# 3. Launch Desktop Application in Development Mode
pnpm tauri dev
```

For full setup instructions, see [`docs/06_BUILD_INSTRUCTIONS_LOCAL_IDE.md`](./docs/06_BUILD_INSTRUCTIONS_LOCAL_IDE.md).

---

## 4. Branching & Commit Conventions

### 4.1 Branch Naming
All branches must branch from `main` and use descriptive prefixes:
* `feat/<feature-name>`: New feature or capability (e.g. `feat/parquet-streaming`).
* `fix/<bug-name>`: Bug fix or error resolution (e.g. `fix/excel-sheet-detection`).
* `docs/<topic>`: Documentation updates (e.g. `docs/update-ipc-contracts`).
* `refactor/<module>`: Code restructuring without functional changes (e.g. `refactor/query-compiler`).
* `perf/<area>`: Performance optimizations (e.g. `perf/echarts-lttb-decimation`).
* `chore/<task>`: Dependency or build pipeline updates (e.g. `chore/upgrade-tauri-2`).

### 4.2 Commit Messages (Conventional Commits)
We enforce standard [Conventional Commits](https://www.conventionalcommits.org/):
```
<type>(<scope>): <concise imperative summary>

[optional body describing rationale and context]

[optional footer(s) such as Closes #123]
```

**Allowed Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`.

---

## 5. Coding Standards & Tooling

### 5.1 Frontend (TypeScript & React)
* **Strict TypeScript**: `tsc --noEmit` must pass with zero errors. `any` is strictly prohibited.
* **Component Patterns**: Functional components with explicit prop interfaces; styling via Tailwind CSS utility classes.
* **State Management**: UI state in Zustand (`apps/desktop/src/features/*/store/`), server cache in TanStack Query.
* **Formatting & Linting**: `pnpm lint` (ESLint + Prettier).

### 5.2 Backend (Python & Polars)
* **Linter & Formatter**: `ruff check .` and `ruff format --check .`.
* **Type Annotations**: Strict typing with Pydantic v2 DTOs and complete function type hints.
* **Vectorized Processing**: Avoid Python loops over row data; compose operations via `polars.LazyFrame` expressions.

### 5.3 Rust Desktop Shell
* **Formatting & Linting**: `cargo fmt --check` and `cargo clippy -- -D warnings`.

---

## 6. Testing & Quality Assurance Gates

Every PR must pass automated CI quality gates before merge:

| Area | Suite / Command | Target Coverage |
| :--- | :--- | :--- |
| **Backend Engine** | `pytest -v --cov=engine --cov=api` | $\ge 90\%$ line coverage |
| **Frontend Stores & Utils** | `pnpm test` (Vitest) | $\ge 85\%$ line coverage |
| **UI Components** | `pnpm test` (React Testing Library) | $\ge 80\%$ logical coverage |
| **End-to-End** | `pnpm test:e2e` (Playwright) | Critical user journeys |

---

## 7. Pull Request (PR) Workflow

1. **Fork & Branch**: Create your feature branch from the latest `main`.
2. **Docs Alignment**: Ensure any new or modified feature is documented in `docs/`.
3. **Verify Locally**:
   ```bash
   pnpm lint
   pnpm typecheck
   pnpm test
   cd packages/backend && pytest && ruff check .
   ```
4. **Submit PR**: Fill out the pull request template:
   ```markdown
   ### Summary of Changes
   - Added ...
   - Updated docs in docs/...

   ### Verification
   - Unit & integration tests passing.
   - Verified 60 FPS rendering in local desktop dev environment.

   ### Development Flow Compliance
   - [x] Corresponding documentation updated in docs/
   - [x] No ghost routes or dead functions
   - [x] Zero external network telemetry
   ```
5. **Code Review**: PRs require approval from maintainers and a passing CI build before merging via **Squash and Merge**.

---

## 8. License & IP

By contributing to `data-vis`, you agree that your contributions will be licensed under the project's [GNU Affero General Public License v3.0 (AGPLv3)](./LICENSE).
