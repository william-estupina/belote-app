# Arrivee plus fluide des cartes au pli Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ralentir legerement et fluidifier l'arrivee des cartes jouees vers le pli avec un amorti final discret, sans changer la structure de l'animation.

**Architecture:** La trajectoire actuelle est conservee. Le comportement est ajuste par configuration: duree un peu plus longue dans `layout.ts`, easing de pose amortie dans `useAnimations.ts`, mapping de cet easing dans `CarteAnimee.tsx`, puis verrouillage du comportement par des tests cibles.

**Tech Stack:** React Native, TypeScript strict, Jest, React Native Testing Library

**Spec:** `docs/superpowers/specs/2026-04-01-arrivee-cartes-pli-fluide-design.md`

---

## Structure des fichiers

- Modify: `apps/mobile/constants/layout.ts`
  Role: recalibrer la duree d'arrivee des cartes jouees.
- Modify: `apps/mobile/hooks/useAnimations.ts`
  Role: appliquer l'easing retenu aux cartes jouees vers le pli.
- Modify: `apps/mobile/components/game/CarteAnimee.tsx`
  Role: declarer le profil d'easing avec amorti final.
- Modify: `apps/mobile/components/game/CoucheAnimation.tsx`
  Role: etendre le type d'easing pour transporter le nouveau profil.
- Modify: `apps/mobile/__tests__/useAnimations.test.ts`
  Role: figer la nouvelle configuration avec un test rouge puis vert.
- Modify: `apps/mobile/__tests__/CarteAnimee.test.tsx`
  Role: figer le mapping du nouvel easing vers Reanimated.

---

### Task 1: Ecrire les tests rouges sur l'amorti final

**Files:**

- Modify: `apps/mobile/__tests__/useAnimations.test.ts`
- Modify: `apps/mobile/__tests__/CarteAnimee.test.tsx`

- [ ] **Step 1: Ajouter un test sur le hook**

Verifier qu'une carte lancee par `lancerAnimationJeuCarte` cree un vol avec:

- une duree de `360`
- un easing `out-back-soft`

- [ ] **Step 2: Ajouter un test sur `CarteAnimee`**

Verifier que le profil `out-back-soft` s'appuie sur `Easing.back(0.85)`.

- [ ] **Step 3: Lancer les tests et verifier l'echec**

Run:

```bash
pnpm --filter @belote/mobile test -- --runTestsByPath __tests__/useAnimations.test.ts __tests__/CarteAnimee.test.tsx
```

Expected: echec car l'easing n'est pas encore amorti

---

### Task 2: Implementer l'ajustement minimal

**Files:**

- Modify: `apps/mobile/constants/layout.ts`
- Modify: `apps/mobile/hooks/useAnimations.ts`
- Modify: `apps/mobile/components/game/CarteAnimee.tsx`
- Modify: `apps/mobile/components/game/CoucheAnimation.tsx`

- [ ] **Step 1: Conserver la duree cible a `360` ms**

Ne pas toucher a la duree deja retenue pour la version fluide.

- [ ] **Step 2: Appliquer un easing amorti aux cartes jouees**

Ajouter `easing: "out-back-soft"` sur le vol cree par `lancerAnimationJeuCarte`.

- [ ] **Step 3: Declarer l'easing dans `CarteAnimee`**

Mapper `out-back-soft` vers `Easing.out(Easing.back(0.85))`.

- [ ] **Step 4: Etendre le type partage**

Autoriser `out-back-soft` dans `CarteEnVol`.

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

Expected: peut rester rouge a cause des erreurs hors perimetre deja presentes dans le repo

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/specs/2026-04-01-arrivee-cartes-pli-fluide-design.md docs/superpowers/plans/2026-04-01-arrivee-cartes-pli-fluide.md apps/mobile/components/game/CarteAnimee.tsx apps/mobile/components/game/CoucheAnimation.tsx apps/mobile/hooks/useAnimations.ts apps/mobile/__tests__/useAnimations.test.ts apps/mobile/__tests__/CarteAnimee.test.tsx
git commit -m "feat(mobile): amortir la pose des cartes au pli"
```
