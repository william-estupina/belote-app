import { expect, test } from "@playwright/test";

test.describe("Distribution des cartes", () => {
  test("la distribution se termine sans erreur JS", async ({ page }) => {
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

    // Attendre que la page de jeu se charge et le bouton "Jouer" du plateau apparaisse
    await page.waitForTimeout(500);

    // Lancer la partie via le bouton sur le plateau (le 2ème "Jouer")
    const boutonJouer = page.getByText("Jouer", { exact: true }).nth(1);
    await expect(boutonJouer).toBeVisible({ timeout: 3000 });
    await boutonJouer.click();

    // Attendre que la distribution se termine et les enchères commencent
    // Les enchères affichent "Prendre" ou "Passer"
    await expect(page.getByText("Passer")).toBeVisible({ timeout: 15000 });

    // Aucune erreur JS pendant la distribution
    expect(erreursPage).toEqual([]);
  });
});
