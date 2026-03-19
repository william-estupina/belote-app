# Distribution Atlas Skia Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer progressivement la distribution 3 phases actuelle par une distribution Atlas Skia avec trajectoire en arc, easing d'arrivée naturel et orchestration native.

**Architecture:** On garde `useAnimations` pour le jeu de carte et le ramassage, puis on introduit un chemin séparé pour la distribution: helpers purs testés, atlas d'images Skia, hook `useAnimationsDistribution` et rendu `DistributionCanvas`. L'intégration doit rester incrémentale avec un fallback sûr sur le rendu existant tant que l'atlas n'est pas totalement branché.

**Tech Stack:** Expo SDK 54, React Native, react-native-reanimated v4, @shopify/react-native-skia, TypeScript strict, Jest

---

### Task 1: Géométrie et mapping atlas

**Files:**
- Create: `apps/mobile/hooks/distributionAtlas.ts`
- Test: `apps/mobile/__tests__/distributionAtlas.test.ts`

- [x] Écrire des helpers purs pour la grille atlas, le verso et l'arc quadratique.
- [x] Vérifier les cas nominaux via Jest.

### Task 2: Ajustements visuels hors atlas

**Files:**
- Modify: `apps/mobile/constants/layout.ts`
- Modify: `apps/mobile/components/game/CarteAnimee.tsx`

- [x] Passer l'easing de distribution en `out-cubic`.
- [x] Remplacer l'interpolation linéaire par une Bézier quadratique légère.
- [x] Vérifier le typecheck mobile.

### Task 3: Hook atlas et canvas Skia

**Files:**
- Create: `apps/mobile/hooks/useAtlasCartes.ts`
- Create: `apps/mobile/components/game/DistributionCanvas.tsx`

- [ ] Construire un atlas Skia unique à partir des faces et du verso.
- [ ] Exposer les `SkRect` source pour recto/verso.
- [ ] Rendre la distribution via `<Canvas><Atlas ... /></Canvas>`.

### Task 4: Orchestration de distribution native

**Files:**
- Create: `apps/mobile/hooks/useAnimationsDistribution.ts`
- Modify: `apps/mobile/hooks/useControleurJeu.ts`
- Modify: `apps/mobile/components/game/CoucheAnimation.tsx`

- [ ] Déplacer l'orchestration de distribution dans un hook dédié.
- [ ] Utiliser `withDelay` et callbacks `runOnJS` pour les fins de paquets et de distribution.
- [ ] Brancher le canvas de distribution sans casser les autres animations.

### Task 5: Vérifications finales

**Files:**
- Modify: `AVANCEMENT.md`

- [ ] Lancer `pnpm.cmd --filter @belote/mobile typecheck`.
- [ ] Lancer les tests ciblés mobile.
- [ ] Mettre à jour `AVANCEMENT.md` une fois la migration Atlas réellement terminée.
