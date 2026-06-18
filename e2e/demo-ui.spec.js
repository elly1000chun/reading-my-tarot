import { expect, test } from "@playwright/test";

async function attachScreenshot(page, testInfo, name) {
  await testInfo.attach(name, {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png"
  });
}

test.describe("Mystic Tarot demo UI", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#pageLoader")).toBeHidden();
  });

  test("shows the localized question input and language controls", async ({
    page
  }, testInfo) => {
    await expect(page.locator("#languageSelector")).toBeVisible();
    await expect(page.locator("#questionInput")).toBeVisible();
    await expect(page.locator("#interpretationPanel")).toBeHidden();
    await expect(page.locator("#questionLabel")).toHaveText(
      "카드에게 어떤 질문을 건네고 싶나요?"
    );
    await expect(page.getByRole("button", { name: "New Reading" })).toBeHidden();

    await page.getByRole("button", { name: "English" }).click();

    await expect(page.locator("#questionLabel")).toHaveText(
      "What would you like the cards to reflect on?"
    );
    await expect(page.locator("#questionInput")).toHaveAttribute(
      "placeholder",
      "Ask about a situation, choice, relationship, or the energy around today."
    );

    await attachScreenshot(page, testInfo, "question-input");
  });

  test("performs a single-card reading and resets the result view", async ({
    page
  }, testInfo) => {
    await page
      .locator("#questionInput")
      .fill("What should I focus on today?");
    await page.getByRole("button", { name: /Single Card/ }).click();

    await expect(page.locator("#readingResults")).toBeVisible();
    await expect(page.locator("#interpretationPanel")).toBeVisible();
    await expect(page.locator("#interpretationSummary")).toContainText(
      "What should I focus on today?"
    );
    await expect(page.locator("#spreadContainer .card-content")).toHaveCount(1);
    await expect(page.getByRole("button", { name: "New Reading" })).toBeVisible();

    const languageSelectorBox = await page.locator("#languageSelector").boundingBox();
    const newReadingBox = await page.locator("#newReadingBtn").boundingBox();
    expect(languageSelectorBox).not.toBeNull();
    expect(newReadingBox).not.toBeNull();
    expect(newReadingBox.y).toBeLessThan(
      languageSelectorBox.y + languageSelectorBox.height + 24
    );

    await attachScreenshot(page, testInfo, "single-card-reading");

    await page.getByRole("button", { name: "New Reading" }).click();

    await expect(page.locator("#readingResults")).toBeHidden();
    await expect(page.locator("#interpretationPanel")).toBeHidden();
    await expect(page.locator("#spreadSelection")).toBeVisible();
    await expect(page.locator("#questionInput")).toHaveValue(
      "What should I focus on today?"
    );
  });

  test("replaces the local summary with an AI interpretation when available", async ({
    page
  }) => {
    let requestPayload;

    await page.route("**/api/interpret-reading", async (route) => {
      requestPayload = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          summary: "AI summary: focus on one practical next step.",
          source: "ai"
        })
      });
    });

    await page.getByRole("button", { name: "English" }).click();
    await page
      .locator("#questionInput")
      .fill("How can I move forward with this decision?");
    await page.getByRole("button", { name: /Single Card/ }).click();

    await expect(page.locator("#interpretationSummary")).toContainText(
      "AI summary: focus on one practical next step."
    );
    expect(requestPayload).toMatchObject({
      question: "How can I move forward with this decision?",
      language: "en",
      spreadType: "single"
    });
    expect(requestPayload.cards).toHaveLength(1);
    expect(requestPayload.cards[0]).toEqual(
      expect.objectContaining({
        position: "Your card",
        name: expect.any(String),
        meanings: expect.any(Array),
        description: expect.any(String)
      })
    );
  });
});
