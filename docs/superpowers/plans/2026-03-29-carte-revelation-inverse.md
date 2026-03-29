# CarteRevelation Inverse Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Animer le retour de la carte retournée vers le paquet en réutilisant `CarteRevelation` avec un prop `inverse`, au lieu de l'ancien `CarteAnimee` avec flip linéaire.

**Architecture:** On ajoute `inverse?: boolean` et `dureeTotale?: number` à `CarteRevelation`. Le contrôleur stocke la carte en retour dans `carteRetourneeEnRetour` (EtatJeu) et expose `onRetourCarteRetourneeTerminee`. PlateauJeu rend `<CarteRevelation inverse>` conditionnellement. `lancerAnimationRetourCarteRetournee` est supprimée de `useAnimations`.

**Tech Stack:** React Native + react-native-reanimated, Jest/Testing Library, TypeScript

---

## Fichiers touchés

| Fichier                                           | Action                                                                       |
| ------------------------------------------------- | ---------------------------------------------------------------------------- |
| `apps/mobile/components/game/CarteRevelation.tsx` | Modifier — ajouter `inverse`, `dureeTotale`                                  |
| `apps/mobile/__tests__/CarteRevelation.test.tsx`  | Modifier — ajouter cas inverse                                               |
| `apps/mobile/hooks/useControleurJeu.ts`           | Modifier — `carteRetourneeEnRetour` dans EtatJeu, refactoring redistribution |
| `apps/mobile/components/game/PlateauJeu.tsx`      | Modifier — rendu inverse + correction `carteRetourneeReserve`                |
| `apps/mobile/hooks/useAnimations.ts`              | Modifier — supprimer `lancerAnimationRetourCarteRetournee`                   |
| `apps/mobile/__tests__/useAnimations.test.ts`     | Modifier — supprimer test `lancerAnimationRetourCarteRetournee`              |

> **Note :** `apps/mobile/constants/layout.ts` n'a PAS besoin d'être modifié — `dureeRetourCarteRetournee` est déjà présent à la ligne 121.

---

## Task 1 : Tests CarteRevelation inverse (TDD)

**Files:**

- Modify: `apps/mobile/__tests__/CarteRevelation.test.tsx`

- [ ] **Step 1 : Écrire les 4 cas de test inverse**

Ajouter à la fin du `describe("CarteRevelation")` dans `CarteRevelation.test.tsx` :

```tsx
describe("mode inverse", () => {
  it("se monte sans erreur avec inverse", () => {
    expect(() =>
      render(
        <CarteRevelation
          inverse
          carte={CARTE_TEST}
          departX={100}
          departY={200}
          arriveeX={180}
          arriveeY={220}
          largeurCarte={80}
          hauteurCarte={116}
          atlas={ATLAS_TEST}
          onTerminee={() => {}}
        />,
      ),
    ).not.toThrow();
  });

  it("appelle onTerminee apres la fin de l'animation en mode inverse", () => {
    const surTerminee = jest.fn();
    const callbacksAnimationFrame: FrameRequestCallback[] = [];
    const requestAnimationFrameOriginal = global.requestAnimationFrame;

    global.requestAnimationFrame = jest.fn((callback: FrameRequestCallback) => {
      callbacksAnimationFrame.push(callback);
      return 1;
    });

    render(
      <CarteRevelation
        inverse
        carte={CARTE_TEST}
        departX={100}
        departY={200}
        arriveeX={180}
        arriveeY={220}
        largeurCarte={80}
        hauteurCarte={116}
        atlas={ATLAS_TEST}
        onTerminee={surTerminee}
      />,
    );

    expect(surTerminee).not.toHaveBeenCalled();
    expect(callbacksAnimationFrame).toHaveLength(1);

    callbacksAnimationFrame[0](16);
    expect(surTerminee).toHaveBeenCalledTimes(1);

    global.requestAnimationFrame = requestAnimationFrameOriginal;
  });

  it("position initiale du conteneur correspond a arriveeX/Y en mode inverse", () => {
    // Mock interpolate retourne output[0], donc p=0 → position initiale.
    // En inverse, output[0] = arriveeX/Y → left = arriveeX - largeurCarte/2
    const { UNSAFE_getAllByType } = render(
      <CarteRevelation
        inverse
        carte={CARTE_TEST}
        departX={100}
        departY={200}
        arriveeX={180}
        arriveeY={220}
        largeurCarte={80}
        hauteurCarte={116}
        atlas={ATLAS_TEST}
        onTerminee={() => {}}
      />,
    );

    const animated = require("react-native-reanimated");
    const { View } = require("react-native");

    // useAnimatedStyle est appelé et retourne le style calculé au moment du rendu
    // interpolate retourne output[0] → en inverse, x = arriveeX
    // Vérifier que interpolate a été appelé avec arriveeX comme premier élément de output
    expect(animated.interpolate).toHaveBeenCalledWith(
      expect.anything(),
      [0, 1, 2, 3],
      [180, 100, 100, 100], // inverse x : arrivee→depart→depart→depart
    );
  });

  it("styleDos initial a rotY=-90 en mode inverse (roles dos/face echanges)", () => {
    const animated = require("react-native-reanimated");
    animated.interpolate.mockClear();

    render(
      <CarteRevelation
        inverse
        carte={CARTE_TEST}
        departX={100}
        departY={200}
        arriveeX={180}
        arriveeY={220}
        largeurCarte={80}
        hauteurCarte={116}
        atlas={ATLAS_TEST}
        onTerminee={() => {}}
      />,
    );

    // En mode inverse, styleDos utilise la formule de styleFace original :
    // rotY = interpolate(p, [1,1.5,2], [-90,-90,0], "clamp") → output[0] = -90
    expect(animated.interpolate).toHaveBeenCalledWith(
      expect.anything(),
      [1, 1.5, 2],
      [-90, -90, 0],
      "clamp",
    );
  });
});
```

- [ ] **Step 2 : Vérifier que les tests échouent**

```bash
cd apps/mobile && npx jest __tests__/CarteRevelation.test.tsx --no-coverage
```

Expected : FAIL — `inverse` n'existe pas encore

---

## Task 2 : Implémenter CarteRevelation inverse + dureeTotale

**Files:**

- Modify: `apps/mobile/components/game/CarteRevelation.tsx`

- [ ] **Step 3 : Ajouter `inverse` et `dureeTotale` à l'interface + calcul des durées**

Remplacer l'interface et les constantes de durées :

```tsx
interface PropsCarteRevelation {
  carte: Carte;
  departX: number;
  departY: number;
  arriveeX: number;
  arriveeY: number;
  largeurCarte: number;
  hauteurCarte: number;
  atlas: AtlasCartes;
  onTerminee: () => void;
  inverse?: boolean;
  dureeTotale?: number; // seulement utilisé en mode inverse
}

// Durées de référence des 3 phases (ms)
const DUREE_SOULEVEMENT = 200;
const DUREE_FLIP = 300;
const DUREE_PLACEMENT = 350;
const DUREE_TOTALE_REF = DUREE_SOULEVEMENT + DUREE_FLIP + DUREE_PLACEMENT;
// Soulevement vertical en pixels
const PX_SOULEVEMENT = 8;
```

- [ ] **Step 4 : Mettre à jour la signature de la fonction + calcul conditionnel des durées**

Remplacer le début de la fonction `CarteRevelation` (de la ligne `export function CarteRevelation({` jusqu'au premier `useEffect`) :

```tsx
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
  inverse = false,
  dureeTotale,
}: PropsCarteRevelation) {
  // progres : 0 → 1 (soulevement) → 2 (flip) → 3 (placement)
  const progres = useSharedValue(0);
  const animationFrameRef = useRef<number | null>(null);

  const onTermineeRef = useRef(onTerminee);
  useEffect(() => {
    onTermineeRef.current = onTerminee;
  });

  // Durées effectives (ms) — en mode inverse avec dureeTotale fourni, on scale proportionnellement
  const dureeSoulevement =
    inverse && dureeTotale !== undefined
      ? Math.round((DUREE_SOULEVEMENT / DUREE_TOTALE_REF) * dureeTotale)
      : DUREE_SOULEVEMENT;
  const dureeFlip =
    inverse && dureeTotale !== undefined
      ? Math.round((DUREE_FLIP / DUREE_TOTALE_REF) * dureeTotale)
      : DUREE_FLIP;
  const dureePlacement =
    inverse && dureeTotale !== undefined
      ? dureeTotale - dureeSoulevement - dureeFlip
      : DUREE_PLACEMENT;
```

- [ ] **Step 5 : Mettre à jour useEffect pour utiliser les durées calculées**

Remplacer le `useEffect` de lancement de l'animation :

```tsx
useEffect(() => {
  progres.value = withSequence(
    withTiming(1, { duration: dureeSoulevement, easing: Easing.out(Easing.ease) }),
    withTiming(2, { duration: dureeFlip, easing: Easing.inOut(Easing.ease) }),
    withTiming(
      3,
      { duration: dureePlacement, easing: Easing.inOut(Easing.cubic) },
      (fini) => {
        "worklet";
        if (fini) {
          runOnJS(() => {
            animationFrameRef.current = requestAnimationFrame(() => {
              animationFrameRef.current = null;
              onTermineeRef.current();
            });
          })();
        }
      },
    ),
  );

  return () => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  };
}, [progres, dureeSoulevement, dureeFlip, dureePlacement]);
```

- [ ] **Step 6 : Mettre à jour styleConteneur avec interpolations inverses**

Remplacer le `useAnimatedStyle` du conteneur :

```tsx
// Position et échelle du conteneur
const styleConteneur = useAnimatedStyle(() => {
  const p = progres.value;

  const x = inverse
    ? interpolate(p, [0, 1, 2, 3], [arriveeX, departX, departX, departX])
    : interpolate(p, [0, 1, 2, 3], [departX, departX, departX, arriveeX]);

  const y = inverse
    ? interpolate(
        p,
        [0, 1, 2, 3],
        [arriveeY, arriveeY - PX_SOULEVEMENT, arriveeY - PX_SOULEVEMENT, departY],
      )
    : interpolate(
        p,
        [0, 1, 2, 3],
        [departY, departY - PX_SOULEVEMENT, departY - PX_SOULEVEMENT, arriveeY],
      );

  const echelle = inverse
    ? interpolate(p, [0, 1, 2, 3], [1.0, 1.0, 1.0, 0.85])
    : interpolate(p, [0, 1, 2, 3], [0.85, 1.0, 1.0, 1.0]);

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
```

- [ ] **Step 7 : Mettre à jour styleDos et styleFace avec flip inversé**

Remplacer les deux `useAnimatedStyle` de dos et face :

```tsx
// Dos
const styleDos = useAnimatedStyle(() => {
  const p = progres.value;
  const rotY = inverse
    ? interpolate(p, [1, 1.5, 2], [-90, -90, 0], "clamp")
    : interpolate(p, [1, 1.5, 2], [0, 90, 90], "clamp");
  const opacity = inverse
    ? interpolate(p, [1, 1.5, 1.6, 2], [0, 0, 1, 1], "clamp")
    : interpolate(p, [0, 1, 1.4, 1.5], [1, 1, 1, 0], "clamp");
  return {
    position: "absolute" as const,
    width: largeurCarte,
    height: hauteurCarte,
    backfaceVisibility: "hidden" as const,
    opacity,
    transform: [{ perspective: 800 }, { rotateY: `${rotY}deg` }],
  };
});

// Face
const styleFace = useAnimatedStyle(() => {
  const p = progres.value;
  const rotY = inverse
    ? interpolate(p, [1, 1.5, 2], [0, 90, 90], "clamp")
    : interpolate(p, [1, 1.5, 2], [-90, -90, 0], "clamp");
  const opacity = inverse
    ? interpolate(p, [0, 1, 1.4, 1.5], [1, 1, 1, 0], "clamp")
    : interpolate(p, [1, 1.5, 1.6, 2], [0, 0, 1, 1], "clamp");
  return {
    position: "absolute" as const,
    width: largeurCarte,
    height: hauteurCarte,
    backfaceVisibility: "hidden" as const,
    opacity,
    transform: [{ perspective: 800 }, { rotateY: `${rotY}deg` }],
  };
});
```

- [ ] **Step 8 : Lancer les tests CarteRevelation**

```bash
cd apps/mobile && npx jest __tests__/CarteRevelation.test.tsx --no-coverage
```

Expected : PASS (tous les cas)

- [ ] **Step 9 : Commit**

```bash
git add apps/mobile/components/game/CarteRevelation.tsx apps/mobile/__tests__/CarteRevelation.test.tsx
git commit -m "feat(mobile): ajouter prop inverse a CarteRevelation pour le retour carte"
```

---

## Task 3 : EtatJeu + useControleurJeu — redistribution avec CarteRevelation inverse

**Files:**

- Modify: `apps/mobile/hooks/useControleurJeu.ts`

- [ ] **Step 10 : Ajouter `carteRetourneeEnRetour` à l'interface EtatJeu**

Dans l'interface `EtatJeu`, après `carteRetournee: Carte | null;` (ligne ~75), ajouter :

```ts
/** Carte retournée en cours d'animation de retour vers le paquet (redistribution) */
carteRetourneeEnRetour: Carte | null;
```

- [ ] **Step 11 : Initialiser `carteRetourneeEnRetour` à null dans l'état initial**

Chercher l'état initial (le `useState<EtatJeu>` ou `const etatInitial`) et ajouter :

```ts
carteRetourneeEnRetour: null,
```

- [ ] **Step 12 : Ajouter le ref pour le callback de retour**

Après `const onRevelationTermineeRef = useRef<(() => void) | null>(null);` (ligne ~269), ajouter :

```ts
const onRetourCarteRetourneeRef = useRef<(() => void) | null>(null);
```

- [ ] **Step 13 : Remplacer le bloc redistribution dans `lancerRedistributionAnimee`**

Dans le `setTimeout` (après `pauseAvantRappel`), `centrePaquet` est déjà calculé via `calculerDispositionReserveCentrale` quelques lignes avant (lignes ~875-887). Remplacer uniquement le bloc depuis `const carteRetournee = etatJeuRef.current.carteRetournee;` jusqu'à la fin du `if (carteRetournee) { ... } else { ... }` (lignes ~889-938) — `centrePaquet` est déjà en scope :

```ts
const carteRetournee = etatJeuRef.current.carteRetournee;
const cartesRetour = construireCartesRetourPaquet();

const lancerPhase2 = () => {
  setEtatJeu((prev) => ({ ...prev, carteRetourneeEnRetour: null }));
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
  onRetourCarteRetourneeRef.current = lancerPhase2;
  setEtatJeu((prev) => ({
    ...prev,
    mainJoueur: [],
    nbCartesAdversaires: { nord: 0, est: 0, ouest: 0 },
    carteRetournee: null,
    carteRetourneeEnRetour: carteRetournee,
    phaseEncheres: null,
    historiqueEncheres: [],
    cartesRestantesPaquet: 1,
    afficherActionsEnchereRedistribution: false,
  }));
} else {
  setEtatJeu((prev) => ({
    ...prev,
    mainJoueur: [],
    nbCartesAdversaires: { nord: 0, est: 0, ouest: 0 },
    phaseEncheres: null,
    historiqueEncheres: [],
    cartesRestantesPaquet: 1,
    afficherActionsEnchereRedistribution: false,
  }));
  lancerPhase2();
}
```

- [ ] **Step 14 : Ajouter `onRetourCarteRetourneeTerminee` et l'exposer**

Après `const onRevelationTerminee = useCallback(...)` (ligne ~1493), ajouter :

```ts
const onRetourCarteRetourneeTerminee = useCallback(() => {
  const fn = onRetourCarteRetourneeRef.current;
  onRetourCarteRetourneeRef.current = null;
  fn?.();
}, []);
```

Dans l'objet retourné par le hook, ajouter `onRetourCarteRetourneeTerminee` à côté de `onRevelationTerminee`.

- [ ] **Step 15 : Vérifier la compilation TypeScript**

```bash
cd apps/mobile && npx tsc --noEmit 2>&1 | head -30
```

Expected : 0 erreur (ou uniquement des erreurs préexistantes)

- [ ] **Step 16 : Lancer les tests du contrôleur**

```bash
cd apps/mobile && npx jest __tests__/useControleurJeuDistribution.test.ts __tests__/useControleurJeuPli.test.ts --no-coverage
```

Expected : PASS

---

## Task 4 : PlateauJeu — rendu inverse + correction carteRetourneeReserve

**Files:**

- Modify: `apps/mobile/components/game/PlateauJeu.tsx`

- [ ] **Step 17 : Corriger la condition `carteRetourneeReserve`**

Trouver (lignes ~82-87) :

```tsx
const carteRetourneeReserve =
  etatJeu.phaseUI === "revelationCarte" ||
  etatJeu.phaseUI === "encheres" ||
  etatJeu.phaseUI === "redistribution"
    ? etatJeu.carteRetournee
    : null;
```

Remplacer par :

```tsx
const carteRetourneeReserve =
  etatJeu.phaseUI === "revelationCarte" || etatJeu.phaseUI === "encheres"
    ? etatJeu.carteRetournee
    : null;
```

- [ ] **Step 18 : Destructurer `onRetourCarteRetourneeTerminee` depuis le contrôleur**

Dans la destructuration de `useControleurJeu`, ajouter `onRetourCarteRetourneeTerminee` à côté de `onRevelationTerminee`.

- [ ] **Step 19 : Ajouter le rendu `<CarteRevelation inverse>`**

Après le bloc `{/* Animation révélation de la carte retournée */}` (ligne ~238-253), ajouter :

```tsx
{
  /* Animation retour de la carte retournée vers le paquet */
}
{
  etatJeu.carteRetourneeEnRetour !== null && largeur > 0 && (
    <CarteRevelation
      inverse
      carte={etatJeu.carteRetourneeEnRetour}
      departX={dispositionReserve.centrePaquet.x}
      departY={dispositionReserve.centrePaquet.y}
      arriveeX={dispositionReserve.centreCarteRetournee.x}
      arriveeY={dispositionReserve.centreCarteRetournee.y}
      largeurCarte={dispositionReserve.largeurCarte}
      hauteurCarte={dispositionReserve.hauteurCarte}
      atlas={atlas}
      dureeTotale={ANIMATIONS.redistribution.dureeRetourCarteRetournee}
      onTerminee={onRetourCarteRetourneeTerminee}
    />
  );
}
```

- [ ] **Step 20 : Importer ANIMATIONS depuis constants/layout**

`ANIMATIONS` n'est pas encore importé dans `PlateauJeu.tsx`. Ajouter l'import après les imports existants de `../../constants/` :

```ts
import { ANIMATIONS } from "../../constants/layout";
```

- [ ] **Step 21 : Vérifier la compilation TypeScript**

```bash
cd apps/mobile && npx tsc --noEmit 2>&1 | head -30
```

Expected : 0 erreur

- [ ] **Step 22 : Lancer les tests PlateauJeu**

```bash
cd apps/mobile && npx jest __tests__/PlateauJeu.test.tsx --no-coverage
```

Expected : PASS

- [ ] **Step 23 : Commit**

```bash
git add apps/mobile/components/game/PlateauJeu.tsx apps/mobile/hooks/useControleurJeu.ts
git commit -m "feat(mobile): retour carte retournee via CarteRevelation inverse"
```

---

## Task 5 : Supprimer lancerAnimationRetourCarteRetournee

**Files:**

- Modify: `apps/mobile/hooks/useAnimations.ts`
- Modify: `apps/mobile/__tests__/useAnimations.test.ts`

- [ ] **Step 24 : Supprimer `lancerAnimationRetourCarteRetournee` de useAnimations.ts**

Supprimer la fonction `lancerAnimationRetourCarteRetournee` (lignes ~349-389) et la retirer de l'objet retourné.

- [ ] **Step 25 : Supprimer le test correspondant dans useAnimations.test.ts**

Supprimer le `it("cree une carte retour-retournee-* face visible avec flip et appelle le callback de fin", ...)` (lignes ~124-165).

> **Note :** Le test existant de `lancerAnimationRetourPaquet` utilise déjà la signature avec `arrivee: { x, y }` (ligne ~77 du fichier de test). Aucune mise à jour nécessaire pour ce test.

- [ ] **Step 26 : Vérifier la compilation TypeScript**

```bash
cd apps/mobile && npx tsc --noEmit 2>&1 | head -30
```

Expected : 0 erreur

- [ ] **Step 27 : Lancer tous les tests mobile**

```bash
cd apps/mobile && npx jest --no-coverage
```

Expected : PASS (tous les tests)

- [ ] **Step 28 : Commit final**

```bash
git add apps/mobile/hooks/useAnimations.ts apps/mobile/__tests__/useAnimations.test.ts
git commit -m "refactor(mobile): supprimer lancerAnimationRetourCarteRetournee remplace par CarteRevelation inverse"
```
