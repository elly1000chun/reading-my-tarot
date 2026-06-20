# OpenAI API Usage

The demo app uses the OpenAI Responses API from the Cloudflare Worker endpoint
`/api/interpret-reading`. The browser never calls OpenAI directly. Instead, the
browser sends the user's question, selected spread type, card positions, card
names, meanings, and descriptions to the Worker. The Worker validates and
truncates the payload, calls OpenAI, and returns only `{ summary, source: "ai" }`
to the browser. If OpenAI is unavailable, the browser keeps the local fallback
summary.

## Model

- Default model: `gpt-5.4-mini`
- Configured in:
  - `worker/src/index.js` as `DEFAULT_MODEL`
  - `wrangler.toml` as `OPENAI_MODEL`
- Endpoint: `https://api.openai.com/v1/responses`
- Reasoning effort: `low`
- Default max output tokens: `1600`
- Storage: `store: false`

`gpt-5.4-mini` was selected because this feature generates short reflective
tarot summaries rather than complex reasoning, coding, or tool-heavy agentic
workflows. The app needs low latency and controlled cost for interactive use,
especially because users can retry AI interpretations. OpenAI's model guide
recommends smaller variants such as `GPT-5.4 mini` or `GPT-5.4 nano` when
optimizing for latency and cost, while reserving flagship models such as
`GPT-5.5` for more complex reasoning and coding workloads:
https://developers.openai.com/api/docs/models

## Prompt

The Worker sends the following instruction prompt to OpenAI:

```text
You write reflective tarot reading summaries for entertainment and self-reflection.
Return only the final summary text, with no markdown headings or bullet lists.
Use the user's question, spread type, card positions, names, meanings, and descriptions as grounding.
Do not present the reading as certain fate or a fixed prediction.
Do not give definitive medical, legal, financial, or safety-critical advice.
If the question asks for high-stakes advice, keep the answer reflective and encourage consulting an appropriate professional.
{lengthGuide}
```

`{lengthGuide}` is selected by language and spread type:

- Korean, non-Celtic Cross: `Write 5 to 7 Korean sentences.`
- English, non-Celtic Cross: `Write 120 to 180 English words.`
- Korean, Celtic Cross: `Write 15 to 21 Korean sentences.`
- English, Celtic Cross: `Write 15 to 21 English sentences.`

The user input is sent as JSON text with this shape:

```json
{
  "question": "What message do I need right now?",
  "language": "en",
  "spreadType": "single",
  "cards": [
    {
      "position": "Your card",
      "name": "The Fool",
      "meanings": ["New beginnings"],
      "description": "The Fool represents a fresh start."
    }
  ]
}
```

The Worker logs token usage from successful OpenAI responses, including input
tokens, output tokens, reasoning tokens, and total tokens. It does not return
token usage to the browser.
