import { expect, test } from "@playwright/test";

test.describe("landing page", () => {
  test("states the thesis and offers both ways in", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });

    await page.goto("/");

    await expect(page.locator("h1")).toContainText("未来には、");
    await expect(page.locator("h1")).toContainText("まだ声がない");

    // The answer arrives after a beat of silence, and then the one action.
    await expect(page.getByText("未来の誰かと、話をしよう。")).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByRole("link", { name: "対話をはじめる" })).toBeVisible();

    // The caveat is on the opening screen, not behind a link.
    await expect(page.getByText(/このシステムは未来を予測しません/)).toBeVisible();

    expect(consoleErrors.filter((e) => !e.includes("favicon"))).toEqual([]);
  });

  test("keeps the explanation one link away rather than deleting it", async ({ page }) => {
    // The six stages, the four agents and the corpus counts moved off the
    // opening; they are still disclosed, and the opening still points at them.
    await page.goto("/");
    await page.getByRole("link", { name: "この仕組みについて" }).click();
    await expect(page).toHaveURL(/\/about$/);
    await expect(page.getByText(/citable\s+findings/)).toBeVisible();
  });

  test("never scrolls horizontally", async ({ page }) => {
    await page.goto("/");
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
