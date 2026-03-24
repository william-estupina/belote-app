# Cycle de vie unique CarteAnimee — Plan d'implementation

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminer le clignotement visuel au pli en gardant une seule instance `CarteAnimee` tout au long du cycle vol -> repos -> ramassage, sans jamais demonter/remonter le composant.

**Architecture:** Les cartes "jeu-\*" restent dans `cartesEnVol` apres leur animation (gelees a progression=1). Le ramassage met a jour leur destination in-place via un champ `segment` qui s'incremente. `CarteAnimee` detecte le changement de segment et relance l'animation. Le concept `cartesPoseesAuPli` est supprime partout.

**Tech Stack:** React Native, react-native-reanimated v4, Expo, Jest, TypeScript strict

**Spec:** `docs/superpowers/specs/2026-03-23-carte-animee-cycle-vie-unique-design.md`

---

## Structure des fichiers

### Fichiers a modifier

- `apps/mobile/components/game/CoucheAnimation.tsx`
  - Supprimer l'interface `CartePoseeAuPli` locale et la prop `cartesPoseesAuPli`
  - Ajouter `segment` a l'interface `CarteEnVol`
  - Supprimer le rendu `cartesPoseesAuPli.map(...)`
  - Passer `segment` a `CarteAnimee` (via key ou prop)
- `apps/mobile/components/game/CarteAnimee.tsx`
  - Ajouter prop `segment` au tableau de dependances du `useEffect` d'animation
  - Reinitialiser `progres.value = 0` et relancer `withTiming(1)` quand `segment` change
  - Ajouter les styles shadow au conteneur anime pour les cartes gelees
- `apps/mobile/hooks/useAnimations.ts`
  - Supprimer tout le concept `cartesPoseesAuPli` (state, ref, fonctions construire*, creer*, remplacer\*)
  - Garder les cartes "jeu-\*" dans `cartesEnVol` apres fin d'animation (ne plus retirer)
  - Refactorer `lancerAnimationRamassagePli` pour mettre a jour les cartes existantes (segment++)
  - Adapter `surAnimationTerminee` avec un comportement par segment
  - Adapter `annulerAnimations` (supprimer la ligne cartesPoseesAuPli)
- `apps/mobile/hooks/useControleurJeu.ts`
  - Supprimer `remplacerCartesPoseesAuPliDepuisPli` et son useEffect
  - Supprimer `cartesPoseesAuPli` du return
  - Remplacer la resync par creation de `CarteEnVol` gelees
- `apps/mobile/components/game/PlateauJeu.tsx`
  - Supprimer la destructuration et le passage de `cartesPoseesAuPli`

### Fichiers de test a modifier

- `apps/mobile/__tests__/useAnimations.test.ts` — Rewrite complet
- `apps/mobile/__tests__/CoucheAnimation.test.tsx` — Supprimer test cartesPoseesAuPli
- `apps/mobile/__tests__/useControleurJeuPli.test.ts` — Adapter resync test
- `apps/mobile/__tests__/CarteAnimee.test.tsx` — Ajouter test segment

---

## Task 1 : Ajouter `segment` a `CarteEnVol` dans CoucheAnimation

**Files:**

- Modify: `apps/mobile/components/game/CoucheAnimation.tsx:12-22`

- [ ] **Step 1: Ajouter le champ `segment` a l'interface `CarteEnVol`**

```typescript
export interface CarteEnVol {
  id: string;
  carte: Carte;
  depart: PositionCarte;
  arrivee: PositionCarte;
  faceVisible: boolean;
  duree: number;
  segment: number; // s'incremente a chaque nouvelle trajectoire
  flipDe?: number;
  flipVers?: number;
  easing?: "out-cubic" | "inout-cubic";
}
```

- [ ] **Step 2: Passer `segment` en prop a `CarteAnimee` et en `key`**

Dans le rendu `cartesEnVol.map(...)`, changer la key de `vol.id` a `vol.id` (on garde l'id stable pour ne pas demonter) et passer `segment` en prop :

```tsx
{
  cartesEnVol.map((vol) => (
    <CarteAnimee
      key={vol.id}
      carte={vol.carte}
      depart={vol.depart}
      arrivee={vol.arrivee}
      faceVisible={vol.faceVisible}
      duree={vol.duree}
      segment={vol.segment}
      atlas={atlas}
      flipDe={vol.flipDe}
      flipVers={vol.flipVers}
      easing={vol.easing}
      largeurEcran={largeurEcran}
      hauteurEcran={hauteurEcran}
      onTerminee={() => onAnimationTerminee(vol.id)}
    />
  ));
}
```

- [ ] **Step 3: Verifier que le typecheck passe**

Run: `pnpm turbo typecheck`
Expected: Erreurs de compilation car `segment` n'est pas fourni par les appelants et `CarteAnimee` ne l'accepte pas encore. On fixera ca dans les taches suivantes. Pour l'instant, on note les erreurs attendues.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/components/game/CoucheAnimation.tsx
git commit -m "feat(mobile): ajouter champ segment a CarteEnVol"
```

---

## Task 2 : Supprimer `cartesPoseesAuPli` de CoucheAnimation

**Files:**

- Modify: `apps/mobile/components/game/CoucheAnimation.tsx`
- Modify: `apps/mobile/__tests__/CoucheAnimation.test.tsx`

- [ ] **Step 1: Supprimer le test `cartesPoseesAuPli` dans le fichier de test**

Dans `apps/mobile/__tests__/CoucheAnimation.test.tsx`, supprimer le test `"affiche aussi les cartes posees au pli sur la couche d'animation"` (lignes 56-97). Ne garder que le test `"affiche les cartes en vol sur la couche d'animation"`. Ajouter `segment: 0` a la carte en vol dans le test restant.

```typescript
describe("CoucheAnimation", () => {
  it("affiche les cartes en vol sur la couche d'animation", () => {
    const props = {
      cartesEnVol: [
        {
          id: "jeu-1",
          carte: { couleur: "pique", rang: "as" } as const,
          depart: { x: 0.2, y: 0.8, rotation: 0, echelle: 1 },
          arrivee: { x: 0.6, y: 0.45, rotation: 8, echelle: 0.9 },
          faceVisible: true,
          duree: 300,
          segment: 0,
        },
      ],
      largeurEcran: 1200,
      hauteurEcran: 800,
      onAnimationTerminee: () => {},
    } as unknown as ComponentProps<typeof CoucheAnimation>;

    const { getByTestId } = render(<CoucheAnimation {...props} />);

    expect(getByTestId("carte-animee")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it passes**

Run: `pnpm --filter @belote/mobile test -- --testPathPattern=CoucheAnimation`
Expected: PASS

- [ ] **Step 3: Supprimer `cartesPoseesAuPli` du composant**

Dans `apps/mobile/components/game/CoucheAnimation.tsx` :

1. Supprimer l'interface locale `CartePoseeAuPli` (lignes 38-46)
2. Supprimer `cartesPoseesAuPli` de `PropsCoucheAnimation` (ligne 26) et de la destructuration (ligne 50)
3. Supprimer le bloc `cartesPoseesAuPli.map(...)` (lignes 100-125)
4. Supprimer `cartesPoseesAuPli.length === 0 &&` de la condition de retour null (ligne 69)
5. Supprimer l'import `CarteFaceAtlas` de `./Carte` (ligne 8) — il n'est plus utilise ici
6. Supprimer les variables `largeurCarte` / `hauteurCarte` qui ne servent plus (lignes 73-74)

Le composant ne rend plus que `DistributionCanvas` + `cartesEnVol.map(...)`.

- [ ] **Step 4: Run test to verify it still passes**

Run: `pnpm --filter @belote/mobile test -- --testPathPattern=CoucheAnimation`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/components/game/CoucheAnimation.tsx apps/mobile/__tests__/CoucheAnimation.test.tsx
git commit -m "refactor(mobile): supprimer cartesPoseesAuPli de CoucheAnimation"
```

---

## Task 3 : Rendre `CarteAnimee` reactif au segment

**Files:**

- Modify: `apps/mobile/components/game/CarteAnimee.tsx`
- Modify: `apps/mobile/__tests__/CarteAnimee.test.tsx`

- [ ] **Step 1: Ecrire le test de relance d'animation sur changement de segment**

Dans `apps/mobile/__tests__/CarteAnimee.test.tsx`, ajouter un test :

```typescript
it("relance l'animation quand le segment change", () => {
  const withTimingMock = jest.fn((valeur: number, _config: unknown, surFin?: (termine?: boolean) => void) => {
    surFin?.(true);
    return valeur;
  });
  const reanimated = jest.requireMock("react-native-reanimated") as {
    withTiming: jest.Mock;
  };
  reanimated.withTiming = withTimingMock;

  const surFin = jest.fn();

  const { rerender } = render(
    <CarteAnimee
      carte={CARTE_TEST}
      depart={{ x: 0.2, y: 0.8, rotation: 0, echelle: 1 }}
      arrivee={{ x: 0.5, y: 0.5, rotation: 5, echelle: 0.9 }}
      faceVisible
      duree={300}
      segment={0}
      largeurEcran={1200}
      hauteurEcran={800}
      atlas={ATLAS_TEST}
      onTerminee={surFin}
    />,
  );

  const premiersAppels = withTimingMock.mock.calls.length;

  rerender(
    <CarteAnimee
      carte={CARTE_TEST}
      depart={{ x: 0.5, y: 0.5, rotation: 0, echelle: 0.85 }}
      arrivee={{ x: 0.5, y: 0.2, rotation: 0, echelle: 0.6 }}
      faceVisible={false}
      duree={400}
      segment={1}
      largeurEcran={1200}
      hauteurEcran={800}
      atlas={ATLAS_TEST}
      onTerminee={surFin}
    />,
  );

  expect(withTimingMock.mock.calls.length).toBeGreaterThan(premiersAppels);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @belote/mobile test -- --testPathPattern=CarteAnimee`
Expected: FAIL — `CarteAnimee` n'accepte pas encore la prop `segment`

- [ ] **Step 3: Implementer le support segment dans CarteAnimee**

Dans `apps/mobile/components/game/CarteAnimee.tsx` :

1. Ajouter `segment?: number` a l'interface `PropsCarteAnimee` (apres `easing`)
2. Destructurer `segment = 0` dans les props du composant
3. Ajouter `segment` au tableau de dependances du `useEffect` qui lance l'animation (ligne 127)
4. Dans ce `useEffect`, reinitialiser `progres.value = 0` avant le `withTiming` :

```typescript
useEffect(() => {
  const planifierFinAnimation = () => {
    if (!onTerminee) return;

    if (typeof globalThis.requestAnimationFrame === "function") {
      animationFrameFinRef.current = globalThis.requestAnimationFrame(() => {
        animationFrameFinRef.current = null;
        onTerminee();
      });
      return;
    }

    timeoutFinRef.current = setTimeout(() => {
      timeoutFinRef.current = null;
      onTerminee();
    }, 0);
  };

  progres.value = 0;
  progres.value = withTiming(
    1,
    { duration: duree, easing: EASINGS[easing] },
    (termine) => {
      "worklet";
      if (termine && onTerminee) {
        runOnJS(planifierFinAnimation)();
      }
    },
  );
}, [progres, duree, onTerminee, easing, segment]);
```

5. Ajouter les styles shadow au `styleConteneur` pour les cartes gelees (quand `progres.value === 1`). Ces shadows etaient auparavant dans le wrapper statique de `CoucheAnimation` :

```typescript
const styleConteneur = useAnimatedStyle(() => {
  const t = progres.value;
  const position = interpolerBezierQuadratique(
    { x: depart.x, y: depart.y },
    pointControle,
    { x: arrivee.x, y: arrivee.y },
    t,
  );
  const rotation = depart.rotation + (arrivee.rotation - depart.rotation) * t;
  const echelle = depart.echelle + (arrivee.echelle - depart.echelle) * t;

  return {
    position: "absolute" as const,
    left: position.x * largeurEcran - largeurCarte / 2,
    top: position.y * hauteurEcran - hauteurCarte / 2,
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

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @belote/mobile test -- --testPathPattern=CarteAnimee`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/components/game/CarteAnimee.tsx apps/mobile/__tests__/CarteAnimee.test.tsx
git commit -m "feat(mobile): CarteAnimee reactif au segment pour enchainer les trajectoires"
```

---

## Task 4 : Refactorer `useAnimations` — supprimer `cartesPoseesAuPli`

**Files:**

- Modify: `apps/mobile/hooks/useAnimations.ts`
- Modify: `apps/mobile/__tests__/useAnimations.test.ts`

- [ ] **Step 1: Reecrire les tests**

Remplacer le contenu de `apps/mobile/__tests__/useAnimations.test.ts` :

```typescript
import type { Carte } from "@belote/shared-types";
import { act, renderHook } from "@testing-library/react-native";

import { useAnimations } from "../hooks/useAnimations";

const CARTE_TEST: Carte = { couleur: "pique", rang: "as" };

describe("useAnimations", () => {
  let requestAnimationFrameOriginal: typeof global.requestAnimationFrame;

  beforeEach(() => {
    jest.useFakeTimers();
    requestAnimationFrameOriginal = global.requestAnimationFrame;
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
    global.requestAnimationFrame = requestAnimationFrameOriginal;
  });

  it("garde la carte jeu-* dans cartesEnVol apres la fin de l'animation (gelee)", () => {
    const surFin = jest.fn();
    global.requestAnimationFrame = jest.fn((cb: FrameRequestCallback) => {
      cb(16);
      return 1;
    });

    const { result } = renderHook(() => useAnimations());

    act(() => {
      result.current.lancerAnimationJeuCarte(CARTE_TEST, "est", surFin);
    });

    act(() => {
      result.current.surAnimationTerminee("jeu-1");
    });

    expect(surFin).toHaveBeenCalledTimes(1);
    expect(result.current.cartesEnVol).toHaveLength(1);
    expect(result.current.cartesEnVol[0].id).toBe("jeu-1");
  });

  it("ne retourne plus de cartesPoseesAuPli", () => {
    const { result } = renderHook(() => useAnimations());
    const valeurRetour = result.current as unknown as Record<string, unknown>;
    expect("cartesPoseesAuPli" in valeurRetour).toBe(false);
  });

  it("initialise les cartes jeu-* avec segment 0", () => {
    const { result } = renderHook(() => useAnimations());

    act(() => {
      result.current.lancerAnimationJeuCarte(CARTE_TEST, "est");
    });

    expect(result.current.cartesEnVol[0].segment).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @belote/mobile test -- --testPathPattern=useAnimations`
Expected: FAIL — `cartesPoseesAuPli` existe encore, le comportement de `surAnimationTerminee` retire encore la carte

- [ ] **Step 3: Implementer les changements dans useAnimations.ts**

Modifications dans `apps/mobile/hooks/useAnimations.ts` :

1. **Supprimer** : `CartePoseeAuPli` interface, `CarteDuPli` (deplacer dans le fichier si utilise ailleurs — verifier), `construireCartePoseeAuPli`, `construireCartesPoseesAuPliDepuisPli`
2. **Supprimer** : state `cartesPoseesAuPli` + `cartesPoseesAuPliRef` + `setCartesPoseesAuPli`
3. **Supprimer** : `remplacerCartesPoseesAuPli`, `creerCartePoseeAuPli`, `creerCartePoseeAuPliDepuisVol`
4. **Supprimer** : `remplacerCartesPoseesAuPliDepuisPli`
5. **Ajouter** `segment: 0` a toutes les `CarteEnVol` creees dans `lancerAnimationJeuCarte` et `glisserCarteRetournee`
6. **Modifier `surAnimationTerminee`** : pour les cartes "jeu-\*", appeler le callback mais ne PAS retirer la carte de `cartesEnVol`

```typescript
const surAnimationTerminee = useCallback(
  (id: string) => {
    const callbackFin = callbacksFinJeuRef.current.get(id);

    if (id.startsWith("jeu-")) {
      // Carte jeu : reste gelee dans cartesEnVol, on appelle juste le callback
      if (callbackFin) {
        callbacksFinJeuRef.current.delete(id);
        callbackFin();
      }
      return;
    }

    // Autres cartes (slide-retournee, etc.) : retirer de cartesEnVol
    if (callbackFin) {
      callbacksFinJeuRef.current.delete(id);
      callbackFin();
    }

    remplacerCartesEnVol((precedent) => precedent.filter((carte) => carte.id !== id));
  },
  [remplacerCartesEnVol],
);
```

7. **Supprimer** `cartesPoseesAuPli` et `remplacerCartesPoseesAuPliDepuisPli` du return
8. **Mettre a jour** l'interface `ResultatUseAnimations` : supprimer `cartesPoseesAuPli` et `remplacerCartesPoseesAuPliDepuisPli`

Note: garder `CarteDuPli` exporte car il est utilise par `useControleurJeu.ts`. Si apres verification il n'est utilise que dans `useAnimations`, le deplacer.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @belote/mobile test -- --testPathPattern=useAnimations`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/hooks/useAnimations.ts apps/mobile/__tests__/useAnimations.test.ts
git commit -m "refactor(mobile): supprimer cartesPoseesAuPli de useAnimations, garder cartes gelees"
```

---

## Task 5 : Refactorer le ramassage — mise a jour in-place des cartes

**Files:**

- Modify: `apps/mobile/hooks/useAnimations.ts`
- Modify: `apps/mobile/__tests__/useAnimations.test.ts`

- [ ] **Step 1: Ecrire les tests de ramassage in-place**

Ajouter dans `apps/mobile/__tests__/useAnimations.test.ts` :

```typescript
describe("ramassage in-place", () => {
  it("met a jour les cartes jeu-* existantes pour la convergence (segment 1)", () => {
    const { result } = renderHook(() => useAnimations());

    act(() => {
      result.current.lancerAnimationJeuCarte(CARTE_TEST, "est");
    });

    act(() => {
      result.current.surAnimationTerminee("jeu-1");
    });

    const carteAvant = result.current.cartesEnVol[0];
    expect(carteAvant.segment).toBe(0);

    act(() => {
      result.current.lancerAnimationRamassagePli(
        [{ joueur: "est", carte: CARTE_TEST }],
        "nord",
      );
      jest.runAllTimers();
    });

    const carteApres = result.current.cartesEnVol.find((c) => c.id === "jeu-1");
    expect(carteApres).toBeDefined();
    expect(carteApres!.segment).toBe(1);
  });

  it("retire les cartes de cartesEnVol apres la phase 2 du ramassage", () => {
    const onTerminee = jest.fn();
    const { result } = renderHook(() => useAnimations());

    act(() => {
      result.current.lancerAnimationJeuCarte(CARTE_TEST, "est");
    });

    act(() => {
      result.current.surAnimationTerminee("jeu-1");
    });

    act(() => {
      result.current.lancerAnimationRamassagePli(
        [{ joueur: "est", carte: CARTE_TEST }],
        "nord",
        onTerminee,
      );
      jest.runAllTimers();
    });

    // Simuler fin convergence (segment 1)
    act(() => {
      result.current.surAnimationTerminee("jeu-1");
    });

    // La carte devrait etre en segment 2 (glissement)
    const carteGlissement = result.current.cartesEnVol.find((c) => c.id === "jeu-1");
    expect(carteGlissement).toBeDefined();
    expect(carteGlissement!.segment).toBe(2);

    // Simuler fin glissement (segment 2)
    act(() => {
      result.current.surAnimationTerminee("jeu-1");
    });

    expect(result.current.cartesEnVol).toHaveLength(0);
    expect(onTerminee).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @belote/mobile test -- --testPathPattern=useAnimations`
Expected: FAIL — le ramassage cree encore de nouvelles cartes

- [ ] **Step 3: Refactorer `lancerAnimationRamassagePli`**

Remplacer la logique de `lancerAnimationRamassagePli` dans `apps/mobile/hooks/useAnimations.ts`.

Au lieu de creer de nouvelles `CarteEnVol` "ramassage-p1-_" / "ramassage-p2-_", mettre a jour les cartes "jeu-\*" existantes :

```typescript
const lancerAnimationRamassagePli = useCallback(
  (
    cartesPli: { joueur: PositionJoueur; carte: Carte }[],
    gagnant: PositionJoueur,
    onTerminee?: () => void,
    onDebutRamassage?: () => void,
  ) => {
    const indexGagnant = POSITIONS_JOUEUR.indexOf(gagnant);
    const equipe = indexGagnant % 2 === 0 ? "equipe1" : "equipe2";
    const posPile = POSITIONS_PILES[equipe];
    const rotationArrivee = equipe === "equipe2" ? 90 : 0;
    const posGagnant = POSITIONS_PLI[gagnant];
    const { dureeConvergence, dureeGlissement, delaiPhase2 } = planifierRamassagePli();

    const timeout = setTimeout(() => {
      onDebutRamassage?.();

      // Phase 1 : convergence — mettre a jour les cartes "jeu-*" existantes
      remplacerCartesEnVol((precedent) => {
        return precedent.map((carteEnVol) => {
          const correspondance = cartesPli.find(({ carte }) =>
            estMemeCarte(carte, carteEnVol.carte),
          );
          if (!correspondance || !carteEnVol.id.startsWith("jeu-")) {
            return carteEnVol;
          }

          return {
            ...carteEnVol,
            depart: { ...carteEnVol.arrivee },
            arrivee: {
              x: posGagnant.x,
              y: posGagnant.y,
              rotation: 0,
              echelle: 0.85,
            },
            duree: dureeConvergence,
            easing: "inout-cubic" as const,
            segment: carteEnVol.segment + 1,
          };
        });
      });

      // Enregistrer les callbacks de convergence -> glissement
      for (const { carte } of cartesPli) {
        const carteEnVol = cartesEnVolRef.current.find(
          (c) => c.id.startsWith("jeu-") && estMemeCarte(c.carte, carte),
        );
        if (carteEnVol) {
          callbacksFinJeuRef.current.set(carteEnVol.id, () => {
            // Phase 2 : glissement vers la pile
            const centre = (cartesPli.length - 1) / 2;
            const idx = cartesPli.findIndex((cp) => estMemeCarte(cp.carte, carte));
            const offsetIdx = idx - centre;
            const microDecalageX = offsetIdx * 0.004;
            const microDecalageY = offsetIdx * 0.002;

            remplacerCartesEnVol((prec) =>
              prec.map((c) => {
                if (c.id !== carteEnVol.id) return c;
                return {
                  ...c,
                  depart: {
                    x: posGagnant.x + microDecalageX,
                    y: posGagnant.y + microDecalageY,
                    rotation: 0,
                    echelle: 0.85,
                  },
                  arrivee: {
                    x: posPile.x,
                    y: posPile.y,
                    rotation: rotationArrivee,
                    echelle: 0.6,
                  },
                  faceVisible: false,
                  duree: dureeGlissement,
                  easing: "inout-cubic" as const,
                  segment: c.segment + 1,
                };
              }),
            );

            // Callback fin de glissement : retirer la carte
            callbacksFinJeuRef.current.set(carteEnVol.id, () => {
              remplacerCartesEnVol((prec) => prec.filter((c) => c.id !== carteEnVol.id));
            });
          });
        }
      }

      // Callback onTerminee global apres toutes les phases 2
      if (onTerminee) {
        const timeoutFin = setTimeout(onTerminee, delaiPhase2 + dureeGlissement);
        timeoutsRef.current.push(timeoutFin);
      }
    }, ANIMATIONS.ramassagePli.delaiAvant);

    timeoutsRef.current.push(timeout);
  },
  [remplacerCartesEnVol],
);
```

Note: le `surAnimationTerminee` de la Task 4 doit etre **remplace** par cette version finale qui gere les callbacks de ramassage enregistres dynamiquement :

```typescript
const surAnimationTerminee = useCallback(
  (id: string) => {
    const callbackFin = callbacksFinJeuRef.current.get(id);

    if (callbackFin) {
      callbacksFinJeuRef.current.delete(id);
      callbackFin();
      return;
    }

    if (id.startsWith("jeu-")) {
      // Carte jeu sans callback : reste gelee
      return;
    }

    // Autres cartes : retirer
    remplacerCartesEnVol((precedent) => precedent.filter((carte) => carte.id !== id));
  },
  [remplacerCartesEnVol],
);
```

Cette version remplace celle ecrite a la Task 4 — la logique "callback first" est necessaire car le ramassage enregistre des callbacks dynamiques sur les cartes "jeu-\*".

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @belote/mobile test -- --testPathPattern=useAnimations`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/hooks/useAnimations.ts apps/mobile/__tests__/useAnimations.test.ts
git commit -m "feat(mobile): ramassage in-place via segment sur les cartes jeu-*"
```

---

## Task 6 : Adapter `useControleurJeu` et `PlateauJeu`

**Files:**

- Modify: `apps/mobile/hooks/useControleurJeu.ts`
- Modify: `apps/mobile/components/game/PlateauJeu.tsx`
- Modify: `apps/mobile/__tests__/useControleurJeuPli.test.ts`

- [ ] **Step 1: Adapter le test de resynchronisation**

Dans `apps/mobile/__tests__/useControleurJeuPli.test.ts`, le test `"conserve la verite metier du pli..."` (lignes 56-76) importe `construireCartesPoseesAuPliDepuisPli` qui sera supprime. Remplacer ce test par un test qui verifie que la resynchronisation cree des cartes gelees dans `cartesEnVol` :

```typescript
import { construireCartesGeleesDepuisPli } from "../hooks/useAnimations";

// ... dans le describe existant :

it("construit des cartes gelees pour les cartes du pli absentes de cartesEnVol", () => {
  const pli = [{ joueur: "est" as const, carte: CARTE_TEST }];
  const cartesEnVol: Array<{ carte: Carte }> = [];

  const gelee = construireCartesGeleesDepuisPli(pli, cartesEnVol);

  expect(gelee).toHaveLength(1);
  expect(gelee[0]).toMatchObject({
    id: "pli-est-pique-as",
    carte: CARTE_TEST,
    segment: 0,
  });
});

it("ne cree pas de carte gelee si elle est deja en vol", () => {
  const pli = [{ joueur: "est" as const, carte: CARTE_TEST }];
  const cartesEnVol = [{ carte: CARTE_TEST }];

  const gelee = construireCartesGeleesDepuisPli(pli, cartesEnVol);

  expect(gelee).toHaveLength(0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @belote/mobile test -- --testPathPattern=useControleurJeuPli`
Expected: FAIL — `construireCartesGeleesDepuisPli` n'existe pas

- [ ] **Step 3: Creer `construireCartesGeleesDepuisPli` dans useAnimations.ts**

Ajouter dans `apps/mobile/hooks/useAnimations.ts` :

```typescript
export function construireCartesGeleesDepuisPli(
  pli: CarteDuPli[],
  cartesEnVol: ReadonlyArray<{ carte: Carte }>,
): CarteEnVol[] {
  return pli
    .filter(
      ({ carte }) =>
        !cartesEnVol.some((carteEnVol) => estMemeCarte(carteEnVol.carte, carte)),
    )
    .map(({ joueur, carte }) => {
      const posArrivee = POSITIONS_PLI[joueur];
      const { decalageX, decalageY, rotation } = variationCartePli(
        carte.couleur,
        carte.rang,
        joueur,
      );
      const pos = {
        x: arrondirPosition(posArrivee.x + decalageX),
        y: arrondirPosition(posArrivee.y + decalageY),
        rotation,
        echelle: 0.9,
      };

      return {
        id: `pli-${joueur}-${carte.couleur}-${carte.rang}`,
        carte,
        depart: pos,
        arrivee: pos,
        faceVisible: true,
        duree: 0,
        segment: 0,
      };
    });
}
```

Note: `CarteEnVol` est maintenant importe depuis `CoucheAnimation.tsx`. Il faut s'assurer que le type est disponible. Verifier les imports.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @belote/mobile test -- --testPathPattern=useControleurJeuPli`
Expected: PASS

- [ ] **Step 5: Adapter useControleurJeu.ts**

Dans `apps/mobile/hooks/useControleurJeu.ts` :

1. Supprimer la ligne `const remplacerCartesPoseesAuPliDepuisPli = animations.remplacerCartesPoseesAuPliDepuisPli;` (ligne 245-246)
2. Remplacer le `useEffect` de resynchronisation (lignes 1147-1149) :

```typescript
useEffect(() => {
  // Resynchroniser : creer des cartes gelees pour les cartes du pli absentes de cartesEnVol
  const cartesGelees = construireCartesGeleesDepuisPli(
    etatJeu.pliEnCours,
    animations.cartesEnVol,
  );
  if (cartesGelees.length > 0) {
    // Ajouter les cartes gelees manquantes via une methode exposee par useAnimations
    animations.ajouterCartesGelees(cartesGelees);
  }
}, [etatJeu.pliEnCours, animations]);
```

Note: il faudra aussi exposer `ajouterCartesGelees` depuis `useAnimations`. Ajouter dans `useAnimations.ts` :

```typescript
const ajouterCartesGelees = useCallback(
  (cartesGelees: CarteEnVol[]) => {
    remplacerCartesEnVol((precedent) => {
      const idsExistants = new Set(precedent.map((c) => c.id));
      const nouvelles = cartesGelees.filter((c) => !idsExistants.has(c.id));
      return nouvelles.length > 0 ? [...precedent, ...nouvelles] : precedent;
    });
  },
  [remplacerCartesEnVol],
);
```

Et l'ajouter au return et a `ResultatUseAnimations`.

3. Supprimer `cartesPoseesAuPli: animations.cartesPoseesAuPli` du return (ligne 1155)

- [ ] **Step 6: Adapter PlateauJeu.tsx**

Dans `apps/mobile/components/game/PlateauJeu.tsx` :

1. Supprimer `cartesPoseesAuPli` de la destructuration (ligne 36)
2. Supprimer `cartesPoseesAuPli={cartesPoseesAuPli}` du JSX (ligne 227)

- [ ] **Step 7: Run typecheck**

Run: `pnpm turbo typecheck`
Expected: PASS (aucune reference restante a `cartesPoseesAuPli`)

- [ ] **Step 8: Run all tests**

Run: `pnpm --filter @belote/mobile test`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add apps/mobile/hooks/useControleurJeu.ts apps/mobile/hooks/useAnimations.ts apps/mobile/components/game/PlateauJeu.tsx apps/mobile/__tests__/useControleurJeuPli.test.ts
git commit -m "refactor(mobile): supprimer cartesPoseesAuPli de useControleurJeu et PlateauJeu"
```

---

## Task 7 : Nettoyage et verification finale

**Files:**

- Verify all modified files

- [ ] **Step 1: Verifier qu'il ne reste aucune reference a `cartesPoseesAuPli`**

Run: `grep -r "cartesPoseesAuPli" apps/mobile/`
Expected: Aucun resultat

- [ ] **Step 2: Verifier qu'il ne reste aucune reference a `CartePoseeAuPli`**

Run: `grep -r "CartePoseeAuPli" apps/mobile/`
Expected: Aucun resultat

- [ ] **Step 3: Verifier qu'il ne reste aucune reference a `construireCartePoseeAuPli` / `construireCartesPoseesAuPliDepuisPli`**

Run: `grep -r "construireCartePosee" apps/mobile/`
Expected: Aucun resultat

- [ ] **Step 4: Run full validation**

Run: `pnpm turbo typecheck test`
Expected: PASS

- [ ] **Step 5: Run e2e tests**

Run: `pnpm --filter @belote/mobile test:e2e`
Expected: PASS

- [ ] **Step 6: Commit final si ajustements**

```bash
git add -A
git commit -m "chore(mobile): nettoyage references cartesPoseesAuPli"
```
