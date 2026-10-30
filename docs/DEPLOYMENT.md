# Finderz Live Deployment and Hosting

## Hosting Model

Finderz is a TanStack Start application built with Vite and Nitro. `vite.config.ts` selects Nitro's `vercel` preset for production builds and writes a Vercel-compatible server function plus static assets. The Vercel function serves the app and its server functions; this is not a static-only site.

GitHub is the source repository and can trigger deployments, but it does not host the running app. Use Vercel or another Node/serverless host with an explicitly configured Nitro preset. GitHub Pages is not suitable for the current app because catalog search, X post metadata, and optional AI briefs run through server functions.

The Vercel build output observed for this repository reports a `nodejs24.x` server runtime. Keep the Vercel project on Node.js 24 where the runtime setting is available, and re-check the build output after changing the Node version, Nitro, or Vite configuration.

## Before Deploying

- Confirm the intended commit is on the GitHub `main` branch: [refatwashere/Finderz](https://github.com/refatwashere/Finderz).
- Make sure the repository root is the Vercel project root. There is no monorepo subdirectory to select.
- Keep `vite.config.ts`, `scripts/with-app-env.mjs`, `scripts/grok-pwa-plugin.mjs`, and `server/` middleware intact. The wrapper supplies app environment values, and the Vercel Nitro middleware supplies PWA/install behavior.
- Keep `.grok/`, `.vercel/`, `node_modules/`, and local screenshots out of Git. `.gitignore` already excludes these.
- Review the deployment environment section below before enabling authentication, adding a database, or configuring the optional AI feature.

## Connect GitHub to Vercel

1. In Vercel, choose **Add New Project** and import `refatwashere/Finderz` from GitHub. Grant access to this repository if Vercel requests it.
2. Select the repository root as the project root and set the production branch to `main`.
3. Use `npm ci` for dependency installation and `npm run build` for the build command. Do not replace the build command with a direct Vite command: the npm script runs the environment wrapper and then the migration step.
4. Leave the output-directory setting on automatic detection. Nitro creates `.vercel/output`; do not set `dist` as the Vercel output directory because that would omit the server function.
5. Select Node.js 24 for the project runtime/build environment when Vercel offers that setting.
6. Configure the environment variables for the target environment before the first deployment. For Finderz without accounts, use the account-free settings below.
7. Deploy. Connect a custom domain only after the generated Vercel URL has passed the smoke checks.

After integration, Vercel normally creates preview deployments for branch changes and a production deployment for changes merged or pushed to `main`. Confirm the deployment's branch and commit in Vercel before promoting or sharing a URL.

## Build and Database Behavior

The `npm run build` script runs `vite build` through `scripts/with-app-env.mjs`, then invokes `npm run db:migrate`.

- With `DATABASE_URL` unset, the deploy-time migration script skips. Local/serverless code can use the embedded PGLite fallback, but its data is process-local and must not be treated as durable storage in a serverless deployment.
- With `DATABASE_URL` set, the migration script connects with `pg` and applies pending top-level files in `migrations/`. Migrations are recorded in `_migrations` and run transactionally.
- The current Finderz discovery, taste marks, saved file, and pinned X posts use browser local storage. They do not require a server database and are not synchronized across devices.
- `migrations/auth/0001_auth.sql` is nested and is intentionally not picked up by the current non-recursive migration script. Do not enable production auth and assume this nested file has been applied. Follow the auth migration instructions and ensure the production schema is installed before enabling accounts.
- If a future feature needs durable server data, provision PostgreSQL (the code supports a Neon/Postgres `DATABASE_URL`), add the migration using the repository's migration conventions, and test the deployment migration against a non-production database first.

## Environment Variables

Set variables in Vercel's project environment settings, not in committed files. Vercel environment changes require a new deployment to take effect. Never put secrets in `VITE_` variables; Vite exposes `VITE_` values to browser bundles.

### Finderz without accounts (current feature set)

| Variable | Requirement | Purpose |
| --- | --- | --- |
| `VITE_AUTH_ENABLED` | Set to `false` for Production, Preview, and Development | Keeps the prewired auth layer disabled for the current account-free Finderz experience. Set it before building because the flag also affects client bundles. |
| `XAI_API_KEY` | Optional | Enables user-requested AI briefs. This is a server-only xAI key and may incur usage charges. Leave unset to disable the feature. |
| `JAVINFO_API_KEY` | Optional | Enables the adult-only JAVINFO provider when a user explicitly turns it on in Sources. Server-only; never use a `VITE_` prefix. Its published `/query` rate is $0.0004 per successful request and up to 10 requests/minute per account. Rotate the key pasted into chat before configuring this variable. |
| `DATABASE_URL` | Not required | Do not configure solely for local browser-saved finds. Add only when a server-side feature actually needs durable PostgreSQL data. |

Apple, AniList, TVMaze, Internet Archive, and Wikipedia searches do not require credentials. JAVINFO requires `JAVINFO_API_KEY` and remains disabled until its Sources switch is explicitly enabled. Its results are adult-only catalog metadata; the integration ignores media/stream and download fields.

### If accounts or Grok identity are intentionally enabled

Do not set `VITE_AUTH_ENABLED=true` as a guess. The auth integration is brokered and needs a real production configuration. The server code expects a production database and auth origin/secret; federated sign-in also expects valid broker credentials.

| Variable | Use |
| --- | --- |
| `VITE_AUTH_ENABLED=true` | Enables the auth-aware application behavior. |
| `BETTER_AUTH_URL` | The exact canonical HTTPS origin of the deployed app, for example `https://finderz.example.com`; no path or trailing route. It must match OAuth callback configuration. |
| `BETTER_AUTH_SECRET` | A strong, unique server-side secret for Better Auth. Store it only in Vercel's encrypted environment settings. |
| `DATABASE_URL` | Production PostgreSQL connection string for durable users and sessions. Use the provider's recommended pooled/serverless URL and verify the database schema before rollout. |
| `GROK_AUTH_ISSUER` | The approved identity broker issuer for this app. |
| `GROK_AUTH_CLIENT_ID` | The production client ID issued for the app. |
| `GROK_AUTH_CLIENT_SECRET` | The matching production client secret; server-only. |

`GROK_PROJECT_ID`, `GROK_GATE_ORIGIN`, `GROK_CONNECTORS_URL`, and `GROK_CONNECTOR_ACCESS_TOKEN` are app-builder/gate/connector integration settings, not generic Vercel settings. Configure them only when deploying through the corresponding platform integration. Do not copy preview credentials or fabricate these values for a standalone deployment. Authenticated deployments also need a deliberate user-data ownership and authorization review before being exposed publicly.

## Production Smoke Checks

After every first deployment or runtime/configuration change:

1. Open the production URL over HTTPS. Confirm the Finderz title, styles, fonts, and images load and that the browser console has no uncaught errors.
2. Submit a known title search. Confirm the server function returns results or a user-visible provider error, and that catalog and dispatch links open the intended destinations.
3. Save a result and reload in the same browser profile. Confirm the local file persists; verify it is not presented as cross-device or server-backed storage.
4. Toggle a source, refresh, and verify the preference persists. Test the mobile layout at a narrow viewport.
5. If `XAI_API_KEY` is configured, request one brief and inspect Vercel function logs for upstream/API errors. Confirm the key is not present in the client bundle or browser network responses.
6. If JAVINFO is configured, confirm its opt-in switch defaults off, enable it only for an adult test, submit a known catalog code, and inspect the server result. Confirm the API key is absent from client bundles and no stream/download URLs are rendered.
7. If authentication is enabled, test sign-in, callback, session persistence, sign-out, and a fresh browser session. Validate the final callback origin and database migrations before inviting users.
8. Check Vercel function and build logs. A successful build alone does not prove that the deployed page hydrates or that server functions and static assets are reachable.

The PWA install page is served by the configured Nitro middleware at `/?install=1&platform=ios`. Preserve `serverDir: "./server"` and the PWA plugin wiring if you change the Vite config.

## Custom Domain and Release Operations

- Add the domain in Vercel's project settings and apply the DNS records Vercel provides. Use Vercel's domain status and HTTPS certificate checks; do not guess DNS targets.
- Once the domain is active, set `BETTER_AUTH_URL` to that canonical origin if auth is enabled, then redeploy and re-test the OAuth callback.
- Use Vercel's deployment history to inspect a release and promote or roll back to the last known-good deployment. A rollback restores the previous build, not external database state; database changes must be backward-compatible or separately rolled back.
- Keep production and preview environment variables separate. Never place production secrets in Preview deployments unless there is a specific need.
- For releases involving schema changes, deploy additive/backward-compatible migrations first, then deploy code that uses them. Destructive schema changes require a separate migration plan and backup/restore strategy.

## Troubleshooting

| Symptom | Likely cause and response |
| --- | --- |
| Build cannot find Vite | Use Vercel's `npm ci` install and `npm run build` command; do not invoke a global Vite executable. |
| Blank page or module MIME error | Check Vercel output-directory overrides and asset URLs. Keep Nitro's `.vercel/output` output and inspect the deployed browser network/console for failed JS/CSS assets. |
| Server function returns 500 | Inspect Vercel function logs and environment settings. Check server-only variables, runtime compatibility, and external API connectivity. |
| Briefing says unavailable | `XAI_API_KEY` is missing, invalid, or the xAI request failed. The feature is optional; do not expose the key with a `VITE_` prefix. |
| Migration step fails | Verify `DATABASE_URL`, network access, database permissions, and migration state. Build logs identify the migration and PostgreSQL error. If there are no top-level migrations, the script should skip the connection. |
| OAuth callback/origin errors | Confirm `BETTER_AUTH_URL` exactly matches the deployed HTTPS origin and the broker's registered callback. Verify production broker credentials and auth schema. |
| Catalog results are incomplete | Provider requests can fail independently or be rate-limited. Check function logs and upstream provider status; Finderz does not control catalog availability. |

## Current Readiness Notes

The project has been pushed to GitHub and `npm run build` has completed successfully using the Vercel preset. A production deployment has not been created by this guide. Typecheck passes; lint has two non-blocking warnings. The configured app-data/auth test run passes 55 tests, while the explicitly run script suite has known PWA metadata expectation failures and Windows symlink permission failures. Resolve or consciously accept those test issues before treating them as a production release gate.