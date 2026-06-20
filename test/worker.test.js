import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createOpenAiRequest,
  extractResponseText,
  handleRequest,
  validatePayload
} from "../worker/src/index.js";

const createPayload = () => ({
  question: "How can I move forward?",
  language: "en",
  spreadType: "single",
  cards: [
    {
      position: "Your card",
      name: "The Fool",
      meanings: ["New beginnings"],
      description: "The Fool represents a fresh start."
    }
  ]
});

const createRequest = (body, init = {}) =>
  new Request("https://example.com/api/interpret-reading", {
    method: "POST",
    headers: {
      Origin: "https://example.com",
      "Content-Type": "application/json",
      ...(init.headers || {})
    },
    body: JSON.stringify(body),
    ...init
  });

describe("Worker interpret-reading API", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("validates and normalizes a reading payload", () => {
    const validation = validatePayload(createPayload());

    expect(validation.error).toBeUndefined();
    expect(validation.value).toEqual(createPayload());
  });

  it("rejects invalid reading payloads", () => {
    expect(validatePayload({ ...createPayload(), question: "" }).error)
      .toBe("question must be a non-empty string.");
    expect(validatePayload({ ...createPayload(), cards: [] }).error)
      .toBe("cards must be a non-empty array.");
    expect(
      validatePayload({
        ...createPayload(),
        cards: [{ position: "", name: "The Fool" }]
      }).error
    ).toBe("Each card must include position and name.");
  });

  it("creates a Responses API request grounded in the tarot payload", () => {
    const request = createOpenAiRequest(createPayload(), "gpt-test");

    expect(request).toMatchObject({
      model: "gpt-test",
      reasoning: {
        effort: "low"
      },
      max_output_tokens: 1600,
      store: false
    });
    expect(request.instructions).toContain("entertainment and self-reflection");
    expect(request.input[0].content[0].text).toContain("How can I move forward?");
  });

  it("requests a longer interpretation for Celtic Cross spreads", () => {
    const koreanRequest = createOpenAiRequest(
      {
        ...createPayload(),
        language: "ko",
        spreadType: "celtic-cross"
      },
      "gpt-test"
    );
    const englishRequest = createOpenAiRequest(
      {
        ...createPayload(),
        language: "en",
        spreadType: "celtic-cross"
      },
      "gpt-test"
    );

    expect(koreanRequest.instructions).toContain(
      "Write 15 to 21 Korean sentences."
    );
    expect(englishRequest.instructions).toContain(
      "Write 15 to 21 English sentences."
    );
  });

  it("extracts text from output_text or typed output content", () => {
    expect(extractResponseText({ output_text: "  Direct summary  " }))
      .toBe("Direct summary");
    expect(
      extractResponseText({
        output: [
          {
            content: [{ text: "Nested" }, { text: "summary" }]
          }
        ]
      })
    ).toBe("Nested\nsummary");
  });

  it("returns an AI summary for a valid request", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ output_text: "A generated tarot summary." }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await handleRequest(createRequest(createPayload()), {
      OPENAI_API_KEY: "sk-test",
      OPENAI_MODEL: "gpt-test",
      ALLOWED_ORIGIN: "https://example.com"
    });

    await expect(response.json()).resolves.toEqual({
      summary: "A generated tarot summary.",
      source: "ai"
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("Access-Control-Allow-Origin"))
      .toBe("https://example.com");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.openai.com/v1/responses",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer sk-test"
        })
      })
    );
    const [, requestInit] = fetchMock.mock.calls[0];
    expect(JSON.parse(requestInit.body)).toMatchObject({
      model: "gpt-test",
      reasoning: {
        effort: "low"
      },
      max_output_tokens: 1600
    });
  });

  it("logs OpenAI token usage from the Responses API result", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            model: "gpt-result",
            output_text: "A generated tarot summary.",
            usage: {
              input_tokens: 100,
              output_tokens: 40,
              output_tokens_details: {
                reasoning_tokens: 12
              },
              total_tokens: 140
            }
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" }
          }
        )
      )
    );

    const response = await handleRequest(createRequest(createPayload()), {
      OPENAI_API_KEY: "sk-test",
      OPENAI_MODEL: "gpt-request",
      ALLOWED_ORIGIN: "https://example.com"
    });

    expect(response.status).toBe(200);
    expect(console.log).toHaveBeenCalledWith("OpenAI usage", {
      model: "gpt-result",
      inputTokens: 100,
      outputTokens: 40,
      reasoningTokens: 12,
      totalTokens: 140
    });
  });

  it("allows OpenAI reasoning and output limits to be configured", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ output_text: "Configured summary." }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await handleRequest(createRequest(createPayload()), {
      OPENAI_API_KEY: "sk-test",
      OPENAI_MODEL: "gpt-test",
      OPENAI_REASONING_EFFORT: "minimal",
      OPENAI_MAX_OUTPUT_TOKENS: "2400",
      ALLOWED_ORIGIN: "https://example.com"
    });

    expect(response.status).toBe(200);
    const [, requestInit] = fetchMock.mock.calls[0];
    expect(JSON.parse(requestInit.body)).toMatchObject({
      reasoning: {
        effort: "minimal"
      },
      max_output_tokens: 2400
    });
  });

  it("handles preflight requests", async () => {
    const response = await handleRequest(
      new Request("https://example.com/api/interpret-reading", {
        method: "OPTIONS",
        headers: { Origin: "https://example.com" }
      }),
      { ALLOWED_ORIGIN: "https://example.com" }
    );

    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Methods"))
      .toBe("POST, OPTIONS");
  });

  it("rejects disallowed origins", async () => {
    const response = await handleRequest(createRequest(createPayload()), {
      OPENAI_API_KEY: "sk-test",
      ALLOWED_ORIGIN: "https://allowed.example"
    });

    expect(response.status).toBe(403);
  });

  it("requires the OpenAI API key", async () => {
    const response = await handleRequest(createRequest(createPayload()), {
      ALLOWED_ORIGIN: "https://example.com"
    });

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: "OPENAI_API_KEY is not configured."
    });
  });

  it("hides upstream OpenAI failure details from clients", async () => {
    const consoleErrorMock = vi.spyOn(console, "error").mockImplementation(() => {});

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: {
              message: "upstream leaked detail sk-test",
              type: "server_error",
              code: "upstream_error"
            }
          }),
          { status: 500 }
        )
      )
    );

    const response = await handleRequest(createRequest(createPayload()), {
      OPENAI_API_KEY: "sk-test",
      ALLOWED_ORIGIN: "https://example.com"
    });
    const body = await response.text();

    expect(response.status).toBe(502);
    expect(body).toContain("Failed to generate AI interpretation.");
    expect(body).not.toContain("sk-test");
    expect(consoleErrorMock.mock.calls[0][1].message).toBe(
      "OpenAI request failed with 500 (server_error, upstream_error)."
    );
    expect(JSON.stringify(consoleErrorMock.mock.calls)).not.toContain("sk-test");
  });
});
