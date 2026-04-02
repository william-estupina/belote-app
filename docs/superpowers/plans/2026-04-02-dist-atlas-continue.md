# Distribution atlas continue jusqu'a main jouable Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Garder toute la distribution visible dans une scene Skia atlas unique, puis basculer vers `MainJoueur` une seule fois quand la main sud devient jouable.

**Architecture:** La mise en oeuvre part de la base existante `CanvasCartesUnifie` et renforce `useAnimationsDistribution` pour en faire l'orchestrateur principal du mode `cinematique-distribution`. `useControleurJeu` et `useOrchestrationDistribution` exposent ensuite un mode de rendu explicite et un handoff unique vers `MainJoueur`, sans coutures visuelles intermediaires.

**Tech Stack:** Expo SDK 54, React Native, react-native-reanimated v4, @shopify/react-native-skia, Jest, TypeScript strict

---

## Structure de fichiers cible

- Modifier : `apps/mobile/hooks/useAnimationsDistribution.ts`
  Coeur de la scene atlas de distribution, sous-phases cine, slots persistants sud/adversaires/centre.

- Modifier : `apps/mobile/components/game/CanvasCartesUnifie.tsx`
  Support du nombre final de slots et du rendu des sprites centre + mains.

- Modifier : `apps/mobile/components/game/CoucheAnimation.tsx`
  Surface atlas complete quand `modeRenduCartes === "cinematique-distribution"`.

- Modifier : `apps/mobile/hooks/useOrchestrationDistribution.ts`
  Traduction des phases metier en sous-phases cine et handoff unique.

- Modifier : `apps/mobile/hooks/useControleurJeu.ts`
  Exposition de `modeRenduCartes`, `phaseDistributionCinematique` et suppression des mises a jour visuelles concurrentes.

- Modifier : `apps/mobile/components/game/PlateauJeu.tsx`
  Routage explicite entre scene atlas complete et `MainJoueur`.

- Modifier : `apps/mobile/components/game/MainJoueur.tsx`
  Confirmer le role "jeu interactif uniquement".

- Modifier : `apps/mobile/__tests__/useAnimationsDistribution.test.ts`
  Couvrir les sous-phases cine et la persistance atlas sud.

- Modifier : `apps/mobile/__tests__/useControleurJeuDistribution.test.ts`
  Couvrir le contrat de handoff unique.

- Modifier : `apps/mobile/__tests__/CoucheAnimation.test.tsx`
  Couvrir le mode scene atlas complete.

- Modifier : `apps/mobile/__tests__/PlateauJeu.test.tsx`
  Couvrir le routage `cinematique-distribution` / `jeu-interactif`.

---

### Task 1: Poser le contrat de rendu et le verrouiller par tests

**Files:**

- Modify: `apps/mobile/hooks/useControleurJeu.ts`
- Modify: `apps/mobile/__tests__/useControleurJeuDistribution.test.ts`
- Modify: `apps/mobile/__tests__/PlateauJeu.test.tsx`

- [ ] **Step 1: Ecrire le test de mode de rendu explicite**

Ajouter dans `apps/mobile/__tests__/useControleurJeuDistribution.test.ts` un cas qui fixe le contrat :

```ts
it("reste en mode cinematique-distribution jusqu'au handoff final", async () => {
  const { result } = renderHook(() =>
    useControleurJeu({
      difficulte: "facile",
      scoreObjectif: 1000,
      largeurEcran: 1280,
      hauteurEcran: 720,
    }),
  );

  expect(result.current.etatJeu.phaseUI).toBe("distribution");
  expect(result.current.modeRenduCartes).toBe("cinematique-distribution");

  await avancerJusqua(() => result.current.etatJeu.phaseUI === "encheres");

  expect(result.current.modeRenduCartes).toBe("cinematique-distribution");
});
```

- [ ] **Step 2: Ecrire le test de routage du plateau**

Ajouter dans `apps/mobile/__tests__/PlateauJeu.test.tsx` un cas de rendu du plateau :

```ts
it("ne rend pas MainJoueur comme surface principale pendant la cinematique", () => {
  mockUseControleurJeu.mockReturnValue({
    ...BASE_CONTROLEUR,
    etatJeu: {
      ...BASE_CONTROLEUR.etatJeu,
      phaseUI: "distribution",
    },
    modeRenduCartes: "cinematique-distribution",
  });

  render(<PlateauJeu />);

  expect(screen.getByTestId("couche-animation-scene-atlas")).toBeTruthy();
  expect(screen.queryByTestId("main-joueur")).toBeNull();
});
```

- [ ] **Step 3: Introduire les nouveaux types minimaux dans le controleur**

Ajouter dans `apps/mobile/hooks/useControleurJeu.ts` :

```ts
export type ModeRenduCartes = "cinematique-distribution" | "jeu-interactif";

export type PhaseDistributionCinematique =
  | "distribution-initiale"
  | "revelation-carte"
  | "attente-encheres"
  | "redistribution"
  | "distribution-restante"
  | "tri-final-sud"
  | "pre-handoff"
  | "terminee";
```

Puis etendre `EtatJeu` :

```ts
modeRenduCartes: ModeRenduCartes;
phaseDistributionCinematique: PhaseDistributionCinematique | null;
```

- [ ] **Step 4: Initialiser le controleur sur le mode cine**

Dans l'etat initial de `useControleurJeu.ts`, ajouter :

```ts
    modeRenduCartes: "cinematique-distribution",
    phaseDistributionCinematique: "distribution-initiale",
```

- [ ] **Step 5: Retourner les nouveaux champs par le hook**

Dans le `return` de `useControleurJeu.ts`, exposer :

```ts
    modeRenduCartes: etatJeu.modeRenduCartes,
    phaseDistributionCinematique: etatJeu.phaseDistributionCinematique,
```

- [ ] **Step 6: Lancer les tests cibles**

Run: `pnpm --filter @belote/mobile test -- --runTestsByPath apps/mobile/__tests__/useControleurJeuDistribution.test.ts apps/mobile/__tests__/PlateauJeu.test.tsx`
Expected: les nouveaux cas echouent d'abord, puis passent apres branchement minimal.

- [ ] **Step 7: Commit**

```bash
git add apps/mobile/hooks/useControleurJeu.ts apps/mobile/__tests__/useControleurJeuDistribution.test.ts apps/mobile/__tests__/PlateauJeu.test.tsx
git commit -m "test(mobile): verrouiller le mode cine de distribution"
```

---

### Task 2: Etendre la scene atlas unifiee pour toute la distribution visible

**Files:**

- Modify: `apps/mobile/components/game/CanvasCartesUnifie.tsx`
- Modify: `apps/mobile/hooks/useAnimationsDistribution.ts`
- Modify: `apps/mobile/__tests__/useAnimationsDistribution.test.ts`

- [ ] **Step 1: Ecrire le test de persistance atlas sud jusqu'au handoff**

Ajouter dans `apps/mobile/__tests__/useAnimationsDistribution.test.ts` :

```ts
it("conserve les cartes sud visibles dans l'atlas apres leur arrivee et leur tri final", () => {
  const atlas: AtlasCartes = ATLAS_TEST;
  const { result } = renderHook(() =>
    useAnimationsDistribution(atlas, { largeur: 1280, hauteur: 720 }),
  );

  act(() => {
    result.current.lancerDistribution(MAINS_TEST, {
      indexDonneur: 1,
      cartesVisibles: MAINS_TEST.sud,
    });
  });

  act(() => {
    jest.runOnlyPendingTimers();
  });

  expect(result.current.enCours).toBe(true);
  expect(result.current.nbCartesActivesSud.value).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Normaliser les slots de la scene unifiee**

Dans `apps/mobile/hooks/useAnimationsDistribution.ts`, introduire un type de slot de scene :

```ts
type ZoneSceneDistribution =
  | "sud"
  | "nord"
  | "ouest"
  | "est"
  | "paquet"
  | "carte-retournee";

interface SlotSceneDistribution {
  id: string;
  zone: ZoneSceneDistribution;
  rectSource: RectSource;
  visible: boolean;
}
```

- [ ] **Step 3: Augmenter le nombre de slots de la scene**

Dans `apps/mobile/components/game/CanvasCartesUnifie.tsx`, remplacer les constantes :

```ts
export const MAX_SLOTS_MAINS = 32;
export const MAX_SLOTS_CENTRE = 12;
export const MAX_SLOTS = MAX_SLOTS_MAINS + MAX_SLOTS_CENTRE;
```

et mettre a jour le commentaire :

```ts
/** Nombre total de slots : 32 mains + 12 centre (paquet, carte retournee, glissements) */
```

- [ ] **Step 4: Alimenter les sprites du centre depuis le hook**

Dans `useAnimationsDistribution.ts`, preparer les sprites pour le centre avec les memes buffers que les mains :

```ts
const spritesScene = slotsScene.map((slot) =>
  rect(
    slot.rectSource.x,
    slot.rectSource.y,
    slot.rectSource.width,
    slot.rectSource.height,
  ),
);
```

et retourner :

```ts
  spritesScene,
  nbCartesActivesScene,
  progressionsScene,
  donneesWorkletScene,
```

- [ ] **Step 5: Garder `terminerDistribution` comme seule sortie de scene**

Verifier que `terminerDistribution()` reste le seul point qui coupe `enCours` :

```ts
const terminerDistribution = useCallback(() => {
  setEnCours(false);
  nbCartesActivesSud.value = 0;
  nbCartesActivesAdv.value = 0;
}, [nbCartesActivesSud, nbCartesActivesAdv]);
```

Si un compteur unique de scene est introduit, le reset doit se faire dessus a la place.

- [ ] **Step 6: Lancer les tests cibles**

Run: `pnpm --filter @belote/mobile test -- --runTestsByPath apps/mobile/__tests__/useAnimationsDistribution.test.ts`
Expected: les tests de scene atlas passent, sans regression sur les cas existants.

- [ ] **Step 7: Commit**

```bash
git add apps/mobile/components/game/CanvasCartesUnifie.tsx apps/mobile/hooks/useAnimationsDistribution.ts apps/mobile/__tests__/useAnimationsDistribution.test.ts
git commit -m "feat(mobile): unifier la scene atlas de distribution"
```

---

### Task 3: Basculer CoucheAnimation et PlateauJeu vers la scene atlas complete

**Files:**

- Modify: `apps/mobile/components/game/CoucheAnimation.tsx`
- Modify: `apps/mobile/components/game/PlateauJeu.tsx`
- Modify: `apps/mobile/__tests__/CoucheAnimation.test.tsx`
- Modify: `apps/mobile/__tests__/PlateauJeu.test.tsx`

- [ ] **Step 1: Ecrire le test de surface atlas complete**

Dans `apps/mobile/__tests__/CoucheAnimation.test.tsx`, ajouter :

```ts
it("rend la scene atlas complete quand la distribution est cine", () => {
  const props = creerProps({
    distributionEnCours: true,
    modeRenduCartes: "cinematique-distribution",
  });

  render(<CoucheAnimation {...props} />);

  expect(screen.getByTestId("couche-animation-scene-atlas")).toBeTruthy();
  expect(screen.queryByTestId("carte-animee")).toBeNull();
});
```

- [ ] **Step 2: Introduire le prop de mode dans CoucheAnimation**

Modifier l'interface de `CoucheAnimation.tsx` :

```ts
modeRenduCartes: "cinematique-distribution" | "jeu-interactif";
```

Puis remplacer la logique de rendu atlas multiple par un garde unique :

```tsx
const afficherSceneAtlas = modeRenduCartes === "cinematique-distribution";
```

- [ ] **Step 3: Monter `CanvasCartesUnifie` comme rendu principal**

Dans `CoucheAnimation.tsx`, rendre :

```tsx
{
  afficherSceneAtlas && (
    <View testID="couche-animation-scene-atlas">
      <CanvasCartesUnifie
        atlas={atlas}
        largeurEcran={largeurEcran}
        hauteurEcran={hauteurEcran}
        progressions={progressionsScene}
        donneesWorklet={donneesWorkletScene}
        nbCartesActives={nbCartesActivesScene}
        sprites={spritesScene}
      />
    </View>
  );
}
```

- [ ] **Step 4: Ne rendre MainJoueur que dans le mode interactif**

Dans `PlateauJeu.tsx`, remplacer le bloc principal :

```tsx
{
  etatJeu.modeRenduCartes === "jeu-interactif" && (
    <MainJoueur
      cartes={etatJeu.mainJoueur}
      largeurEcran={largeur}
      hauteurEcran={hauteur}
      atlas={atlas}
      cartesJouables={
        etatJeu.phaseUI === "jeu" && etatJeu.estTourHumain
          ? etatJeu.cartesJouables
          : undefined
      }
      interactionActive={etatJeu.phaseUI === "jeu" && etatJeu.estTourHumain}
      onCarteJouee={jouerCarte}
    />
  );
}
```

- [ ] **Step 5: Passer le mode a CoucheAnimation**

Toujours dans `PlateauJeu.tsx`, ajouter :

```tsx
            modeRenduCartes={etatJeu.modeRenduCartes}
```

- [ ] **Step 6: Lancer les tests cibles**

Run: `pnpm --filter @belote/mobile test -- --runTestsByPath apps/mobile/__tests__/CoucheAnimation.test.tsx apps/mobile/__tests__/PlateauJeu.test.tsx`
Expected: la scene atlas est la seule surface de distribution, `MainJoueur` n'apparait qu'en mode interactif.

- [ ] **Step 7: Commit**

```bash
git add apps/mobile/components/game/CoucheAnimation.tsx apps/mobile/components/game/PlateauJeu.tsx apps/mobile/__tests__/CoucheAnimation.test.tsx apps/mobile/__tests__/PlateauJeu.test.tsx
git commit -m "feat(mobile): router la distribution vers la scene atlas complete"
```

---

### Task 4: Remplacer le handoff actuel par un handoff unique pre-handoff -> jeu-interactif

**Files:**

- Modify: `apps/mobile/hooks/useOrchestrationDistribution.ts`
- Modify: `apps/mobile/hooks/useControleurJeu.ts`
- Modify: `apps/mobile/components/game/MainJoueur.tsx`
- Modify: `apps/mobile/__tests__/useControleurJeuDistribution.test.ts`

- [ ] **Step 1: Ecrire le test de handoff unique**

Ajouter dans `apps/mobile/__tests__/useControleurJeuDistribution.test.ts` :

```ts
it("bascule vers jeu-interactif une seule fois quand la main finale est prete", async () => {
  const { result } = renderHook(() =>
    useControleurJeu({
      difficulte: "facile",
      scoreObjectif: 1000,
      largeurEcran: 1280,
      hauteurEcran: 720,
    }),
  );

  await avancerJusqua(
    () => result.current.phaseDistributionCinematique === "pre-handoff",
  );

  expect(result.current.modeRenduCartes).toBe("cinematique-distribution");

  await avancerJusqua(() => result.current.modeRenduCartes === "jeu-interactif");

  expect(result.current.etatJeu.mainJoueur).toHaveLength(5);
});
```

- [ ] **Step 2: Introduire la sous-phase `pre-handoff` dans l'orchestrateur**

Dans `apps/mobile/hooks/useOrchestrationDistribution.ts`, juste avant de liberer la main React Native :

```ts
setEtatJeu((prev) => ({
  ...prev,
  mainJoueur: mainTriee,
  modeRenduCartes: "cinematique-distribution",
  phaseDistributionCinematique: "pre-handoff",
}));
```

- [ ] **Step 3: Basculer en mode interactif sur un seul tick**

Toujours dans `useOrchestrationDistribution.ts`, remplacer le vieux couple `triMainDiffere` / `terminerDistribution` par :

```ts
const timeoutTerminer = setTimeout(() => {
  animDistribution.terminerDistribution();
  setEtatJeu((prev) => ({
    ...prev,
    modeRenduCartes: "jeu-interactif",
    phaseDistributionCinematique: "terminee",
  }));
}, 16);
```

- [ ] **Step 4: Ne plus animer l'entree de MainJoueur apres le handoff**

Dans `apps/mobile/components/game/MainJoueur.tsx`, forcer le rendu de reprise sans animation d'entree :

```ts
  animerNouvellesCartes = false,
```

et retirer toute dependance au mode `reception` pour la reprise finale si elle ne sert plus que la distribution.

- [ ] **Step 5: Conserver l'interaction desactivee avant le switch**

Dans `useControleurJeu.ts`, verifier que l'interaction reste derivee du mode :

```ts
const interactionMainActive =
  etatJeu.modeRenduCartes === "jeu-interactif" &&
  etatJeu.phaseUI === "jeu" &&
  etatJeu.estTourHumain;
```

- [ ] **Step 6: Lancer les tests cibles**

Run: `pnpm --filter @belote/mobile test -- --runTestsByPath apps/mobile/__tests__/useControleurJeuDistribution.test.ts`
Expected: une seule bascule, aucune interaction possible avant `jeu-interactif`.

- [ ] **Step 7: Commit**

```bash
git add apps/mobile/hooks/useOrchestrationDistribution.ts apps/mobile/hooks/useControleurJeu.ts apps/mobile/components/game/MainJoueur.tsx apps/mobile/__tests__/useControleurJeuDistribution.test.ts
git commit -m "feat(mobile): introduire un handoff unique vers la main jouable"
```

---

### Task 5: Faire entrer revelation, carte retournee et redistribution dans le meme pipeline

**Files:**

- Modify: `apps/mobile/hooks/useAnimationsDistribution.ts`
- Modify: `apps/mobile/hooks/useOrchestrationDistribution.ts`
- Modify: `apps/mobile/components/game/PlateauJeu.tsx`
- Modify: `apps/mobile/__tests__/useControleurJeuDistribution.test.ts`

- [ ] **Step 1: Ecrire le test de sequence complete**

Ajouter dans `apps/mobile/__tests__/useControleurJeuDistribution.test.ts` :

```ts
it("garde le mode cine pendant revelation, redistribution et distribution restante", async () => {
  const { result } = renderHook(() =>
    useControleurJeu({
      difficulte: "facile",
      scoreObjectif: 1000,
      largeurEcran: 1280,
      hauteurEcran: 720,
    }),
  );

  await avancerJusqua(() => result.current.etatJeu.phaseUI === "encheres");
  act(() => result.current.prendre());
  await avancerJusqua(() => result.current.etatJeu.phaseUI === "jeu");

  expect(result.current.modeRenduCartes).toBe("jeu-interactif");
});
```

Pendant les etapes intermediaires, les assertions attendues doivent rester :

```ts
expect(result.current.modeRenduCartes).toBe("cinematique-distribution");
```

- [ ] **Step 2: Marquer explicitement les sous-phases cine dans l'orchestrateur**

Dans `apps/mobile/hooks/useOrchestrationDistribution.ts`, appliquer les transitions :

```ts
phaseDistributionCinematique: "revelation-carte";
phaseDistributionCinematique: "attente-encheres";
phaseDistributionCinematique: "redistribution";
phaseDistributionCinematique: "distribution-restante";
phaseDistributionCinematique: "tri-final-sud";
```

au lieu de derivations implicites uniquement via `phaseUI`.

- [ ] **Step 3: Retirer la carte retournee du rendu principal React pendant la cine**

Dans `PlateauJeu.tsx`, garder `CarteRevelation` et `ReserveCentrale` uniquement si :

```ts
const utiliserFallbackCentre = false;
```

ou, si la migration est incrementale, conditionner leur rendu a :

```ts
etatJeu.modeRenduCartes === "jeu-interactif";
```

de sorte que la scene atlas soit seule maitre du centre pendant la distribution.

- [ ] **Step 4: Ajouter les slots centre dans le hook**

Dans `useAnimationsDistribution.ts`, remplir les slots centre avec le dos du paquet et la carte retournee :

```ts
slotsScene.push({
  id: "centre-carte-retournee",
  zone: "carte-retournee",
  rectSource: calculerRectoSource(
    largeurCellule,
    hauteurCellule,
    carte.couleur,
    carte.rang,
  ),
  visible: true,
});
```

- [ ] **Step 5: Lancer les tests cibles**

Run: `pnpm --filter @belote/mobile test -- --runTestsByPath apps/mobile/__tests__/useControleurJeuDistribution.test.ts`
Expected: le mode cine couvre toute la narration de distribution jusqu'au handoff final.

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/hooks/useAnimationsDistribution.ts apps/mobile/hooks/useOrchestrationDistribution.ts apps/mobile/components/game/PlateauJeu.tsx apps/mobile/__tests__/useControleurJeuDistribution.test.ts
git commit -m "feat(mobile): garder toute la narration de distribution dans l atlas"
```

---

### Task 6: Verification finale multi-plateforme

**Files:**

- Modify: `docs/superpowers/specs/2026-04-02-dist-atlas-continue-design.md`
- Modify: `docs/superpowers/plans/2026-04-02-dist-atlas-continue.md`

- [ ] **Step 1: Lancer les tests unitaires et integration mobile**

Run: `pnpm --filter @belote/mobile test`
Expected: suite mobile verte, y compris les nouveaux contrats de rendu.

- [ ] **Step 2: Lancer le typecheck mobile**

Run: `pnpm --filter @belote/mobile typecheck`
Expected: aucune erreur TypeScript.

- [ ] **Step 3: Verifier le web e2e**

Run: `pnpm --filter @belote/mobile test:e2e`
Expected: pas de saut visible avant la premiere interaction possible.

- [ ] **Step 4: Verification manuelle**

Verifier sur web, iOS et Android :

```text
1. La main sud reste atlas jusqu'a sa position finale triee.
2. Aucune carte ne disparait une frame avant le handoff.
3. La carte retournee reste dans le pipeline atlas.
4. Apres le handoff, les cartes sud deviennent jouables sans animation parasite.
5. La redistribution apres double passe garde la meme continuite.
```

- [ ] **Step 5: Mettre a jour la spec et le plan si un ecart de plateforme apparait**

Si une plateforme impose une adaptation reelle, consigner la decision directement dans les deux docs avant merge.

- [ ] **Step 6: Commit**

```bash
git add docs/superpowers/specs/2026-04-02-dist-atlas-continue-design.md docs/superpowers/plans/2026-04-02-dist-atlas-continue.md
git commit -m "chore(mobile): finaliser la doc de verification de la distribution atlas continue"
```
