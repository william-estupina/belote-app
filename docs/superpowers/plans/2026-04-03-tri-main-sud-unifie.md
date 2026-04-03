# Tri main sud unifie Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Utiliser un seul ordre de reference pour la main sud dans le tri React et dans la distribution atlas.

**Architecture:** Le tri reste centralise dans `triMainJoueur`. L orchestration de distribution calcule l ordre final sud et le transmet au moteur atlas afin que les cartes existantes et les cartes nouvellement distribuees convergent vers les memes indices finaux que la main React.

**Tech Stack:** TypeScript strict, React Native, Jest, jest-expo

---

### Task 1: Cadrer les tests du tri partage

**Files:**

- Modify: `apps/mobile/__tests__/triMainJoueur.test.ts`
- Modify: `apps/mobile/__tests__/useControleurJeuDistribution.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
it("alterne rouge puis noir apres une couleur prioritaire noire quand c est possible", () => {
  // ...
});

it("transmet le meme ordre sud trie a la distribution atlas", async () => {
  // ...
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @belote/mobile test -- triMainJoueur useControleurJeuDistribution`
Expected: FAIL sur l alternance et sur l ordre sud non transmis a l atlas.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/__tests__/triMainJoueur.test.ts apps/mobile/__tests__/useControleurJeuDistribution.test.ts
git commit -m "test: ajouter la couverture du tri main sud unifie"
```

### Task 2: Brancher le tri unique dans la distribution sud

**Files:**

- Modify: `apps/mobile/hooks/triMainJoueur.ts`
- Modify: `apps/mobile/hooks/useAnimationsDistribution.ts`
- Modify: `apps/mobile/hooks/useOrchestrationDistribution.ts`

- [ ] **Step 1: Implement the minimal shared ordering flow**

```ts
const mainSudOrdonnee = trierMainJoueur(mainCompleteSud, optionsTri);
```

- [ ] **Step 2: Use the ordered hand as the atlas target order**

```ts
const indexFinal = mainSudOrdonnee.findIndex((carteOrdonnee) =>
  cartesSontEgales(carteOrdonnee, carte),
);
```

- [ ] **Step 3: Run focused tests**

Run: `pnpm --filter @belote/mobile test -- triMainJoueur useControleurJeuDistribution`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/hooks/triMainJoueur.ts apps/mobile/hooks/useAnimationsDistribution.ts apps/mobile/hooks/useOrchestrationDistribution.ts
git commit -m "fix: unifier le tri de la main sud"
```

### Task 3: Verification finale

**Files:**

- Modify: `docs/superpowers/specs/2026-04-03-tri-main-sud-unifie-design.md`
- Modify: `docs/superpowers/plans/2026-04-03-tri-main-sud-unifie.md`

- [ ] **Step 1: Run the relevant mobile tests**

Run: `pnpm --filter @belote/mobile test -- triMainJoueur useControleurJeuDistribution`
Expected: PASS

- [ ] **Step 2: Run typecheck if signatures changed**

Run: `pnpm --filter @belote/mobile typecheck`
Expected: PASS

- [ ] **Step 3: Commit the docs with the code**

```bash
git add docs/superpowers/specs/2026-04-03-tri-main-sud-unifie-design.md docs/superpowers/plans/2026-04-03-tri-main-sud-unifie.md
git commit -m "chore: documenter le tri main sud unifie"
```
