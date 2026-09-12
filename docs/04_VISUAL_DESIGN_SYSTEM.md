# 04: Visual Design System & UI Specifications

**Project Codename:** `data-vis`  
**Version:** 1.0.0-rc  
**Status:** APPROVED (Source of Truth)  
**Classification:** Design Tokens, Typography, Layout Hierarchy & Charting Guidelines  

---

## 1. Design Principles & Minimalist Aesthetic Philosophy

1. **Functional Minimalism**: The visual interface strictly serves analytical utility. Every UI element, border, badge, and icon must have a direct functional purpose.
2. **Zero Visual Debt**:
   - **No Gratuitous Gradients or Glassmorphism**: Clean, flat, subtle neutral surfaces (`--bg-surface`, `--bg-subtle`).
   - **No Excessive Cards or Nested Containers**: Flat grid canvas with crisp, single-pixel borders (`--border-subtle`).
   - **No Decorative Pills or Badges**: Badges are strictly reserved for critical status indicators (e.g., `Missing File`, `Syncing`, `Filtered`).
   - **No Unnecessary Animations**: Zero bouncy or gratuitous physics. Transitions are instant or crisp $\le 150\text{ ms}$ fades.
3. **High Information Density & Purposeful Spacing**: Designed for analytical productivity. Clean typography, consistent 4px/8px rhythm, and maximum viewport space dedicated to data visualization and grids.
4. **Predictable Workspace Hierarchy**: Consistent workbench layout (Top Nav, Left Sidebar, Central Canvas, Right Inspector, Bottom Status Bar).
5. **Dark & Light Mode Parity**: High-contrast, intentional palettes for both themes with WCAG 2.1 AA compliance ($\ge 4.5:1$ contrast).

---

## 2. Design Tokens & Color Palette

### 2.1 Warm Neutral Palette (Parchment Light & Obsidian Dark)

```css
:root {
  /* Editorial Typographic Tokens */
  --font-ui: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-reading: 'Source Serif 4', Georgia, Cambria, 'Times New Roman', Times, serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', Menia, Consolas, monospace;

  /* Layout Tokens */
  --reading-width: 768px;
  --sidebar-width: 260px;

  /* Warm Neutral Palette -- Light Theme (Parchment & Warm Off-White) */
  --bg-app: #fbf9f5;
  --bg-surface: #f4f0e8;
  --bg-subtle: #eae5db;
  --bg-elevated: #ffffff;

  --text-primary: #1c1917;
  --text-secondary: #57524a;
  --text-muted: #8c857b;

  --border-subtle: #e4decb;
  --border-strong: #d1c8b4;

  --color-accent: #b45309;
  --color-accent-hover: #92400e;
  --color-accent-subtle: #fef3c7;
}

.dark {
  /* Warm Neutral Palette -- Dark Theme (Charcoal & Warm Obsidian) */
  --bg-app: #121110;
  --bg-surface: #1a1816;
  --bg-subtle: #24211e;
  --bg-elevated: #2e2b27;

  --text-primary: #f5f2eb;
  --text-secondary: #b5ad9e;
  --text-muted: #787166;

  --border-subtle: #2d2925;
  --border-strong: #423d37;

  --color-accent: #d97706;
  --color-accent-hover: #f59e0b;
  --color-accent-subtle: #451a03;
}
```

### 2.2 Visualization Color Palettes (Categorical & Sequential)

```javascript
export const chartPalettes = {
  categorical: [
    "#4f46e5", // Indigo
    "#06b6d4", // Cyan
    "#10b981", // Emerald
    "#f59e0b", // Amber
    "#ec4899", // Pink
    "#8b5cf6", // Violet
    "#f97316", // Orange
    "#14b8a6", // Teal
    "#64748b"  // Slate
  ],
  diverging: ["#ef4444", "#f59e0b", "#e2e8f0", "#10b981", "#3b82f6"],
  sequential: ["#e0e7ff", "#a5b4fc", "#6366f1", "#4338ca", "#312e81"]
};
```

### 2.3 Curated Graph Surface Color Presets

To ensure harmonious contrast between the UI chrome and the chart canvases, 10 warm-neutral presets are provided with instant reactive repainting:

#### ☀️ Light Mode Presets
1. **Parchment (Default / Editorial)**: Canvas `#F4F0E8`, Grid `#D6CFC2`
2. **Warm Paper (Warm & balanced editorial)**: Canvas `#F7F4EE`, Grid `#D9D3C8`
3. **Soft Cream (Clean dashboards)**: Canvas `#FAF8F3`, Grid `#DDD8CE`
4. **Warm Gray (More technical)**: Canvas `#F2F0EB`, Grid `#D5D1C9`
5. **Near-White Warm (Minimal UI)**: Canvas `#FCFBF8`, Grid `#E2DED6`

#### 🌙 Dark Mode Presets
1. **Soft Black (Default / Higher contrast)**: Canvas `#181816`, Grid `#34332F`
2. **Warm Charcoal (Warm low-fatigue dark)**: Canvas `#1F1E1B`, Grid `#3A3833`
3. **Deep Brown-Charcoal (Warmer aesthetic)**: Canvas `#211F1C`, Grid `#3C3934`
4. **Warm Slate (Technical dashboards)**: Canvas `#252421`, Grid `#414039`
5. **Deep Parchment-Black (Editorial)**: Canvas `#191817`, Grid `#36332F`

---

## 3. Typography & Spacing System

- **Primary UI Font**: Inter, system-ui, `-apple-system`, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif.
- **Monospace Font (Code & Formulae)**: "JetBrains Mono", "Fira Code", Menlo, Monaco, Consolas, monospace.
- **Scale Hierarchy**:
  - `Display / H1`: `24px` (`font-bold`, tracking tight)
  - `Section / H2`: `18px` (`font-semibold`, tracking tight)
  - `Card Header / H3`: `14px` (`font-semibold`)
  - `Body Text`: `13px` / `14px` (`font-normal`, leading relaxed)
  - `Small / Captions / Badges`: `11px` / `12px` (`font-medium`)

---

## 4. Workspace Layout Hierarchy

The application interface is divided into 5 standard functional areas:

```
+---------------------------------------------------------------------------------------------------+
| Top Navigation Bar (Logo | Active Workspace Title | Undo/Redo | Auto-Save | Theme Toggle | Export) |
+-----------------------+---------------------------------------------------+-----------------------+
| Left Sidebar          | Main Work Area                                    | Right Inspector       |
|                       |                                                   |                       |
| [Datasets Explorer]   | +-----------------------------------------------+ | [Chart Configuration] |
| - Active Datasets     | | Tab Bar: [ Sheet 1 ] [ Sheet 2 ] [ + New Tab ]| | - Chart Type Selector|
| - Columns & Types     | +-----------------------------------------------+ | - X-Axis / Y-Axis     |
| - Null Indicators     | |                                               | | - Color / Size Group  |
|                       | | Grid Canvas / Dashboard View                  | | - Filter Rules Pane |
| [Filters Panel]       | | (Interactive Apache ECharts / Data Table)     | | - Title & Legend    |
| - Quick Filters       | |                                               | |                       |
|                       | +-----------------------------------------------+ |                       |
+-----------------------+---------------------------------------------------+-----------------------+
| Bottom Status Bar (Status Indicator | Polars Query Duration: 14ms | Row Count: 1,245,000 | Port)  |
+---------------------------------------------------------------------------------------------------+
```

---

## 5. Chart Styling & Apache ECharts Guidelines

1. **Responsive Resizing**: All ECharts instances hook into `ResizeObserver` and window resize listeners on parent card containers and detached native popout windows.
2. **Viewport-Confined Tooltips**: All tooltips configure `confine: true` to prevent overlays from clipping beyond canvas boundaries.
3. **Multi-Valued Dimension Exploding**: On-the-fly list unnesting without mutating underlying dataset records.
4. **Animations**: Smooth $300\text{ ms}$ cubic easing for series transitions; disabled during rapid scrub/brush interactions.
5. **Decimation & LOD**: Enable ECharts `large: true` and `sampling: 'lttb'` (Largest Triangle Three Buckets) when series length $> 10,000$ points to guarantee 60 FPS rendering.

---

## 6. Accessibility & Keyboard Shortcuts (WCAG 2.1 AA)

- **Keyboard Focus Rings**: Explicit 2px indigo outline (`focus-visible:ring-2 focus-visible:ring-indigo-500 focus:outline-none`).
- **Global Keybindings**:
  - `Ctrl + O` / `Cmd + O`: Open Ingestion File Picker.
  - `Ctrl + S` / `Cmd + S`: Force Workspace Save.
  - `Ctrl + Z` / `Cmd + Z`: Undo last action.
  - `Ctrl + Shift + Z` / `Cmd + Shift + Z`: Redo last action.
  - `Ctrl + E` / `Cmd + E`: Open Export Dialog.
  - `Ctrl + B` / `Cmd + B`: Toggle Sidebar.
  - `Esc`: Close open modal / cancel active selection.
