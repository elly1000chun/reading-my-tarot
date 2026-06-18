# Worker Deployment Notes

## Overview

The static Tarot app can call the AI interpretation API in two deployment shapes:

- Same-domain route: `/api/*` is routed to the Cloudflare Worker.
- Separate Worker URL: GitHub Pages calls a `workers.dev` or custom Worker domain.

The browser defaults to same-domain `/api/interpret-reading`. For separate Worker deployment, set the `ai-api-base-url` meta value in `index.html` or define `window.READING_MY_TAROT_CONFIG.aiApiBaseUrl` before the module script runs.

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

Deploy the Worker:

```bash
npm run worker:deploy
```

The Worker uses these non-secret vars from `wrangler.toml`:

- `OPENAI_MODEL`: model used for AI summaries.
- `ALLOWED_ORIGIN`: comma-separated browser origins allowed by CORS.

For GitHub Pages at `https://elly1000chun.github.io/reading-my-tarot/`, the allowed CORS origin is `https://elly1000chun.github.io`.

## Static App API URL

If `/api/*` is routed to the Worker on the same site, no static app change is needed.

If using a separate Worker URL, set one of these options:

```html
<meta name="ai-api-base-url" content="https://reading-my-tarot-api.<account>.workers.dev">
```

or:

```html
<script>
  window.READING_MY_TAROT_CONFIG = {
    aiApiBaseUrl: "https://reading-my-tarot-api.<account>.workers.dev"
  };
</script>
```

Use `aiInterpretationEndpoint` instead of `aiApiBaseUrl` only if the endpoint path is not `/api/interpret-reading`.
