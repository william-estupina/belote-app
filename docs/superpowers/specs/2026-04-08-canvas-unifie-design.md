# Canvas Skia Unifie — Spec de design

## Objectif

Remplacer les multiples `<Canvas>` Skia du plateau de jeu par un **unique Canvas plein ecran** avec un seul `<Atlas>` draw call. Toutes les cartes (main joueur, adversaires, piles, reserve, animations de vol, flip 2D) sont rendues dans ce canvas.

## Decisions de design

| Decision                | Choix                                                                                         |
| ----------------------- | --------------------------------------------------------------------------------------------- |
| Nombre de canvas        | 1 unique, toujours monte                                                                      |
| Flip 3D des cartes      | Simulation 2D dans le meme Canvas (scaleX 1→0→1 + swap sprite) via `<Group>` + `<Image>` Skia |
| Empilement paquet/piles | Simplifie a 1 seul sprite (pas de couches multiples)                                          |
| Z-ordering              | Partitions fixes (ordre des slots = ordre de dessin)                                          |
| Grise cartes injouables | `colors` param de l'Atlas (teinture par sprite)                                               |
| Main joueur animations  | SharedValues individuelles (x, decalageY, angle, echelle) lues dans le worklet                |

## Architecture des slots

48 slots pre-alloues dans l'Atlas, partitionnes en groupes fixes :

```
Groupe              Slots     Nb   Usage
─────────────────────────────────────────────────────
PILES_PLIS          [0-1]      2   1 dos par equipe
RESERVE             [2-3]      2   1 dos paquet + 1 carte retournee
ADVERSAIRES         [4-27]    24   8 cartes x 3 positions
MAIN_JOUEUR         [28-35]    8   Eventail du joueur sud
ANIMATIONS          [36-43]    8   Distribution sud / vol de jeu
HAUTE_PRIORITE      [44-47]    4   Flip 2D reserve (hors atlas, via Group+Image)
─────────────────────────────────────────────────────
Total atlas                   44   (slots 44-47 non utilises par l'Atlas)
```

> Les slots 44-47 sont reserves pour le rendu flip hors-Atlas. Le `<Atlas>` lui-meme utilise 44 slots.

## Buffer de donnees unifie

Un `SharedValue<number[]>` de 44 x STRIDE (STRIDE = 14) = 616 valeurs.

Chaque slot occupe 14 valeurs :

```
Offset  Valeur           Defaut (statique)
───────────────────────────────────────────
0       departX          position.x
1       departY          position.y
2       controleX        position.x
3       controleY        position.y
4       arriveeX         position.x
5       arriveeY         position.y
6       rotDepart        rotation
7       rotArrivee       rotation
8       echDepart        echelle
9       echArrivee       echelle
10      scaleX           1 (reserve pour flip 2D futur)
11      scaleY           1 (reserve pour flip 2D futur)
12-13   (reserve)        0
```

### Slots statiques

Pour les elements au repos (piles, reserve, adversaires en eventail) :

- `depart = controle = arrivee = position finale`
- `progression = 1` (fixee)
- Le worklet interpole mais comme tout est identique, le resultat est la position cible.

### Slots main joueur (28-35)

**Modele hybride** : ces slots sont pilotes par des `SharedValue<number>[]` individuelles (`x`, `decalageY`, `angle`, `echelle`) existantes dans `MainJoueur`. Le worklet lit directement ces valeurs au lieu du buffer Bezier pour ce groupe.

Cela evite de refondre la logique `withTiming` de reorganisation de la main.

### Slots animations (36-43)

Pilotes par le buffer Bezier standard. Servent pour :

- Distribution sud (cartes en vol vers la main du joueur)
- Vol de jeu (carte jouee qui vole vers la zone de pli)
- Ramassage de pli (cartes du pli qui volent vers la pile)

Cycle de vie d'un slot animation :

1. Allouer un slot libre dans [36-43]
2. Ecrire les donnees de trajectoire dans le buffer
3. Animer la progression 0→1
4. A la fin, parquer le slot offscreen et le liberer

## Simulation du flip 2D

Le flip (revelation carte retournee, retour carte) est rendu **dans le meme `<Canvas>`** mais **hors de l'Atlas**, via des primitives Skia directes :

```tsx
<Canvas style={...}>
  {/* Atlas pour les 44 slots */}
  <Group>
    <Shadow ... />
    <Atlas image={atlas.image} sprites={sprites} transforms={transforms} colors={colors} />
  </Group>

  {/* Flip 2D — rendu par dessus l'Atlas */}
  {flipActif && (
    <Group transform={matriceFlip}>
      <Shadow ... />
      <ImageSVG ... />  {/* ou Image clippee */}
    </Group>
  )}
</Canvas>
```

**Principe d'animation :**

1. `scaleX` : 1 → 0 (premiere moitie de l'animation)
2. Au point median : swap du sprite source (dos → face ou inverse)
3. `scaleX` : 0 → 1 (seconde moitie)
4. Position/rotation suivent la trajectoire via `useDerivedValue`

L'animation est pilotee par un `SharedValue<number>` (progres 0→3 pour les 3 phases : detachement, flip, glissement).

La matrice de transformation est calculee dans un `useDerivedValue` worklet qui lit la progression et produit une `SkMatrix` incluant translate, rotate, scaleX et scaleY.

> **Limite** : 1 flip simultane max (suffisant — on ne revele/retourne qu'une carte a la fois).

## Grise des cartes injouables

Le parametre `colors` de l'Atlas Skia permet de teinter individuellement chaque sprite :

- Carte normale : `Skia.Color('white')` — aucune alteration
- Carte grisee : `Skia.Color(140, 140, 140, 255)` — assombrissement ~45%

Le tableau `colors: SkColor[]` (44 entrees) est gere cote React (pas worklet). Mis a jour uniquement quand `cartesJouables` change (1 fois par tour).

## Impact sur les composants

### Supprimes

| Composant                   | Raison                                            |
| --------------------------- | ------------------------------------------------- |
| `CanvasCartesAtlas.tsx`     | Remplace par le canvas unifie                     |
| `CanvasMainJoueurAtlas.tsx` | Main joueur integree dans le canvas unifie        |
| `CanvasAdversaires.tsx`     | Adversaires integres dans le canvas unifie        |
| `DistributionCanvasSud.tsx` | Distribution sud integree dans le canvas unifie   |
| `PaquetCentral.tsx`         | Simplifie en 1 slot dans la reserve               |
| `MainAdversaire.tsx`        | Rendu pur sans interaction, absorbe par le canvas |
| `CarteAnimee.tsx`           | Logique → hook, rendu → canvas unifie             |
| `CarteRevelation.tsx`       | Logique → hook, rendu flip → canvas unifie        |

### Modifies

| Composant                | Modification                                                        |
| ------------------------ | ------------------------------------------------------------------- |
| `CanvasCartesUnifie.tsx` | Etendu : 44+4 slots, colors, rendu flip Group+Image                 |
| `MainJoueur.tsx`         | Garde hitboxes Pressable, supprime CanvasMainJoueurAtlas            |
| `ReserveCentrale.tsx`    | Calcul de positions pur, ecrit dans le buffer unifie                |
| `PilePlis.tsx`           | Garde View "emplacement vide" (dashed border), supprime rendu Atlas |
| `CoucheAnimation.tsx`    | Tres simplifie ou supprime, logique dans PlateauJeu                 |
| `PlateauJeu.tsx`         | Monte le canvas unifie unique, passe le buffer aux composants       |

### Nouveau hook

**`useBufferCanvasUnifie(atlas: AtlasCartes, largeurEcran, hauteurEcran)`**

Responsabilites :

- Alloue `donneesWorklet: SharedValue<number[]>` (44 x STRIDE)
- Alloue `progressions: SharedValue<number>[]` (44 entrees)
- Gere `sprites: SkRect[]` (44 rectangles source)
- Gere `colors: SkColor[]` (44 couleurs)
- Expose des fonctions d'ecriture par groupe :
  - `mettreAJourPiles(nbPlis1: number, nbPlis2: number, largeurEcran, hauteurEcran)`
  - `mettreAJourReserve(carteRetournee: Carte | null, afficherPaquet: boolean, ...)`
  - `mettreAJourAdversaires(nbParPosition, cartesAtlas, distributionEnCours)`
  - `mettreAJourMainJoueur(cartes, cartesJouables)` — met a jour sprites + colors pour le grise
  - `allouerSlotAnimation() → index | null`
  - `libererSlotAnimation(index)`
  - `lancerFlip(carte, depart, arrivee, inverse?)` — gere l'etat flip
- Expose les SharedValues de la main joueur (x, decalageY, angle, echelle)

### Modifications aux hooks existants

- `useAnimationsDistribution` → ecrit dans le buffer unifie (slots adversaires 4-27 + slots animation 36-43) au lieu de buffers separes
- `useAnimations` → ecrit les vols de jeu dans les slots animation 36-43 au lieu de creer des CarteAnimee
- `useControleurJeu` → utilise `useBufferCanvasUnifie`, expose le buffer unifie au lieu des multiples buffers

## Contraintes

- Le `<Canvas>` est `pointerEvents="none"` — les zones tactiles restent des `<Pressable>` React Native superposees (comme actuellement dans `MainJoueur`)
- Le canvas couvre tout l'ecran (`position: absolute, top: 0, left: 0, width: largeurEcran, height: hauteurEcran`)
- Les elements non-carte (avatars, panneau encheres, scores, dernier pli, dialogues) restent en React Native au-dessus du canvas
- Le `zIndex` du canvas est inferieur a celui des overlays UI

## Performance attendue

| Metrique                     | Avant                     | Apres                  |
| ---------------------------- | ------------------------- | ---------------------- |
| Surfaces GPU (Canvas)        | 5-12 (variable)           | 1 (fixe)               |
| Draw calls Atlas             | 5-12                      | 1 (+1 rare pour flip)  |
| RSXform buffers              | 3+                        | 1                      |
| Re-renders React pour cartes | frequents (mount/unmount) | aucun (buffer worklet) |
