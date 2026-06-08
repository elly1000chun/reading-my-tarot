import { describe, expect, it } from "vitest";

import Tarot from "../src/tarot.js";

const createDeck = () => [
  { name: "The Fool", meanings: ["New beginnings"] },
  { name: "The Magician", meanings: ["Resourcefulness"] },
  { name: "The High Priestess", meanings: ["Intuition"] }
];

describe("Tarot", () => {
  it("initializes a deck and exposes deck information", () => {
    const tarot = new Tarot();

    const initializedDeck = tarot.initializeDeck(createDeck());
    const deckInfo = tarot.getDeckInfo();

    expect(initializedDeck).toHaveLength(3);
    expect(Object.isFrozen(initializedDeck)).toBe(true);
    expect(Object.isFrozen(initializedDeck[0])).toBe(true);
    expect(deckInfo).toEqual({
      cardCount: 3,
      cards: initializedDeck
    });
  });

  it("rejects invalid deck input", () => {
    const tarot = new Tarot();

    expect(() => tarot.initializeDeck([])).toThrow(
      "Cards must be a non-empty array"
    );
    expect(() => tarot.initializeDeck("cards")).toThrow(
      "Cards must be a non-empty array"
    );
    expect(() => tarot.initializeDeck([null])).toThrow(
      "Item at index 0 is not a valid TarotCard object"
    );
    expect(() => tarot.initializeDeck([["The Fool"]])).toThrow(
      "Item at index 0 is not a valid TarotCard object"
    );
  });

  it("adds, lists, retrieves, and removes spreads", () => {
    const tarot = new Tarot();

    const spread = tarot.addSpread("Three Card", {
      positions: ["Past", "Present", "Future"],
      description: "A simple three-card reading"
    });

    expect(spread).toEqual({
      positions: ["Past", "Present", "Future"],
      description: "A simple three-card reading",
      cardCount: 3
    });
    expect(tarot.listSpreads()).toEqual(["Three Card"]);
    expect(tarot.getSpreadInfo("Three Card")).toEqual(spread);

    tarot.removeSpread("Three Card");

    expect(tarot.listSpreads()).toEqual([]);
    expect(() => tarot.getSpreadInfo("Three Card")).toThrow(
      'Spread "Three Card" not found. Add it using addSpread() first'
    );
  });

  it("validates spread input", () => {
    const tarot = new Tarot();

    expect(() => tarot.addSpread("", { positions: ["Past"] })).toThrow(
      "Spread name must be a non-empty string"
    );
    expect(() => tarot.addSpread("Empty", { positions: [] })).toThrow(
      "Positions must be a non-empty array"
    );
    expect(() => tarot.addSpread("Invalid", { positions: ["Past", ""] }))
      .toThrow("Position 1 must be a non-empty string");
  });

  it("draws the requested number of cards", () => {
    const tarot = new Tarot();
    tarot.initializeDeck(createDeck());

    const cards = tarot.drawCards(2);

    expect(cards).toHaveLength(2);
    expect(cards.every((card) => card.name)).toBe(true);
  });

  it("rejects drawing more cards than the deck contains", () => {
    const tarot = new Tarot();
    tarot.initializeDeck(createDeck());

    expect(() => tarot.drawCards(4)).toThrow(
      "Cannot draw 4 cards. Only 3 cards available"
    );
  });

  it("rejects invalid draw counts", () => {
    const tarot = new Tarot();
    tarot.initializeDeck(createDeck());

    for (const count of [0, -1, 1.5, "2", NaN]) {
      expect(() => tarot.drawCards(count)).toThrow(
        "Card count must be a positive integer"
      );
    }
  });

  it("performs a reading and stores the current spread", () => {
    const tarot = new Tarot();
    tarot.initializeDeck(createDeck());
    tarot.addSpread("Three Card", {
      positions: ["Past", "Present", "Future"]
    });

    const reading = tarot.doReading("Three Card");

    expect(reading).toHaveLength(3);
    expect(reading.map(({ position }) => position)).toEqual([
      "Past",
      "Present",
      "Future"
    ]);
    expect(reading.every(({ card }) => card.name)).toBe(true);
    expect(tarot.getCurrentSpread()).toEqual(reading);
  });

  it("requires an initialized deck before drawing cards or reading", () => {
    const tarot = new Tarot();
    tarot.addSpread("One Card", { positions: ["Focus"] });

    expect(() => tarot.drawCards(1)).toThrow(
      "Deck not initialized. Call initializeDeck() first"
    );
    expect(() => tarot.doReading("One Card")).toThrow(
      "Deck not initialized. Call initializeDeck() first"
    );
  });

  it("requires an existing spread before reading", () => {
    const tarot = new Tarot();
    tarot.initializeDeck(createDeck());

    expect(() => tarot.doReading("Missing")).toThrow(
      'Spread "Missing" not found. Add it using addSpread() first'
    );
  });
});
