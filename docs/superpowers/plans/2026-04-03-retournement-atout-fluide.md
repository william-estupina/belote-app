# Retournement fluide de l'atout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rendre le retournement de la carte d'atout plus fluide, plus court et plus coherent avec la donne atlas sans changer l'orchestration metier.

**Architecture:** L'implementation reste locale a `CarteRevelation` et a ses constantes de timing. On verrouille d'abord le comportement observable avec un test rouge sur la configuration de l'animation, puis on recalibre la choregraphie et on reverifie les tests existants autour de `PlateauJeu`.

**Tech Stack:** TypeScript strict, React Native, react-native-reanimated, Jest, @testing-library/react-native

---

### Task 1: Figer le comportement attendu de la revelation fluide

**Files:**

- Modify: `apps/mobile/__tests__/CarteRevelation.test.tsx`
- Test: `apps/mobile/__tests__/CarteRevelation.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
it("configure une revelation fluide plus courte avec un flip centre dans le trajet", () => {
  const animated = require("react-native-reanimated");
  animated.withTiming.mockClear();
  animated.interpolate.mockClear();

  render(
    <CarteRevelation
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

  expect(animated.withTiming).toHaveBeenNthCalledWith(
    1,
    1,
    expect.objectContaining({ duration: 120 }),
    undefined,
  );
  expect(animated.withTiming).toHaveBeenNthCalledWith(
    2,
    2,
    expect.objectContaining({ duration: 220 }),
    undefined,
  );
  expect(animated.withTiming).toHaveBeenNthCalledWith(
    3,
    3,
    expect.objectContaining({ duration: 220 }),
    expect.any(Function),
  );
  expect(animated.interpolate).toHaveBeenCalledWith(
    expect.anything(),
    [0, 1, 2, 3],
    [100, 118, 148, 180],
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @belote/mobile test -- CarteRevelation.test.tsx`
Expected: FAIL because the current durations and X trajectory still match the old choreography.

- [ ] **Step 3: Write minimal implementation**

```tsx
const DUREE_DETACHEMENT = 120;
const DUREE_FLIP = 220;
const DUREE_GLISSEMENT = 220;
const PX_SOULEVEMENT = 3;

const deltaX = arriveeX - departX;
const jalonX1 = departX + deltaX * 0.22;
const jalonX2 = departX + deltaX * 0.6;
```

Puis reutiliser ces jalons dans `styleConteneur`, en gardant le callback de fin intact.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @belote/mobile test -- CarteRevelation.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/__tests__/CarteRevelation.test.tsx apps/mobile/components/game/CarteRevelation.tsx
git commit -m "feat(mobile): fluidifier le retournement de l atout"
```

### Task 2: Verifier l'integration avec la reserve et la redistribution

**Files:**

- Modify: `apps/mobile/__tests__/CarteRevelation.test.tsx`
- Test: `apps/mobile/__tests__/PlateauJeu.test.tsx`
- Test: `apps/mobile/__tests__/CarteRevelation.test.tsx`

- [ ] **Step 1: Write the failing inverse test**

```tsx
it("recalibre aussi le mode inverse avec les durees proportionnelles de la version fluide", () => {
  const animated = require("react-native-reanimated");
  animated.withTiming.mockClear();

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
      dureeTotale={500}
      onTerminee={() => {}}
    />,
  );

  expect(animated.withTiming).toHaveBeenNthCalledWith(
    1,
    1,
    expect.objectContaining({ duration: 107 }),
    undefined,
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @belote/mobile test -- CarteRevelation.test.tsx`
Expected: FAIL because the inverse scaling still uses the old reference durations.

- [ ] **Step 3: Write minimal implementation**

```tsx
const DUREE_TOTALE_REFERENCE = DUREE_DETACHEMENT + DUREE_FLIP + DUREE_GLISSEMENT;
```

Puis recalculer les durees inversees a partir de cette nouvelle reference et ajuster les interpolations `opacity`, `rotateY`, `rotate` et `scale` pour conserver un mouvement discret dans les deux sens.

- [ ] **Step 4: Run targeted tests to verify they pass**

Run: `pnpm --filter @belote/mobile test -- CarteRevelation.test.tsx PlateauJeu.test.tsx`
Expected: PASS

- [ ] **Step 5: Run final mobile verification**

Run: `pnpm --filter @belote/mobile test -- CarteRevelation.test.tsx PlateauJeu.test.tsx reserve-centrale.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/__tests__/CarteRevelation.test.tsx apps/mobile/__tests__/PlateauJeu.test.tsx apps/mobile/components/game/CarteRevelation.tsx
git commit -m "test(mobile): verrouiller la revelation fluide de l atout"
```
