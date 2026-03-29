# Etape 9 Tests Integration E2E Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fermer l'etape 9 en ajoutant des tests d'integration du controleur, des tests composants critiques, des e2e web responsives Playwright et un runner natif mobile Maestro.

**Architecture:** Les tests restent hybrides. RNTL couvre l'orchestration JS et les composants critiques, Playwright couvre le responsive web exporte, et Maestro couvre les parcours natifs les plus robustes. Les ajustements de code applicatif doivent rester minimaux et se limiter a des `testID`, labels ou petits points de stabilite des tests.

**Tech Stack:** TypeScript strict, Jest + jest-expo, React Native Testing Library, Playwright, Maestro, Expo Router

---

### Task 1: Renforcer l'integration de `useControleurJeu`

**Files:**

- Modify: `apps/mobile/__tests__/useControleurJeuDistribution.test.ts`
- Modify: `apps/mobile/__tests__/useControleurJeuPli.test.ts`

- [ ] **Step 1: Ecrire le test rouge pour un cycle prise -> jeu -> premier pli**

Ajouter un test qui verrouille un parcours complet et lisible:

```ts
it("passe des encheres au jeu puis verrouille le pli avant le ramassage", async () => {
  const { result } = renderHook(() =>
    useControleurJeu({
      difficulte: "facile",
      scoreObjectif: 1000,
      largeurEcran: 1280,
      hauteurEcran: 720,
    }),
  );

  await viderFileEvenements();
  act(() => {
    result.current.prendre();
  });

  await viderFileEvenements(30);

  expect(result.current.etatJeu.phaseUI).toBe("jeu");
  expect(result.current.etatJeu.estTourHumain).toBe(true);
  expect(result.current.etatJeu.cartesJouables.length).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Lancer le test cible et verifier l'echec**

Run:

```bash
pnpm --filter @belote/mobile test -- --runInBand __tests__/useControleurJeuDistribution.test.ts
```

Expected: `FAIL` sur le nouveau scenario ou sur une hypothese d'orchestration encore non couverte

- [ ] **Step 3: Ecrire le test rouge pour la transition de fin de pli**

Ajouter dans `useControleurJeuPli.test.ts` un test sur l'etat verrouille visible:

```ts
it("vide les cartes jouables et conserve le pli visible pendant finPli", () => {
  const resultat = appliquerEtatVerrouillePendantFinPli(
    precedent,
    nouvelEtat,
    pliVisible,
  );

  expect(resultat.phaseUI).toBe("finPli");
  expect(resultat.estTourHumain).toBe(false);
  expect(resultat.cartesJouables).toEqual([]);
  expect(resultat.pliEnCours).toEqual(pliVisible);
});
```

- [ ] **Step 4: Lancer le test cible et verifier l'echec**

Run:

```bash
pnpm --filter @belote/mobile test -- --runInBand __tests__/useControleurJeuPli.test.ts
```

Expected: `FAIL` sur le nouveau cas ajoute

- [ ] **Step 5: Ajouter la correction minimale si un manque reel apparait**

Si les nouveaux tests echouent pour une vraie lacune d'orchestration, corriger dans le hook ou dans les helpers visuels existants. Si le code passe deja, ne rien changer cote production.

- [ ] **Step 6: Rejouer les deux suites et verifier le vert**

Run:

```bash
pnpm --filter @belote/mobile test -- --runInBand __tests__/useControleurJeuDistribution.test.ts __tests__/useControleurJeuPli.test.ts
```

Expected: `PASS`, sans erreurs Jest inattendues

- [ ] **Step 7: Commit**

```bash
git add apps/mobile/__tests__/useControleurJeuDistribution.test.ts apps/mobile/__tests__/useControleurJeuPli.test.ts
git commit -m "test(mobile): couvrir les transitions du controleur de jeu"
```

### Task 2: Ajouter un vrai test d'integration de `PlateauJeu` et les selecteurs minimaux

**Files:**

- Create: `apps/mobile/__tests__/PlateauJeu.integration.test.tsx`
- Modify: `apps/mobile/components/game/PlateauJeu.tsx`
- Modify: `apps/mobile/components/game/PanneauEncheres.tsx`
- Modify: `apps/mobile/components/game/TableauScores.tsx`
- Modify: `apps/mobile/components/game/MainJoueur.tsx`
- Modify: `apps/mobile/components/game/DialogueFinPartie.tsx`

- [ ] **Step 1: Ecrire le test rouge de `PlateauJeu` avec `useControleurJeu` mocke**

Le test doit verifier les etats critiques visibles sans dependre des animations:

```ts
it("affiche le score, le panneau d'encheres et la main interactive quand le tour humain commence", () => {
  mockedUseControleurJeu.mockReturnValue({
    etatJeu: {
      phaseUI: "jeu",
      phaseEncheres: null,
      estTourHumain: true,
      cartesJouables: [{ couleur: "coeur", rang: "as" }],
      scoreEquipe1: 42,
      scoreEquipe2: 18,
      // ...
    },
    // ...
  });

  render(<PlateauJeu />);

  expect(screen.getByTestId("tableau-scores")).toBeTruthy();
  expect(screen.getByTestId("main-joueur")).toBeTruthy();
});
```

- [ ] **Step 2: Lancer le test et verifier l'echec sur les selecteurs manquants**

Run:

```bash
pnpm --filter @belote/mobile test -- --runInBand __tests__/PlateauJeu.integration.test.tsx
```

Expected: `FAIL` car les `testID` ou labels attendus n'existent pas encore

- [ ] **Step 3: Ajouter les `testID` et labels strictement necessaires**

Objectif minimal:

- `tableau-scores`
- `score-equipe1`
- `score-equipe2`
- `panneau-encheres`
- `action-prendre`
- `action-passer`
- `main-joueur`
- `carte-jouable-<index>` ou equivalent stable
- `dialogue-fin-partie`

Exemple cible:

```tsx
<View testID="tableau-scores">
  <Text testID="score-equipe1">{scoreEquipe1}</Text>
  <Text testID="score-equipe2">{scoreEquipe2}</Text>
</View>
```

- [ ] **Step 4: Rejouer le test d'integration et verifier le vert**

Run:

```bash
pnpm --filter @belote/mobile test -- --runInBand __tests__/PlateauJeu.integration.test.tsx
```

Expected: `PASS`

- [ ] **Step 5: Elargir legerement le test pour les dialogues de fin**

Ajouter un cas `scoresManche` et un cas `finPartie` afin de verrouiller:

- visibilite du resume de manche
- visibilite du bouton `Continuer`
- visibilite du bouton `Nouvelle partie`

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/__tests__/PlateauJeu.integration.test.tsx apps/mobile/components/game/PlateauJeu.tsx apps/mobile/components/game/PanneauEncheres.tsx apps/mobile/components/game/TableauScores.tsx apps/mobile/components/game/MainJoueur.tsx apps/mobile/components/game/DialogueFinPartie.tsx
git commit -m "test(mobile): ajouter l'integration de plateau jeu"
```

### Task 3: Etendre les e2e web responsives avec Playwright

**Files:**

- Create: `apps/mobile/e2e/partie-responsive.spec.ts`
- Modify: `apps/mobile/e2e/navigation.spec.ts`
- Modify: `apps/mobile/e2e/distribution.spec.ts`

- [ ] **Step 1: Ecrire la spec rouge desktop/mobile sur la partie**

Ajouter une spec qui s'appuie sur les projects Playwright existants:

```ts
test("le score et les controles de partie restent visibles apres lancement", async ({
  page,
}) => {
  await page.goto("/", { waitUntil: "networkidle" });
  await page.getByTestId("bouton-jouer").click();

  await expect(page.getByTestId("tableau-scores")).toBeVisible();
  await expect(page.getByTestId("panneau-encheres")).toBeVisible();
  await expect(page.getByTestId("action-passer")).toBeVisible();
});
```

- [ ] **Step 2: Lancer la spec seule et verifier l'echec**

Run:

```bash
cd apps/mobile
npx expo export --platform web
npx playwright test e2e/partie-responsive.spec.ts --project=desktop-chromium
```

Expected: `FAIL` initial, soit sur un selecteur, soit sur un etat encore mal expose

- [ ] **Step 3: Completer les assertions responsive**

Ajouter au minimum:

- verification du meme flow sur `mobile-chrome`
- verification que les boutons d'accueil et de parametres restent exploitables
- verification qu'aucune erreur `pageerror` n'est emise pendant le chargement de la partie

- [ ] **Step 4: Lancer la spec sur les deux projets et verifier le vert**

Run:

```bash
cd apps/mobile
npx expo export --platform web
npx playwright test e2e/partie-responsive.spec.ts --project=desktop-chromium --project=mobile-chrome
```

Expected: `2 passed` pour la nouvelle spec, sans erreur JS critique

- [ ] **Step 5: Rejouer toute la suite e2e web**

Run:

```bash
pnpm --filter @belote/mobile test:e2e
```

Expected: toutes les specs Playwright passent

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/e2e/partie-responsive.spec.ts apps/mobile/e2e/navigation.spec.ts apps/mobile/e2e/distribution.spec.ts
git commit -m "test(mobile): etendre les e2e web responsives"
```

### Task 4: Ajouter le runner natif mobile Maestro

**Files:**

- Create: `apps/mobile/maestro/README.md`
- Create: `apps/mobile/maestro/navigation-parametres.yaml`
- Create: `apps/mobile/maestro/demarrer-partie.yaml`
- Modify: `apps/mobile/package.json`
- Modify: `apps/mobile/components/game/PanneauEncheres.tsx`
- Modify: `apps/mobile/components/game/MainJoueur.tsx`

- [ ] **Step 1: Documenter les pre-requis natifs**

`README.md` doit indiquer clairement:

- Android-first pour cette etape, car `apps/mobile/app.json` expose seulement `android.package`
- pre-requis: build installee avec `com.chiienton.belote`
- commande de lancement des flows

Exemple:

```md
- installer Maestro CLI
- lancer un emulateur Android
- installer un build `development` ou `preview`
- executer `maestro test maestro/navigation-parametres.yaml`
```

- [ ] **Step 2: Ecrire le flow rouge de navigation parametres**

```yaml
appId: com.chiienton.belote
---
- launchApp
- tapOn:
    id: bouton-parametres
- assertVisible: "Difficulte des bots"
- tapOn:
    id: difficulte-moyen
```

- [ ] **Step 3: Ecrire le flow rouge de demarrage de partie**

```yaml
appId: com.chiienton.belote
---
- launchApp
- tapOn:
    id: bouton-jouer
- assertVisible:
    id: panneau-encheres
- assertVisible:
    id: action-passer
```

- [ ] **Step 4: Lancer un flow Maestro et verifier l'echec initial**

Run:

```bash
cd apps/mobile
maestro test maestro/demarrer-partie.yaml
```

Expected: `FAIL` si un selecteur natif manque encore, ou `PASS` si les selecteurs ajoutes a la Task 2 suffisent deja

- [ ] **Step 5: Ajouter les scripts package et les derniers selecteurs utiles**

Ajouter dans `apps/mobile/package.json`:

```json
{
  "scripts": {
    "test:e2e:native": "maestro test maestro",
    "test:e2e:native:partie": "maestro test maestro/demarrer-partie.yaml"
  }
}
```

Ne pas ajouter de dependance JS pour Maestro si le binaire CLI est utilise hors npm.

- [ ] **Step 6: Rejouer les flows Maestro**

Run:

```bash
cd apps/mobile
maestro test maestro/navigation-parametres.yaml
maestro test maestro/demarrer-partie.yaml
```

Expected: `2 passed`

- [ ] **Step 7: Commit**

```bash
git add apps/mobile/maestro/README.md apps/mobile/maestro/navigation-parametres.yaml apps/mobile/maestro/demarrer-partie.yaml apps/mobile/package.json apps/mobile/components/game/PanneauEncheres.tsx apps/mobile/components/game/MainJoueur.tsx
git commit -m "test(mobile): ajouter les flows natifs maestro"
```

### Task 5: Mettre a jour l'avancement, verifier puis finaliser

**Files:**

- Modify: `AVANCEMENT.md`

- [ ] **Step 1: Mettre a jour l'etape 9 dans `AVANCEMENT.md`**

Cocher au minimum:

- `Tests d'integration : parties completes simulees`
- `Tests de composants avec React Native Testing Library`
- `Tests E2E avec Maestro`
- `Verifier le responsive (web desktop + mobile)`

Ajouter une note recente concise sur l'ajout de Playwright responsive + Maestro.

- [ ] **Step 2: Lancer la verification mobile complete**

Run:

```bash
pnpm --filter @belote/mobile test -- --runInBand
pnpm --filter @belote/mobile test:e2e
```

Expected: suites Jest et Playwright vertes

- [ ] **Step 3: Lancer la verification Maestro**

Run:

```bash
cd apps/mobile
maestro test maestro
```

Expected: tous les flows Maestro passent sur l'emulateur Android configure

- [ ] **Step 4: Si les modifications depassent le package mobile, lancer la verification transverse**

Run:

```bash
pnpm turbo typecheck test
```

Expected: vert, ou bien justification claire si cette verification est inutile pour le diff final

- [ ] **Step 5: Relire le diff**

Run:

```bash
git diff --stat
git status --short
```

Expected: uniquement les fichiers attendus par l'etape 9

- [ ] **Step 6: Commit final de cloture**

```bash
git add AVANCEMENT.md apps/mobile
git commit -m "test(mobile): finaliser l'etape 9 des tests"
```
