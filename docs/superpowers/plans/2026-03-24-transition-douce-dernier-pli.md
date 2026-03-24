# Transition douce du dernier pli Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Garder le widget du dernier pli visible pendant `finPli` et animer doucement le remplacement de l'ancien apercu par le nouveau.

**Architecture:** `PlateauJeu` elargit seulement sa condition d'affichage. `DernierPli` porte un petit etat visuel local pour conserver la couche sortante pendant que la couche entrante effectue un fondu avec glissement leger.

**Tech Stack:** React Native, TypeScript strict, Jest, Animated API React Native

**Spec:** `docs/superpowers/specs/2026-03-24-transition-douce-dernier-pli-design.md`

---

## Structure des fichiers

- Modify: `apps/mobile/components/game/PlateauJeu.tsx`
  Role: conserver l'affichage du widget pendant `finPli`.
- Modify: `apps/mobile/components/game/DernierPli.tsx`
  Role: memoriser les couches de transition et jouer l'animation douce.
- Modify: `apps/mobile/__tests__/dernier-pli.test.tsx`
  Role: couvrir la retention temporaire de l'ancien pli et la fin de transition.

---

### Task 1: Ecrire le test rouge pour la transition douce

**Files:**

- Modify: `apps/mobile/__tests__/dernier-pli.test.tsx`

- [ ] **Step 1: Ajouter un test de transition**

Ajouter un test qui:

- rend `DernierPli` avec un premier pli
- rerender avec un second pli
- verifie la presence temporaire d'une couche sortante et d'une couche entrante

- [ ] **Step 2: Verifier la fin de transition**

Dans le meme test:

- avancer les timers
- verifier que seule la nouvelle couche reste

- [ ] **Step 3: Lancer le test et verifier l'echec**

Run:

```bash
cmd /c pnpm --filter @belote/mobile test -- --runTestsByPath __tests__/dernier-pli.test.tsx
```

Expected:

- echec car la transition n'existe pas encore

---

### Task 2: Implementer la retention et l'animation douce

**Files:**

- Modify: `apps/mobile/components/game/DernierPli.tsx`
- Modify: `apps/mobile/components/game/PlateauJeu.tsx`

- [ ] **Step 1: Garder le widget visible pendant `finPli`**

Etendre la condition d'affichage de `PlateauJeu`.

- [ ] **Step 2: Ajouter la signature du pli et l'etat de transition**

Dans `DernierPli.tsx`, conserver:

- le pli affiche
- le pli sortant temporaire
- les valeurs animees d'entree/sortie/lueur

- [ ] **Step 3: Jouer la transition lors d'un nouveau pli**

Au changement de signature:

- figer le pli sortant
- afficher le nouveau pli
- lancer le fondu/glissement doux

- [ ] **Step 4: Nettoyer la couche sortante en fin d'animation**

Une fois l'animation terminee:

- supprimer le pli sortant

---

### Task 3: Verifier et finaliser

**Files:**

- Modify: aucun fichier supplementaire attendu

- [ ] **Step 1: Relancer le test cible**

Run:

```bash
cmd /c pnpm --filter @belote/mobile test -- --runTestsByPath __tests__/dernier-pli.test.tsx
```

- [ ] **Step 2: Lancer le typecheck mobile**

Run:

```bash
cmd /c pnpm --filter @belote/mobile typecheck
```

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/specs/2026-03-24-transition-douce-dernier-pli-design.md docs/superpowers/plans/2026-03-24-transition-douce-dernier-pli.md apps/mobile/components/game/PlateauJeu.tsx apps/mobile/components/game/DernierPli.tsx apps/mobile/__tests__/dernier-pli.test.tsx
git commit -m "feat(mobile): adoucir la transition du dernier pli"
```
