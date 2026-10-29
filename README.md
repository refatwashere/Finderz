# Finderz

Finderz is a video discovery desk for finding films, series, anime, and public-domain or freely circulated moving images. Search public catalogs, rank the results against local taste signals, and open the same title across the sites you choose. It is a discovery tool, not a streaming service or an availability checker.

## What It Does

- Searches Apple, AniList, TVMaze, the Internet Archive, and Wikipedia in parallel.
- Accepts a title, a catalog code, and an optional genre.
- Ranks and deduplicates results using title similarity, genre preference, saved taste marks, and available metadata.
- Opens results in enabled destinations such as YouTube, Vimeo, Letterboxd, IMDb, JustWatch, and X video search.
- Lets you add HTTPS search templates for other sites. Templates can use `{q}`, `{id}`, `{genre}`, and `{year}`.
- Stores enabled sources, taste marks, saved finds, and pinned X posts in this browser profile. Nothing is synchronized between devices.
- Can request an optional spoiler-conscious, two-sentence brief for a result when the server has `XAI_API_KEY` configured.

X search is an outbound search link, not a feed or scraper. Pinning a post reads public embed metadata from X; it does not download the video.

## Development

Requirements: Node.js 22 and npm. Install the lockfile dependencies and start the development server:

```sh
npm ci
npm run dev
```

The Vite server is configured for port `8080`. The `dev` script runs through `scripts/with-app-env.mjs`; use the npm script rather than invoking Vite directly so the app-builder environment is applied consistently.

No API key is required for catalog searches. To enable optional AI briefs, provide `XAI_API_KEY` to the server environment. Keep it server-side; never expose it through a `VITE_` variable or commit it. Each brief is a user-triggered request to xAI and includes the result title, year, kind, and synopsis. See [the project guide](docs/PROJECT_GUIDE.md#privacy-and-external-services) before enabling it in a deployed environment.

## Quality Checks

```sh
npm test
npm run typecheck
npm run lint
npm run build
```

`npm run build` builds the app and then runs the database migration script. Finderz's discovery and saved-file features do not use a server database; the repository also contains app-builder authentication/database infrastructure. See [the project guide](docs/PROJECT_GUIDE.md#architecture) for that boundary and the code map.

## Documentation

- [Project guide](docs/PROJECT_GUIDE.md): architecture, data flow, providers, state, operations, limitations, and prioritized enhancement advice.
- [Task log](TASK_LOG.md): completed work, proposed work, and a maintained tally.

## Developer

**Robiul Islam Refat**

- GitHub: [github.com/refatwashere](https://www.github.com/refatwashere)
- Email: [rbl.islam.refat2@gmail.com](mailto:rbl.islam.refat2@gmail.com)
- Website: [refatishere.free.nf](https://www.refatishere.free.nf/)

## Platform Notes

This project includes app-builder-managed PWA and preview integration under `public/__grok/`, `server/`, and `scripts`. Keep these assets and their wiring intact when changing the app. Vite's production configuration uses Nitro's Vercel preset; deployment still requires the corresponding platform configuration and environment.