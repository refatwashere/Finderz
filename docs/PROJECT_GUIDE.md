# Finderz Project Guide

## Purpose and Product Boundaries

Finderz helps people explore moving-image catalogs from one desk. A user searches by title, catalog code, or genre; reviews public metadata; learns from local like/pass marks; saves finds; and dispatches a search to selected external sites.

The app does not stream or host media, verify subscription access, or report where a title is currently available. Dispatch destinations are search links, not integrated availability APIs. X is treated as an outbound video search plus optional public-post pinning; Finderz does not scrape an X feed.

## User Flow

1. The user enters a title, catalog code, or genre and starts a hunt.
2. The browser calls the `huntCatalog` server function. It validates the input and queries five public catalog APIs concurrently.
3. Results are ranked against the query and local taste marks, then duplicate title/year pairs are removed.
4. Each result links to its catalog page and generates searches for enabled non-catalog destinations. The dispatch strip also exposes enabled sources for the overall hunt.
5. A user can mark a result as Taste or Pass, file it locally, request an optional AI brief, or search for matching X video posts.
6. A public X post can be pinned by URL. Public embed metadata is kept in the same local file as saved finds.

## Architecture

### Application shell and route

- `src/router.tsx` creates the TanStack Router and registers the shared error component.
- `src/routes/__root.tsx` provides document metadata, styles, providers, toast notifications, the preview bridge, and the single-page shell.
- `src/routes/index.tsx` renders `Desk`, the only product route in this project.
- `src/components/finderz/` contains the discovery desk, result cards, source settings, saved file, and X lane.
- `src/components/ui/` contains the reusable Radix-based controls used by those screens.

### Discovery and server functions

`src/lib/finderz/hunt.ts` owns the catalog requests and the `huntCatalog`, `embedXPost`, and `briefFind` server functions. Catalog calls use public HTTPS APIs, run concurrently, and have an eight-second timeout. The server function validates inputs before requests are made. Provider failures are handled independently so one unavailable service need not prevent results from other services. JAVINFO is queried only when the adult-results switch is enabled and `JAVINFO_API_KEY` is configured.

The catalog adapters currently map:

| Provider | Data queried | Notes |
| --- | --- | --- |
| Apple Search API | Movies, TV seasons, and music videos | Requests US catalog results; explicit items are excluded. |
| AniList GraphQL | Anime, including anime films | Numeric codes can be interpreted as AniList IDs. |
| TVMaze | TV show search | A title-oriented series source. |
| Internet Archive Advanced Search | Movie media records | Results are filtered by title-token overlap. |
| Wikipedia search and page summaries | Film and television-related pages | Text is heuristically filtered to keep likely moving-image entries. |
| JAVINFO `/query` | JAV release metadata | Optional; requires server-side `JAVINFO_API_KEY`. Only titles, codes, release years, covers, and HTTPS catalog-page links are mapped; stream/download fields are ignored. |

`src/lib/finderz/types.ts` defines the normalized `Find`, `Source`, and saved-state types. Adding a catalog provider requires a provider type, an adapter and normalization in `hunt.ts`, sensible result metadata, failure behavior, and tests. A user-created source is different: it only adds a search destination and does not add a new catalog API.

### Ranking

`src/lib/finderz/rank.ts` excludes passed IDs, scores title affinity, the selected genre, accumulated genre taste, likes, and metadata completeness, applies provider/kind adjustments, sorts by score, and removes duplicate lowercase title/year pairs. These are heuristic priorities, not editorial recommendations or a learned model. The saved genre marks and IDs are local to the current browser profile.

### Sources and dispatch

`src/lib/finderz/sources.ts` defines built-in sources and URL interpolation. Built-in catalog sources are Apple TV, AniList, and Internet Archive; other built-ins dispatch to sites such as YouTube, Vimeo, Letterboxd, IMDb, JustWatch, and X. Result cards dispatch to enabled non-catalog sources. The overall dispatch strip can include all enabled sources.

Custom templates must resolve to HTTPS URLs containing `{q}` or `{id}`. The source form automatically adds `https://` when a scheme is omitted. Supported placeholders are `{q}`, `{id}`, `{genre}`, and `{year}`. Values are URL-encoded. Custom templates are destinations chosen by the user; they are not fetched by Finderz as catalog providers.

### Browser state and persistence

`src/lib/finderz/store.ts` uses Zustand with its persistence middleware and the storage key `finderz-desk`. On first load after the rename, it copies the previous `kestrel-desk` browser-storage value to the new key and removes the old key after the copy succeeds.

Persisted in the browser profile:

- Enabled/disabled and custom sources
- Taste marks and accumulated genre weights
- Saved finds
- Pinned X post metadata

Not persisted across reloads:

- The latest query and its catalog results

There is no Finderz account requirement, cross-device synchronization, or Finderz server-side database for this feature set. Clearing browser site data removes the saved local file and preferences. The shell's app-builder auth/database helpers are separate infrastructure; do not describe them as Finderz account or sync functionality unless the product is changed to use them.

### Optional AI brief

`briefFind` runs on the server and calls xAI's chat-completions API using `grok-4.5` when `XAI_API_KEY` is configured. The user explicitly requests a brief from a result card. The server sends title, year, kind, and synopsis and asks for a short, spoiler-conscious response. The key must remain server-only. Requests can consume the deployment owner's API quota; add an explicit disclosure and suitable rate/cost controls before broad or public deployment.

## Privacy and External Services

- Search terms and selected genre/code are sent from the server to the relevant catalog providers. Their availability, terms, rate limits, and returned content are outside Finderz's control.
- When enabled, title/code searches are also sent to JAVINFO. Its published `/query` endpoint costs $0.0004 per successful call and is rate-limited per account. JAVINFO returns adult-catalog metadata; its Finderz switch is opt-in and off by default. The integration does not expose stream, torrent, or download fields.
- Outbound destination links open third-party sites in a new tab. Those sites receive the search query when opened.
- Saved finds, source preferences, taste marks, and X pins are held in browser local storage, not encrypted or synced by Finderz. Anyone with access to the same browser profile may see them.
- When AI briefs are enabled and requested, the selected catalog metadata is sent to xAI. The API key belongs to the deployment environment and its usage may be billable.
- X pinning validates an X/Twitter status URL and asks the public oEmbed endpoint for author and text metadata. It does not retrieve or store video content.

## Design and Interaction Notes

The interface is an editorial-style, dark discovery desk: a persistent source/file toolbar, a focused hunt form, ranked result rows, and contextual source dispatch. Figtree is used for interface text and Newsreader for display headings. The layout moves from a two-column desk to a single column on smaller screens, and result entrances respect reduced-motion preferences.

Maintain the distinction between catalog evidence and external discovery links in future UI changes. Label catalog sources, search destinations, and any claimed viewing availability separately. Keep the saved-file workflow usable without accounts, and make the local-only persistence boundary visible wherever users might assume cross-device saving.

## Development and Operations

### Requirements and commands

Use Node.js 22 and the checked-in `package-lock.json`:

```sh
npm ci
npm run dev
```

The development server uses port `8080` and is launched through `scripts/with-app-env.mjs`. Avoid invoking Vite directly; the wrapper applies the app-builder environment. The root `startup.sh` is a platform revive hook, not the general Windows development entry point.

| Command | Purpose |
| --- | --- |
| `npm test` | Runs Node tests for scripts and the app-data/auth helper tests. |
| `npm run typecheck` | Runs TypeScript with no output. |
| `npm run lint` | Runs ESLint over the project. |
| `npm run build` | Builds the Vite/TanStack app, then runs `db:migrate`. |
| `npm run preview:restart` | Restarts the repository's built-output preview helper. |
| `npm run preview:stop` | Stops that built-output preview helper. |

The project has a Vercel Nitro preset in `vite.config.ts`. A successful local build does not by itself configure a deployment; deployment variables and platform setup must be managed separately.

### Important platform-owned files

The app-builder shell depends on `public/__grok/`, `server/`, `scripts/grok-pwa-*`, the preview bridge, and the existing Vite plugins. Do not remove or replace these while documenting or extending Finderz. The root `AGENTS.md` is the authoritative workspace-specific instruction file.

## Current Limitations

- Catalog quality and uptime vary by provider; results are not authoritative availability data.
- Provider response handling is deliberately tolerant, but a missing provider may not be obvious when other sources return results.
- Result deduplication uses normalized title and year only; alternate spellings and provider-specific IDs may still produce duplicates.
- Taste marks and saved items have no export/import, cross-device sync, or server backup.
- Genre support varies among catalog providers; some providers mainly receive the query text rather than a structured genre filter.
- Optional AI briefs have no app-level usage meter or rate limit in the current implementation.

## Enhancement Advice

These are recommendations, not completed features. They are also listed as proposed work in [the task log](../TASK_LOG.md).

For live hosting setup, environment variables, deploy verification, and rollback procedures, see the [deployment guide](DEPLOYMENT.md).

| Priority | Recommendation | Why it fits Finderz |
| --- | --- | --- |
| High | Return per-provider status and show partial failures, timeouts, and empty results distinctly. | Makes a quiet upstream outage distinguishable from a genuine no-match hunt. |
| High | Add disclosure and server-side rate/cost controls for AI briefs. | Keeps the optional, owner-funded xAI feature predictable if the app becomes public. |
| Medium | Add local export/import and a clear local-data reset action. | Preserves the no-account design while reducing the risk of losing a user's file. |
| Medium | Expand focused tests for adapter normalization, ranking, duplicate handling, and URL templates. | Protects the central value of Finderz: useful, trustworthy discovery across uneven sources. |
| Medium | Make source setup testable with a generated preview link and clearer template validation errors. | Helps users configure their own discovery sites without claiming those sites are catalog integrations. |

Keep availability claims modest unless a dedicated availability API is integrated. For future design work, prioritize source/result trust cues, keyboard access through the sheets and chip controls, and an explicit explanation of which actions leave the browser.

## Project Maintainer

**Robiul Islam Refat**

- GitHub: [github.com/refatwashere](https://www.github.com/refatwashere)
- Email: [rbl.islam.refat2@gmail.com](mailto:rbl.islam.refat2@gmail.com)
- Website: [refatishere.free.nf](https://www.refatishere.free.nf/)