# Tableau de score de fin de manche Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rendre le dialogue de fin de manche plus lisible avec une sequence automatique `titre -> verdict -> points de manche -> capot eventuel -> score total`.

**Architecture:** Le controleur mobile construit un `resumeFinManche` explicite pour l'UI. `DialogueFinManche` devient un composant sequentiel pilote par ce resume et par des timings centralises, sans deduire les regles metier depuis le rendu.

**Tech Stack:** TypeScript strict, React Native, Animated, Jest, Testing Library React Native

---

### Task 1: Ajouter un resume de fin de manche testable

**Files:**

- Create: `apps/mobile/hooks/resume-fin-manche.ts`
- Create: `apps/mobile/__tests__/resume-fin-manche.test.ts`
- Modify: `apps/mobile/hooks/useControleurJeu.ts`

- [x] **Step 1: Write the failing test**

```ts
it("retourne contrat-rempli quand l'equipe preneuse remplit", () => {
  const resume = construireResumeFinManche({
    indexPreneur: 0,
    scoreEquipe1: 180,
    scoreEquipe2: 96,
    scoreMancheEquipe1: 92,
    scoreMancheEquipe2: 70,
  });

  expect(resume.messageVerdict).toBe("Contrat rempli !");
  expect(resume.estContratRempli).toBe(true);
  expect(resume.scoreAvantEquipe1).toBe(88);
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @belote/mobile test -- --runInBand __tests__/resume-fin-manche.test.ts`
Expected: FAIL because `construireResumeFinManche` does not exist yet

- [x] **Step 3: Write minimal implementation**

```ts
export function construireResumeFinManche(
  entree: EntreeResumeFinManche,
): ResumeFinManche {
  // mappe l'equipe preneuse, le verdict, les scores avant/apres
}
```

- [x] **Step 4: Branch the controller on the new helper**

Ajouter `resumeFinManche` dans `EtatJeu`, l'alimenter depuis `extraireEtatUI`, puis le remettre a `null` au demarrage d'une nouvelle manche.

- [x] **Step 5: Run tests to verify they pass**

Run: `pnpm --filter @belote/mobile test -- --runInBand __tests__/resume-fin-manche.test.ts`
Expected: PASS

- [x] **Step 6: Commit**

```bash
git add apps/mobile/hooks/resume-fin-manche.ts apps/mobile/hooks/useControleurJeu.ts apps/mobile/__tests__/resume-fin-manche.test.ts
git commit -m "feat(mobile): exposer un resume de fin de manche"
```

### Task 2: Rendre le dialogue de fin de manche sequentiel

**Files:**

- Modify: `apps/mobile/components/game/DialogueFinManche.tsx`
- Modify: `apps/mobile/constants/animations-visuelles.ts`
- Modify: `apps/mobile/components/game/PlateauJeu.tsx`
- Test: `apps/mobile/__tests__/DialogueFinManche.test.tsx`

- [x] **Step 1: Write the failing test**

```tsx
it("affiche d'abord seulement fin de manche puis le verdict", async () => {
  render(
    <DialogueFinManche resumeFinManche={resumeContratRempli} onContinuer={jest.fn()} />,
  );

  expect(screen.getByText("Fin de manche")).toBeTruthy();
  expect(screen.queryByText("Contrat rempli !")).toBeNull();

  await avancerTimers(delaiVerdict);

  expect(screen.getByText("Contrat rempli !")).toBeTruthy();
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @belote/mobile test -- --runInBand __tests__/DialogueFinManche.test.tsx`
Expected: FAIL because the component still exposes the old props and old sequence

- [x] **Step 3: Write minimal implementation**

Transformer `DialogueFinManche` pour:

- consommer `resumeFinManche`
- suivre des etapes locales (`intro`, `verdict`, `details`, `capot`, `total`, `action`)
- sauter proprement l'etape `capot` si inutile
- conserver le comptage du score total avec `scoreAvant` et `scoreApres`

- [x] **Step 4: Wire the component from the board**

Remplacer les anciennes props dans `PlateauJeu.tsx` par `resumeFinManche={etatJeu.resumeFinManche}`.

- [x] **Step 5: Run tests to verify they pass**

Run: `pnpm --filter @belote/mobile test -- --runInBand __tests__/DialogueFinManche.test.tsx`
Expected: PASS

- [x] **Step 6: Commit**

```bash
git add apps/mobile/components/game/DialogueFinManche.tsx apps/mobile/constants/animations-visuelles.ts apps/mobile/components/game/PlateauJeu.tsx apps/mobile/__tests__/DialogueFinManche.test.tsx
git commit -m "feat(mobile): animer le dialogue de fin de manche"
```

### Task 3: Verifier l'integration et la non-regression

**Files:**

- Test: `apps/mobile/__tests__/resume-fin-manche.test.ts`
- Test: `apps/mobile/__tests__/DialogueFinManche.test.tsx`
- Test: `apps/mobile/__tests__/animationsVisuelles.test.ts`

- [x] **Step 1: Extend or adjust the relevant regression tests**

Verifier aussi:

- verdict `Vous etes dedans`
- verdict `Ils sont dedans`
- rendu capot dedie
- timings exposes dans `ANIMATIONS_DIALOGUE_FIN_MANCHE`

- [x] **Step 2: Run the focused mobile tests**

Run: `pnpm --filter @belote/mobile test -- --runInBand __tests__/resume-fin-manche.test.ts __tests__/DialogueFinManche.test.tsx __tests__/animationsVisuelles.test.ts`
Expected: PASS

- [x] **Step 3: Run mobile typecheck**

Run: `pnpm --filter @belote/mobile typecheck`
Expected: PASS

- [x] **Step 4: Commit**

```bash
git add apps/mobile/__tests__/resume-fin-manche.test.ts apps/mobile/__tests__/DialogueFinManche.test.tsx apps/mobile/__tests__/animationsVisuelles.test.ts
git commit -m "test(mobile): couvrir la fin de manche animee"
```

### Task 4: Final verification and delivery

**Files:**

- Modify: `docs/superpowers/plans/2026-03-25-tableau-score-fin-manche.md`

- [x] **Step 1: Run the final verification commands**

Run: `pnpm --filter @belote/mobile test -- --runInBand __tests__/resume-fin-manche.test.ts __tests__/DialogueFinManche.test.tsx __tests__/animationsVisuelles.test.ts`
Expected: PASS

Run: `pnpm --filter @belote/mobile typecheck`
Expected: PASS

- [x] **Step 2: Mark completed work in this plan**

Cocher les cases executees pour laisser une trace lisible.

- [x] **Step 3: Prepare branch completion**

Use superpowers:finishing-a-development-branch after the implementation is fully verified.
