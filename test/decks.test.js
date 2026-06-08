import { readdir, readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

const deckFiles = [
  "decks/en/default.json",
  "decks/en/waites.json",
  "decks/ko/default.json"
];
const minorSuits = new Set(["wands", "cups", "swords", "pentacles"]);
const localizedMetadataFields = ["name", "symbol", "image", "type", "value", "suit"];

const loadDeck = async (filePath) => {
  const fileUrl = new URL(`../${filePath}`, import.meta.url);
  return JSON.parse(await readFile(fileUrl, "utf8"));
};

const expectNonEmptyString = (value) => {
  expect(typeof value).toBe("string");
  expect(value.trim().length).toBeGreaterThan(0);
};

const loadImageFilenames = async () => {
  const imageDir = new URL("../decks/images/", import.meta.url);
  return new Set(await readdir(imageDir));
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
    const imageFilenames = await loadImageFilenames();

    for (const card of deck) {
      expectNonEmptyString(card.name);
      expectNonEmptyString(card.symbol);
      expectNonEmptyString(card.description);
      expectNonEmptyString(card.image);
      expect(imageFilenames.has(card.image)).toBe(true);

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

  it("uses the same image for upright and reversed card pairs", async () => {
    const deck = await loadDeck(deckFile);
    const cardsByName = new Map(deck.map((card) => [card.name, card]));

    for (const card of deck.filter((card) => card.name.endsWith(" Reversed"))) {
      const uprightName = card.name.replace(/ Reversed$/, "");
      const uprightCard = cardsByName.get(uprightName);

      expect(uprightCard).toBeDefined();
      expect(card.image).toBe(uprightCard.image);
    }
  });
});

describe("localized deck parity", () => {
  it("keeps Korean default deck metadata aligned with English default deck", async () => {
    const englishDeck = await loadDeck("decks/en/default.json");
    const koreanDeck = await loadDeck("decks/ko/default.json");

    expect(koreanDeck).toHaveLength(englishDeck.length);

    koreanDeck.forEach((koreanCard, index) => {
      const englishCard = englishDeck[index];

      for (const field of localizedMetadataFields) {
        expect(koreanCard[field]).toEqual(englishCard[field]);
      }

      expect(koreanCard.meanings).not.toEqual(englishCard.meanings);
      expect(koreanCard.description).not.toBe(englishCard.description);
    });
  });
});
