import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

const deckFiles = ["decks/en/default.json", "decks/en/waites.json"];
const minorSuits = new Set(["wands", "cups", "swords", "pentacles"]);

const loadDeck = async (filePath) => {
  const fileUrl = new URL(`../${filePath}`, import.meta.url);
  return JSON.parse(await readFile(fileUrl, "utf8"));
};

const expectNonEmptyString = (value) => {
  expect(typeof value).toBe("string");
  expect(value.trim().length).toBeGreaterThan(0);
};

describe.each(deckFiles)("deck schema: %s", (deckFile) => {
  it("contains a complete upright and reversed deck", async () => {
    const deck = await loadDeck(deckFile);

    expect(deck).toHaveLength(156);
    expect(new Set(deck.map((card) => card.name)).size).toBe(156);
    expect(deck.filter((card) => card.name.endsWith(" Reversed"))).toHaveLength(78);
    expect(deck.filter((card) => !card.name.endsWith(" Reversed"))).toHaveLength(78);
  });

  it("has valid card fields", async () => {
    const deck = await loadDeck(deckFile);

    for (const card of deck) {
      expectNonEmptyString(card.name);
      expectNonEmptyString(card.symbol);
      expectNonEmptyString(card.description);

      expect(Array.isArray(card.meanings)).toBe(true);
      expect(card.meanings.length).toBeGreaterThan(0);
      card.meanings.forEach(expectNonEmptyString);

      expect(["major", "minor"]).toContain(card.type);
      expect(Number.isInteger(card.value)).toBe(true);

      if (card.type === "major") {
        expect(card.suit).toBeNull();
        expect(card.value).toBeGreaterThanOrEqual(0);
        expect(card.value).toBeLessThanOrEqual(21);
      } else {
        expect(minorSuits.has(card.suit)).toBe(true);
        expect(card.value).toBeGreaterThanOrEqual(1);
        expect(card.value).toBeLessThanOrEqual(14);
      }
    }
  });
});
