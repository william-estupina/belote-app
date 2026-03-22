# Rotation du donneur et ancrage du paquet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Faire tourner l'ordre visuel de distribution et la position du paquet en fonction du donneur courant, y compris apres redistribution.

**Architecture:** La source de verite reste `indexDonneur` dans le contexte de jeu. Des helpers purs dans `apps/mobile/hooks/distributionLayoutAtlas.ts` calculent le premier servi, l'ordre de distribution et l'origine du paquet, puis ces helpers sont reutilises par l'animation et le composant `PaquetCentral`.

**Tech Stack:** Expo React Native, TypeScript strict, Jest, Reanimated, Skia Atlas

---

### Task 1: Verrouiller le comportement par des tests purs

**Files:**

- Modify: `apps/mobile/__tests__/distributionLayoutAtlas.test.ts`
- Test: `apps/mobile/__tests__/distributionLayoutAtlas.test.ts`

- [ ] **Step 1: Ecrire les tests rouges**

Ajouter des assertions sur :

- `obtenirPremierServi(indexDonneur)`
- `obtenirOrdreDistribution(indexDonneur)`
- `obtenirOrigineDistribution(indexDonneur)`

- [ ] **Step 2: Lancer le test cible pour verifier l'echec**

Run: `pnpm --filter @belote/mobile test -- --runInBand distributionLayoutAtlas.test.ts --no-coverage`
Expected: FAIL avec fonctions non exportees ou comportement absent.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/__tests__/distributionLayoutAtlas.test.ts
git commit -m "test(mobile): verrouiller la rotation visuelle du donneur"
```

### Task 2: Implementer les helpers purs de distribution

**Files:**

- Modify: `apps/mobile/hooks/distributionLayoutAtlas.ts`

- [ ] **Step 1: Ajouter les helpers**

Implementer :

- `obtenirPremierServi(indexDonneur: number): PositionJoueur`
- `obtenirOrdreDistribution(indexDonneur: number): PositionJoueur[]`
- `obtenirOrigineDistribution(indexDonneur: number): PointNormalise`

- [ ] **Step 2: Conserver `obtenirCibleDistributionAtlas`**

Ne pas changer les cibles d'arrivee de chaque main, seulement le calcul de l'origine et de l'ordre.

- [ ] **Step 3: Relancer le test cible**

Run: `pnpm --filter @belote/mobile test -- --runInBand distributionLayoutAtlas.test.ts --no-coverage`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/hooks/distributionLayoutAtlas.ts apps/mobile/__tests__/distributionLayoutAtlas.test.ts
git commit -m "feat(mobile): calculer ordre et origine de distribution selon le donneur"
```

### Task 3: Brancher les helpers sur l'animation et le paquet

**Files:**

- Modify: `apps/mobile/hooks/useAnimationsDistribution.ts`
- Modify: `apps/mobile/hooks/useControleurJeu.ts`
- Modify: `apps/mobile/components/game/PaquetCentral.tsx`
- Modify: `apps/mobile/components/game/PlateauJeu.tsx`

- [ ] **Step 1: Faire accepter `indexDonneur` a l'animation**

Etendre `lancerDistribution` pour recevoir `indexDonneur` dans les options, puis utiliser `obtenirOrdreDistribution` et `obtenirOrigineDistribution`.

- [ ] **Step 2: Propager `indexDonneur` depuis `useControleurJeu`**

Passer `contexte.indexDonneur` a la distribution initiale et restante.

- [ ] **Step 3: Ancrer `PaquetCentral` pres du donneur**

Ajouter une prop `indexDonneur` et reutiliser `obtenirOrigineDistribution` pour placer le paquet.

- [ ] **Step 4: Passer `indexDonneur` depuis `PlateauJeu`**

Faire suivre la valeur issue de `etatJeu`.

- [ ] **Step 5: Ajouter l'etat minimal necessaire**

Exposer `indexDonneur` dans `EtatJeu` et dans `extraireEtatUI` sans toucher a la logique metier.

- [ ] **Step 6: Lancer les tests mobiles cibles**

Run: `pnpm --filter @belote/mobile test -- --runInBand distributionLayoutAtlas.test.ts planCallbacksDistribution.test.ts DistributionCanvas.test.tsx --no-coverage`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add apps/mobile/hooks/useAnimationsDistribution.ts apps/mobile/hooks/useControleurJeu.ts apps/mobile/components/game/PaquetCentral.tsx apps/mobile/components/game/PlateauJeu.tsx
git commit -m "feat(mobile): faire tourner la distribution avec le donneur courant"
```

### Task 4: Verification finale

**Files:**

- None

- [ ] **Step 1: Typecheck mobile**

Run: `pnpm turbo typecheck --filter=@belote/mobile`
Expected: PASS

- [ ] **Step 2: Tests mobile pertinents**

Run: `pnpm --filter @belote/mobile test -- --runInBand distributionLayoutAtlas.test.ts planCallbacksDistribution.test.ts DistributionCanvas.test.tsx --no-coverage`
Expected: PASS

- [ ] **Step 3: Verification transverse si necessaire**

Run: `pnpm --filter @belote/mobile test -- --runInBand`
Expected: PASS ou, en cas de bruit hors scope, documenter clairement ce qui bloque.
