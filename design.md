# FEI Design System Reference

This document maps every design token used in this codebase (`fei-shared.css`, `fei-shared.js`, `index.html`) to the canonical FEI Design System token export at `/Users/joseramirez/Documents/FEI/Design System` (W3C DTCG-format `.tokens.json` files exported from Figma variables).

**Source of truth hierarchy:**
1. **Design System tokens** — `Default.tokens.json` (primitives), `Scale/{XS,MD,XL,2XL}.tokens.json` (responsive type/spacing scale), `Semantic/{Light Mode,Dark Mode,Light Mode-Alt}.tokens.json` (semantic color roles). These are authored in Figma and are the canonical values.
2. **Project conventions** — Grid, Elevation/Shadow, Motion/Easing, and Z-Index have **no tokens in the Design System export**. They're formalized here based on actual usage in `fei-shared.css`, so they read as first-class system rules rather than ad hoc code.

This site is desktop-only (1440px reference, no `@media` breakpoints), and its layout is built on the **XL** scale mode (margin-left-right: 80px matches `--margin:80px` exactly).

---

## 1. Grid & Layout

| Property | Value | Notes |
|---|---|---|
| Columns | 12 | `--cols:12` |
| Gutter | 32px | `--gutter:32px`, matches Scale/Gap `g-32` |
| Margin (page edge) | 80px | `--margin:80px`, matches Scale(XL)/Margin `margin-left-right:80` |
| Max content width (inner, 12-col) | **1521px** | canonical grid width — 1520px inner content area (rounds to 1521 per current spec) |
| Max width (full-bleed, inner + margins) | 1680px | `--max-w:1680px` = 1521 + 2×80(≈1681, current code uses 1680 — 1px rounding, treat 1521 as canonical) |

**Fluid viewport helpers** (kept in sync with real viewport width by JS, so calc() math doesn't drift from the scrollbar-exclusive width):

```
--vpw      : true viewport width (100vw fallback, JS-synced)
--page-w   : min(vpw, max-w)                      — the page never exceeds max-w
--edge     : (vpw - page-w) / 2                   — dead space beyond max-w (full-bleed zone)
--inner    : page-w - 2 * margin                  — usable 12-col content width
--gl-step  : (inner + gutter) / 3                 — exposed grid-line spacing (thirds, not twelfths)
--colw     : (inner - 11 * gutter) / 12            — single column width
--col3     : 3 * colw + 2 * gutter                 — 3-col block (≈296px @1440, used for title columns)
```

Column content starts at `var(--edge) + var(--margin)` from the viewport edge and ends at the mirrored position on the right.

---

## 2. Color

### 2.1 Primitives

Project variable → hex → matched Design System token. Exact matches are unmarked; approximate/best-effort matches are marked **≈**.

| Project var | Hex / value | Design System token |
|---|---|---|
| `--oxford-blue` | `#000E29` | Primary/Oxford Blue |
| `--cobalt-blue` | `#233C98` | Primary/Cobalt Blue |
| `--bright-cobalt` | `#2E56E5` | Digital-Brand/Cobalt-Electric |
| `--light-sky-blue` | `#B8DEEF` | Primary/Light Sky Blue |
| `--cyan` | `#00EEFF` | Digital-Vibrant/Cyan |
| `--white` | `#FFFFFF` | Neutral/White |
| `--gray-10` | `#EBEFF1` | Neutral/Gray 10 |
| `--light-5` | `rgba(255,255,255,.05)` | Neutral/Opacity/Light 5 |
| `--light-10` | `rgba(255,255,255,.10)` | Neutral/Opacity/Light 10 |
| `--light-30` | `rgba(255,255,255,.30)` | Neutral/Opacity/Light 30 |
| `--steel-blue` | `#DFE9F0` | Digital-Brand/Steel Blue - Base |
| `--steel-blue-dark` | `#A5BBCB` | Digital-Brand/Steel Blue - Dark |
| `--beige` | `#E8E6DF` | Digital-Brand/Beige |
| `--mid-blue-gray` | `#93AEC1` | **≈** Digital-Brand/Steel Blue - Dark (`#A5BBCB`) — closest primitive; project value is a custom shade between Steel Blue Dark and Medium |
| `--text-blue-gray` | `#626B7F` | **≈** Neutral/Gray 70 (`#505050`) by luminance, but hue-shifted blue — no primitive matches closely; effectively a custom tint |
| `--dash-dark-card` | `#162035` | Digital-Brand/Steel Blue - XDark; also equals Semantic Component/Fund Card `fund-card-fill` (both modes) |
| `--dash-light-card` | `#F5F7F8` | Digital-Brand/Steel Blue - XLight |
| `--dash-hairline` | `#CCD6E8` | Digital-Brand/Steel Blue - Medium |
| `--text-primary` | `#212121` | Neutral/Gray 90 |
| `--text-secondary` | `#505050` | Neutral/Gray 70 |
| `--text-inversed` | `#EBEFF1` | Neutral/Gray 10 |
| `--border-secondary` | `#C8C8C8` | Neutral/Gray 20 |

**Inline one-off colors** (not tokenized as CSS variables, used directly in component rules):

| Hex | Used for | Design System match |
|---|---|---|
| `#4DDB87` | up-arrow / positive change | Status/Light Green — exact |
| `#FF6B6B` | down-arrow / negative change | Status/Light Red — exact |
| `#1b2740` | `.fund-card:hover` background | **≈** Digital-Brand/Steel Blue-XDark (`#162035`) lightened; also close to Fund Card `fund-card-fill-hover` (`#080D52`) but not exact |
| `#dde5fd` | utility card bg, footer link chips | Primary/Light Blue — exact |
| `#24304a` | social icon border | **≈** between Steel Blue-XDark and Cobalt Blue — no exact primitive |
| `#8c93a3` | misc secondary text | **≈** Neutral/Gray 60 region — no exact primitive |
| `#000a1e` / `#000715` | footer/gradient darkening | **≈** darker than Oxford Blue, no primitive this dark exists |

### 2.2 Semantic (Light / Dark Mode)

The site is primarily dark-themed (oxford-blue backgrounds) but several sections (`#insights-grid`, `#utility`, `#recent-insights`) use a white/light surface — both semantic modes are actively in use.

| Role | Light Mode | Dark Mode | Where used in project |
|---|---|---|---|
| Surface/primary | `#FFFFFF` | `#000E29` | page background (dark), white sections (light) |
| Surface/secondary | `#F5F7F8` | `#162035` | search inputs (light: `--dash-light-card`), cards (dark: `--dash-dark-card`) |
| Surface/action | `#2E56E5` | `#2E56E5` | `.btn` primary buttons — matches `--bright-cobalt` in both modes |
| Foreground/primary | `#000E29` | `#FFFFFF` | body text on light bg / white text on dark bg |
| Foreground/secondary | `#464646` | `#A5BBCB` | secondary text — dark mode matches `--steel-blue-dark` |
| Foreground/accent | `#233C98` | `#00EEFF` | dark-mode accent matches `--cyan` (used for eyebrow/mono tags) |
| Border/primary | `#A5BBCB` | `rgba(255,255,255,.10)` | dark mode is an **exact match** to `--light-10`, used as the standard hairline/divider across the site |
| Feedback/success | `#007A35` | `#4DDB87` | dark mode exact match to our up-arrow green |
| Feedback/error | `#E02200` | `#FF6B6B` | dark mode exact match to our down-arrow red |
| Interactive/Primary/fill | `#2E56E5` | `#2E56E5` | exact match to `--bright-cobalt`, used on all `.btn` |
| Interactive/Primary/fill-hover | `#233C98` | `#233C98` | exact match to `--cobalt-blue` |
| Component/Fund Card/fund-card-fill | `#162035` | `#162035` | exact match to `--dash-dark-card` |
| Component/Fund Card/fund-card-border | `rgba(255,255,255,.05)` | `rgba(255,255,255,.05)` | exact match to `--light-5`, used on `.fund-card{border:1px solid var(--light-5)}` |
| Data Visualization/chart-1 | `#00EEFF` | `#00EEFF` | matches `--cyan` |

---

## 3. Typography

### 3.1 Families & weights

| Token | Family | Project var | Semantic usage |
|---|---|---|---|
| Font/Font Family/Headings | FEChivoAir | `--font-air` | **In this project:** display/numeric only — hero title (100px), stat numbers, `.of-copy-title`, quote blocks. Not used for standard headings, despite the "Headings" name in the token system. |
| Font/Font Family/Body | FEChivoWater | `--font-water` | Body copy, section headings (`.section-title`), buttons, eyebrows, nav — the dominant font across the site |
| Font/Font Family/Mono | Chivo Mono | `--font-mono` | Small uppercase labels/eyebrows/tags: `.pt-th`, `.fund-eyebrow`, `.utility-nav`, `.sheet-col h5` |
| Font Weight/regular | 400 | — | body text |
| Font Weight/bold | 700 | — | headings, buttons, emphasis |

> **Naming deviation:** the Design System labels the Air family "Headings," but this project uses Water for nearly all headings/titles and reserves Air strictly for big display numbers. Flagged for design/eng alignment — not changed in code as part of this doc.

### 3.2 Type scale (Scale/XL mode — matches this project's desktop reference)

| Token | Size (px) | Closest project usage |
|---|---|---|
| Display/display-1 | 100 | `.hero-title`, `.stat-num`, `.btn-stat .value` (`--font-air`) |
| Headline/headline-1 | 64 | `.of-copy-title` (`--font-air`) |
| Headline/headline-2 | 48 | `.section-title` (`--font-water`) |
| Headline/headline-3 | 32 | — |
| Headline/headline-4 | 24 | `.fund-name`, `.ig-card-title`, `.team-name` |
| Body/body-xl | 24 | — |
| Body/body-lg | 18 | **Default `.body` size site-wide** — use unless a section explicitly calls for another size; `.of-copy .body`, `.ig-card-link` |
| Body/body-md | 16 | smaller body copy, used where noted (not the default) |
| Body/body-sm | 14 | `.sheet-col a` (nav), small labels |
| Body/body-xs | 12 | `.pt-th` (table headers) |
| Numeric/numeric-large | 100 | (Air family; overlaps Display/display-1 at XL) |
| Numeric/numeric-medium | 56 | — |
| Numeric/numeric-small | 32 | `.fund-ticker` |
| Utility/eyebrow-lg | 14 | `.fund-eyebrow`, `.eyebrow` |
| Utility/eyebrow-sm | 12 | `.utility-nav`, `.sheet-col h5` |
| UI/button | 16 | `.btn` |

Full 4-mode responsive scale (XS/MD/XL/2XL), for reference if the site ever adds breakpoints:

| Token | XS | MD | XL | 2XL |
|---|---|---|---|---|
| display-1 | 64 | 88 | 100 | 100 |
| headline-1 | 40 | 48 | 64 | 64 |
| headline-2 | 32 | 40 | 48 | 48 |
| headline-3 | 24 | 28 | 32 | 32 |
| headline-4 | 24 | 24 | 24 | 24 |
| body-xl | 18 | 20 | 24 | 24 |
| body-lg | 18 | 18 | 18 | 18 |
| body-md | 16 | 16 | 16 | 16 |
| body-sm | 14 | 14 | 14 | 14 |
| body-xs | 12 | 12 | 12 | 12 |
| numeric-large | 64 | 88 | 100 | 100 |
| numeric-medium | 44 | 48 | 56 | 56 |
| numeric-small | 24 | 28 | 32 | 32 |
| eyebrow-lg | 14 | 14 | 14 | 14 |
| eyebrow-sm | 12 | 12 | 12 | 12 |
| UI/button | 16 | 16 | 16 | 16 |

The project's global `--ts:1` multiplier (`calc(Npx * var(--ts))` on every font-size) is a scale-toggle convenience layered on top of these values — not part of the Design System itself.

---

## 4. Spacing

### 4.1 Design System scale (canonical)

| Token | Value (px) |
|---|---|
| p-0 / g-0 | 0 |
| p-4 / g-4 | 4 |
| p-8 / g-8 | 8 |
| p-12 / g-12 | 12 |
| p-16 / g-16 | 16 |
| p-24 / g-24 | 24 |
| p-32 / g-32 | 32 |
| p-40 | 40 |
| p-48 | 48 |
| p-56 | 56 |
| p-64 | 64 |
| p-80 | 80 |
| p-96 | 96 |
| p-112 | 112 |

(Gap stops at `g-32`; larger gaps should fall back to the Padding scale value.)

Margin tokens (Scale/XL, matching this project): `margin-left-right: 80px` (= `--margin`), `margin-top-bottom: 64px`, `margin-top-bottom-lg: 112px`.

### 4.2 Project usage

The 8-based scale above (8/16/24/32/48/56/64/80) accounts for the overwhelming majority of gaps and component padding in `fei-shared.css` (buttons: `12px 16px`; cards: `24px`/`32px`; section gaps: `32px`/`64px`).

A separate class of values — **11, 17, 23, 25, 26, 29, 34, 36, 44, 52, 87, 91, 96px** — appears in absolutely-positioned section layout (e.g. hero `padding-top:91px`, `.mv-title{top:106px}`, `.ut-row{padding-top:17px}`). These are **not part of the spacing scale** — they're exact pixel offsets derived from the Figma layout and should be treated as layout-specific positioning, not reusable spacing tokens.

---

## 5. Border Radius & Stroke

### 5.1 Design System scale

| Token | Value (px) |
|---|---|
| rounded-none | 0 |
| rounded-sm | 4 |
| rounded-md | 8 |
| rounded-lg | 12 |
| rounded-xl | 32 (XS) / 48 (MD) / **64 (XL, 2XL)** |
| rounded-full | 9999 |
| stroke-1 | 1 |
| stroke-2 | 2 |
| stroke-3 | 3 |

At this project's XL scale mode, `rounded-xl = 64px` — this is the exact value already used for the site's signature "scoop corner" component convention below.

### 5.2 Project usage

| Radius | Used for |
|---|---|
| `rounded-sm` (4px) | `.btn`, `.input-field`, `of-search-box`, `.sheet-rail button` |
| `rounded-md` (8px) | `.mv-frame`, `.pt-inner`, `.fund-card`, `.team-card`, `.ig-card`, `.ut-card` |
| `rounded-full` (9999px) | `.mv-play`, `.mv-dot` (pills/circles) |
| **Scoop corner** (project convention) | `8px 8px 64px 8px` — one corner scooped to `rounded-xl` (64px) while the rest stay `rounded-md`. Used on `.mv-subscribe`, `.ct-card`, `.ri4-panel.expanded`. Also used as a hover-only transition: `.team-card:hover{border-bottom-right-radius:64px}` |

---

## 6. Elevation / Shadow

**No shadow tokens exist in the Design System export.** The project currently has exactly two shadow values in use; formalized here as a 2-step scale so future components have something to reach for instead of inventing new one-offs:

| Name | Value | Used for |
|---|---|---|
| `shadow-sm` | `0 1px 3px rgba(0,14,41,0.2)` | `.sheet-brief-cta` (small, subtle lift on nav CTA) |
| `shadow-md` | `0 16px 36px rgba(0,14,41,0.22)` | `.ri2-card` (large card lift) |

Both use Oxford Blue (`#000E29`) as the shadow color at low opacity, consistent with the site's cool, dark palette — new shadows should follow this same tint rather than a neutral black.

---

## 7. Motion & Easing

**No motion tokens exist in the Design System export.** Formalized from actual usage:

| Token | Value | Usage |
|---|---|---|
| `--ease-out` | `cubic-bezier(0.16, 1, 0.3, 1)` | The **single** easing curve used site-wide — buttons, cards, arrows, opacity/filter fades, panel expand/collapse. Do not introduce other easing curves without reason. |

**Duration scale** (derived from the actual spread of durations in use — .15s through .65s), organized into three tiers:

| Tier | Duration | Used for |
|---|---|---|
| `duration-fast` | ~0.2s | Micro-interactions: icon opacity/transform on hover, arrow nudges, small fades |
| `duration-base` | ~0.3s–0.4s | Standard transitions: card hover backgrounds, corner-radius morphs, dropdown reveals |
| `duration-slow` | ~0.5s–0.65s | Larger state changes: panel/height expand-collapse, carousel slide transitions |

GSAP-driven timeline sequences (e.g. product ticker expand/collapse) compose multiple tiers together rather than using one flat duration for the whole sequence.

**Arrow hover convention (global):** Any inline arrow icon (`<svg>` trailing a link or button label) must translate right `4px` on hover. Always pair `transform` with `color` in the same transition, both at `duration-fast` (0.2s) with `--ease-out`. Example:

```css
.my-link svg { transition: color .2s var(--ease-out), transform .2s var(--ease-out); }
.my-link:hover svg { color: var(--cyan); transform: translateX(4px); }
```

---

## 8. Z-Index

**No z-index tokens exist in the Design System export.** The project uses two independent layering systems — global (header/nav, values 60–70) and local-per-section (values 0–4, reused fresh inside each section since sections don't overlap each other except via the sticky funds background). Formalized here:

### 8.1 Global layers

| Layer | z-index | Purpose |
|---|---|---|
| `z-base` | 0 / 1 | `#topo-bg` canvas (0), `main` content (1) |
| `z-nav-overlay` | 60 | `#nav-overlay` scrim behind the nav sheet |
| `z-nav-sheet` | 61 | `#nav-sheet` mega-menu panel |
| `z-header` | 70 | `#site-header` sticky header, always on top |

### 8.2 Local section layers (repeated pattern within each section)

| Layer | z-index | Purpose |
|---|---|---|
| `z-sticky-bg` | 1 | The sticky `#our-funds` video background section itself |
| `z-cover-content` | 2 | Every section after `#our-funds` (`#recent-insights`, `#teams`, `#insights-grid`, `#utility`, `#why-fei`, `#by-the-numbers`, `#contact`, `#site-footer`) — must sit above the sticky background as the page scrolls past it |
| `z-grid-lines` | 3 | Decorative grid-line overlays within a section, above its background but below foreground content |
| `z-foreground` | 4 | Section title/copy/interactive content, above grid lines |

---

## 9. Icon Sizes

| Token | Value (px) | Project usage |
|---|---|---|
| icon-sm | 16 | Text-link trailing arrows (`.ig-card-link svg`), chevrons |
| icon-md | 24 | Standard button/nav icons, `.fund-link-arrow` variants |
| icon-lg | 32 | `.fund-card svg`, larger decorative icons |

Project icon sizes in actual use: 16, 20, 24, 28, 32px — 20px and 28px fall between the official sm/md and md/lg steps and should be reconciled toward the nearest official size where practical.

---

## 10. Needs Reconciliation

Values that could only be given a best-effort/approximate match (no exact primitive exists) — flagged for design/eng follow-up:

| Project value | Best-effort match | Gap |
|---|---|---|
| `--mid-blue-gray` `#93AEC1` | Digital-Brand/Steel Blue - Dark `#A5BBCB` | Close but not exact; may be an intentional custom tint or a drift from an older palette revision |
| `--text-blue-gray` `#626B7F` | No close primitive | Blue-shifted gray with no primitive counterpart |
| `#1b2740` (`.fund-card:hover` bg) | Fund Card `fund-card-fill-hover` `#080D52` | Project hover color is noticeably lighter than the token's specified hover fill |
| `#24304a` (social icon border) | — | No primitive within reasonable visual distance |
| `#8c93a3` (misc secondary text) | Neutral/Gray 60 region | No exact primitive at this specific hue |
| `#000a1e` / `#000715` (footer/gradient darks) | — | Darker than Oxford Blue; no primitive exists at this luminance |
| Font family "Headings" = Air | Project uses Water for headings | Naming/usage convention mismatch between token system and actual site typography |
| Icon sizes 20px, 28px | icon-md (24), icon-lg (32) | Fall between official steps |

---

## 11. Component Spacing Rule

**Card padding and internal spacing must always match the Figma component exactly.**

When implementing or updating any card component, fetch the Figma node with `get_design_context` and use the exact padding, gap, border-radius, and border values — never approximate or reuse values from a similar component. This applies to fund cards, video cards, insight cards, and any other card-based component.

Current fund card spec (node `3475:94056`):
- `padding: 25px`
- `gap: 24px` (between copy block and arrow)
- `background: #162035`
- `border: 1px solid rgba(255,255,255,0.05)`
- `border-radius: 8px`
