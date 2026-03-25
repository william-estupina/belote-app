# Redistribution double passe Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Donner un vrai ressenti de redistribution apres double passe en deplacant le jeton dealer immediatement et en rappelant visuellement les mains vers le paquet avant la nouvelle distribution.

**Architecture:** Le controleur mobile orchestre une sequence UI speciale quand `nombreRedistributions` augmente. Le hook d'animations expose un mouvement supplementaire de retour au paquet, reutilisant `CarteAnimee` avec des dos de cartes.

**Tech Stack:** React Native, Reanimated, TypeScript strict, Jest, XState

---

### Task 1: Verrouiller le comportement attendu par les tests

**Files:**

- Modify: `apps/mobile/__tests__/useControleurJeuDistribution.test.ts`
- Modify: `apps/mobile/__tests__/useAnimations.test.ts`

- [ ] **Step 1: Ecrire le test rouge du controleur**
- [ ] **Step 2: Lancer le test cible et verifier l'echec**
- [ ] **Step 3: Ecrire le test rouge de l'animation de retour**
- [ ] **Step 4: Lancer le test cible et verifier l'echec**

### Task 2: Ajouter l'animation de retour au paquet

**Files:**

- Modify: `apps/mobile/hooks/useAnimations.ts`

- [ ] **Step 1: Ajouter l'API d'animation de retour au paquet**
- [ ] **Step 2: Creer les cartes en vol face cachee avec callback de fin**
- [ ] **Step 3: Verifier le test cible**

### Task 3: Orchestrer la redistribution speciale dans le controleur

**Files:**

- Modify: `apps/mobile/hooks/useControleurJeu.ts`

- [ ] **Step 1: Construire les trajectoires depuis les mains visibles**
- [ ] **Step 2: Deplacer immediatement le donneur dans l'etat UI**
- [ ] **Step 3: Lancer le retour au paquet avant la nouvelle distribution**
- [ ] **Step 4: Verifier le test du controleur**

### Task 4: Verification finale et commit

**Files:**

- Modify: `apps/mobile/hooks/useControleurJeu.ts`
- Modify: `apps/mobile/hooks/useAnimations.ts`
- Modify: `apps/mobile/__tests__/useControleurJeuDistribution.test.ts`
- Modify: `apps/mobile/__tests__/useAnimations.test.ts`
- Create: `docs/superpowers/specs/2026-03-25-redistribution-double-passe-design.md`
- Create: `docs/superpowers/plans/2026-03-25-redistribution-double-passe.md`

- [ ] **Step 1: Lancer les tests cibles du controleur et des animations**
- [ ] **Step 2: Relire le diff**
- [ ] **Step 3: Committer avec un message `fix(mobile): ...`**
