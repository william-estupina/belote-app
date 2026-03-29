# Révélation carte retournée — composant CarteRevelation autonome

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer l'animation multi-segments saccadée de révélation de la carte retournée par un composant Reanimated autonome `CarteRevelation` avec départ correct depuis le paquet.

**Architecture:** Nouveau composant `CarteRevelation` avec `withSequence` Reanimated (soulevement + flip + placement), nouvelle phase UI `"revelationCarte"` dans le contrôleur, `PlateauJeu` monte/démonte le composant selon cette phase. Zéro state React entre les phases d'animation.

**Tech Stack:** React Native Reanimated (`withSequence`, `withTiming`, `interpolate`, `useAnimatedStyle`), TypeScript, Jest/React Testing Library

---

## Cartographie des fichiers

| Fichier                                                      | Action        | Responsabilité                                                                                     |
| ------------------------------------------------------------ | ------------- | -------------------------------------------------------------------------------------------------- |
| `apps/mobile/components/game/CarteRevelation.tsx`            | **Créer**     | Animation autonome 3 phases (soulevement/flip/placement)                                           |
| `apps/mobile/hooks/useControleurJeu.ts`                      | **Modifier**  | Ajouter `"revelationCarte"` à `PhaseUI`, remplacer appel animation, exposer `onRevelationTerminee` |
| `apps/mobile/components/game/PlateauJeu.tsx`                 | **Modifier**  | Monter `CarteRevelation` pendant phase `"revelationCarte"`                                         |
| `apps/mobile/hooks/useAnimations.ts`                         | **Modifier**  | Supprimer `lancerAnimationRevelationCarteRetournee` et constantes associées                        |
| `apps/mobile/constants/animations-visuelles.ts`              | **Modifier**  | Supprimer `ANIMATIONS_CARTE_RETOURNEE`                                                             |
| `apps/mobile/components/game/ZoneCarteRetournee.tsx`         | **Supprimer** | Fichier orphelin                                                                                   |
| `apps/mobile/__tests__/useAnimations.test.ts`                | **Modifier**  | Supprimer le test de `lancerAnimationRevelationCarteRetournee`                                     |
| `apps/mobile/__tests__/useControleurJeuDistribution.test.ts` | **Modifier**  | Adapter la transition vers enchères                                                                |
| `apps/mobile/__tests__/visibiliteEncheres.test.ts`           | **Modifier**  | Ajouter `"revelationCarte"` au it.each                                                             |

---

## Task 1 : Supprimer le code mort (ZoneCarteRetournee + test révélation)

**Files:**

- Delete: `apps/mobile/components/game/ZoneCarteRetournee.tsx`
- Modify: `apps/mobile/__tests__/useAnimations.test.ts`
- Modify: `apps/mobile/hooks/useAnimations.ts`
- Modify: `apps/mobile/constants/animations-visuelles.ts`

- [ ] **Step 1 : Vérifier que ZoneCarteRetournee n'est importé nulle part**

```bash
grep -r "ZoneCarteRetournee" apps/mobile --include="*.ts" --include="*.tsx"
```

Résultat attendu : uniquement `ZoneCarteRetournee.tsx` lui-même et éventuellement `AGENTS.md`.

- [ ] **Step 2 : Supprimer ZoneCarteRetournee.tsx**

```bash
rm apps/mobile/components/game/ZoneCarteRetournee.tsx
```

- [ ] **Step 3 : Supprimer le test `lancerAnimationRevelationCarteRetournee` dans useAnimations.test.ts**

Dans `apps/mobile/__tests__/useAnimations.test.ts`, supprimer :

- L'import `import { ANIMATIONS_CARTE_RETOURNEE } from "../constants/animations-visuelles";`
- Le bloc `it("anime la revelation de la carte retournee avec soulèvement, flip au sommet puis pose", ...)` entier (~70 lignes)

- [ ] **Step 4 : Lancer les tests pour confirmer qu'il n'y a pas de régression**

```bash
cd apps/mobile && npx jest __tests__/useAnimations.test.ts --no-coverage
```

Résultat attendu : tous les tests passent.

- [ ] **Step 5 : Supprimer lancerAnimationRevelationCarteRetournee de useAnimations.ts**

Dans `apps/mobile/hooks/useAnimations.ts` :

1. Supprimer les constantes en haut du fichier :

```ts
// À supprimer :
const DECALAGE_X_SOULEVEMENT_RETOURNEE = 0.03;
const DECALAGE_Y_SOULEVEMENT_RETOURNEE = 0.085;
const ROTATION_SOULEVEMENT_RETOURNEE = -14;
const ECHELLE_SOULEVEMENT_RETOURNEE = 1.08;
const ROTATION_APEX_RETOURNEE = -9;
const ECHELLE_APEX_RETOURNEE = 1.1;
```

2. Supprimer le type `CarteRetourPaquet` — vérifier qu'il n'est utilisé qu'ici :

```bash
grep -r "CarteRetourPaquet" apps/mobile --include="*.ts" --include="*.tsx"
```

S'il n'est utilisé qu'en interne, le supprimer. S'il est importé ailleurs, le garder.

3. Supprimer la fonction `lancerAnimationRevelationCarteRetournee` (lignes 352-455 environ).

4. Supprimer `lancerAnimationRevelationCarteRetournee` du `return` du hook (ligne 478 environ).

5. Supprimer l'import `ANIMATIONS_CARTE_RETOURNEE` :

```ts
// À supprimer :
import { ANIMATIONS_CARTE_RETOURNEE } from "../constants/animations-visuelles";
```

- [ ] **Step 6 : Supprimer ANIMATIONS_CARTE_RETOURNEE de animations-visuelles.ts**

Dans `apps/mobile/constants/animations-visuelles.ts`, supprimer le bloc :

```ts
export const ANIMATIONS_CARTE_RETOURNEE = {
  dureeFlip: ralentirDureeAnimationMajeure(accelererDureeAnimation(400)),
  delaiFlip: ralentirDureeAnimationMajeure(accelererDureeAnimation(200)),
} as const;
```

- [ ] **Step 7 : Vérifier qu'il n'y a plus de références à ANIMATIONS_CARTE_RETOURNEE**

```bash
grep -r "ANIMATIONS_CARTE_RETOURNEE" apps/mobile --include="*.ts" --include="*.tsx"
```

Résultat attendu : aucun résultat.

- [ ] **Step 8 : Lancer les tests**

```bash
cd apps/mobile && npx jest --no-coverage
```

Résultat attendu : tous les tests passent (le test de révélation vient d'être supprimé, les autres ne sont pas impactés).

- [ ] **Step 9 : Commit**

```bash
git add apps/mobile/components/game/ZoneCarteRetournee.tsx \
        apps/mobile/__tests__/useAnimations.test.ts \
        apps/mobile/hooks/useAnimations.ts \
        apps/mobile/constants/animations-visuelles.ts
git commit -m "refactor(mobile): supprimer code mort revelation carte retournee"
```

---

## Task 2 : Ajouter "revelationCarte" à PhaseUI et adapter useControleurJeu

**Files:**

- Modify: `apps/mobile/hooks/useControleurJeu.ts`
- Modify: `apps/mobile/__tests__/useControleurJeuDistribution.test.ts`
- Modify: `apps/mobile/__tests__/visibiliteEncheres.test.ts`

- [ ] **Step 1 : Adapter le mock et les tests dans useControleurJeuDistribution.test.ts**

Dans `apps/mobile/__tests__/useControleurJeuDistribution.test.ts` :

1. Supprimer le mock `mockLancerAnimationRevelationCarteRetournee` (déclaration ligne ~27 et dans le `useAnimations` mock ligne ~46).

2. Adapter le test `"lance la revelation de la carte retournee..."` (autour ligne 185) :

```ts
it("passe en phase revelationCarte apres la distribution, puis en encheres quand la revelation est terminee", async () => {
  const { result } = renderHook(() =>
    useControleurJeu({
      difficulte: "facile",
      scoreObjectif: 1000,
      largeurEcran: 1280,
      hauteurEcran: 720,
    }),
  );

  await viderFileEvenements();

  // Phase revelationCarte déclenchée
  expect(result.current.etatJeu.phaseUI).toBe("revelationCarte");
  expect(result.current.etatJeu.carteRetournee).not.toBeNull();
  expect(result.current.etatJeu.phaseEncheres).toBeNull();

  // Simuler la fin de l'animation
  act(() => {
    result.current.onRevelationTerminee();
  });

  expect(result.current.etatJeu.phaseUI).toBe("encheres");
  expect(result.current.etatJeu.phaseEncheres).toBe("encheres1");
  expect(result.current.etatJeu.carteRetournee).not.toBeNull();
});
```

3. Adapter le test `"utilise les dimensions mises a jour apres le premier layout..."` (autour ligne 227) : le test vérifie que quand les dimensions sont 0, la révélation n'est pas lancée. Dans la nouvelle logique, si dimensions === 0 au moment de la transition, `finaliserEntreeEncheres` est appelée directement (pas de phase `revelationCarte`). Adapter le test :

```ts
it("appelle directement finaliserEntreeEncheres si les dimensions sont nulles au moment de la transition", async () => {
  const { result } = renderHook(
    ({ largeurEcran, hauteurEcran }) =>
      useControleurJeu({
        difficulte: "facile",
        scoreObjectif: 1000,
        largeurEcran,
        hauteurEcran,
      }),
    { initialProps: { largeurEcran: 0, hauteurEcran: 0 } },
  );

  await viderFileEvenements();

  // Dimensions nulles : pas de phase revelationCarte, directement encheres
  expect(result.current.etatJeu.phaseUI).toBe("encheres");
});
```

- [ ] **Step 2 : Lancer les tests pour confirmer qu'ils échouent (TDD)**

```bash
cd apps/mobile && npx jest __tests__/useControleurJeuDistribution.test.ts --no-coverage
```

Résultat attendu : les tests adaptés échouent (phaseUI est `"distribution"` ou `"encheres"` au lieu de `"revelationCarte"`).

- [ ] **Step 3 : Ajouter "revelationCarte" à PhaseUI dans useControleurJeu.ts**

Dans `apps/mobile/hooks/useControleurJeu.ts`, modifier le type `PhaseUI` (ligne ~52) :

```ts
export type PhaseUI =
  | "inactif"
  | "distribution"
  | "redistribution"
  | "revelationCarte"
  | "encheres"
  | "jeu"
  | "finPli"
  | "scoresManche"
  | "finPartie";
```

- [ ] **Step 4 : Ajouter le ref onRevelationTermineeRef et remplacer l'appel animation**

Dans `useControleurJeu`, juste après les autres `useRef` en haut du hook, ajouter :

```ts
const onRevelationTermineeRef = useRef<(() => void) | null>(null);
```

Dans le `useCallback` de distribution (autour ligne 626-650), remplacer le bloc :

```ts
// AVANT :
const dispositionReserve = calculerDispositionReserveCentrale({
  largeurEcran: dimensionsCourantes.largeur,
  hauteurEcran: dimensionsCourantes.hauteur,
});

animations.lancerAnimationRevelationCarteRetournee(
  carteRetournee,
  {
    x: dispositionReserve.centreCarteRetournee.x / dimensionsCourantes.largeur,
    y: dispositionReserve.centreCarteRetournee.y / dimensionsCourantes.hauteur,
  },
  finaliserEntreeEncheres,
);
```

```ts
// APRÈS :
onRevelationTermineeRef.current = finaliserEntreeEncheres;
setEtatJeu((prev) => ({
  ...prev,
  phaseUI: "revelationCarte",
  carteRetournee,
}));
```

Supprimer aussi l'import de `calculerDispositionReserveCentrale` du hook si ce n'est plus utilisé après ce changement (vérifier d'abord avec grep).

- [ ] **Step 5 : Supprimer animations du useCallback dependency array**

Dans le `useCallback` de distribution, supprimer `animations` du tableau de dépendances (ligne ~654) si `animations.lancerAnimationRevelationCarteRetournee` n'est plus appelé dedans. Vérifier si `animations` est encore utilisé dans ce callback pour d'autres raisons.

- [ ] **Step 6 : Exposer onRevelationTerminee dans le return du hook**

Dans le `return` du hook (ligne ~1463), ajouter :

```ts
onRevelationTerminee: useCallback(() => {
  onRevelationTermineeRef.current?.();
}, []),
```

Ou le définir en dehors du return avec `useCallback` et le référencer dans le return.

Ajouter aussi `onRevelationTerminee: () => void` à l'interface de retour si elle est explicitement typée.

- [ ] **Step 7 : Lancer les tests**

```bash
cd apps/mobile && npx jest __tests__/useControleurJeuDistribution.test.ts --no-coverage
```

Résultat attendu : tous les tests passent.

- [ ] **Step 8 : Adapter visibiliteEncheres.test.ts**

Dans `apps/mobile/__tests__/visibiliteEncheres.test.ts`, ajouter `"revelationCarte"` au `it.each` :

```ts
it.each<PhaseUI>([
  "inactif",
  "distribution",
  "redistribution",
  "revelationCarte", // ajout
  "jeu",
  "finPli",
  "scoresManche",
  "finPartie",
])("n'affiche jamais les encheres en phase %s", (phaseUI) => {
  expect(doitAfficherUIEncheres(phaseUI, false)).toBe(false);
});
```

- [ ] **Step 9 : Lancer tous les tests**

```bash
cd apps/mobile && npx jest --no-coverage
```

Résultat attendu : tous les tests passent.

- [ ] **Step 10 : Commit**

```bash
git add apps/mobile/hooks/useControleurJeu.ts \
        apps/mobile/__tests__/useControleurJeuDistribution.test.ts \
        apps/mobile/__tests__/visibiliteEncheres.test.ts
git commit -m "feat(mobile): ajouter phase revelationCarte au controleur de jeu"
```

---

## Task 3 : Créer le composant CarteRevelation

**Files:**

- Create: `apps/mobile/components/game/CarteRevelation.tsx`

- [ ] **Step 1 : Créer CarteRevelation.tsx**

```
apps/mobile/components/game/CarteRevelation.tsx
```

Le composant orchestre 3 phases via `withSequence`. La `SharedValue` progresse de `0` à `3` (une unité par phase).

```tsx
import type { Carte } from "@belote/shared-types";
import { useEffect } from "react";
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import type { AtlasCartes } from "../../hooks/useAtlasCartes";
import { CarteDos, CarteFaceAtlas } from "./Carte";

interface PropsCarteRevelation {
  carte: Carte;
  departX: number; // pixels — centre du paquet
  departY: number; // pixels — centre du paquet
  arriveeX: number; // pixels — centre zone carte retournée
  arriveeY: number; // pixels — centre zone carte retournée
  largeurCarte: number;
  hauteurCarte: number;
  atlas: AtlasCartes;
  onTerminee: () => void;
}

// Durées des 3 phases (ms)
const DUREE_SOULEVEMENT = 200;
const DUREE_FLIP = 300;
const DUREE_PLACEMENT = 350;
// Soulevement vertical en pixels
const PX_SOULEVEMENT = 8;

export function CarteRevelation({
  carte,
  departX,
  departY,
  arriveeX,
  arriveeY,
  largeurCarte,
  hauteurCarte,
  atlas,
  onTerminee,
}: PropsCarteRevelation) {
  // progres : 0 → 1 (soulevement) → 2 (flip) → 3 (placement)
  const progres = useSharedValue(0);

  useEffect(() => {
    progres.value = withSequence(
      withTiming(1, { duration: DUREE_SOULEVEMENT, easing: Easing.out(Easing.ease) }),
      withTiming(2, { duration: DUREE_FLIP, easing: Easing.inOut(Easing.ease) }),
      withTiming(
        3,
        { duration: DUREE_PLACEMENT, easing: Easing.inOut(Easing.cubic) },
        (fini) => {
          "worklet";
          if (fini) runOnJS(onTerminee)();
        },
      ),
    );
  }, [progres, onTerminee]);

  // Position et échelle du conteneur
  const styleConteneur = useAnimatedStyle(() => {
    const p = progres.value;

    // Phase 1 (0→1) : soulevement depuis departX/Y vers position soulevée
    // Phase 2 (1→2) : flip sur place (position soulevée fixe)
    // Phase 3 (2→3) : glissement vers arriveeX/Y
    const x = interpolate(p, [0, 1, 2, 3], [departX, departX, departX, arriveeX]);
    // Y soulevé = departY - PX_SOULEVEMENT
    const y = interpolate(
      p,
      [0, 1, 2, 3],
      [departY, departY - PX_SOULEVEMENT, departY - PX_SOULEVEMENT, arriveeY],
    );
    const echelle = interpolate(p, [0, 1, 2, 3], [0.85, 1.0, 1.0, 1.0]);
    const rotation = interpolate(p, [0, 1, 2, 3], [0, -5, -5, 0]);

    return {
      position: "absolute" as const,
      left: x - largeurCarte / 2,
      top: y - hauteurCarte / 2,
      transform: [{ rotate: `${rotation}deg` }, { scale: echelle }],
      zIndex: 100,
      shadowColor: "#000",
      shadowOffset: { width: 1, height: 2 },
      shadowOpacity: 0.4,
      shadowRadius: 3,
      elevation: 4,
    };
  });

  // Dos : visible de 0° à 90° (phase 0→1.5), puis caché
  const styleDos = useAnimatedStyle(() => {
    const p = progres.value;
    // flip démarre à phase=1, finit à phase=2
    // rotY : 0° à phase=1, 90° à phase=1.5
    const rotY = interpolate(p, [1, 1.5, 2], [0, 90, 90], "clamp");
    return {
      position: "absolute" as const,
      width: largeurCarte,
      height: hauteurCarte,
      backfaceVisibility: "hidden" as const,
      transform: [{ perspective: 800 }, { rotateY: `${rotY}deg` }],
    };
  });

  // Face : cachée jusqu'à 90°, puis visible de 90° à 0° (phase 1.5→2)
  const styleFace = useAnimatedStyle(() => {
    const p = progres.value;
    // Face démarre à -90° (soit 270°), finit à 0°
    const rotY = interpolate(p, [1, 1.5, 2], [-90, -90, 0], "clamp");
    return {
      position: "absolute" as const,
      width: largeurCarte,
      height: hauteurCarte,
      backfaceVisibility: "hidden" as const,
      transform: [{ perspective: 800 }, { rotateY: `${rotY}deg` }],
    };
  });

  return (
    <Animated.View style={styleConteneur}>
      <Animated.View style={styleDos}>
        <CarteDos largeur={largeurCarte} hauteur={hauteurCarte} />
      </Animated.View>
      <Animated.View style={styleFace}>
        <CarteFaceAtlas
          atlas={atlas}
          carte={carte}
          largeur={largeurCarte}
          hauteur={hauteurCarte}
        />
      </Animated.View>
    </Animated.View>
  );
}
```

- [ ] **Step 2 : Vérifier que le fichier compile sans erreur TypeScript**

```bash
cd apps/mobile && npx tsc --noEmit 2>&1 | grep CarteRevelation
```

Résultat attendu : aucune erreur sur `CarteRevelation.tsx`.

- [ ] **Step 3 : Commit**

```bash
git add apps/mobile/components/game/CarteRevelation.tsx
git commit -m "feat(mobile): composant CarteRevelation animation autonome"
```

---

## Task 4 : Câbler PlateauJeu

**Files:**

- Modify: `apps/mobile/components/game/PlateauJeu.tsx`

- [ ] **Step 1 : Importer CarteRevelation et calculerDispositionReserveCentrale dans PlateauJeu.tsx**

En haut de `apps/mobile/components/game/PlateauJeu.tsx`, ajouter les imports :

```tsx
import { CarteRevelation } from "./CarteRevelation";
import { calculerDispositionReserveCentrale } from "./reserve-centrale-disposition";
```

- [ ] **Step 2 : Calculer dispositionReserve dans le corps du composant**

Dans `PlateauJeu`, juste après la destructuration de `dimensions` (ou juste avant le return), ajouter :

```tsx
const dispositionReserve = calculerDispositionReserveCentrale({
  largeurEcran: largeur,
  hauteurEcran: hauteur,
});
```

- [ ] **Step 3 : Adapter afficherReserveCentrale**

Modifier la condition existante (ligne ~68) pour inclure `"revelationCarte"` :

```tsx
const afficherReserveCentrale =
  etatJeu.phaseUI === "distribution" ||
  etatJeu.phaseUI === "revelationCarte" ||
  etatJeu.phaseUI === "encheres" ||
  etatJeu.phaseUI === "redistribution";
```

- [ ] **Step 4 : Monter CarteRevelation dans le JSX**

Dans le JSX de `PlateauJeu`, après le bloc `<ReserveCentrale .../>` (ligne ~210), ajouter :

```tsx
{
  /* Animation révélation de la carte retournée */
}
{
  etatJeu.phaseUI === "revelationCarte" && etatJeu.carteRetournee && largeur > 0 && (
    <CarteRevelation
      carte={etatJeu.carteRetournee}
      departX={dispositionReserve.centrePaquet.x}
      departY={dispositionReserve.centrePaquet.y}
      arriveeX={dispositionReserve.centreCarteRetournee.x}
      arriveeY={dispositionReserve.centreCarteRetournee.y}
      largeurCarte={dispositionReserve.largeurCarte}
      hauteurCarte={dispositionReserve.hauteurCarte}
      atlas={atlas}
      onTerminee={onRevelationTerminee}
    />
  );
}
```

`onRevelationTerminee` vient du hook `useControleurJeu` (déstructurer depuis `jeu`).

- [ ] **Step 5 : Vérifier que tout compile**

```bash
cd apps/mobile && npx tsc --noEmit 2>&1 | head -20
```

Résultat attendu : aucune erreur TypeScript.

- [ ] **Step 6 : Lancer tous les tests**

```bash
cd apps/mobile && npx jest --no-coverage
```

Résultat attendu : tous les tests passent.

- [ ] **Step 7 : Commit**

```bash
git add apps/mobile/components/game/PlateauJeu.tsx
git commit -m "feat(mobile): cabloter CarteRevelation dans PlateauJeu"
```

---

## Vérification finale

- [ ] **Step 1 : Vérifier qu'il n'y a plus de références orphelines**

```bash
grep -r "lancerAnimationRevelationCarteRetournee\|ANIMATIONS_CARTE_RETOURNEE\|ZoneCarteRetournee" apps/mobile --include="*.ts" --include="*.tsx"
```

Résultat attendu : aucun résultat.

- [ ] **Step 2 : Lancer la suite de tests complète**

```bash
cd apps/mobile && npx jest --no-coverage
```

Résultat attendu : tous les tests passent.

- [ ] **Step 3 : Vérifier le build TypeScript**

```bash
cd apps/mobile && npx tsc --noEmit
```

Résultat attendu : aucune erreur.
