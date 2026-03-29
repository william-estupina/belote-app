# Animation retour paquet redistribution — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Animer la carte retournée qui retourne dans le paquet lors de la redistribution (quand tout le monde a passé), puis animer les cartes des mains vers la vraie position du paquet.

**Architecture:** Deux phases séquentielles liées par callback : phase 1 = carte retournée vole de sa position vers le paquet (flip face → dos), phase 2 = mains des 4 joueurs volent en vagues vers le paquet. La vraie position du paquet est calculée dynamiquement via `calculerDispositionReserveCentrale`. La carte retournée reste visible (via `PlateauJeu.tsx`) jusqu'au démarrage de l'animation, puis est remplacée par un `carteEnVol`.

**Tech Stack:** React Native, TypeScript, react-native-reanimated v4, Jest + @testing-library/react-native

**Spec:** `docs/superpowers/specs/2026-03-29-animation-retour-paquet-redistribution.md`

---

## Fichiers modifiés

| Fichier                                       | Changement                                                                                                     |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `apps/mobile/constants/layout.ts`             | Ajouter `dureeRetourCarteRetournee` dans `ANIMATIONS.redistribution`                                           |
| `apps/mobile/hooks/useAnimations.ts`          | Nouvelle fonction `lancerAnimationRetourCarteRetournee` + modifier signature `lancerAnimationRetourPaquet`     |
| `apps/mobile/components/game/PlateauJeu.tsx`  | Étendre condition visibilité carte retournée à `phaseUI === "redistribution"`                                  |
| `apps/mobile/hooks/useControleurJeu.ts`       | Restructurer `lancerRedistributionAnimee` : retirer `carteRetournee: null` immédiat, séquencer les deux phases |
| `apps/mobile/__tests__/useAnimations.test.ts` | Mettre à jour test existant `lancerAnimationRetourPaquet` + ajouter test `lancerAnimationRetourCarteRetournee` |

---

## Task 1 — Constante de durée dans `layout.ts`

**Files:**

- Modify: `apps/mobile/constants/layout.ts`

- [ ] **Step 1 : Ajouter la constante**

Dans `ANIMATIONS.redistribution`, après `dureeGlissementDealer` :

```ts
redistribution: {
  pauseAvantRappel: accelererDureeAnimation(300),
  dureeGlissementDealer: 500,
  dureeRetourCarteRetournee: ralentirDureeAnimationMajeure(500), // duree du retour de la carte retournee vers le paquet (ms)
},
```

- [ ] **Step 2 : Vérifier la compilation TypeScript**

```bash
cd apps/mobile && npx tsc --noEmit 2>&1 | head -20
```

Attendu : aucune erreur.

- [ ] **Step 3 : Commit**

```bash
git add apps/mobile/constants/layout.ts
git commit -m "feat(mobile): ajouter constante dureeRetourCarteRetournee"
```

---

## Task 2 — Modifier `lancerAnimationRetourPaquet` (signature + test)

**Files:**

- Modify: `apps/mobile/hooks/useAnimations.ts`
- Test: `apps/mobile/__tests__/useAnimations.test.ts`

- [ ] **Step 1 : Mettre à jour le test existant pour la nouvelle signature**

Dans `apps/mobile/__tests__/useAnimations.test.ts`, l'appel à `lancerAnimationRetourPaquet` (ligne ~63) passe actuellement `surFin` comme deuxième argument. Le mettre à jour pour la nouvelle signature `(cartes, arrivee, onTerminee?)` et vérifier que `arrivee` est bien utilisée dans les coordonnées :

```ts
// Remplacer l'appel existant :
result.current.lancerAnimationRetourPaquet(
  [
    {
      carte: CARTE_TEST,
      depart: { x: 0.5, y: 0.92, rotation: 0, echelle: 1 },
      delai: 0,
      flipDe: 180,
      flipVers: 0,
    },
    {
      carte: { couleur: "coeur", rang: "roi" },
      depart: { x: 0.1, y: 0.5, rotation: 90, echelle: 0.6 },
      delai: ANIMATIONS.distribution.delaiEntreVaguesRetourPaquet,
    },
  ],
  { x: 0.38, y: 0.45 }, // arrivee — position du paquet (pas le centre)
  surFin,
);
```

Et mettre à jour l'assertion sur `arrivee` pour vérifier les coordonnées :

```ts
expect(result.current.cartesEnVol[0]).toMatchObject({
  id: "retour-1",
  carte: CARTE_TEST,
  faceVisible: false,
  segment: 0,
  delai: 0,
  arrivee: { x: 0.38, y: 0.45, echelle: 0.85 },
  flipDe: 180,
  flipVers: 0,
});
```

- [ ] **Step 2 : Vérifier que le test échoue**

```bash
cd apps/mobile && npx jest --testPathPattern=useAnimations --no-coverage 2>&1 | tail -20
```

Attendu : FAIL — TypeError ou assertion échoue sur `arrivee.x`.

- [ ] **Step 3 : Modifier la signature de `lancerAnimationRetourPaquet` dans `useAnimations.ts`**

Changer la signature de :

```ts
const lancerAnimationRetourPaquet = useCallback(
  (cartes: ReadonlyArray<CarteRetourPaquet>, onTerminee?: () => void) => {
```

En :

```ts
const lancerAnimationRetourPaquet = useCallback(
  (
    cartes: ReadonlyArray<CarteRetourPaquet>,
    arrivee: { x: number; y: number },
    onTerminee?: () => void,
  ) => {
```

Et dans le corps, remplacer :

```ts
arrivee: {
  x: ANIMATIONS.distribution.originX,
  y: ANIMATIONS.distribution.originY,
  rotation: 0,
  echelle: 0.85,
},
```

Par :

```ts
arrivee: {
  x: arrivee.x,
  y: arrivee.y,
  rotation: 0,
  echelle: 0.85,
},
```

- [ ] **Step 4 : Vérifier que le test passe**

```bash
cd apps/mobile && npx jest --testPathPattern=useAnimations --no-coverage 2>&1 | tail -20
```

Attendu : PASS (le test modifié + tous les autres tests du fichier).

- [ ] **Step 5 : Vérifier la compilation TypeScript**

```bash
cd apps/mobile && npx tsc --noEmit 2>&1 | head -30
```

Il y aura des erreurs TypeScript sur le site d'appel dans `useControleurJeu.ts` (l'ancienne signature). C'est attendu — sera corrigé en Task 5. Vérifier qu'il n'y a pas d'autres erreurs inattendues.

- [ ] **Step 6 : Commit**

```bash
git add apps/mobile/hooks/useAnimations.ts apps/mobile/__tests__/useAnimations.test.ts
git commit -m "feat(mobile): lancerAnimationRetourPaquet accepte une destination explicite"
```

---

## Task 3 — Nouvelle fonction `lancerAnimationRetourCarteRetournee`

**Files:**

- Modify: `apps/mobile/hooks/useAnimations.ts`
- Test: `apps/mobile/__tests__/useAnimations.test.ts`

- [ ] **Step 1 : Écrire le test**

Ajouter dans `apps/mobile/__tests__/useAnimations.test.ts` :

```ts
it("cree une carte retour-retournee-* face visible avec flip et appelle le callback de fin", () => {
  const surFin = jest.fn();
  const { result } = renderHook(() => useAnimations());

  const depart = { x: 0.58, y: 0.45, rotation: 0, echelle: 0.85 };
  const arrivee = { x: 0.38, y: 0.45 };

  act(() => {
    result.current.lancerAnimationRetourCarteRetournee(
      CARTE_TEST,
      depart,
      arrivee,
      surFin,
    );
  });

  expect(result.current.cartesEnVol).toHaveLength(1);
  expect(result.current.cartesEnVol[0]).toMatchObject({
    id: "retour-retournee-1",
    carte: CARTE_TEST,
    faceVisible: true,
    flipDe: 180,
    flipVers: 0,
    segment: 0,
    delai: 0,
    depart: { x: 0.58, y: 0.45, rotation: 0, echelle: 0.85 },
    arrivee: { x: 0.38, y: 0.45, rotation: 0, echelle: 0.85 },
    duree: ANIMATIONS.redistribution.dureeRetourCarteRetournee,
  });

  act(() => {
    jest.advanceTimersByTime(ANIMATIONS.redistribution.dureeRetourCarteRetournee - 1);
  });

  expect(surFin).not.toHaveBeenCalled();

  act(() => {
    jest.advanceTimersByTime(1);
  });

  expect(surFin).toHaveBeenCalledTimes(1);
});
```

- [ ] **Step 2 : Vérifier que le test échoue**

```bash
cd apps/mobile && npx jest --testPathPattern=useAnimations --no-coverage 2>&1 | tail -20
```

Attendu : FAIL — `result.current.lancerAnimationRetourCarteRetournee is not a function`.

- [ ] **Step 3 : Implémenter `lancerAnimationRetourCarteRetournee` dans `useAnimations.ts`**

Ajouter après `lancerAnimationRetourPaquet` :

```ts
const lancerAnimationRetourCarteRetournee = useCallback(
  (
    carte: Carte,
    depart: { x: number; y: number; rotation: number; echelle: number },
    arrivee: { x: number; y: number },
    onTerminee?: () => void,
  ) => {
    compteurId.current += 1;
    const id = `retour-retournee-${compteurId.current}`;

    const nouvelleCarteEnVol: CarteEnVol = {
      id,
      carte,
      depart,
      arrivee: {
        x: arrivee.x,
        y: arrivee.y,
        rotation: 0,
        echelle: 0.85,
      },
      faceVisible: true,
      flipDe: 180,
      flipVers: 0,
      delai: 0,
      duree: ANIMATIONS.redistribution.dureeRetourCarteRetournee,
      segment: 0,
      easing: "inout-cubic",
    };

    setCartesEnVol((precedent) => [...precedent, nouvelleCarteEnVol]);

    if (onTerminee) {
      const timeout = setTimeout(
        onTerminee,
        ANIMATIONS.redistribution.dureeRetourCarteRetournee,
      );
      timeoutsRef.current.push(timeout);
    }
  },
  [],
);
```

Ajouter `lancerAnimationRetourCarteRetournee` dans l'objet retourné par le hook.

- [ ] **Step 4 : Vérifier que tous les tests passent**

```bash
cd apps/mobile && npx jest --testPathPattern=useAnimations --no-coverage 2>&1 | tail -20
```

Attendu : PASS pour tous les tests du fichier.

- [ ] **Step 5 : Commit**

```bash
git add apps/mobile/hooks/useAnimations.ts apps/mobile/__tests__/useAnimations.test.ts
git commit -m "feat(mobile): ajouter lancerAnimationRetourCarteRetournee"
```

---

## Task 4 — Étendre la visibilité de la carte retournée dans `PlateauJeu.tsx`

**Files:**

- Modify: `apps/mobile/components/game/PlateauJeu.tsx`

- [ ] **Step 1 : Modifier la condition `carteRetourneeReserve`**

Trouver la ligne (~79) :

```ts
const carteRetourneeReserve =
  etatJeu.phaseUI === "encheres" ? etatJeu.carteRetournee : null;
```

La remplacer par :

```ts
const carteRetourneeReserve =
  etatJeu.phaseUI === "encheres" || etatJeu.phaseUI === "redistribution"
    ? etatJeu.carteRetournee
    : null;
```

- [ ] **Step 2 : Vérifier la compilation TypeScript**

```bash
cd apps/mobile && npx tsc --noEmit 2>&1 | head -20
```

Attendu : seules les erreurs déjà connues sur `useControleurJeu.ts` (site d'appel `lancerAnimationRetourPaquet`).

- [ ] **Step 3 : Commit**

```bash
git add apps/mobile/components/game/PlateauJeu.tsx
git commit -m "fix(mobile): conserver la carte retournee visible pendant la redistribution"
```

---

## Task 5 — Restructurer `lancerRedistributionAnimee` dans `useControleurJeu.ts`

**Files:**

- Modify: `apps/mobile/hooks/useControleurJeu.ts`

- [ ] **Step 1 : Retirer `carteRetournee: null` du `setEtatJeu` immédiat**

Dans `lancerRedistributionAnimee`, dans le premier `setEtatJeu` (ligne ~862), supprimer la ligne `carteRetournee: null`. La carte reste en état pendant la pause de 300ms.

Avant :

```ts
setEtatJeu((prev) => ({
  ...prev,
  phaseUI: "redistribution",
  indexDonneur: prev.indexDonneur,
  joueurActif: POSITIONS_JOUEUR[contexte.indexJoueurActif],
  phaseEncheres: prev.phaseEncheres,
  indexPreneur: null,
  couleurAtout: null,
  carteRetournee: null,   // ← supprimer cette ligne
  cartesRestantesPaquet: 1,
  ...
}));
```

- [ ] **Step 2 : Restructurer le callback du `setTimeout`**

Remplacer le contenu du `setTimeout` (callback de `pauseAvantRappel`) par la logique séquentielle à deux phases.

Le callback actuel :

```ts
const timeoutAvantRappel = setTimeout(() => {
  if (estDemonte.current) return;

  const cartesRetour = construireCartesRetourPaquet();

  setEtatJeu((prev) => ({
    ...prev,
    mainJoueur: [],
    nbCartesAdversaires: { nord: 0, est: 0, ouest: 0 },
    phaseEncheres: null,
    historiqueEncheres: [],
    cartesRestantesPaquet: 1,
    afficherActionsEnchereRedistribution: false,
  }));

  animations.lancerAnimationRetourPaquet(cartesRetour, () => {
    if (estDemonte.current) return;

    setEtatJeu((prev) => ({
      ...prev,
      cartesRestantesPaquet: 32,
      indexDonneur: contexte.indexDonneur,
    }));

    const timeoutApresDealer = setTimeout(() => {
      if (estDemonte.current) return;
      lancerDistributionAnimee(contexte);
    }, ANIMATIONS.redistribution.dureeGlissementDealer);

    timeoutsControleurRef.current.push(timeoutApresDealer);
  });
}, ANIMATIONS.redistribution.pauseAvantRappel);
```

Remplacer par :

```ts
const timeoutAvantRappel = setTimeout(() => {
  if (estDemonte.current) return;

  const { largeur, hauteur } = dimensionsEcranRef.current;
  const disposition = calculerDispositionReserveCentrale({
    largeurEcran: largeur,
    hauteurEcran: hauteur,
  });
  const centrePaquet = {
    x: disposition.centrePaquet.x / largeur,
    y: disposition.centrePaquet.y / hauteur,
  };
  const centreCarteRetournee = {
    x: disposition.centreCarteRetournee.x / largeur,
    y: disposition.centreCarteRetournee.y / hauteur,
  };

  const carteRetournee = etatJeuRef.current.carteRetournee;
  const cartesRetour = construireCartesRetourPaquet();

  // Effacer l'état et démarrer l'animation dans le même rendu (React 18 batch)
  setEtatJeu((prev) => ({
    ...prev,
    mainJoueur: [],
    nbCartesAdversaires: { nord: 0, est: 0, ouest: 0 },
    carteRetournee: null,
    phaseEncheres: null,
    historiqueEncheres: [],
    cartesRestantesPaquet: 1,
    afficherActionsEnchereRedistribution: false,
  }));

  const lancerPhase2 = () => {
    animations.lancerAnimationRetourPaquet(cartesRetour, centrePaquet, () => {
      if (estDemonte.current) return;

      setEtatJeu((prev) => ({
        ...prev,
        cartesRestantesPaquet: 32,
        indexDonneur: contexte.indexDonneur,
      }));

      const timeoutApresDealer = setTimeout(() => {
        if (estDemonte.current) return;
        lancerDistributionAnimee(contexte);
      }, ANIMATIONS.redistribution.dureeGlissementDealer);

      timeoutsControleurRef.current.push(timeoutApresDealer);
    });
  };

  if (carteRetournee) {
    // Phase 1 : carte retournée → paquet
    animations.lancerAnimationRetourCarteRetournee(
      carteRetournee,
      {
        x: centreCarteRetournee.x,
        y: centreCarteRetournee.y,
        rotation: 0,
        echelle: 0.85,
      },
      centrePaquet,
      lancerPhase2,
    );
  } else {
    lancerPhase2();
  }
}, ANIMATIONS.redistribution.pauseAvantRappel);
```

- [ ] **Step 3 : Vérifier que `calculerDispositionReserveCentrale` est bien importée**

Chercher dans les imports de `useControleurJeu.ts` si `calculerDispositionReserveCentrale` est déjà importée. Si non, l'ajouter :

```ts
import { calculerDispositionReserveCentrale } from "../components/game/reserve-centrale-disposition";
```

- [ ] **Step 4 : Vérifier la compilation TypeScript — zéro erreur**

```bash
cd apps/mobile && npx tsc --noEmit 2>&1 | head -30
```

Attendu : aucune erreur.

- [ ] **Step 5 : Lancer tous les tests**

```bash
cd apps/mobile && npx jest --no-coverage 2>&1 | tail -30
```

Attendu : tous les tests passent.

- [ ] **Step 6 : Commit**

```bash
git add apps/mobile/hooks/useControleurJeu.ts
git commit -m "feat(mobile): animer le retour de la carte retournee lors de la redistribution"
```
