# Arrivee plus fluide des cartes au pli Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ralentir legerement et fluidifier l'arrivee des cartes jouees vers le pli sans changer la structure de l'animation.

**Architecture:** La trajectoire actuelle est conservee. Le comportement est ajuste par configuration: duree un peu plus longue dans `layout.ts`, easing explicite dans `useAnimations.ts`, puis verrouillage du comportement par un test cible sur le hook.

**Tech Stack:** React Native, TypeScript strict, Jest, React Native Testing Library

**Spec:** `docs/superpowers/specs/2026-04-01-arrivee-cartes-pli-fluide-design.md`

---

## Structure des fichiers

- Modify: `apps/mobile/constants/layout.ts`
  Role: recalibrer la duree d'arrivee des cartes jouees.
- Modify: `apps/mobile/hooks/useAnimations.ts`
  Role: appliquer l'easing retenu aux cartes jouees vers le pli.
- Modify: `apps/mobile/__tests__/useAnimations.test.ts`
  Role: figer la nouvelle configuration avec un test rouge puis vert.

---

### Task 1: Ecrire le test rouge sur la configuration de jeu de carte

**Files:**

- Modify: `apps/mobile/__tests__/useAnimations.test.ts`

- [ ] **Step 1: Ajouter un test cible**

Verifier qu'une carte lancee par `lancerAnimationJeuCarte` cree un vol avec:

- une duree de `360`
- un easing `inout-cubic`

- [ ] **Step 2: Lancer le test et verifier l'echec**

Run:

```bash
cmd /c pnpm --filter @belote/mobile test -- --runTestsByPath __tests__/useAnimations.test.ts
```

Expected: echec car l'easing n'est pas encore fixe et la duree est encore plus courte

---

### Task 2: Implementer l'ajustement minimal

**Files:**

- Modify: `apps/mobile/constants/layout.ts`
- Modify: `apps/mobile/hooks/useAnimations.ts`

- [ ] **Step 1: Allonger legerement `ANIMATIONS.jeuCarte.duree`**

Passer la duree cible a `360` ms.

- [ ] **Step 2: Appliquer un easing explicite aux cartes jouees**

Ajouter `easing: "inout-cubic"` sur le vol cree par `lancerAnimationJeuCarte`.

---

### Task 3: Verifier puis commit

**Files:**

- Modify: aucun fichier supplementaire attendu

- [ ] **Step 1: Relancer le test cible**

Run:

```bash
cmd /c pnpm --filter @belote/mobile test -- --runTestsByPath __tests__/useAnimations.test.ts
```

- [ ] **Step 2: Lancer le typecheck mobile**

Run:

```bash
cmd /c pnpm --filter @belote/mobile typecheck
```

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/specs/2026-04-01-arrivee-cartes-pli-fluide-design.md docs/superpowers/plans/2026-04-01-arrivee-cartes-pli-fluide.md apps/mobile/constants/layout.ts apps/mobile/hooks/useAnimations.ts apps/mobile/__tests__/useAnimations.test.ts
git commit -m "feat(mobile): fluidifier l'arrivee des cartes au pli"
```
