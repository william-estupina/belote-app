# Correction du lancement Expo via WSL Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lancer Expo dans WSL quand les scripts mobile sont executes depuis Windows sur un workspace WSL afin de reduire le cold start en developpement.

**Architecture:** Un petit lanceur Node centralise la detection Windows+UNC WSL et construit la commande Expo adaptee. Les scripts mobile l'utilisent sans changer l'API de commande pour l'utilisateur. Un test cible verrouille la construction de commande pour le cas WSL et le fallback classique.

**Tech Stack:** Node.js, CommonJS, Jest, Expo, pnpm

---

## Structure des fichiers

- Create: `apps/mobile/scripts/lancer-expo.cjs`
  Role: construire et executer la commande Expo adaptee au contexte Windows+WSL.
- Create: `apps/mobile/__tests__/lancer-expo.test.ts`
  Role: verrouiller la conversion du chemin UNC WSL et la commande produite.
- Modify: `apps/mobile/package.json`
  Role: faire passer les scripts de dev mobile par le lanceur.
- Create: `docs/superpowers/specs/2026-04-02-lancement-expo-wsl-design.md`
  Role: tracer la decision de conception.

### Task 1: Ecrire le test rouge

**Files:**

- Create: `apps/mobile/__tests__/lancer-expo.test.ts`

- [ ] **Step 1: Ecrire le test de construction de commande**

Verifier :

- la conversion du chemin `\\wsl.localhost\\Ubuntu-24.04\\...` en chemin Linux
- la construction de `wsl.exe ... pnpm exec expo ...` sur Windows
- le fallback `pnpm exec expo ...` hors chemin UNC WSL

- [ ] **Step 2: Lancer le test pour verifier l'echec**

Run:

```bash
pnpm --filter @belote/mobile test -- --runTestsByPath __tests__/lancer-expo.test.ts
```

Expected: FAIL car `apps/mobile/scripts/lancer-expo.cjs` n'existe pas encore

### Task 2: Implementer le lanceur

**Files:**

- Create: `apps/mobile/scripts/lancer-expo.cjs`
- Modify: `apps/mobile/package.json`

- [ ] **Step 1: Ajouter les helpers de resolution**

Implementer :

- `convertirCheminWslDepuisWindows`
- `construireCommandeExpo`
- `determinerRepertoirePackage`

- [ ] **Step 2: Ajouter l'execution du processus**

Executer la commande construite avec `spawn(..., { stdio: "inherit" })` et propager le code de sortie.

- [ ] **Step 3: Brancher les scripts mobile**

Faire passer `dev`, `dev:web`, `dev:android` et `dev:ios` par le lanceur en conservant les arguments Expo existants.

### Task 3: Verifier puis commit

**Files:**

- Modify: aucun fichier supplementaire attendu

- [ ] **Step 1: Relancer le test cible**

Run:

```bash
pnpm --filter @belote/mobile test -- --runTestsByPath __tests__/lancer-expo.test.ts
```

- [ ] **Step 2: Verifier le package mobile**

Run:

```bash
pnpm --filter @belote/mobile typecheck
```

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/specs/2026-04-02-lancement-expo-wsl-design.md docs/superpowers/plans/2026-04-02-lancement-expo-wsl.md apps/mobile/package.json apps/mobile/scripts/lancer-expo.cjs apps/mobile/__tests__/lancer-expo.test.ts
git commit -m "fix(mobile): lancer expo via wsl sous windows"
```
