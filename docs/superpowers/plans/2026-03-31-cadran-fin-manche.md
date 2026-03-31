# Cadran emotionnel de fin de manche Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer le verdict textuel de `DialogueFinManche` par un cadran emotionnel anime place sous `Fin de manche`, avec 6 intensites visuelles selon l'issue de la manche.

**Architecture:** Le composant garde sa timeline actuelle mais le bloc de verdict devient un cadran anime unique. La logique metier reste dans `resumeFinManche`; le composant mappe seulement le resume vers une configuration de rendu chaude ou froide, legere, forte ou maximale.

**Tech Stack:** TypeScript strict, React Native, Animated, Jest, Testing Library React Native

---

### Task 1: Cadrer le rendu par les tests

**Files:**

- Modify: `apps/mobile/__tests__/DialogueFinManche.test.tsx`

- [x] **Step 1: Ajouter un test rouge pour le cadran**

Verifier que :

- `Fin de manche` reste visible
- le cadran apparait ensuite avec le bon texte
- le bloc `animation-capot` separe n'est plus rendu

- [x] **Step 2: Lancer le test pour verifier l'echec**

Run: `pnpm --filter @belote/mobile test -- --runInBand __tests__/DialogueFinManche.test.tsx`

- [x] **Step 3: Ajouter un test rouge pour la defaite normale**

Verifier qu'une manche perdue sans chute ni capot affiche `Defaite`.

- [x] **Step 4: Relancer le test pour verifier l'echec**

Run: `pnpm --filter @belote/mobile test -- --runInBand __tests__/DialogueFinManche.test.tsx`

### Task 2: Implementer le cadran emotionnel

**Files:**

- Modify: `apps/mobile/components/game/DialogueFinManche.tsx`

- [x] **Step 1: Remplacer le bloc verdict par un cadran anime**

- [x] **Step 2: Supprimer le bloc `Capot` separe et reinjecter le cas capot dans le cadran**

- [x] **Step 3: Mapper les 6 etats valides**

Cas a couvrir :

- victoire normale
- `Ils sont dedans`
- `Capot`
- defaite normale
- `Vous etes dedans`
- `Capot`

- [x] **Step 4: Conserver le comptage anime du score total avec ses accents couleur**

### Task 3: Verifier et livrer

**Files:**

- Modify: `docs/superpowers/specs/2026-03-31-cadran-fin-manche-design.md`
- Modify: `docs/superpowers/plans/2026-03-31-cadran-fin-manche.md`

- [x] **Step 1: Lancer la verification ciblee**

Run: `pnpm --filter @belote/mobile test -- --runInBand __tests__/DialogueFinManche.test.tsx`

- [x] **Step 2: Lancer le typecheck mobile**

Run: `pnpm --filter @belote/mobile typecheck`

- [ ] **Step 3: Committer code et docs ensemble**

```bash
git add apps/mobile/components/game/DialogueFinManche.tsx apps/mobile/__tests__/DialogueFinManche.test.tsx docs/superpowers/specs/2026-03-31-cadran-fin-manche-design.md docs/superpowers/plans/2026-03-31-cadran-fin-manche.md
git commit -m "feat(mobile): ajouter le cadran emotionnel de fin de manche"
```
