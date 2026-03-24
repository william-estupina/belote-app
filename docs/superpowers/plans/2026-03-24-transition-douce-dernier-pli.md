# Transition douce du dernier pli Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Garder le widget du dernier pli visible pendant `finPli` et synchroniser sa transition douce avec le debut et la fin reels du ramassage.

**Architecture:** `useControleurJeu` garde un etat UI dedie au dernier pli visible et declenche sa transition exactement au `onDebutRamassage`, puis la termine au `onTerminee`. `DernierPli` devient un composant anime pilote par props, avec un mouvement tres discret et une duree calquee sur le ramassage.

**Tech Stack:** React Native, TypeScript strict, Jest, Animated API React Native

**Spec:** `docs/superpowers/specs/2026-03-24-transition-douce-dernier-pli-design.md`

---

## Structure des fichiers

- Modify: `apps/mobile/components/game/PlateauJeu.tsx`
  Role: afficher le widget avec les nouvelles props de transition.
- Modify: `apps/mobile/components/game/DernierPli.tsx`
  Role: jouer l'animation douce pilotee par le controleur.
- Modify: `apps/mobile/hooks/useControleurJeu.ts`
  Role: declencher et terminer la transition du dernier pli sur le vrai cycle de ramassage.
- Modify: `apps/mobile/__tests__/dernier-pli.test.tsx`
  Role: couvrir le rendu anime pilote par props.
- Modify: `apps/mobile/__tests__/useControleurJeuPli.test.ts`
  Role: couvrir le timing de debut et fin de transition.

---

### Task 1: Ecrire les tests rouges pour la transition synchronisee

**Files:**

- Modify: `apps/mobile/__tests__/dernier-pli.test.tsx`

- [ ] **Step 1: Ajouter un test de composant pilote par transition**

Ajouter un test qui:

- rend `DernierPli` avec un pli visible et un pli precedent
- verifie qu'aucune animation n'est demarree tant que `transitionDernierPliActive` est faux
- active ensuite la transition et verifie la coexistence des deux couches

- [ ] **Step 2: Ajouter un test de logique du controleur**

Ajouter un test pur sur le helper de transition du dernier pli pour verifier:

- pas de bascule avant demarrage du ramassage
- bascule au demarrage
- nettoyage a la fin

- [ ] **Step 3: Lancer le test et verifier l'echec**

Run:

```bash
cmd /c pnpm --filter @belote/mobile test -- --runTestsByPath __tests__/dernier-pli.test.tsx
```

Expected: echec car le timing n'est pas encore pilote par le ramassage

---

### Task 2: Implementer le pilotage depuis le ramassage et l'animation douce

**Files:**

- Modify: `apps/mobile/components/game/DernierPli.tsx`
- Modify: `apps/mobile/components/game/PlateauJeu.tsx`
- Modify: `apps/mobile/hooks/useControleurJeu.ts`
- Modify: `apps/mobile/hooks/planRamassagePli.ts`

- [ ] **Step 1: Exposer la duree totale du ramassage**

Ajouter un helper simple pour obtenir la duree totale de transition depuis le plan de ramassage.

- [ ] **Step 2: Ajouter l'etat UI du dernier pli visible dans `useControleurJeu`**

Conserver:

- le pli actuellement visible
- le pli sortant temporaire
- le drapeau `transitionDernierPliActive`
- la duree de transition
- une cle de relance d'animation

- [ ] **Step 3: Demarrer la transition au `onDebutRamassage`**

Quand le ramassage commence:

- si aucun dernier pli visible n'existe, afficher simplement le premier
- sinon, garder l'ancien en sortant
- afficher le nouveau en entrant
- marquer la transition active avec la duree totale du ramassage

- [ ] **Step 4: Terminer la transition au `onTerminee`**

Quand le ramassage se termine:

- desactiver la transition
- retirer la couche sortante
- garder le nouveau pli comme reference visible

- [ ] **Step 5: Adapter `DernierPli` pour n'animer que quand on lui demande**

Le composant doit seulement jouer:

- un micro glissement vertical
- un fondu doux
- une variation d'opacite tres legere sur l'ancien

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
