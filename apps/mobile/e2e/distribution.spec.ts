import { expect, test } from "@playwright/test";

test.describe("Distribution des cartes", () => {
  test("la distribution démarre immédiatement sans second clic", async ({ page }) => {
    const erreursConsole: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        erreursConsole.push(msg.text());
      }
    });
    const erreursPage: string[] = [];
    page.on("pageerror", (err) => {
      erreursPage.push(err.message);
    });

    await page.goto("/", { waitUntil: "networkidle" });

    // Naviguer vers la partie via le bouton du menu d'accueil
    await page.getByTestId("bouton-jouer").click();

    // Attendre que la distribution se termine et les enchères commencent
    // Les enchères affichent "Prendre" ou "Passer"
    await expect(page.getByText("Passer")).toBeVisible({ timeout: 15000 });

    // Aucune erreur JS pendant la distribution
    expect(erreursPage).toEqual([]);
  });

  test("le rendu web garde un canvas de distribution pendant la donne initiale", async ({
    page,
  }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    await page.getByTestId("bouton-jouer").click();

    await expect(page.getByText("Chargement du plateau...")).not.toBeVisible({
      timeout: 15000,
    });

    expect(await page.locator("canvas").count()).toBeGreaterThan(0);
    await expect(page.locator("body")).not.toContainText("♥");
    await expect(page.locator("body")).not.toContainText("♠");
  });
});
