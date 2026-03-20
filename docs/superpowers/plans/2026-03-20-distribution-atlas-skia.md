# Distribution Skia Atlas — Plan d'implémentation

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer l'animation de distribution par cartes individuelles (`CarteAnimee`) par un rendu Skia Atlas single draw call avec trajectoires Bézier, ease-out, et orchestration `withDelay` native Reanimated.

**Architecture:** Un unique `<Canvas>` Skia avec `drawAtlas` remplace les N composants `CarteAnimee` pendant la distribution. Un hook dédié `useAnimationsDistribution` gère les `SharedValue` Reanimated (progression 0→1 par carte) et calcule les `RSXform` dans `useRSXformBuffer`. L'orchestration passe de `setTimeout` JS à `withDelay` natif sur le UI thread. Le composant `DistributionCanvas` est séparé du hook pour une meilleure séparation des responsabilités (déviation volontaire de la spec qui prévoyait le Canvas interne au hook).

**Tech Stack:** @shopify/react-native-skia 2.2.12, react-native-reanimated v4, TypeScript strict, sharp (script de build)

**Spec:** `docs/superpowers/specs/2026-03-19-distribution-atlas-skia-design.md`

**Déviations volontaires par rapport à la spec :**

- Le Canvas Skia est dans un composant séparé `DistributionCanvas` plutôt qu'interne au hook (meilleure séparation des responsabilités)
- La signature de `useAnimationsDistribution` prend `atlas: AtlasCartes` seul (les dimensions écran passent à `DistributionCanvas`, les callbacks à `lancerDistribution`)
- `constants/layout.ts` est déjà à jour (`arcDistribution` + `easingDistribution: "out-cubic"`) — pas de modification nécessaire

---

## Structure des fichiers

### Fichiers existants réutilisés

| Fichier                                           | Rôle actuel                                        | Changement                                                                         |
| ------------------------------------------------- | -------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `apps/mobile/hooks/distributionAtlas.ts`          | Maths Bézier + rect source atlas (déjà implémenté) | Ajouter directive `"worklet"` aux fonctions Bézier pour compatibilité Skia worklet |
| `apps/mobile/__tests__/distributionAtlas.test.ts` | Tests des fonctions atlas/bézier                   | Aucun                                                                              |

### Fichiers à créer

| Fichier                                              | Responsabilité                                                                      |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `apps/mobile/scripts/generer-sprite-sheet.ts`        | Script Node (sharp) : assemble les 32 PNG + 1 dos en sprite sheet 8×5               |
| `apps/mobile/assets/sprites/sprite-sheet.png`        | Asset généré par le script                                                          |
| `apps/mobile/assets/sprites/dos.png`                 | Dos de carte seul (pour usages hors Atlas)                                          |
| `apps/mobile/hooks/useAtlasCartes.ts`                | Hook React : charge la sprite sheet via `useImage`, expose `rectSource` / `rectDos` |
| `apps/mobile/hooks/useAnimationsDistribution.ts`     | Hook principal : orchestration withDelay, SharedValues, préparation données Atlas   |
| `apps/mobile/components/game/DistributionCanvas.tsx` | Composant : rend le Canvas Skia Atlas avec `useRSXformBuffer`                       |

### Fichiers à modifier

| Fichier                                           | Nature du changement                                                                       |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `apps/mobile/package.json`                        | Ajouter `sharp` en devDependency                                                           |
| `apps/mobile/hooks/distributionAtlas.ts`          | Ajouter `"worklet"` à `interpolerBezierQuadratique` et `calculerPointArc`                  |
| `apps/mobile/components/game/CoucheAnimation.tsx` | Ajouter rendu conditionnel `DistributionCanvas`                                            |
| `apps/mobile/hooks/useControleurJeu.ts`           | Intégrer `useAtlasCartes` + `useAnimationsDistribution`, router les appels de distribution |
| `apps/mobile/hooks/useAnimations.ts`              | Retirer `lancerDistribution` (garder glisser/jeu/ramassage)                                |

### Fichiers NON modifiés

- `CarteAnimee.tsx` — arc Bézier + ease-out déjà en place (imports de `distributionAtlas`)
- `Carte.tsx`, `PaquetCentral.tsx`, `MainJoueur.tsx`, `PlateauJeu.tsx`
- `constants/layout.ts` — `arcDistribution` et `easingDistribution: "out-cubic"` déjà configurés (appliqués dans une PR précédente)

---

## Task 1 : Script de génération du sprite sheet

**Files:**

- Create: `apps/mobile/scripts/generer-sprite-sheet.ts`
- Create: `apps/mobile/assets/sprites/sprite-sheet.png` (généré)
- Create: `apps/mobile/assets/sprites/dos.png` (généré)
- Modify: `apps/mobile/package.json` (ajout devDep sharp)

- [ ] **Step 1: Installer sharp en devDependency**

```bash
cd apps/mobile && pnpm add -D sharp @types/sharp
```

- [ ] **Step 2: Écrire le script de génération**

Créer `apps/mobile/scripts/generer-sprite-sheet.ts` :

```ts
import sharp from "sharp";
import path from "path";
import fs from "fs";

// Grille 8×5 : lignes = couleurs (trefle, carreau, coeur, pique), colonnes = rangs (7,8,9,10,V,D,R,As)
// Ligne 5 = dos (cellule 0 uniquement)

const COULEURS_FICHIER = ["clubs", "diamonds", "hearts", "spades"] as const;
const RANGS_FICHIER = ["7", "8", "9", "10", "jack", "queen", "king", "ace"] as const;

const COLONNES = 8;
const LIGNES = 5;

const LARGEUR_CELLULE = 167;
const HAUTEUR_CELLULE = 243;

const COULEUR_DOS = { r: 30, g: 60, b: 120, alpha: 255 };

async function generer() {
  const dossierCartes = path.resolve(__dirname, "../assets/cartes");
  const dossierSprites = path.resolve(__dirname, "../assets/sprites");

  if (!fs.existsSync(dossierSprites)) {
    fs.mkdirSync(dossierSprites, { recursive: true });
  }

  const largeurTotale = COLONNES * LARGEUR_CELLULE;
  const hauteurTotale = LIGNES * HAUTEUR_CELLULE;

  const composites: sharp.OverlayOptions[] = [];

  // Lignes 0-3 : faces des cartes
  for (let ligne = 0; ligne < 4; ligne++) {
    const couleurFichier = COULEURS_FICHIER[ligne];
    for (let col = 0; col < COLONNES; col++) {
      const rangFichier = RANGS_FICHIER[col];
      const nomFichier = `${rangFichier}_of_${couleurFichier}.png`;
      const cheminFichier = path.join(dossierCartes, nomFichier);

      if (!fs.existsSync(cheminFichier)) {
        throw new Error(`Fichier manquant: ${cheminFichier}`);
      }

      const imageRedimensionnee = await sharp(cheminFichier)
        .resize(LARGEUR_CELLULE, HAUTEUR_CELLULE, { fit: "fill" })
        .toBuffer();

      composites.push({
        input: imageRedimensionnee,
        left: col * LARGEUR_CELLULE,
        top: ligne * HAUTEUR_CELLULE,
      });
    }
  }

  // Dos de carte (rectangle bleu uni)
  const dosBuffer = await sharp({
    create: {
      width: LARGEUR_CELLULE,
      height: HAUTEUR_CELLULE,
      channels: 4,
      background: COULEUR_DOS,
    },
  })
    .png()
    .toBuffer();

  // Ligne 4, cellule 0 : dos dans le sprite sheet
  composites.push({
    input: dosBuffer,
    left: 0,
    top: 4 * HAUTEUR_CELLULE,
  });

  // Assembler le sprite sheet
  await sharp({
    create: {
      width: largeurTotale,
      height: hauteurTotale,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(composites)
    .png({ compressionLevel: 9 })
    .toFile(path.join(dossierSprites, "sprite-sheet.png"));

  // Générer aussi le dos seul (pour usages hors Atlas)
  await sharp({
    create: {
      width: LARGEUR_CELLULE,
      height: HAUTEUR_CELLULE,
      channels: 4,
      background: COULEUR_DOS,
    },
  })
    .png()
    .toFile(path.join(dossierSprites, "dos.png"));

  console.log(
    `Sprite sheet générée : ${largeurTotale}×${hauteurTotale}px (${COLONNES}×${LIGNES} cellules de ${LARGEUR_CELLULE}×${HAUTEUR_CELLULE})`,
  );
  console.log(`Dos de carte généré : ${LARGEUR_CELLULE}×${HAUTEUR_CELLULE}px`);
}

generer().catch((err) => {
  console.error("Erreur:", err);
  process.exit(1);
});
```

- [ ] **Step 3: Exécuter le script pour générer les assets**

```bash
cd apps/mobile && npx tsx scripts/generer-sprite-sheet.ts
```

Expected: fichiers `assets/sprites/sprite-sheet.png` et `assets/sprites/dos.png` créés.

- [ ] **Step 4: Vérifier visuellement l'image générée**

Ouvrir `apps/mobile/assets/sprites/sprite-sheet.png` et confirmer la grille 8×5 avec les 32 faces + 1 dos.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/scripts/generer-sprite-sheet.ts apps/mobile/assets/sprites/ apps/mobile/package.json pnpm-lock.yaml
git commit -m "feat(mobile): script et sprite sheet atlas 8x5 pour distribution"
```

---

## Task 2 : Ajouter directive worklet aux fonctions Bézier

Les fonctions `interpolerBezierQuadratique` et `calculerPointArc` de `distributionAtlas.ts` sont appelées depuis le callback worklet de `useRSXformBuffer`. Elles doivent être marquées `"worklet"` pour être exécutables sur le UI thread.

**Files:**

- Modify: `apps/mobile/hooks/distributionAtlas.ts:54-99`

- [ ] **Step 1: Ajouter `"worklet"` aux fonctions**

Dans `distributionAtlas.ts`, ajouter `"worklet";` comme première instruction dans le corps de :

1. `calculerPointArc` (ligne 58, après l'accolade ouvrante) :

```ts
export function calculerPointArc(
  depart: PointNormalise,
  arrivee: PointNormalise,
  decalagePerpendiculaire: number,
): PointNormalise {
  "worklet";
  // ... reste du code inchangé
```

2. `interpolerBezierQuadratique` (ligne 86, après l'accolade ouvrante) :

```ts
export function interpolerBezierQuadratique(
  depart: PointNormalise,
  controle: PointNormalise,
  arrivee: PointNormalise,
  t: number,
): PointNormalise {
  "worklet";
  // ... reste du code inchangé
```

**Note :** Les fonctions marquées `"worklet"` restent appelables depuis le JS thread aussi (Reanimated gère les deux cas). Les tests existants continuent de fonctionner.

- [ ] **Step 2: Vérifier que les tests passent toujours**

```bash
pnpm --filter @belote/mobile test -- --testPathPattern=distributionAtlas --no-coverage
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/hooks/distributionAtlas.ts
git commit -m "fix(mobile): ajouter directive worklet aux fonctions bezier atlas"
```

---

## Task 3 : Hook useAtlasCartes

**Files:**

- Create: `apps/mobile/hooks/useAtlasCartes.ts`

- [ ] **Step 1: Écrire le hook**

Créer `apps/mobile/hooks/useAtlasCartes.ts` :

```ts
import { useImage } from "@shopify/react-native-skia";
import type { Couleur, Rang } from "@belote/shared-types";
import { useMemo } from "react";

import {
  SPRITE_COLONNES,
  SPRITE_LIGNES,
  calculerRectoSource,
  calculerVersoSource,
  type RectSource,
} from "./distributionAtlas";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const SPRITE_SHEET_SOURCE = require("../assets/sprites/sprite-sheet.png");

export interface AtlasCartes {
  image: ReturnType<typeof useImage>;
  largeurCellule: number;
  hauteurCellule: number;
  rectSource: (couleur: Couleur, rang: Rang) => RectSource;
  rectDos: () => RectSource;
}

/**
 * Hook qui charge le sprite sheet et expose les fonctions de mapping atlas.
 * Les dimensions des cellules sont calculées dynamiquement depuis l'image chargée.
 */
export function useAtlasCartes(): AtlasCartes {
  const image = useImage(SPRITE_SHEET_SOURCE);

  const largeurCellule = image ? image.width() / SPRITE_COLONNES : 0;
  const hauteurCellule = image ? image.height() / SPRITE_LIGNES : 0;

  const rectSource = useMemo(
    () => (couleur: Couleur, rang: Rang) =>
      calculerRectoSource(largeurCellule, hauteurCellule, couleur, rang),
    [largeurCellule, hauteurCellule],
  );

  const rectDos = useMemo(
    () => () => calculerVersoSource(largeurCellule, hauteurCellule),
    [largeurCellule, hauteurCellule],
  );

  return { image, largeurCellule, hauteurCellule, rectSource, rectDos };
}
```

- [ ] **Step 2: Vérifier le typecheck**

```bash
pnpm turbo typecheck --filter=@belote/mobile
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/hooks/useAtlasCartes.ts
git commit -m "feat(mobile): hook useAtlasCartes pour chargement sprite sheet"
```

---

## Task 4 : Hook useAnimationsDistribution

C'est le cœur de l'implémentation. Ce hook gère les SharedValue Reanimated, l'orchestration withDelay, et prépare les données pour le rendu Atlas.

**Files:**

- Create: `apps/mobile/hooks/useAnimationsDistribution.ts`

### Points techniques critiques

1. **SharedValues** : on utilise `makeMutable` de Reanimated (pas un hook) pour créer un pool de 32 valeurs mutables via `useRef`. Ceci évite la violation des Rules of Hooks (impossible d'appeler `useSharedValue` dans une boucle).

2. **Données worklet** : les données géométriques des cartes (depart, arrivee, controle, rotations, échelles) sont stockées dans un `SharedValue<number[]>` plat (tableau de flottants) pour être accessibles depuis le worklet de `useRSXformBuffer`. Un objet JS ordinaire ne serait pas sérialisable vers le UI thread.

3. **Callbacks onPaquetArrive** : déclenchés via le callback `finished` de `withTiming` + `runOnJS`. La dernière carte de chaque paquet déclenche le callback. Pas de `setTimeout`.

- [ ] **Step 1: Écrire le hook**

Créer `apps/mobile/hooks/useAnimationsDistribution.ts` :

```ts
import type { Carte, PositionJoueur } from "@belote/shared-types";
import { POSITIONS_JOUEUR } from "@belote/shared-types";
import { useCallback, useRef, useState } from "react";
import {
  Easing,
  makeMutable,
  runOnJS,
  type SharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

import { ANIMATIONS, POSITIONS_MAINS } from "../constants/layout";
import {
  calculerPointArc,
  calculerRectoSource,
  calculerVersoSource,
  type PointNormalise,
  type RectSource,
} from "./distributionAtlas";
import type { AtlasCartes } from "./useAtlasCartes";

// --- Types ---

/** Données géométriques pour une carte dans l'Atlas (côté JS) */
export interface CarteAtlas {
  carte: Carte;
  joueur: PositionJoueur;
  depart: PointNormalise;
  arrivee: PointNormalise;
  controle: PointNormalise;
  rotationDepart: number;
  rotationArrivee: number;
  echelleDepart: number;
  echelleArrivee: number;
  rectSource: RectSource;
}

/**
 * Données géométriques aplaties pour le worklet.
 * Pour chaque carte i, les données sont à l'offset i * STRIDE :
 * [departX, departY, controleX, controleY, arriveeX, arriveeY,
 *  rotationDepart, rotationArrivee, echelleDepart, echelleArrivee]
 */
const STRIDE = 10;

export interface ResultatAnimationsDistribution {
  lancerDistribution: (
    mains: Record<PositionJoueur, Carte[]>,
    options?: {
      onPaquetArrive?: (position: PositionJoueur, cartes: Carte[]) => void;
      onTerminee?: () => void;
      cartesVisibles?: Carte[];
    },
  ) => void;
  cartesAtlas: CarteAtlas[];
  /** SharedValues de progression (0→1) pour chaque carte, accessibles depuis worklet */
  progressions: SharedValue<number>[];
  /** Données géométriques aplaties pour le worklet */
  donneesWorklet: SharedValue<number[]>;
  /** Nombre de cartes actives dans la distribution courante */
  nbCartesActives: SharedValue<number>;
  enCours: boolean;
}

const MAX_CARTES = 32;
const EASING_OUT_CUBIC = Easing.out(Easing.cubic);

/**
 * Hook d'orchestration de la distribution via Skia Atlas.
 * Utilise withDelay natif Reanimated pour orchestrer sur le UI thread.
 */
export function useAnimationsDistribution(
  atlas: AtlasCartes,
): ResultatAnimationsDistribution {
  const [cartesAtlas, setCartesAtlas] = useState<CarteAtlas[]>([]);
  const [enCours, setEnCours] = useState(false);

  // Pool de SharedValues via makeMutable (pas un hook, pas de Rules of Hooks violation)
  const progressionsRef = useRef<SharedValue<number>[]>(
    Array.from({ length: MAX_CARTES }, () => makeMutable(0)),
  );
  const progressions = progressionsRef.current;

  // Données géométriques aplaties pour le worklet
  const donneesWorkletRef = useRef<SharedValue<number[]>>(
    makeMutable(new Array(MAX_CARTES * STRIDE).fill(0)),
  );
  const donneesWorklet = donneesWorkletRef.current;

  // Nombre de cartes actives
  const nbCartesActivesRef = useRef<SharedValue<number>>(makeMutable(0));
  const nbCartesActives = nbCartesActivesRef.current;

  const lancerDistribution = useCallback(
    (
      mains: Record<PositionJoueur, Carte[]>,
      options?: {
        onPaquetArrive?: (position: PositionJoueur, cartes: Carte[]) => void;
        onTerminee?: () => void;
        cartesVisibles?: Carte[];
      },
    ) => {
      const { distribution } = ANIMATIONS;
      const { largeurCellule, hauteurCellule } = atlas;

      if (!atlas.image || largeurCellule === 0) return;

      // Construire les paquets (3 puis 2)
      const nbCartesParJoueur = Math.max(
        ...POSITIONS_JOUEUR.map((pos) => mains[pos].length),
      );
      const taillesPaquets: number[] = [];
      let cartesRestantes = nbCartesParJoueur;
      if (cartesRestantes >= 3) {
        taillesPaquets.push(3);
        cartesRestantes -= 3;
      }
      while (cartesRestantes > 0) {
        const taille = Math.min(cartesRestantes, 3);
        taillesPaquets.push(taille);
        cartesRestantes -= taille;
      }

      const nouvCartesAtlas: CarteAtlas[] = [];
      const donneesPlat: number[] = [];
      let temps = 0;
      let indexCarte = 0;

      const { ecartX, ecartRotation } = distribution.eventailVol;
      const decalage = distribution.arcDistribution.decalagePerpendiculaire;

      // Tracker les paquets pour les callbacks onPaquetArrive
      // Chaque entrée : { indexDerniereCarte, position, cartes }
      const paquetsCallback: {
        indexDerniereCarteAtlas: number;
        position: PositionJoueur;
        cartes: Carte[];
      }[] = [];

      // Stocker delai et duree pour chaque carte Atlas
      const delaisCartes: { delai: number; duree: number }[] = [];

      for (let p = 0; p < taillesPaquets.length; p++) {
        const taillePaquet = taillesPaquets[p];
        if (p > 0) temps += distribution.pauseEntreRounds;

        for (const position of POSITIONS_JOUEUR) {
          const cartesJoueur = mains[position];
          const posMain = POSITIONS_MAINS[position];

          const cartesDuPaquet: Carte[] = [];
          for (let c = 0; c < taillePaquet && indexCarte + c < cartesJoueur.length; c++) {
            cartesDuPaquet.push(cartesJoueur[indexCarte + c]);
          }
          if (cartesDuPaquet.length === 0) continue;

          const delaiPaquet = temps;
          const nbCartesPaquet = cartesDuPaquet.length;

          // Direction de vol pour éventail perpendiculaire
          const dx = posMain.x - distribution.originX;
          const dy = posMain.y - distribution.originY;
          const angle = Math.atan2(dy, dx);
          const perpX = -Math.sin(angle);
          const perpY = Math.cos(angle);

          for (let idx = 0; idx < cartesDuPaquet.length; idx++) {
            const carte = cartesDuPaquet[idx];
            const centre = (nbCartesPaquet - 1) / 2;
            const offsetIdx = idx - centre;

            const departX = distribution.originX + offsetIdx * ecartX * perpX;
            const departY = distribution.originY + offsetIdx * ecartX * perpY;
            const depart: PointNormalise = { x: departX, y: departY };
            const arrivee: PointNormalise = { x: posMain.x, y: posMain.y };
            const controle = calculerPointArc(depart, arrivee, decalage);

            const estVisible =
              options?.cartesVisibles?.some(
                (cv) => cv.couleur === carte.couleur && cv.rang === carte.rang,
              ) ?? false;

            const rectSrc = estVisible
              ? calculerRectoSource(
                  largeurCellule,
                  hauteurCellule,
                  carte.couleur,
                  carte.rang,
                )
              : calculerVersoSource(largeurCellule, hauteurCellule);

            const rotDepart = offsetIdx * ecartRotation;
            const rotArrivee = 0;
            const echDepart = 0.5;
            const echArrivee = 1;

            nouvCartesAtlas.push({
              carte,
              joueur: position,
              depart,
              arrivee,
              controle,
              rotationDepart: rotDepart,
              rotationArrivee: rotArrivee,
              echelleDepart: echDepart,
              echelleArrivee: echArrivee,
              rectSource: rectSrc,
            });

            // Données aplaties pour le worklet
            donneesPlat.push(
              depart.x,
              depart.y,
              controle.x,
              controle.y,
              arrivee.x,
              arrivee.y,
              rotDepart,
              rotArrivee,
              echDepart,
              echArrivee,
            );

            delaisCartes.push({ delai: delaiPaquet, duree: distribution.dureeCarte });
          }

          // Tracker la dernière carte du paquet pour le callback
          paquetsCallback.push({
            indexDerniereCarteAtlas: nouvCartesAtlas.length - 1,
            position,
            cartes: [...cartesDuPaquet],
          });

          temps += distribution.delaiEntreJoueurs;
        }

        indexCarte += taillePaquet;
      }

      // Mettre à jour l'état React
      setCartesAtlas(nouvCartesAtlas);
      setEnCours(true);

      // Mettre à jour les données worklet
      const donneesComplet = new Array(MAX_CARTES * STRIDE).fill(0);
      for (let i = 0; i < donneesPlat.length; i++) {
        donneesComplet[i] = donneesPlat[i];
      }
      donneesWorklet.value = donneesComplet;
      nbCartesActives.value = nouvCartesAtlas.length;

      // Réinitialiser les progressions
      for (let i = 0; i < MAX_CARTES; i++) {
        progressions[i].value = 0;
      }

      // Lancer les animations withDelay + withTiming
      let compteurTermines = 0;
      const totalCartes = nouvCartesAtlas.length;

      for (let i = 0; i < totalCartes; i++) {
        const { delai, duree } = delaisCartes[i];

        // Chercher si cette carte est la dernière d'un paquet (pour onPaquetArrive)
        const paquet = paquetsCallback.find((p) => p.indexDerniereCarteAtlas === i);

        progressions[i].value = withDelay(
          delai,
          withTiming(1, { duration: duree, easing: EASING_OUT_CUBIC }, (termine) => {
            "worklet";
            if (!termine) return;

            compteurTermines++;

            // Callback onPaquetArrive via runOnJS
            if (paquet && options?.onPaquetArrive) {
              runOnJS(options.onPaquetArrive)(paquet.position, paquet.cartes);
            }

            // Callback onTerminee quand toutes les cartes sont arrivées
            if (compteurTermines >= totalCartes) {
              if (options?.onTerminee) {
                runOnJS(options.onTerminee)();
              }
              runOnJS(setEnCours)(false);
            }
          }),
        );
      }
    },
    [atlas, progressions, donneesWorklet, nbCartesActives],
  );

  return {
    lancerDistribution,
    cartesAtlas,
    progressions,
    donneesWorklet,
    nbCartesActives,
    enCours,
  };
}
```

- [ ] **Step 2: Vérifier le typecheck**

```bash
pnpm turbo typecheck --filter=@belote/mobile
```

Expected: PASS (peut nécessiter l'export de `PointNormalise` depuis `distributionAtlas.ts` s'il ne l'est pas déjà)

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/hooks/useAnimationsDistribution.ts
git commit -m "feat(mobile): hook useAnimationsDistribution avec withDelay et bezier"
```

---

## Task 5 : Composant DistributionCanvas

**Files:**

- Create: `apps/mobile/components/game/DistributionCanvas.tsx`

### Point technique critique

Le callback de `useRSXformBuffer` est un **worklet Skia**. Il ne peut accéder qu'aux SharedValues et fonctions marquées `"worklet"`. Les données géométriques sont passées via `donneesWorklet` (SharedValue de tableau plat). Les fonctions `interpolerBezierQuadratique` sont marquées `"worklet"` (Task 2).

- [ ] **Step 1: Écrire le composant**

Créer `apps/mobile/components/game/DistributionCanvas.tsx` :

```tsx
import { Atlas, Canvas, rect, useRSXformBuffer } from "@shopify/react-native-skia";
import { useMemo } from "react";
import type { SharedValue } from "react-native-reanimated";

import { RATIO_ASPECT_CARTE, RATIO_LARGEUR_CARTE } from "../../constants/layout";
import {
  interpolerBezierQuadratique,
  SPRITE_COLONNES,
  SPRITE_LIGNES,
} from "../../hooks/distributionAtlas";
import type { CarteAtlas } from "../../hooks/useAnimationsDistribution";
import type { AtlasCartes } from "../../hooks/useAtlasCartes";

interface PropsDistributionCanvas {
  atlas: AtlasCartes;
  cartesAtlas: CarteAtlas[];
  progressions: SharedValue<number>[];
  donneesWorklet: SharedValue<number[]>;
  nbCartesActives: SharedValue<number>;
  largeurEcran: number;
  hauteurEcran: number;
}

const STRIDE = 10;

/**
 * Canvas Skia qui dessine toutes les cartes de distribution en un seul draw call
 * via drawAtlas / useRSXformBuffer.
 */
export function DistributionCanvas({
  atlas,
  cartesAtlas,
  progressions,
  donneesWorklet,
  nbCartesActives,
  largeurEcran,
  hauteurEcran,
}: PropsDistributionCanvas) {
  // Tous les hooks AVANT tout early return
  const nbCartes = cartesAtlas.length;

  // Rectangles source dans la sprite sheet (un par carte)
  const sprites = useMemo(
    () =>
      cartesAtlas.map((ca) =>
        rect(ca.rectSource.x, ca.rectSource.y, ca.rectSource.width, ca.rectSource.height),
      ),
    [cartesAtlas],
  );

  // Dimensions de la carte à l'écran
  const largeurCarte = Math.round(largeurEcran * RATIO_LARGEUR_CARTE);
  const hauteurCarte = Math.round(largeurCarte * RATIO_ASPECT_CARTE);

  // Facteur d'échelle sprite sheet → écran (uniforme car on garde le ratio)
  const scaleBase = atlas.largeurCellule > 0 ? largeurCarte / atlas.largeurCellule : 1;
  const pivotX = atlas.largeurCellule / 2;
  const pivotY = atlas.hauteurCellule / 2;

  // RSXform buffer — recalculé à chaque frame par Skia worklet
  const transforms = useRSXformBuffer(nbCartes, (val, i) => {
    "worklet";
    const donnees = donneesWorklet.value;
    const nbActives = nbCartesActives.value;

    if (i >= nbActives) {
      val.set(0, 0, -10000, -10000); // hors écran
      return;
    }

    const t = progressions[i].value;
    const offset = i * STRIDE;

    // Lire les données géométriques depuis le tableau plat
    const departX = donnees[offset];
    const departY = donnees[offset + 1];
    const controleX = donnees[offset + 2];
    const controleY = donnees[offset + 3];
    const arriveeX = donnees[offset + 4];
    const arriveeY = donnees[offset + 5];
    const rotDepart = donnees[offset + 6];
    const rotArrivee = donnees[offset + 7];
    const echDepart = donnees[offset + 8];
    const echArrivee = donnees[offset + 9];

    // Position Bézier quadratique
    const pos = interpolerBezierQuadratique(
      { x: departX, y: departY },
      { x: controleX, y: controleY },
      { x: arriveeX, y: arriveeY },
      t,
    );

    // Interpolation linéaire rotation et échelle
    const rotation = rotDepart + (rotArrivee - rotDepart) * t;
    const echelle = echDepart + (echArrivee - echDepart) * t;

    const rotRad = (rotation * Math.PI) / 180;
    const cos = Math.cos(rotRad) * echelle * scaleBase;
    const sin = Math.sin(rotRad) * echelle * scaleBase;

    // RSXform(scos, ssin, tx, ty)
    const pixelX = pos.x * largeurEcran;
    const pixelY = pos.y * hauteurEcran;

    val.set(
      cos,
      sin,
      pixelX - cos * pivotX + sin * pivotY,
      pixelY - sin * pivotX - cos * pivotY,
    );
  });

  // Early return APRÈS tous les hooks
  if (!atlas.image || nbCartes === 0) return null;

  return (
    <Canvas
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: largeurEcran,
        height: hauteurEcran,
        zIndex: 100,
      }}
      pointerEvents="none"
    >
      <Atlas image={atlas.image} sprites={sprites} transforms={transforms} />
    </Canvas>
  );
}
```

- [ ] **Step 2: Vérifier le typecheck**

```bash
pnpm turbo typecheck --filter=@belote/mobile
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/components/game/DistributionCanvas.tsx
git commit -m "feat(mobile): composant DistributionCanvas avec Skia Atlas drawAtlas"
```

---

## Task 6 : Intégration dans CoucheAnimation + retrait de lancerDistribution

On combine la modification de `CoucheAnimation`, le retrait de `lancerDistribution` dans `useAnimations`, et l'intégration dans `useControleurJeu` en une seule task pour éviter un commit intermédiaire qui casse le typecheck.

**Files:**

- Modify: `apps/mobile/components/game/CoucheAnimation.tsx`
- Modify: `apps/mobile/hooks/useAnimations.ts`
- Modify: `apps/mobile/hooks/useControleurJeu.ts`
- Modify: `apps/mobile/components/game/PlateauJeu.tsx` (si nécessaire pour passer les props)

- [ ] **Step 1: Modifier CoucheAnimation — ajouter props et rendu conditionnel**

Ajouter les imports :

```ts
import type { SharedValue } from "react-native-reanimated";
import type { CarteAtlas } from "../../hooks/useAnimationsDistribution";
import type { AtlasCartes } from "../../hooks/useAtlasCartes";
import { DistributionCanvas } from "./DistributionCanvas";
```

Ajouter les props optionnelles à l'interface `PropsCoucheAnimation` :

```ts
atlas?: AtlasCartes;
cartesAtlasDistribution?: CarteAtlas[];
progressionsDistribution?: SharedValue<number>[];
donneesWorkletDistribution?: SharedValue<number[]>;
nbCartesActivesDistribution?: SharedValue<number>;
distributionEnCours?: boolean;
```

Dans le JSX, avant les cartes en vol, ajouter :

```tsx
{
  /* Distribution via Skia Atlas (single draw call) */
}
{
  atlas &&
    cartesAtlasDistribution &&
    progressionsDistribution &&
    donneesWorkletDistribution &&
    nbCartesActivesDistribution &&
    distributionEnCours && (
      <DistributionCanvas
        atlas={atlas}
        cartesAtlas={cartesAtlasDistribution}
        progressions={progressionsDistribution}
        donneesWorklet={donneesWorkletDistribution}
        nbCartesActives={nbCartesActivesDistribution}
        largeurEcran={largeurEcran}
        hauteurEcran={hauteurEcran}
      />
    );
}
```

- [ ] **Step 2: Retirer lancerDistribution de useAnimations**

Dans `useAnimations.ts` :

1. Supprimer la fonction `lancerDistribution` (lignes 38-170)
2. Retirer `lancerDistribution` du return (ligne 385)
3. Conserver : `glisserCarteRetournee`, `lancerAnimationJeuCarte`, `lancerAnimationRamassagePli`, `annulerAnimations`, `surAnimationTerminee`, `cartesEnVol`, `cartesSurTapis`

- [ ] **Step 3: Intégrer dans useControleurJeu**

Ajouter les imports :

```ts
import { useAtlasCartes } from "./useAtlasCartes";
import { useAnimationsDistribution } from "./useAnimationsDistribution";
```

Après `const animations = useAnimations();` ajouter :

```ts
const atlas = useAtlasCartes();
const animDistribution = useAnimationsDistribution(atlas);
```

Remplacer les appels `animations.lancerDistribution(...)` par `animDistribution.lancerDistribution(...)` dans :

- `lancerDistributionAnimee` (autour de la ligne 554)
- `lancerDistributionRestanteAnimee` (autour de la ligne 1051)

**Note :** `animations.glisserCarteRetournee(...)` reste inchangé.

Ajouter au return de `useControleurJeu` :

```ts
atlas,
cartesAtlasDistribution: animDistribution.cartesAtlas,
progressionsDistribution: animDistribution.progressions,
donneesWorkletDistribution: animDistribution.donneesWorklet,
nbCartesActivesDistribution: animDistribution.nbCartesActives,
distributionEnCours: animDistribution.enCours,
```

- [ ] **Step 4: Passer les props Atlas dans PlateauJeu → CoucheAnimation**

Rechercher le composant qui rend `<CoucheAnimation>` (probablement `PlateauJeu.tsx`) et destructurer les nouvelles props de `useControleurJeu` pour les passer :

```tsx
<CoucheAnimation
  {...existingProps}
  atlas={atlas}
  cartesAtlasDistribution={cartesAtlasDistribution}
  progressionsDistribution={progressionsDistribution}
  donneesWorkletDistribution={donneesWorkletDistribution}
  nbCartesActivesDistribution={nbCartesActivesDistribution}
  distributionEnCours={distributionEnCours}
/>
```

- [ ] **Step 5: Vérifier le typecheck**

```bash
pnpm turbo typecheck --filter=@belote/mobile
```

Expected: PASS

- [ ] **Step 6: Lancer les tests**

```bash
pnpm --filter @belote/mobile test --no-coverage
```

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add apps/mobile/hooks/useAnimations.ts apps/mobile/hooks/useControleurJeu.ts apps/mobile/components/game/CoucheAnimation.tsx apps/mobile/components/game/PlateauJeu.tsx
git commit -m "feat(mobile): integrer distribution atlas dans le pipeline d'animation"
```

---

## Task 7 : Validation complète

- [ ] **Step 1: Typecheck complet**

```bash
pnpm turbo typecheck
```

Expected: PASS

- [ ] **Step 2: Tests unitaires complets**

```bash
pnpm turbo test
```

Expected: PASS

- [ ] **Step 3: Lint**

```bash
pnpm turbo lint
```

Expected: PASS

- [ ] **Step 4: Test visuel**

Lancer l'app et jouer une partie complète :

```bash
cd apps/mobile && pnpm start --web
```

Vérifier :

- [ ] Les cartes volent du centre vers les mains avec un arc subtil (pas en ligne droite)
- [ ] L'arrivée des cartes décélère naturellement (ease-out)
- [ ] Pas de saccade visible pendant la distribution
- [ ] Le paquet central diminue visuellement au fur et à mesure
- [ ] La carte retournée slide correctement vers le preneur
- [ ] Le jeu de carte et le ramassage fonctionnent normalement
- [ ] Pas de régression sur les enchères et le gameplay

- [ ] **Step 5: Commit final**

```bash
git add -A
git commit -m "feat(mobile): distribution skia atlas complete — arc bezier, ease-out, withDelay"
```

---

## Notes d'implémentation

### makeMutable vs useSharedValue

On utilise `makeMutable` de `react-native-reanimated` pour créer les SharedValues dans un `useRef`. C'est l'approche recommandée quand le nombre de SharedValues est dynamique ou créé en boucle. `makeMutable` retourne un objet compatible `SharedValue` mais n'est pas un hook React.

### Données worklet — tableau plat

Les données géométriques des cartes sont sérialisées dans un tableau plat `number[]` (SharedValue) pour être accessibles depuis le worklet de `useRSXformBuffer`. Un objet JS avec des propriétés nommées ne serait pas sérialisable vers le UI thread. Le `STRIDE` de 10 encode :
`[departX, departY, controleX, controleY, arriveeX, arriveeY, rotDepart, rotArrivee, echDepart, echArrivee]`

### Échelle uniforme pour RSXform

`RSXform` encode une transformation 2D uniforme (rotation + scale). La sprite sheet et les cartes à l'écran ont le même ratio d'aspect (~1.45), donc un seul facteur `scaleBase = largeurCarte / largeurCellule` suffit. Si le ratio divergeait, il faudrait utiliser une API de rendu différente.

### Fallback si Atlas indisponible

Si `atlas.image` est `null` (chargement en cours), le `DistributionCanvas` retourne `null`. Le chargement d'une image locale est quasi-instantané. Si un fallback est nécessaire, on pourrait réintégrer temporairement `CarteAnimee` — hors scope de cette implémentation.
