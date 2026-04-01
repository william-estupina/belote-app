# Setup Maestro Mobile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter un socle Maestro Android-first pour les parcours mobiles Expo avec des ancrages UI stables et une documentation d'execution minimale.

**Architecture:** Le setup repose sur des flows Maestro simples dans `apps/mobile/.maestro/`, sur quelques `testID` React Native stables pour fiabiliser les parcours, et sur des scripts de verification qui fonctionnent meme depuis un checkout WSL expose en chemin UNC. La couverture initiale reste volontairement simple: accueil, navigation vers les ecrans secondaires et ouverture de l'ecran de partie.

**Tech Stack:** Expo Router, React Native, Jest, Testing Library React Native, Maestro CLI

---

### Task 1: Stabiliser les ancrages UI exposes a Maestro

**Files:**
- Modify: `apps/mobile/app/partie.tsx`
- Modify: `apps/mobile/components/game/PlateauJeu.tsx`
- Modify: `apps/mobile/components/game/PanneauEncheres.tsx`
- Modify: `apps/mobile/components/game/MainJoueur.tsx`
- Test: `apps/mobile/__tests__/PanneauEncheres.test.tsx`
- Test: `apps/mobile/__tests__/MainJoueur.test.tsx`
- Test: `apps/mobile/__tests__/PlateauJeu.test.tsx`

- [ ] **Step 1: Ecrire les tests en echec pour les `testID` publics**
- [ ] **Step 2: Lancer les tests cibles et verifier l'echec**
- [ ] **Step 3: Ajouter les `testID` minimaux dans les composants**
- [ ] **Step 4: Relancer les tests et verifier le vert**
- [ ] **Step 5: Commit**

### Task 2: Ajouter les flows Maestro et les scripts d'execution

**Files:**
- Create: `apps/mobile/.maestro/accueil.yaml`
- Create: `apps/mobile/.maestro/partie.yaml`
- Create: `apps/mobile/.maestro/parametres.yaml`
- Create: `apps/mobile/.maestro/regles.yaml`
- Modify: `apps/mobile/package.json`
- Modify: `package.json`
- Modify: `README.md`

- [ ] **Step 1: Ajouter les flows Maestro de base**
- [ ] **Step 2: Ajouter les scripts de verification et d'execution**
- [ ] **Step 3: Documenter les prerequis et commandes**
- [ ] **Step 4: Verifier la syntaxe Maestro**
- [ ] **Step 5: Commit**
