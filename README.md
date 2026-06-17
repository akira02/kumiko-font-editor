<img width="1088" height="362" alt="image" src="https://github.com/user-attachments/assets/725fa628-7af8-4aaf-aae8-0950599abad8" />

# Kumiko Font Editor

Language: English | [繁體中文](README.zh-TW.md)

Kumiko Font Editor is an open-source, browser-based font editor focused on CJK type design. It supports UFO project import, IndexedDB draft storage, and GitHub-based workflows through GitHub OAuth and Cloudflare Pages Functions.

CJK fonts often involve tens of thousands of glyphs, so Kumiko is being built around scalable production workflows: component-aware editing, intelligent component suggestions, and measurable quality checks for large character sets.

## Features

- Import local UFO project folders and parse `.ufo` content into IndexedDB.
- Load UFO projects from GitHub repositories through a Cloudflare Pages Functions archive proxy.
- Sign in with the GitHub OAuth web flow, check the user's fork, list branches, push commits, and open GitHub compare pages for pull requests.
- Edit glyph paths, nodes, and metrics while tracking dirty glyph state.
- Store drafts in browser IndexedDB so projects can be reopened later.

## Local Development

This project uses pnpm 10. The `packageManager` field in `package.json` provides the default Corepack version. `.npmrc` requires pnpm while allowing pnpm 10.x, which avoids large `pnpm-lock.yaml` rewrites from different major versions.

Before your first development session:

```bash
corepack enable
corepack prepare pnpm@10.33.3 --activate
```

If your system has an older pnpm installed through Homebrew or another package manager, it may override the Corepack shim. In that case, prefer `corepack pnpm ...`, or remove/upgrade the old global pnpm installation.

For frontend-only UI development:

```bash
pnpm install
pnpm dev
```

If `pnpm-lock.yaml` receives large formatting changes from an older local pnpm version, check:

```bash
corepack pnpm --version
```

The version should be `10.x`. Do not update dependencies with pnpm 8/9 or other older pnpm versions.

Recommended checks before submitting changes:

```bash
pnpm lint
pnpm build
```

To test GitHub sign-in, GitHub loading, or any `/functions` route, use Cloudflare Pages Functions local mode:

```bash
cp .dev.vars.example .dev.vars
# Edit .dev.vars and fill in values from your GitHub OAuth App
pnpm cf:preview
```

`.dev.vars` requires at least these values:

```bash
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
GITHUB_SESSION_SECRET=...
GITHUB_OAUTH_SCOPE=public_repo read:user user:email
```

`GITHUB_SESSION_SECRET` should be a sufficiently long random string. Functions uses it to sign the GitHub session cookie.

## Project Structure

### Frontend `src/`

- `src/features/home/`: home screen, project import entry points, recent project list, and local UFO / GitHub import flows.
- `src/features/editor/`: overall editor layout composition and feature entry points, such as the three-column editor layout.
- `src/features/editor/canvas/`: main glyph editing canvas, canvas lifecycle, tool shortcuts, clipboard, and text input integration.
- `src/features/editor/leftPanel/`: glyph / component search, preview, and editor-line insertion UI for the left editor panel.
- `src/features/editor/tools/`: editor interaction tools such as pointer, pen, brush, hand, text, and scene controller tools.
- `src/features/fontOverview/`: full font overview, grouping, search, new glyph creation, and overview grid.
- `src/features/common/`: feature-level UI and hooks shared across major features.
- `src/features/common/glyphInspector/`: glyph inspector shared by the editor and overview, including glyph summary, node inspector, metrics, save, and GitHub commit flow.
- `src/canvas/`: low-level canvas controller, scene view, and rendering layers. It should not directly own React UI.
- `src/store/`: Zustand global state, glyph editing data model, and mutation actions.
  - `src/store/index.ts`: store creation, action composition, and temporal undo/redo entry point.
  - `src/store/types.ts`: glyph, font, selection, viewport, and global state types.
  - `src/store/glyphGeometry.ts`: path/node geometry helpers, such as endpoint checks, node lookup, and sidebearing recomputation.
  - `src/store/glyphLayer.ts`: active/archive glyph layer reads and top-level glyph synchronization.
  - `src/store/glyphSearch.ts`: glyph overview/search filtering and IDS dictionary support.
  - `src/store/editorLine.ts`: editor glyph line, cursor, and active glyph index synchronization helpers.
  - `src/store/dirtyState.ts`: dirty/local dirty flag update helpers.
- `src/lib/`: data processing and integration logic shared by multiple features, such as UFO/Glyphs formats, GitHub API, IndexedDB persistence, and export worker clients.
- `src/workers/`: Web Worker entry points for heavier background work such as search and large exports.
- `src/hooks/`: React hooks shared across features.
- `src/icons/`: shared project icon components.
- `src/font/`: glyph path data structures and font-specific helpers.
  - `src/font/fontra-ported/`: pure algorithm modules ported file-by-file from fontra, such as curve fitting and variable font interpolation. See that folder's README and `docs/fontra-parity.md`.
- `src/assets/`: frontend static assets.

### Backend and Public Assets

- `functions/api/github/`: Cloudflare Pages Functions for GitHub OAuth, viewer, repository metadata, archive proxy, fork/commit/merge, and related APIs.
- `public/`: public static files served without bundler processing, such as the manifest, favicon, and Hanseeker data.

### Placement Guidelines

- Add new pages or user flows under the relevant `src/features/<feature>/` folder first.
- Put logic in `src/lib/` only when it is shared across multiple features and owns data processing, external integration, or domain rules.
- Keep feature-internal helpers inside the feature folder. For example, canvas clipboard formats belong in `src/features/editor/canvas/`.
- Put canvas rendering in `src/canvas/`; put editor interaction tools in `src/features/editor/tools/`; React components should not be placed directly in `src/canvas/`.
- Keep global state in `src/store/`. If a feature only needs to shape data for UI, prefer a feature-local hook.

## Data Pipeline Scripts

Scripts under `scripts/` convert external data sources into TSV files under `public/` for runtime fetches. These sources are updated periodically and must be synchronized manually:

| Command                      | Source                                                                                               | Output                                                                                 |
| ---------------------------- | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `pnpm data:glyphdata`        | Glyphs [GlyphData.xml](https://github.com/schriftgestalt/GlyphsInfo) (auto-downloaded, BSD 3-Clause) | `public/glyphsdata/glyphdata.txt`: glyph name / altName -> unicode and production name |
| `pnpm data:ids`              | BabelStone [IDS.TXT](https://www.babelstone.co.uk/CJK/IDS.TXT) (auto-downloaded)                     | `public/ids/ids_babelstone.txt`                                                        |
| `pnpm data:glyphwiki <dump>` | GlyphWiki dump (download `dump_newest_only.txt` manually first)                                      | `public/glyphwiki/composition.txt` and `variants.txt`                                  |

`glyphdata.txt` maps nice names from Glyphs character set lists, such as `leftArrow`, to Unicode and export production names, such as `arrowleft`. CJK ideographs are not covered by that table and are parsed with the `uniXXXX` naming convention. See [docs/glyph-naming.md](docs/glyph-naming.md) for details.

More design decisions and architecture notes are available in [docs/](docs/README.md).

## Relationship to fontra

Kumiko references many ideas from [fontra](https://github.com/googlefonts/fontra), but the technology stack differs enough that it cannot be a direct fork. Kumiko stays as close as practical to a pure frontend React architecture, while fontra uses a Python WebSocket backend. The tracking strategy has three layers: UFO/designspace file-level compatibility, pure algorithm ports into `src/font/fontra-ported/`, and UI/backend tracking without direct adoption. See [docs/fontra-parity.md](docs/fontra-parity.md) for the full strategy, current fontra baseline SHA, and re-sync process.

## Next Steps

- Replace the GitHub token flow with more complete server-side session storage instead of relying only on signed cookies.
- Expand GitHub write-back support for more UFO metadata and non-glyph files.
