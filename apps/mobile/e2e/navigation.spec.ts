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

    await page.goto("/", { waitUntil: "networkidle" });

    // Vérifier que le titre s'affiche (Text RN = div sur web, pas de rôle heading)
    await expect(page.getByText("Belote", { exact: true })).toBeVisible();

    // Vérifier que le sous-titre s'affiche
    await expect(page.getByText("Jeu de cartes")).toBeVisible();

    // Vérifier que les boutons du menu s'affichent
    await expect(page.getByText("Jouer")).toBeVisible();
    await expect(page.getByText("Paramètres")).toBeVisible();
    await expect(page.getByText("Règles")).toBeVisible();

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

  test("navigation vers les paramètres", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    await page.getByText("Paramètres").click();
    await expect(page.getByText("Difficulté des bots")).toBeVisible();
  });

  test("navigation vers les règles", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    await page.getByText("Règles").click();
    await expect(page.getByText("Le jeu", { exact: true })).toBeVisible();
    await expect(page.getByText("Distribution")).toBeVisible();
  });
});
