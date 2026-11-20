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
    await expect(
      page.getByText("あなたの今日の選択について、2050年の人々と話してみませんか？"),
    ).toBeVisible();

    await expect(
      page.getByRole("link", { name: "審査員向けデモ（90秒）" }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /自分の問いで証言をはじめる/ }),
    ).toBeVisible();

    // The corpus is disclosed on the landing page, not hidden.
    await expect(page.getByText(/citable\s+findings/)).toBeVisible();

    expect(consoleErrors.filter((e) => !e.includes("favicon"))).toEqual([]);
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
