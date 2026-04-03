# Pose de la carte sud depuis son etat visuel reel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Faire partir la carte du joueur sud depuis son etat visuel reel dans l'eventail, sans reset de position, rotation ou echelle, tout en conservant la courbe actuelle vers le pli.

**Architecture:** Le flux existant est conserve: `MainJoueur` capte l'interaction, `useControleurJeu` orchestre le masquage puis le retrait logique, et `useAnimations` cree la carte en vol. La correction consiste a transmettre un etat de depart complet compatible avec `PositionCarte`, a le relayer jusqu'a `CarteAnimee`, puis a figer ce contrat par des tests rouges et verts.

**Tech Stack:** React Native, TypeScript strict, Jest, React Native Testing Library, Reanimated

---

## Structure des fichiers

- Modify: `apps/mobile/components/game/MainJoueur.tsx`
  Role: remonter l'etat visuel complet de la carte sud au clic.
- Modify: `apps/mobile/hooks/useControleurJeu.ts`
  Role: relayer l'etat de depart complet au hook d'animations.
- Modify: `apps/mobile/hooks/useAnimations.ts`
  Role: accepter un depart personnalise complet pour `lancerAnimationJeuCarte`.
- Modify: `apps/mobile/__tests__/MainJoueur.test.tsx`
  Role: figer le contrat de remontee du depart complet depuis la main sud.
- Modify: `apps/mobile/__tests__/useControleurJeuDistribution.test.ts`
  Role: verifier que le controleur relaie le depart complet.
- Modify: `apps/mobile/__tests__/useAnimations.test.ts`
  Role: verifier que le hook conserve le depart complet dans `cartesEnVol`.

---

### Task 1: Poser les tests rouges sur le nouveau contrat

**Files:**

- Modify: `apps/mobile/__tests__/MainJoueur.test.tsx`
- Modify: `apps/mobile/__tests__/useControleurJeuDistribution.test.ts`
- Modify: `apps/mobile/__tests__/useAnimations.test.ts`

- [ ] **Step 1: Ecrire le test rouge dans `MainJoueur`**

Verifier que le callback `onCarteJouee` recoit des donnees de depart incluant au moins `x`, `y`, `rotation` et `echelle`.

- [ ] **Step 2: Ecrire le test rouge dans `useControleurJeuDistribution`**

Verifier que `jouerCarte` relaie cet etat complet a `mockLancerAnimationJeuCarte`.

- [ ] **Step 3: Ecrire le test rouge dans `useAnimations`**

Verifier qu'un depart personnalise complet est conserve tel quel dans la carte `jeu-*` creee.

- [ ] **Step 4: Lancer les tests pour verifier l'echec**

Run:

```bash
pnpm --filter @belote/mobile test -- --runTestsByPath __tests__/MainJoueur.test.tsx __tests__/useControleurJeuDistribution.test.ts __tests__/useAnimations.test.ts
```

Expected: FAIL car le flux ne transporte pas encore un depart complet de type `PositionCarte`.

---

### Task 2: Implementer la correction minimale

**Files:**

- Modify: `apps/mobile/components/game/MainJoueur.tsx`
- Modify: `apps/mobile/hooks/useControleurJeu.ts`
- Modify: `apps/mobile/hooks/useAnimations.ts`

- [ ] **Step 1: Enrichir le callback de `MainJoueur`**

Faire evoluer le type du callback pour remonter un depart complet compatible avec `PositionCarte`, calcule a partir de la disposition et du rendu courant de la carte.

- [ ] **Step 2: Relayer le depart complet dans `useControleurJeu`**

Faire evoluer `jouerCarte` pour recevoir cet objet et le passer tel quel a `animations.lancerAnimationJeuCarte`.

- [ ] **Step 3: Accepter le depart complet dans `useAnimations`**

Faire evoluer `lancerAnimationJeuCarte` pour utiliser ce depart complet quand il est fourni et garder le depart par defaut pour les autres joueurs.

---

### Task 3: Verifier la correction et commit

**Files:**

- Modify: `docs/superpowers/plans/2026-04-03-pose-carte-sud-depart-reel.md`

- [ ] **Step 1: Relancer les tests cibles**

Run:

```bash
pnpm --filter @belote/mobile test -- --runTestsByPath __tests__/MainJoueur.test.tsx __tests__/useControleurJeuDistribution.test.ts __tests__/useAnimations.test.ts
```

- [ ] **Step 2: Verifier le typage mobile**

Run:

```bash
pnpm --filter @belote/mobile typecheck
```

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/plans/2026-04-03-pose-carte-sud-depart-reel.md apps/mobile/components/game/MainJoueur.tsx apps/mobile/hooks/useControleurJeu.ts apps/mobile/hooks/useAnimations.ts apps/mobile/__tests__/MainJoueur.test.tsx apps/mobile/__tests__/useControleurJeuDistribution.test.ts apps/mobile/__tests__/useAnimations.test.ts
git commit -m "fix(mobile): faire partir la carte sud depuis sa pose reelle"
```
