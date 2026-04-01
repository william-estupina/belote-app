# Plan : Fusion canvas unifié + fix disparition cartes Sud

## TL;DR

Fusionner DistributionCanvasSud + CanvasAdversaires en un seul canvas Skia permanent de 32 slots.
Élimine structurellement le bug de disparition des cartes sud (plus de montage/démontage).
Simplifie l'architecture, réduit à 1 draw call GPU.

## Contexte technique

- React 19.1.4 / RN 0.81.5 / Expo 54 — batching auto OK
- Pas d'écran de préchargement custom (juste splash Expo par défaut)
- Sprite sheet 1336×1215px, grille 8×5 (faces + verso)

## Différences clés entre les 2 canvas actuels

| Feature       | DistributionCanvasSud | CanvasAdversaires               |
| ------------- | --------------------- | ------------------------------- |
| Sprites       | Faces dynamiques      | Verso uniquement                |
| Pivot Y       | Bas (hauteurCellule)  | Centre (hauteurCellule/2)       |
| Shadow        | Oui                   | Non                             |
| zIndex        | 100                   | 10                              |
| Lifecycle     | Éphémère              | Permanent                       |
| Mode statique | N/A                   | Éventail recalculé post-distrib |

## Phase 1 : Canvas unifié (séquentiel)

### 1.1 — Créer CanvasCartesUnifie.tsx

- Pool 32 sprites, pivot uniforme (centre), shadow sur tout le Group
- useRSXformBuffer de taille 32
- Sprites dynamiques : lire srcX/srcY/srcW/srcH depuis données worklet (STRIDE 14)
- Permanent (toujours monté), cartes inactives parquées off-screen

### 1.2 — Fusionner les pools dans useAnimationsDistribution.ts

- 1 seul progressions[] de 32, 1 donneesWorklet de 32×14, 1 nbCartesActives
- Convention : 0-7 = sud, 8-31 = adversaires
- STRIDE 10 → 14 (ajout srcX, srcY, srcW, srcH)
- Supprimer `enCours` (React state) → plus de montage/démontage
- Migrer logique éventail statique depuis CanvasAdversaires

### 1.3 — Adapter éventail statique post-distribution

- Quand distrib termine : slots sud → progression -1, slots adv → éventail statique
- `terminerDistribution()` → `masquerSlotsSud()` (pas de démontage React)

### 1.4 — Adapter handoff vers MainJoueur

- lancerPhase3() : appliquerEtatAvantEncheres() AVANT masquerSlotsSud()
- requestAnimationFrame entre les deux pour garantir 1 frame de chevauchement
- Ajuster les calculs de position sud pour pivot centre (au lieu de bas)

## Phase 2 : Fix opacité MainJoueur (parallèle)

### 2.1 — CarteEventailAnimee : opacité 1 post-distribution

- Quand on vient de la distribution, pas de fondu 0→1

## Phase 3 : Préchargement sprite sheet (indépendant)

### 3.1 — expo-splash-screen + Asset.loadAsync dans \_layout.tsx

## Phase 4 : Nettoyage

### 4.1 — Supprimer DistributionCanvasSud.tsx

### 4.2 — Supprimer CanvasAdversaires.tsx (code migré dans CanvasCartesUnifie)

### 4.3 — Simplifier CoucheAnimation.tsx et ResultatAnimationsDistribution

### 4.4 — Adapter tests (5+ fichiers)

## Fichiers

| Fichier                                   | Action                             |
| ----------------------------------------- | ---------------------------------- |
| components/game/CanvasCartesUnifie.tsx    | CRÉER                              |
| hooks/useAnimationsDistribution.ts        | MODIFIER (pool unifiée, STRIDE 14) |
| hooks/useOrchestrationDistribution.ts     | MODIFIER (handoff inversé)         |
| components/game/CoucheAnimation.tsx       | MODIFIER (1 canvas)                |
| components/game/MainJoueur.tsx            | MODIFIER (opacité)                 |
| components/game/DistributionCanvasSud.tsx | SUPPRIMER                          |
| components/game/CanvasAdversaires.tsx     | SUPPRIMER                          |
| app/\_layout.tsx                          | MODIFIER (préchargement)           |
| **tests**/\*                              | ADAPTER (5+ fichiers)              |

## Vérification

1. pnpm --filter @belote/mobile test
2. Test manuel : zéro gap visuel distribution → enchères
3. Test manuel : éventails adversaires corrects post-distribution
4. Test manuel : redistribution fonctionne
5. pnpm turbo typecheck test
6. Profiler : 1 draw call Skia pendant distribution
