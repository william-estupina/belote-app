# Recalibrage visuel du paquet central Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Donner au paquet central une presence visuelle plus forte au depart et une diminution plus sensible pendant la distribution.

**Architecture:** Le changement reste local au composant `ReserveCentrale`. Le calcul du nombre de couches et de leur dispersion dependra directement de `cartesPaquetVisibles`, sans changer l'ancrage global ni la carte retournee. Les tests de composant verifieront la nouvelle densite maximale et l'amincissement du paquet.

**Tech Stack:** TypeScript strict, React Native, Jest, Testing Library React Native

---

### Task 1: Ecrire le test rouge du paquet central

**Files:**

- Modify: `apps/mobile/__tests__/reserve-centrale.test.tsx`
- Test: `apps/mobile/__tests__/reserve-centrale.test.tsx`

- [ ] **Step 1: Ajouter un test sur l'epaisseur maximale et la reduction du paquet**

Ajouter un test qui monte `ReserveCentrale` avec `32` cartes visibles, puis avec `4` cartes visibles, et verifie :

- que le nombre de `CarteDos` rendus est plus eleve pour `32` cartes ;
- que le paquet plein rend `8` couches ;
- que le paquet presque vide rend `1` couche ;
- que la derniere couche du paquet plein est plus decalee que celle du paquet aminci.

- [ ] **Step 2: Lancer le test cible et verifier l'echec**

Run: `pnpm --filter @belote/mobile test -- reserve-centrale.test.tsx --runInBand`
Expected: FAIL, car le paquet courant reste plafonne a `5` couches et n'expose pas encore un decalage assez marque.

### Task 2: Implementer le recalibrage du paquet

**Files:**

- Modify: `apps/mobile/components/game/ReserveCentrale.tsx`

- [ ] **Step 1: Introduire un calcul derive du remplissage**

Calculer un ratio de remplissage a partir de `cartesPaquetVisibles` pour piloter :

- `nbCouches` avec un maximum a `8` ;
- `decalageHorizontal` ;
- `decalageVertical`.

- [ ] **Step 2: Appliquer ces valeurs au rendu des couches**

Remplacer les valeurs constantes des styles inline des couches par les nouvelles valeurs derivees du remplissage.

- [ ] **Step 3: Lancer le test cible puis la suite de tests du composant**

Run: `pnpm --filter @belote/mobile test -- reserve-centrale.test.tsx --runInBand`
Expected: PASS

### Task 3: Verification finale et commit

**Files:**

- Modify: `docs/superpowers/specs/2026-03-31-rendu-paquet-central-design.md`
- Modify: `docs/superpowers/plans/2026-03-31-rendu-paquet-central.md`
- Modify: `apps/mobile/__tests__/reserve-centrale.test.tsx`
- Modify: `apps/mobile/components/game/ReserveCentrale.tsx`

- [ ] **Step 1: Verifier l'etat git et la suite de tests ciblee**

Run: `git status --short`
Run: `pnpm --filter @belote/mobile test -- reserve-centrale.test.tsx --runInBand`

- [ ] **Step 2: Committer le lot**

```bash
git add docs/superpowers/specs/2026-03-31-rendu-paquet-central-design.md docs/superpowers/plans/2026-03-31-rendu-paquet-central.md apps/mobile/__tests__/reserve-centrale.test.tsx apps/mobile/components/game/ReserveCentrale.tsx
git commit -m "fix(mobile): renforcer le volume du paquet central"
```
