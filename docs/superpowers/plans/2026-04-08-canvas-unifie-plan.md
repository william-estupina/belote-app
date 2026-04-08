# Plan d'implementation — Canvas Skia Unifie

Spec : `docs/superpowers/specs/2026-04-08-canvas-unifie-design.md`

## Etapes

### Etape 1 — Constantes et types du canvas unifie

**Fichier** : `apps/mobile/constants/canvas-unifie.ts` (nouveau)

Definir :

- `MAX_SLOTS_ATLAS = 44`
- `STRIDE_UNIFIE = 14`
- Groupes de slots : `SLOTS_PILES = { debut: 0, fin: 1 }`, `SLOTS_RESERVE = { debut: 2, fin: 3 }`, `SLOTS_ADVERSAIRES = { debut: 4, fin: 27 }`, `SLOTS_MAIN = { debut: 28, fin: 35 }`, `SLOTS_ANIMATIONS = { debut: 36, fin: 43 }`
- Types : `GroupeSlots`, `DonneesSlot`

**Validation** : `pnpm turbo typecheck`

---

### Etape 2 — Hook useBufferCanvasUnifie (noyau)

**Fichier** : `apps/mobile/hooks/useBufferCanvasUnifie.ts` (nouveau)

Implementer le hook qui alloue et gere le buffer unifie :

- `donneesWorklet: SharedValue<number[]>` (44 x 14 = 616 valeurs)
- `progressions: SharedValue<number>[]` (44 entrees, initialisees a -1)
- `sprites: SkRect[]` (44 entrees, initialisees au dos)
- `colors: SkColor[]` (44 entrees, initialisees a blanc)
- SharedValues individuelles pour la main joueur (8 x, 8 decalageY, 8 angle, 8 echelle)
- Pool de slots animation [36-43] avec `allouerSlotAnimation()` / `libererSlotAnimation(index)`
- Fonctions d'ecriture :
  - `parquerSlot(index)` — met le slot offscreen
  - `ecrireSlotStatique(index, x, y, rotation, echelle, sprite)`
  - `ecrireSlotAnime(index, depart, controle, arrivee, rotations, echelles, sprite)`
  - `mettreAJourSprite(index, sprite)`
  - `mettreAJourCouleur(index, grise: boolean)`

**Validation** : `pnpm turbo typecheck`

---

### Etape 3 — Refonte de CanvasCartesUnifie

**Fichier** : `apps/mobile/components/game/CanvasCartesUnifie.tsx` (modifie)

Refactorer pour :

- Accepter 44 slots Atlas + colors
- Le worklet RSXform gere 2 modes par slot :
  - Slots [0-27, 36-43] : interpolation Bezier depuis le buffer (comme actuellement)
  - Slots [28-35] : lecture des SharedValues individuelles de la main joueur
- Ajouter le rendu flip 2D apres l'Atlas (Group + Image Skia)
- Ajouter le parametre `colors` a `<Atlas>`
- Shadow unique partagee

Props :

```ts
interface PropsCanvasCartesUnifie {
  atlas: AtlasCartes;
  progressions: SharedValue<number>[];
  donneesWorklet: SharedValue<number[]>;
  sprites: SkRect[];
  colors: SkColor[];
  largeurEcran: number;
  hauteurEcran: number;
  // Main joueur (SharedValues individuelles)
  valeursMain: ValeursAnimationMainJoueur;
  cartesMain: CarteMainJoueurAtlas[];
  largeurCarte: number;
  hauteurCarte: number;
  // Flip 2D
  flip: EtatFlip | null;
}
```

**Validation** : `pnpm turbo typecheck`

---

### Etape 4 — Fonctions de mise a jour par groupe

**Fichier** : `apps/mobile/hooks/useBufferCanvasUnifie.ts` (etendre)

Ajouter les fonctions haut niveau qui calculent les positions et ecrivent dans le buffer :

**`mettreAJourPiles(nbPlis1, nbPlis2, largeurEcran, hauteurEcran)`**

- Importer `calculerGeometriePilePlis` depuis `pile-plis-geometrie.ts`
- Slot 0 : position pile equipe1 (ou parque si nbPlis1=0)
- Slot 1 : position pile equipe2 (ou parque si nbPlis2=0)
- Sprite : dos
- Rotation pour les piles tournees (est/ouest)

**`mettreAJourReserve(afficherPaquet, carteRetournee, largeurEcran, hauteurEcran)`**

- Importer `calculerDispositionReserveCentrale` depuis `reserve-centrale-disposition.ts`
- Slot 2 : dos paquet (ou parque si pas de paquet)
- Slot 3 : carte retournee face (ou parque si null)

**`mettreAJourAdversaires(nbParPosition, largeurEcran, hauteurEcran)`**

- Importer `calculerCiblesEventailAdversaire` depuis `distributionLayoutAtlas.ts`
- Slots 4-27 : positions en eventail pour nord/ouest/est
- Parquer les slots inutilises

**`mettreAJourMainJoueur(cartes, cartesJouables)`**

- Met a jour les `sprites[]` pour les slots 28-35 (face des cartes en main)
- Met a jour les `colors[]` pour le grise

**Validation** : `pnpm turbo typecheck`

---

### Etape 5 — Integration dans PlateauJeu et MainJoueur

**Fichiers modifies** :

- `apps/mobile/components/game/PlateauJeu.tsx`
- `apps/mobile/components/game/MainJoueur.tsx`

PlateauJeu :

- Appeler `useBufferCanvasUnifie(atlas, largeurEcran, hauteurEcran)`
- Monter un seul `<CanvasCartesUnifie>` avec toutes les props du buffer
- Appeler `mettreAJourPiles`, `mettreAJourReserve` dans des useEffect
- Passer les valeursMain et cartesMain au canvas

MainJoueur :

- Supprimer le rendu de `<CanvasMainJoueurAtlas>`
- Garder uniquement les `<Pressable>` hitboxes et la logique d'animation
- Exposer `valeursAnimation` et `cartesCanvas` via props/callback pour que PlateauJeu les transmette au canvas unifie

**Validation** : `pnpm --filter @belote/mobile test:e2e` (les tests visuels doivent voir les cartes rendues)

---

### Etape 6 — Migration des adversaires

**Fichiers modifies** :

- `apps/mobile/hooks/useAnimationsDistribution.ts`
- `apps/mobile/components/game/CoucheAnimation.tsx`
- `apps/mobile/components/game/PlateauJeu.tsx`

Migration :

- `useAnimationsDistribution` ecrit dans le buffer unifie (slots 4-27) au lieu de buffers separes
- `CoucheAnimation` ne monte plus `<CanvasAdversaires>`
- Supprimer `CanvasAdversaires.tsx`
- Supprimer `MainAdversaire.tsx` (son rendu statique est gere par mettreAJourAdversaires)

**Validation** : `pnpm --filter @belote/mobile test:e2e`

---

### Etape 7 — Migration des animations de vol (CarteAnimee)

**Fichiers modifies** :

- `apps/mobile/hooks/useAnimations.ts`
- `apps/mobile/components/game/CoucheAnimation.tsx`

Migration :

- `useAnimations` utilise `allouerSlotAnimation` / `libererSlotAnimation` au lieu de creer des composants CarteAnimee
- Les trajectoires Bezier sont ecrites dans le buffer (slots 36-43)
- La progression est animee avec `withTiming` sur le SharedValue correspondant
- `CoucheAnimation` ne mappe plus les `cartesEnVol` vers des `<CarteAnimee>`
- Supprimer `CarteAnimee.tsx`

**Validation** : `pnpm --filter @belote/mobile test:e2e`

---

### Etape 8 — Migration de la distribution sud

**Fichiers modifies** :

- `apps/mobile/hooks/useAnimationsDistribution.ts` ou `useOrchestrationDistribution.ts`
- `apps/mobile/components/game/CoucheAnimation.tsx`

Migration :

- La distribution sud utilise les slots animation (36-43) au lieu de `DistributionCanvasSud`
- Supprimer `DistributionCanvasSud.tsx`

**Validation** : `pnpm --filter @belote/mobile test:e2e`

---

### Etape 9 — Migration du flip 2D (CarteRevelation)

**Fichier nouveau** : `apps/mobile/hooks/useFlipCanvas.ts`
**Fichier modifie** : `apps/mobile/components/game/CanvasCartesUnifie.tsx`

Implementer :

- Hook `useFlipCanvas` qui gere l'etat du flip (progres, sprite source actif, matrice)
- Animation en 3 phases (detachement, flip scaleX, glissement) pilotee par SharedValue 0→3
- Le canvas unifie lit `flip.actif`, `flip.matrice`, `flip.sprite` et dessine via Group+Image
- Logique portee depuis `CarteRevelation.tsx` (interpolation des positions, durees des phases)
- Supprimer `CarteRevelation.tsx`

**Fichier modifie** : `apps/mobile/components/game/PlateauJeu.tsx`

- Remplacer les montages de `<CarteRevelation>` par des appels a `lancerFlip`

**Validation** : `pnpm --filter @belote/mobile test:e2e`

---

### Etape 10 — Migration des elements statiques (Reserve, Piles, PaquetCentral)

**Fichiers modifies** :

- `apps/mobile/components/game/ReserveCentrale.tsx` — supprime le rendu CanvasCartesAtlas, garde le conteneur View pour le layout de la carte retournee visible pendant encheres (ou devient un simple calcul)
- `apps/mobile/components/game/PilePlis.tsx` — supprime le rendu CanvasCartesAtlas, garde l'emplacement vide dashed
- Supprimer `PaquetCentral.tsx`

PlateauJeu appelle `mettreAJourPiles` et `mettreAJourReserve` dans des useEffect.

**Validation** : `pnpm --filter @belote/mobile test:e2e`

---

### Etape 11 — Nettoyage et suppression des fichiers obsoletes

- Supprimer les fichiers :
  - `CanvasCartesAtlas.tsx`
  - `CanvasMainJoueurAtlas.tsx`
  - `CanvasAdversaires.tsx`
  - `DistributionCanvasSud.tsx`
  - `PaquetCentral.tsx`
  - `MainAdversaire.tsx`
  - `CarteAnimee.tsx`
  - `CarteRevelation.tsx`
- Supprimer ou simplifier `CoucheAnimation.tsx` si plus necessaire
- Nettoyer les imports dans tous les fichiers impactes
- Supprimer le composant debug `ComparaisonRenduCarte.tsx` s'il reference les anciens composants

**Validation** : `pnpm turbo typecheck test` + `pnpm --filter @belote/mobile test:e2e`

---

### Etape 12 — Validation finale

- Verifier typecheck complet : `pnpm turbo typecheck`
- Lancer les tests unitaires : `pnpm turbo test`
- Lancer les tests e2e : `pnpm --filter @belote/mobile test:e2e`
- Test manuel : distribution, encheres, jeu, ramassage pli, scores, fin de partie
