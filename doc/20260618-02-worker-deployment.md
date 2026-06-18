# Worker Deployment Notes

## Overview

The Tarot app is served from Cloudflare Workers at:

```text
https://reading-my-tarot.elly1000chun.workers.dev/
```

The app can call the AI interpretation API in two deployment shapes:

- Same-domain route: `/api/*` is handled by the same Cloudflare Worker that serves the static app.
- Separate Worker URL: GitHub Pages calls a `workers.dev` or custom Worker domain.

The current deployment uses the same-domain route. The browser defaults to `/api/interpret-reading`, so no `ai-api-base-url` value is needed for the production Worker URL.

## Local Worker Setup

1. Copy `.dev.vars.example` to `.dev.vars`.
2. Set `OPENAI_API_KEY` in `.dev.vars`.
3. Start the Worker:

```bash
npm run worker:dev
```

4. Start or open the static app separately. The local Playwright static server uses `http://127.0.0.1:54173`.

## Cloudflare Setup

Store the OpenAI API key as a Worker runtime secret. This value must be attached to the deployed Worker named `reading-my-tarot` because the API route reads `env.OPENAI_API_KEY` at request time.

```bash
npx wrangler secret put OPENAI_API_KEY
```

If the secret was previously added to another Worker, such as an older `reading-my-tarot-api` deployment, add it again for `reading-my-tarot` from this project directory.

For Cloudflare Builds, also add `OPENAI_API_KEY` as a secret build variable. The deploy script reads that build-time value and uploads it to the Worker with `wrangler deploy --secrets-file`.

The same setting can be added from the Cloudflare dashboard:

1. Open Workers & Pages.
2. Select `reading-my-tarot`.
3. Open Settings > Variables and Secrets.
4. Add `OPENAI_API_KEY` as a Secret, not as a plain text variable.
5. Save or deploy the updated Worker version when Cloudflare prompts for it.

Use these commands in Cloudflare Builds:

```text
Build command: npm run build:cloudflare
Deploy command: npm run deploy:cloudflare
```

For local or manual deployment, run:

```bash
npm run worker:deploy
```

`wrangler.toml` declares `OPENAI_API_KEY` as a required secret, so deploys validate that the secret exists for the target Worker before deployment. In Cloudflare Builds, the deploy script writes the build secret to a temporary `.env.production` file, passes it through `--secrets-file`, and deletes the file after Wrangler exits.

The Worker uses these non-secret vars from `wrangler.toml`:

- `OPENAI_MODEL`: model used for AI summaries.
- `ALLOWED_ORIGIN`: comma-separated browser origins allowed by CORS. The production origin is `https://reading-my-tarot.elly1000chun.workers.dev`.

The deploy script runs `build:cloudflare` first, which regenerates `public/` from `index.html`, `src/tarot.js`, and `decks/`.

## Static App API URL

For the current Worker-hosted app, `/api/*` is handled by the same Worker. No static app change is needed.

If the app is later served from a separate static host, set one of these options:

```html
<meta name="ai-api-base-url" content="https://reading-my-tarot.elly1000chun.workers.dev">
```

or:

```html
<script>
  window.READING_MY_TAROT_CONFIG = {
    aiApiBaseUrl: "https://reading-my-tarot.elly1000chun.workers.dev"
  };
</script>
```

Use `aiInterpretationEndpoint` instead of `aiApiBaseUrl` only if the endpoint path is not `/api/interpret-reading`.

## Asset Routing

`wrangler.toml` uses Cloudflare Workers static assets:

```toml
[assets]
directory = "public"
run_worker_first = ["/api/*"]
```

Static files are served from `public/`, while `/api/*` requests run the Worker first. This keeps `/api/interpret-reading` available even if a static asset path overlaps in the future.
