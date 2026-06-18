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

Store the OpenAI API key as a Cloudflare secret:

```bash
npx wrangler secret put OPENAI_API_KEY
```

Build the Cloudflare static assets and deploy the Worker:

```bash
npm run worker:deploy
```

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
