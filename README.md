# Handoff: Location Storyboard App ("The Camino")

## Overview
A location-scouting storyboard tool for film/TV productions. Users import a shooting schedule PDF (exported from the app "Fuzzlecheck"), the app parses INT/EXT, Day/Night, scene number, episode number, country, and address per scene, and presents each scene as an editable card. Cards can be grouped into "location groups" (e.g. all scenes at one hotel), manually or via AI-style suggestions. Includes a map view, multiple grid layouts, CSV/PDF export, sharing (whole board or per-group), and a password-gated project dashboard.

## About the Design Files
The files in this bundle are **design references built in HTML/React (via Babel-in-browser)** — clickable prototypes showing intended look, content, and behavior. They are **not production code to copy directly**. The task is to **recreate these designs in the target codebase's existing environment** (e.g. React + a real backend, or whatever stack the production app uses) using its established patterns, component library, and data layer. If no environment exists yet, choose the framework best suited to the project (this prototype uses React, which is a reasonable default).

## Fidelity
**High-fidelity.** Colors, type, spacing, and copy are final-intent. Recreate pixel-close using the target codebase's design system/tokens where one exists; otherwise the tokens below are the source of truth.

Data is currently all in-memory/sample (`data.jsx`) and photo uploads are stored as base64 data URLs in local component state — none of this persists across reloads except via `localStorage` for the dashboard's custom project list. A real implementation needs a backend: persistent storage for scenes/groups/photos/comments, real auth, real PDF parsing, and real image hosting.

## Screens / Views

### 1. Login (`login.html`)
- Centered card, 380px wide, on a sunk-gray backdrop.
- Logo mark (40px rounded square, dark fill, italic serif "S"), title "Storyboard" (serif, 26px), subtitle.
- Email + password fields, primary dark submit button "Sign in".
- Client-side-only demo auth: password `camino2026` checked in JS, sets `sessionStorage.sb_auth = '1'`, redirects to `dashboard.html`. **Replace with real auth.**
- Error state: red inline banner below the button.

### 2. Dashboard (`dashboard.html`)
- Top bar: logo + "Storyboard" wordmark, right-aligned user email + "Sign out".
- Redirects to `login.html` if `sessionStorage.sb_auth` isn't set.
- Grid of project cards (auto-fill, min 240px): colored cover band with first-letter monogram, name, type badge (Series/Film + season/episode count).
- Seeded project "The Camino" always present and links to `index.html` (the main app).
- "+ New project" dashed card opens a modal: name field + Series/Film type toggle. Created projects are stored in `localStorage.sb_projects` and rendered alongside the seed. Clicking one currently also opens `index.html` (prototype limitation — a real app would scope data per project).

### 3. Main storyboard app (`index.html` + `app.jsx`, `components.jsx`, `modals.jsx`, `data.jsx`)
Redirects to `login.html` if not authenticated (session check at top of `index.html`).

**Shell layout**: CSS grid — 248px sidebar + fluid main area, 56px top bar spanning both columns. `.app { grid-template-columns: 248px 1fr; grid-template-rows: 56px 1fr; height: 100vh; }`

**Top bar** (`.topbar`):
- Brand block: dark 24px rounded-square logo (italic serif "C"), title "The Camino" (italic serif, 22px) + subtitle "Season 1 · 4 episodes" (hidden in Film mode). Logo links to `dashboard.html`.
- View toggle (segmented control): Scenes (grid icon) / Groups (with suggestion-count badge) / Map. Labels collapse to icon-only under 1300px.
- Search input (icon + text + "⌘K" hint, hint hidden under 1180px), max-width 260px, shrinks with min-width 140px.
- Right side: stacked team avatars (colored circles with initials), "Import PDF" button, "Export" button (dropdown: PDF via browser print / CSV download), "Share" button (primary, dark).
- All labels except icons collapse under 1050px to keep the bar usable on narrow viewports.

**Sidebar** (`.sidebar`, scrollable):
- "All scenes" (folder icon + count)
- "Episodes" section (hidden entirely in Film mode) — one row per episode with colored dot + count
- "Countries" section — flag swatch (inline SVG, 16:11) + name + count
- "Location groups" section — "+" button opens `window.prompt` to name a new group; each group row shows a hover-only trash icon to delete (scenes become ungrouped, not deleted); shows a small "N suggested groups" hint when AI suggestions are pending
- "Status" section — one row per status (To scout / Scouted / Locked / Shot) with colored dot + count

**Page head** (`.page-head`): serif page title (38px) that changes based on active filter (episode name+era, country, status, or group name), subtitle, and 3 stat numbers (Scenes / Groups / Locked) in serif 24px.

**Scenes view — layout toggle** (Cards / Gallery / List), all three keep full inline editing, drag-handle reordering, duplicate/delete:
- **Cards** (default): CSS multi-column masonry (`column-count` driven by `--grid-cols` CSS var, 3–5 via Tweaks "Grid density"). Each card:
  - Title bar (`.card-titlebar`, sunk background): drag handle, episode badge "EP n" (hidden in Film mode), "SC" label + editable 2-digit number input, then — wrapping to its own full-width row that grows with content — an editable location-name text input; far right has an "eye" icon (open full detail modal) and a "•••"-style edit icon opening a small menu (Full details / Duplicate / Delete).
  - Photo area: 16:9 aspect. Shows first uploaded photo or a striped placeholder tinted per-country with a text label (interior/room/facade/street/landscape/etc). Group name badge (dark pill, top-left) if grouped. Comment-count pill (top-right) if any comments.
  - Body: INT/EXT dropdown-styled tag + DAY/NIGHT/DUSK dropdown-styled tag (both directly editable, colored per value — blue=INT, green=EXT, warm=DAY, dark=NIGHT, orange=DUSK); editable address text input; editable multi-line description textarea; footer row with editable "SCRIPT DAY" number field (mono, small) and a status `<select>` styled as the colored status pill.
  - Cards with no `group` get a light red background tint (`.card-nogroup`) on both card and title bar, in Cards/Gallery and List layouts alike.
  - **Gallery** layout: same card, larger (`.card-lg` — bumps font sizes), grid capped to 1–2 columns.
  - **List** layout: compact single-row-per-scene table (`.row-item`, CSS grid columns: drag handle, 64px 16:9 thumb, EP, SC, INT/EXT select, DAY/NIGHT select, editable location name, editable address, group name (read-only text), status select, open/duplicate/delete icon buttons). Also gets the red "no group" tint.
- Filter chips above the grid: All / To scout / Scouted / Locked (colored dot + label), plus the layout toggle control on the far right.

**Scene detail modal** (`SceneDetail` in `modals.jsx`, opened via the eye icon or "Full details"):
- Split modal, 980px max-width: left gallery panel (sunk bg), right scrollable info panel.
- Gallery: hero image area (full uploaded photo or placeholder) with INT/EXT + Day/Night tag chips overlaid top-left; hover-visible circular remove button top-right when a real photo is shown; thumbnail strip below (each click sets active photo) plus a dashed "+" add-photo button that opens a native file picker (multi-file, `accept="image/*"`).
  - **Photo handling**: uploaded files are resized client-side via `<canvas>` to a max 2000px longest edge and re-encoded as JPEG quality 0.85 before being stored — keeps file size down while remaining print-sharp on A4. A brief "Optimizing for print…" overlay with a spinner shows during processing.
- Info panel: breadcrumb (EP n · title / Scene NN — episode part hidden in Film mode), editable "SC" number input, editable location-name input styled as a large serif heading (border/background appear on hover/focus only), Duplicate/Delete buttons, status pill + status `<select>`, key-value list (Country w/ flag, Address, a "Open in Maps" link built from `https://www.google.com/maps/search/?api=1&query=<address>`), a row of "group tabs" (pill buttons: "No group", one per existing group, dashed "+ New group" that prompts for a name), a notes textarea (autosaves onBlur), and a comments thread (avatar + name + relative timestamp + text, with an inline add-comment input).

**Groups view** (`GroupsView`):
- "Suggested groups" section (only shown if any pending): each suggestion is a dashed-border row with an "✦" icon, the proposed name, reasoning text + confidence %, and Dismiss / "Create group" buttons.
- "Location groups" section: "+ New group" button (prompts for name). Each group renders as a card: header (drag icon, serif group name, scene count, episode list, "Share group" button which opens the Share modal scoped to just that group's scenes, "Delete" button which unassigns all member scenes and removes the group) — then a responsive strip of mini-thumbnails (each: small placeholder image, location name, "EP n · SC NN · INT/DAY" meta line), clickable to open the scene detail modal.

**Import modal** (`ImportModal`): 3-stage flow —
1. **Drop stage**: dashed dropzone, drag-over highlight, click-to-use-sample fallback, copy explaining detected fields, example chips (INT./EXT./DAY/NIGHT/EP 101/SC 14).
2. **Parsing stage**: spinner + checklist of what's being detected (scene headers/episodes/countries) — simulated 1.4s delay.
3. **Preview stage**: a table of parsed scenes (checkbox to include/exclude, EP·SC, INT/EXT + Day/Night tags, slug + address, country w/ flag, per-row edit icon) and a summary banner (sparkle icon, count breakdown, note that N groups will be suggested after import). If all parsed scenes share one episode and the project isn't already Film mode, a suggestion banner offers "Switch to Film". Footer: Cancel / "Import N scenes" (primary).
- On import, new scenes are appended with status "todo", and a slug-similarity pass proposes new location groups (scenes whose slug text before an em-dash matches ≥2 times).

**Share modal** (`ShareModal`): public link display (readonly input + Copy button, copies to clipboard, shows a toast), permission selector (Can view / Can comment), the team list, "Invite people" and "Done" buttons. When opened from a group's "Share group" button, the modal scopes copy and (in a full implementation) the link/permissions to only that group's scenes — currently the URL string itself doesn't change per-scope in this prototype; wire that up server-side.

**Map view** (`MapView`): two-pane layout — left list of aggregated locations (pin-count badge, city, country + episode), right an inline SVG "map" (hand-drawn stylized landmasses per country, dashed line representing the Camino route Le Puy → Conques, numbered circular pins clustered by rounded coordinate bucket, clicking a pin opens the first scene in that cluster). Coordinates are hardcoded lat/lng → SVG-space projections in a lookup table keyed by place name substrings found in each scene's address — **not a real geocoder**; a production build should use real geocoding + a real map provider (Mapbox/Google Maps JS API) instead of this illustrative placeholder.

**Toast**: bottom-center pill, auto-dismiss after ~2.4s, used for confirmations (group created/deleted, scene duplicated/deleted, comment added, CSV exported, link copied, etc).

**Tweaks panel** (dev-only, via `tweaks-panel.jsx` starter): Theme (Studio/Cinema/Paper — see tokens below), Accent color swatch picker, Production type (Series/Film — toggles all episode-related UI), Grid density (Wide=3 / Standard=4 / Compact=5 columns), "Show address on card" toggle, and buttons to jump straight into the Import/Share flows for demoing. **This panel is a prototype-only affordance; it is not part of the end-user product** — production type and theme should instead be real per-project settings (set at project creation in the dashboard, not a floating dev panel).

## Interactions & Behavior
- **Drag-to-reorder**: native HTML5 drag events on the card/row's drag handle; dropping onto another card reorders the underlying `scenes` array (chronological/shoot order is exactly array order — no separate "day" grouping view exists, by design, since the storyboard itself is meant to already reflect shooting order).
- **Inline editing**: nearly every field (scene number, location name, address, description/notes, INT/EXT, Day/Night/Dusk, script day, status, group assignment) is editable directly on the card/row without opening the modal; the modal duplicates the same edits plus photos/comments.
- **Duplicate**: available both on the card menu and inside the detail modal; inserts an exact copy directly after the source scene in array order, with a fresh id and a copied (non-shared) comments array.
- **Delete**: confirm() dialog before removing a scene or a group.
- **CSV export**: builds a CSV client-side (Episode, Scene, INT/EXT, Day/Night, Location, Address, Country, Status, Group, Script Day, Notes) and triggers a download via an object URL.
- **PDF export**: intended to trigger the browser print dialog (`window.print()`) with print-specific CSS that hides chrome (sidebar/topbar/modals/tweaks) and lays cards out 2-per-row. **This is the area most in need of real engineering**: the ask is for the app itself to suggest a sensible per-A4-page split of scene cards (grouping by location group where it fits, splitting large groups across pages, not leaving awkward single-card orphan pages) rather than relying on the browser's default reflow. The prototype includes an in-progress `computePrintPages(scenesList, perPageSetting)` helper (in `app.jsx`) that packs scenes into pages keeping each location group together where its size allows, splitting only when a group exceeds the page capacity, with a "smart" mode that infers 4/6/9 scenes-per-page from the total scene count — but the print-preview modal that was meant to expose the resulting page breakdown to the user (`showPrint` state, per-page count picker) is only partially wired and should be finished/rebuilt properly in the real implementation, likely rendering true fixed-size A4 pages (assemble a "print document" of `<section>` pages sized to A4 at print resolution, each populated by `computePrintPages`, rather than reflowing the live masonry grid).
- **Theme switching**: sets `data-theme` on `<html>` plus a `--accent` CSS custom property; all colors are defined as CSS variables so a real design-system integration should map its own tokens onto the same variable names (see Design Tokens).
- **Production type (Series/Film)**: toggling hides/shows every episode-related UI element (sidebar Episodes section, EP badges on cards/rows/modal, EP prefix in breadcrumbs and CSV rows, EP filter groupings on the map side list and group headers).

## State Management
All state currently lives in React `useState`/`useMemo` in `App` (`app.jsx`) — no backend, no persistence beyond `localStorage` for the dashboard project list and `sessionStorage` for the login flag. A production build needs:
- `scenes`: array of scene objects (see shape below) — needs a real DB table, keyed by project.
- `groupNames`: array of group name strings independent of scenes (so an empty group can exist) — consider making groups first-class records with an id rather than keying by name string, to survive renames.
- `suggestions`: AI-style group suggestions, currently a hardcoded seed array + a simple slug-prefix-matching heuristic run after PDF import. A real implementation should replace this heuristic with a proper similarity/clustering approach (and probably re-run it against the full scene set on demand, not just against freshly imported scenes).
- `filter` (kind: all/episode/country/status/group + value), `search`, `view` (grid/groups/map), `layout` (cards/large/list) — all safe as client-only UI state.
- `openScene`, modal visibility booleans — client-only.
- Tweaks (`theme`, `accent`, `productionType`, `gridCols`, `showAddressOnCard`) — persisted via the tweaks-panel starter's own localStorage mechanism in the prototype; in production, `productionType` in particular should move to real per-project settings set once at project creation.

### Scene object shape
```js
{
  id: string,
  scene: number,           // scene number, user-editable
  episode: string,         // episode id, e.g. "ep1" — irrelevant/ignored when productionType === "film"
  intExt: "INT" | "EXT",
  dn: "DAY" | "NIGHT" | "DUSK",
  slug: string,            // location name / scene heading
  address: string,         // free text, used to build the Google Maps link and (heuristically) map pins
  status: "todo" | "scouted" | "locked" | "shot",
  group: string | null,    // group name, or null/unassigned
  photoHint: string,       // used only to pick a placeholder illustration/tint when no real photo exists
  photos: string[],        // array of resized base64 JPEG data URLs — replace with real uploaded-image URLs
  notes: string,
  comments: [{ user: string, text: string, ts: string }],  // user is a TEAM member id; ts is currently a display string like "2d" not a real timestamp — store real timestamps and format client-side
  shootDay: string | number | null, // "script day", user-editable, distinct from calendar shoot scheduling
}
```

## Design Tokens
Defined as CSS custom properties in `styles.css`, three theme variants (`:root` = Studio/light default, `[data-theme="cinema"]` = dark, `[data-theme="paper"]` = warm/cream). Recreate as your codebase's token system, or map your existing tokens onto these variable names:

- **Color** — `--bg`, `--bg-elev`, `--bg-sunk`, `--line`, `--line-soft`, `--ink`, `--ink-2/3/4` (text hierarchy), `--accent` (user-selectable via Tweaks; default `#9C6A3F` warm brown), `--accent-soft`, `--danger`, `--success`, `--info`, `--warning` — several defined via `oklch()`.
  - Studio (light): bg `#FAFAF8`, ink `#1B1A17`.
  - Cinema (dark): bg `#0E0E0C`, ink `#F4F2EC`, accent `oklch(0.78 0.14 70)`.
  - Paper (cream): bg `#F1ECDF`, ink `#2A2418`.
  - Scene tag colors: INT = blue family, EXT = green family, DAY = warm/gold, NIGHT = dark indigo, DUSK = orange — each has a light-theme and cinema-theme variant defined via `oklch()`/`rgba()`.
  - Status dot colors: todo = warm orange, scouted = blue, locked = green, shot = near-black/white.
- **Radius** — `--radius-sm` 6px, `--radius` 10px, `--radius-lg` 14px.
- **Shadow** — `--shadow-sm/md/lg`, soft warm-tinted shadows (not pure black).
- **Type** — `--serif` "Instrument Serif" (italic, used for the wordmark/page titles/serif headings), `--sans` "Geist" (UI/body), `--mono` "JetBrains Mono" (scene numbers, tags, addresses-as-code-like accents, CSV-adjacent data). Loaded via Google Fonts in `<head>`.
- Grid density var `--grid-cols` (3/4/5) drives the masonry `column-count`.

## Assets
No external image assets — all "photos" are either user-uploaded (client-resized JPEGs) or CSS-drawn diagonal-stripe placeholders tinted per-country (`PH` palette lookup in `data.jsx`). Country flags are hand-drawn inline SVGs (`data.jsx`: `FLAG_FR`, `FLAG_YU`, `FLAG_NL`, `FLAG_DE`) — simple 3-band rectangles, not licensed assets, safe to keep or replace with a flag icon set. Icons are a custom hand-rolled single-stroke SVG set (`Icon` component in `components.jsx`) — no icon library dependency.

## Files
- `login.html` — standalone password-gate screen (no shared JS with the app; inline `<script>` only).
- `dashboard.html` — standalone project list/create screen (inline JS, reads/writes `localStorage.sb_projects`).
- `index.html` — main app shell; loads React 18 + Babel standalone (UMD, in-browser JSX transpilation — **not how a real app should ship JSX**; production should use a real build step), then `tweaks-panel.jsx`, `data.jsx`, `components.jsx`, `modals.jsx`, `app.jsx` in that order.
- `data.jsx` — sample data: episodes, scenes, AI group suggestions, team members, flags, per-country placeholder palette.
- `components.jsx` — `Icon`, `Placeholder`, `StatusBadge`, `Avatar`, `SceneCard`, `SceneRow`, `SideItem`.
- `modals.jsx` — `SceneDetail`, `ImportModal`, `ShareModal`.
- `app.jsx` — top-level `App` component: layout, all view logic (Grid/Groups/Map), state, mutators, CSV export, Tweaks wiring.
- `styles.css` — all styling, theme variables, print styles.
- `tweaks-panel.jsx` — starter component providing the in-page Tweaks panel shell/protocol (dev tool, not part of the end-user product).
