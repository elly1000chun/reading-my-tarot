const DEFAULT_MODEL = "gpt-5.4-mini";
const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const DEFAULT_REASONING_EFFORT = "low";
const DEFAULT_MAX_OUTPUT_TOKENS = 1600;
const MAX_QUESTION_LENGTH = 500;
const MAX_CARDS = 10;
const LOCAL_DEV_ORIGINS = new Set([
  "http://127.0.0.1:54173",
  "http://localhost:54173"
]);

function jsonResponse(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...headers
    }
  });
}

function emptyResponse(status = 204, headers = {}) {
  return new Response(null, { status, headers });
}

function parseAllowedOrigins(env) {
  return new Set([
    ...LOCAL_DEV_ORIGINS,
    ...(env.ALLOWED_ORIGIN || "")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean)
  ]);
}

function getCorsHeaders(request, env) {
  const origin = request.headers.get("Origin");
  const allowedOrigins = parseAllowedOrigins(env);

  if (!origin) {
    return {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      Vary: "Origin"
    };
  }

  if (!allowedOrigins.has(origin)) {
    return null;
  }

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin"
  };
}

function truncateText(value, maxLength) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function validatePayload(payload) {
  if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
    return { error: "Request body must be a JSON object." };
  }

  const question = truncateText(payload.question, MAX_QUESTION_LENGTH);
  if (typeof payload.question !== "string" || !question) {
    return { error: "question must be a non-empty string." };
  }

  if (payload.question.trim().length > MAX_QUESTION_LENGTH) {
    return { error: `question must be ${MAX_QUESTION_LENGTH} characters or less.` };
  }

  const language = payload.language === "ko" ? "ko" : "en";
  const spreadType = truncateText(payload.spreadType, 80);
  if (typeof payload.spreadType !== "string" || !spreadType) {
    return { error: "spreadType must be a non-empty string." };
  }

  if (!Array.isArray(payload.cards) || payload.cards.length === 0) {
    return { error: "cards must be a non-empty array." };
  }

  if (payload.cards.length > MAX_CARDS) {
    return { error: `cards must include ${MAX_CARDS} cards or fewer.` };
  }

  const cards = [];
  for (const card of payload.cards) {
    if (card === null || typeof card !== "object" || Array.isArray(card)) {
      return { error: "Each card must be an object." };
    }

    const position = truncateText(card.position, 80);
    const name = truncateText(card.name, 120);
    if (!position || !name) {
      return { error: "Each card must include position and name." };
    }

    const meanings = Array.isArray(card.meanings)
      ? card.meanings
          .filter((meaning) => typeof meaning === "string")
          .map((meaning) => truncateText(meaning, 120))
          .filter(Boolean)
          .slice(0, 8)
      : [];

    cards.push({
      position,
      name,
      meanings,
      description: truncateText(card.description, 600)
    });
  }

  return {
    value: {
      question,
      language,
      spreadType,
      cards
    }
  };
}

function createPrompt(payload) {
  return JSON.stringify(
    {
      question: payload.question,
      language: payload.language,
      spreadType: payload.spreadType,
      cards: payload.cards
    },
    null,
    2
  );
}

function parsePositiveInteger(value, fallback) {
  const parsedValue = Number.parseInt(value, 10);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : fallback;
}

function createOpenAiRequest(payload, model = DEFAULT_MODEL, options = {}) {
  const isKorean = payload.language === "ko";
  const lengthGuide = isKorean
    ? "Write 5 to 7 Korean sentences."
    : "Write 120 to 180 English words.";
  const reasoningEffort = options.reasoningEffort || DEFAULT_REASONING_EFFORT;
  const maxOutputTokens = parsePositiveInteger(
    options.maxOutputTokens,
    DEFAULT_MAX_OUTPUT_TOKENS
  );

  return {
    model,
    reasoning: {
      effort: reasoningEffort
    },
    instructions: [
      "You write reflective tarot reading summaries for entertainment and self-reflection.",
      "Return only the final summary text, with no markdown headings or bullet lists.",
      "Use the user's question, spread type, card positions, names, meanings, and descriptions as grounding.",
      "Do not present the reading as certain fate or a fixed prediction.",
      "Do not give definitive medical, legal, financial, or safety-critical advice.",
      "If the question asks for high-stakes advice, keep the answer reflective and encourage consulting an appropriate professional.",
      lengthGuide
    ].join(" "),
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: createPrompt(payload)
          }
        ]
      }
    ],
    max_output_tokens: maxOutputTokens,
    store: false
  };
}

function extractResponseText(result) {
  if (typeof result?.output_text === "string" && result.output_text.trim()) {
    return result.output_text.trim();
  }

  const textParts = [];
  for (const item of result?.output || []) {
    for (const content of item.content || []) {
      if (typeof content.text === "string") {
        textParts.push(content.text);
      }
    }
  }

  return textParts.join("\n").trim();
}

async function callOpenAi(payload, env) {
  const requestBody = createOpenAiRequest(payload, env.OPENAI_MODEL || DEFAULT_MODEL, {
    reasoningEffort: env.OPENAI_REASONING_EFFORT || DEFAULT_REASONING_EFFORT,
    maxOutputTokens: env.OPENAI_MAX_OUTPUT_TOKENS || DEFAULT_MAX_OUTPUT_TOKENS
  });

  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `OpenAI request failed with ${response.status}: ${errorText.slice(0, 300)}`
    );
  }

  const result = await response.json();
  const summary = extractResponseText(result);
  if (
    result?.status === "incomplete" &&
    result?.incomplete_details?.reason === "max_output_tokens"
  ) {
    throw new Error("OpenAI response reached max_output_tokens before completion.");
  }

  if (!summary) {
    throw new Error("OpenAI response did not include text output.");
  }

  return summary;
}

async function handleInterpretReading(request, env, corsHeaders) {
  if (!env.OPENAI_API_KEY) {
    return jsonResponse(
      { error: "OPENAI_API_KEY is not configured." },
      503,
      corsHeaders
    );
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: "Request body must be valid JSON." }, 400, corsHeaders);
  }

  const validation = validatePayload(payload);
  if (validation.error) {
    return jsonResponse({ error: validation.error }, 400, corsHeaders);
  }

  try {
    const summary = await callOpenAi(validation.value, env);
    return jsonResponse({ summary, source: "ai" }, 200, corsHeaders);
  } catch (error) {
    console.error("Failed to generate AI tarot interpretation.", error);
    return jsonResponse(
      { error: "Failed to generate AI interpretation." },
      502,
      corsHeaders
    );
  }
}

export async function handleRequest(request, env = {}) {
  const url = new URL(request.url);
  const corsHeaders = getCorsHeaders(request, env);

  if (!corsHeaders) {
    return jsonResponse({ error: "Origin is not allowed." }, 403);
  }

  if (request.method === "OPTIONS") {
    return emptyResponse(204, corsHeaders);
  }

  if (url.pathname !== "/api/interpret-reading") {
    return jsonResponse({ error: "Not found." }, 404, corsHeaders);
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405, {
      ...corsHeaders,
      Allow: "POST, OPTIONS"
    });
  }

  return handleInterpretReading(request, env, corsHeaders);
}

export {
  createOpenAiRequest,
  extractResponseText,
  validatePayload
};

export default {
  fetch: handleRequest
};
