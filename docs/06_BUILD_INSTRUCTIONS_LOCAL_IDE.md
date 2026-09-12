# 06: Local IDE Build & Setup Instructions

**Project Codename:** `data-vis`  
**Version:** 1.0.0-rc  
**Status:** APPROVED (Source of Truth)  
**Classification:** Developer Environment Setup, Build Commands & Workflows  

---

## 1. System Prerequisites

Before building `data-vis`, ensure your local development workstation satisfies the following requirements:

### 1.1 Core Toolchains
- **Node.js**: `v18.18.0` or `v20.x` LTS.
- **Package Manager**: `pnpm` (`v9.x`) or `npm` (`v10.x`).
- **Rust Toolchain**: `rustc` and `cargo` $\ge 1.77$ (`rustup default stable`).
- **Python**: `Python 3.11.x` or `3.12.x` with `uv` (recommended) or `poetry`.

### 1.2 OS-Specific Native Dependencies (for Tauri)

#### Linux (Debian / Ubuntu / Pop!_OS)
```bash
sudo apt-get update
sudo apt-get install -y \
  libwebkit2gtk-4.1-dev \
  build-essential \
  curl \
  wget \
  file \
  libssl-dev \
  libgtk-3-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev
```

#### macOS
```bash
xcode-select --install
```

#### Windows
- Install Microsoft C++ Build Tools (via Visual Studio Installer).
- Install WebView2 Runtime (pre-installed on Windows 11).

---

## 2. Repository Layout & Monorepo Structure

```
data-vis/
├── apps/
│   └── desktop/                  # Tauri + React Application Container
│       ├── src/                  # React / TypeScript Presentation Layer
│       ├── src-tauri/            # Rust Desktop Shell & Sidecar Host
│       ├── package.json          # Desktop frontend dependencies
│       └── vite.config.ts        # Vite build & HMR configuration
├── packages/
│   └── backend/                  # Python / FastAPI / Polars Analytical Service
│       ├── api/                  # FastAPI routers and controllers
│       ├── engine/               # Polars lazy evaluation & ingestion engines
│       ├── db/                   # SQLite database & repository layer
│       ├── pyproject.toml        # Backend dependencies & tools configuration
│       └── main.py               # Backend service entrypoint
├── public/
│   └── fonts/                    # Fonts required for the custom look
│       ├── inter/                # Interface
│       ├── jetbrains-mono/       # Code/Technical Values
│       └── source-serif-4/       # Reading/content
|
├── docs/                         # The Bhagwad Gita: Immutable Source of Truth
├── pnpm-workspace.yaml           # Monorepo workspace configuration
└── package.json                  # Root scripts & orchestration
```

---

## 3. Step-by-Step Local Setup

### Step 1: Clone Repository & Install Node Dependencies
```bash
# Clone repository
git clone https://github.com/your-org/data-vis.git
cd data-vis

# Install monorepo frontend dependencies
pnpm install
```

### Step 2: Setup Python Analytical Backend Virtual Environment
```bash
cd packages/backend

# Using uv (fastest):
uv venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
uv pip install -e ".[dev]"

# Or using standard pip:
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"

cd ../..
```

---

## 4. Running Development Servers

### Option A: Complete Desktop Application (Frontend + Tauri Shell + Backend Sidecar)
```bash
# Spawns Python sidecar, Vite dev server, and Tauri window automatically
pnpm tauri dev
```

### Option B: Standalone Web / API Development (Fast Iteration Mode)

**Terminal 1 (Python Analytical Engine):**
```bash
cd packages/backend
source .venv/bin/activate
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

**Terminal 2 (React / Vite Frontend):**
```bash
cd apps/desktop
pnpm dev
# Opens browser at http://localhost:5173 with proxy to backend
```

---

## 5. Verification & Test Commands

### Run Backend Unit & Integration Tests
```bash
cd packages/backend
pytest -v --cov=engine --cov=api
```

### Run Frontend Unit & Component Tests
```bash
cd apps/desktop
pnpm test
```

### Run Linters & Formatters
```bash
# Frontend Linter & Typecheck
cd apps/desktop
pnpm lint
pnpm typecheck

# Backend Linter & Formatter
cd packages/backend
ruff check .
ruff format --check .
```

---

## 6. IDE Configuration & Debugging (VS Code / Cursor)

Recommended `.vscode/launch.json` configuration for integrated debugging:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Backend (FastAPI)",
      "type": "debugpy",
      "request": "launch",
      "module": "uvicorn",
      "args": ["main:app", "--host", "127.0.0.1", "--port", "8000", "--reload"],
      "jinja": true,
      "cwd": "${workspaceFolder}/packages/backend"
    },
    {
      "name": "Debug Frontend (Chrome)",
      "type": "chrome",
      "request": "launch",
      "url": "http://localhost:5173",
      "webRoot": "${workspaceFolder}/apps/desktop/src"
    }
  ]
}
```
