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

    // Attendre que la distribution se termine et les enchères commencent.
    await expect(page.getByTestId("enchere-passer")).toBeVisible({ timeout: 20000 });

    // Aucune erreur JS pendant la distribution
    expect(erreursPage).toEqual([]);
  });

  test("termine la distribution restante et permet de jouer une premiere carte", async ({
    page,
  }) => {
    const erreursPage: string[] = [];
    page.on("pageerror", (err) => {
      erreursPage.push(err.message);
    });

    await page.goto("/", { waitUntil: "networkidle" });
    await page.getByTestId("bouton-jouer").click();

    await expect(page.getByTestId("enchere-prendre")).toBeVisible({ timeout: 20000 });
    await page.getByTestId("enchere-prendre").click();

    const mainJoueur = page.getByTestId("main-joueur");
    await expect(mainJoueur).toBeVisible({ timeout: 30000 });

    const cartesMain = page.locator('[data-testid^="carte-main-"]');
    const nbCartesAvant = await cartesMain.count();
    expect(nbCartesAvant).toBeGreaterThan(0);

    const trouverIndexCarteJouable = async () => {
      const nbCartes = await cartesMain.count();
      for (let index = 0; index < nbCartes; index += 1) {
        const carte = cartesMain.nth(index);
        const ariaDisabled = await carte.getAttribute("aria-disabled");
        const disabled = await carte.getAttribute("disabled");
        if (ariaDisabled !== "true" && disabled === null && (await carte.isVisible())) {
          return index;
        }
      }

      return -1;
    };

    await expect.poll(trouverIndexCarteJouable, { timeout: 30000 }).not.toBe(-1);
    const indexCarteJouable = await trouverIndexCarteJouable();

    await cartesMain.nth(indexCarteJouable).click();

    await expect
      .poll(async () => cartesMain.count(), { timeout: 5000 })
      .toBeLessThan(nbCartesAvant);
    expect(erreursPage).toEqual([]);
  });
});
