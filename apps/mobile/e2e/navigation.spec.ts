import { expect, test } from "@playwright/test";

test.describe("Navigation sans erreur", () => {
  test("l'écran d'accueil se charge correctement", async ({ page }) => {
    // Capturer les erreurs console
    const erreursConsole: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        erreursConsole.push(msg.text());
      }
    });

    // Capturer les erreurs JS non gérées
    const erreursPage: string[] = [];
    page.on("pageerror", (err) => {
      erreursPage.push(err.message);
    });

    await page.goto("/", { waitUntil: "domcontentloaded" });

    // Vérifier que le titre s'affiche
    await expect(page.getByRole("heading", { name: "Belote" })).toBeVisible();

    // Vérifier que le sous-titre s'affiche
    await expect(page.getByText("Jeu de cartes")).toBeVisible();

    // Aucune erreur JS ne doit avoir été émise
    expect(erreursPage).toHaveLength(0);

    // Filtrer les erreurs console bénignes (warnings Expo/React en dev)
    const erreursCritiques = erreursConsole.filter(
      (msg) =>
        !msg.includes("DevTools") &&
        !msg.includes("ExpoModulesCore") &&
        !msg.includes("deprecated"),
    );
    expect(erreursCritiques).toHaveLength(0);
  });
});
