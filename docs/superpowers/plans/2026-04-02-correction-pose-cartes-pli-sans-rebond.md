# Correction de la pose des cartes au pli sans rebond Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ralentir legerement la pose des cartes au pli tout en supprimant l'overshoot final introduit par l'easing recent.

**Architecture:** La trajectoire existante est conservee. La correction se limite a la configuration de l'animation de jeu de carte : test rouge sur la duree et l'easing attendus, ajustement minimal dans `layout.ts` et `useAnimations.ts`, puis verification cible.

**Tech Stack:** React Native, TypeScript strict, Jest, React Native Testing Library

---

## Structure des fichiers

- Modify: `apps/mobile/constants/layout.ts`
  Role: recalibrer la duree d'animation des cartes jouees.
- Modify: `apps/mobile/hooks/useAnimations.ts`
  Role: appliquer un easing sans rebond aux cartes jouees.
- Modify: `apps/mobile/__tests__/useAnimations.test.ts`
  Role: figer le nouveau contrat sur la duree et l'easing.
- Modify: `apps/mobile/__tests__/CarteAnimee.test.tsx`
  Role: retirer le test qui verrouille l'ancien comportement avec rebond.

---

### Task 1: Ecrire le test rouge

**Files:**

- Modify: `apps/mobile/__tests__/useAnimations.test.ts`

- [ ] **Step 1: Ajuster le contrat attendu**

Verifier qu'une carte lancee par `lancerAnimationJeuCarte` cree un vol avec :

- une duree de `420`
- un easing `out-cubic`

- [ ] **Step 2: Lancer le test pour verifier l'echec**

Run:

```bash
pnpm --filter @belote/mobile test -- --runTestsByPath __tests__/useAnimations.test.ts
```

Expected: FAIL car l'implementation utilise encore l'ancien easing et l'ancienne duree

---

### Task 2: Implementer la correction minimale

**Files:**

- Modify: `apps/mobile/constants/layout.ts`
- Modify: `apps/mobile/hooks/useAnimations.ts`
- Modify: `apps/mobile/__tests__/CarteAnimee.test.tsx`

- [ ] **Step 1: Allonger legerement la duree**

Passer `ANIMATIONS.jeuCarte.duree` a `420` ms.

- [ ] **Step 2: Supprimer le rebond**

Remplacer `out-back-soft` par `out-cubic` dans `lancerAnimationJeuCarte`.

- [ ] **Step 3: Nettoyer le test devenu obsolete**

Retirer le test qui verrouille `Easing.back(0.85)` pour cette animation.

---

### Task 3: Verifier puis commit

**Files:**

- Modify: aucun fichier supplementaire attendu

- [ ] **Step 1: Relancer les tests cibles**

Run:

```bash
pnpm --filter @belote/mobile test -- --runTestsByPath __tests__/useAnimations.test.ts __tests__/CarteAnimee.test.tsx
```

- [ ] **Step 2: Tenter le typecheck mobile**

Run:

```bash
pnpm --filter @belote/mobile typecheck
```

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/specs/2026-04-02-correction-pose-cartes-pli-sans-rebond-design.md docs/superpowers/plans/2026-04-02-correction-pose-cartes-pli-sans-rebond.md apps/mobile/constants/layout.ts apps/mobile/hooks/useAnimations.ts apps/mobile/__tests__/useAnimations.test.ts apps/mobile/__tests__/CarteAnimee.test.tsx
git commit -m "fix(mobile): supprimer le rebond des cartes jouees"
```
