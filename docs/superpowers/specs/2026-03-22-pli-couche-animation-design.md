# Pli rendu par la couche d'animation

## Contexte

Aujourd'hui, les cartes du pli passent par deux representations visuelles successives:

1. `CoucheAnimation` affiche la carte pendant son vol.
2. `ZonePli` re-rend ensuite une version statique de cette meme carte.
3. `CoucheAnimation` reprend enfin la main pour le ramassage.

Ce handoff introduit un point fragile:

- risque de clignotement au moment de l'atterrissage
- duplication de rendu pour une meme carte
- ecart possible entre la carte "posee" et celle ramassee

Le besoin valide est de garder la meme representation visuelle du pli du debut du vol jusqu'au ramassage.

## Decision retenue

La verite metier reste `etatJeu.pliEnCours`, mais la verite visuelle des cartes du pli devient `CoucheAnimation`.

En pratique:

- `useControleurJeu` continue d'alimenter `etatJeu.pliEnCours`
- `ZonePli` ne rend plus les cartes, seulement le cadre decoratif central
- `useAnimations` gere a la fois les cartes en vol et les cartes deja posees au centre
- le ramassage repart depuis ces cartes deja posees, sans repasser par un rendu statique dans `ZonePli`

## Alternatives ecartees

### Option A - conserver `ZonePli` comme rendu principal des cartes

Avantages:

- responsabilite simple a lire au premier abord
- `pliEnCours` alimente directement le rendu visible

Inconvenients:

- le handoff animation -> statique -> animation reste present
- les bugs de transition restent structurellement possibles
- la meme carte est recreree plusieurs fois

### Option B - faire de `CoucheAnimation` l'unique rendu visuel du pli

Avantages:

- une seule source visuelle pour toutes les etapes du pli
- pas de swap de composant a l'arrivee
- le ramassage re-utilise les memes cartes

Inconvenients:

- `CoucheAnimation` porte une responsabilite plus large

Recommendation retenue: Option B.

## Architecture cible

### `useControleurJeu`

Responsabilites conservees:

- maintenir `etatJeu.pliEnCours` comme source de verite metier
- retirer la carte de la main au moment du jeu
- informer `useAnimations` quand un vol commence et quand un ramassage doit commencer

Responsabilites retirees:

- ne plus dependre de `ZonePli` pour afficher les cartes une fois posees

### `useAnimations`

Nouveaux etats visuels:

- `cartesEnVol`: cartes actuellement animees
- `cartesPoseesAuPli`: cartes deja arrivees au centre et encore visibles

Nouvelles responsabilites:

- convertir une carte qui termine son vol en carte posee au pli
- exposer les cartes posees a `CoucheAnimation`
- fournir le point de depart du ramassage depuis `cartesPoseesAuPli`
- vider `cartesPoseesAuPli` a la fin du ramassage ou lors d'une annulation

Principe cle:

- `cartesPoseesAuPli` est un cache de rendu, pas une nouvelle verite metier
- sa reconstruction reste possible a partir de `etatJeu.pliEnCours`

### `CoucheAnimation`

Responsabilites:

- rendre les cartes en vol
- rendre les cartes posees au centre
- garantir que le meme composant visuel reste visible entre l'arrivee et le ramassage

Ordre de rendu recommande:

1. cartes posees au pli
2. cartes en vol
3. distribution atlas si besoin, selon la logique existante

### `ZonePli`

Responsabilite cible:

- cadre decoratif central uniquement
- plus aucun rendu de carte

Cette simplification permet de separer clairement:

- decor du centre (`ZonePli`)
- cartes du centre (`CoucheAnimation`)

## Flux de donnees

### Jeu d'une carte

1. `useControleurJeu` retire la carte de la main concernee.
2. `useAnimations.lancerAnimationJeuCarte(...)` cree une entree dans `cartesEnVol`.
3. quand l'animation se termine, `useAnimations`:
   - retire la carte de `cartesEnVol`
   - ajoute la carte correspondante dans `cartesPoseesAuPli`
   - appelle le callback de fin pour que `useControleurJeu` envoie l'evenement XState
4. `etatJeu.pliEnCours` est alors mis a jour comme aujourd'hui

Resultat attendu:

- la carte visible au centre reste celle de la couche d'animation
- `etatJeu.pliEnCours` continue de representer fidelement l'etat metier

### Reconstruction apres rerender

Au moindre rerender, resize ou resubscription:

- si `etatJeu.pliEnCours` contient des cartes et que `cartesPoseesAuPli` est incomplet ou vide
- alors `useAnimations` ou `useControleurJeu` doit pouvoir reconstituer les cartes posees depuis `pliEnCours`

La reconstruction doit utiliser les memes regles que le vol:

- position `POSITIONS_PLI[joueur]`
- variations de rotation et decalage via `variationCartePli`
- meme carte atlas

Objectif:

- ne jamais perdre visuellement le pli a cause d'un rerender

### Ramassage du pli

1. au moment du ramassage, `useAnimations` lit `cartesPoseesAuPli`
2. la phase 1 du ramassage part depuis ces cartes deja posees
3. a la fin du ramassage, `cartesPoseesAuPli` est vide
4. `etatJeu.pliEnCours` est deja vide cote machine, comme aujourd'hui

Resultat attendu:

- les cartes ramassees sont exactement celles qui etaient visibles au centre

## Modeles de donnees

Le type `CarteEnVol` reste la structure de vol existante.

Nouveau type recommande:

```ts
interface CartePoseeAuPli {
  id: string;
  joueur: PositionJoueur;
  carte: Carte;
  x: number;
  y: number;
  rotation: number;
  echelle: number;
  faceVisible: boolean;
}
```

Notes:

- `id` doit etre stable pour une meme carte jouee afin de faciliter le passage vol -> posee -> ramassage
- `x`, `y` et `rotation` doivent etre derives des memes calculs que l'arrivee de `CarteEnVol`
- `echelle` peut rester a `0.9`, coherent avec l'arrivee actuelle au pli

## Synchronisation recommandee

Deux approches etaient possibles:

### Approche 1 - `cartesPoseesAuPli` purement locale a `useAnimations`

Simple pour l'animation pure, mais fragile en cas de rerender complet.

### Approche 2 - cache local reconstruit depuis `etatJeu.pliEnCours`

Plus robuste:

- le metier reste dans `etatJeu.pliEnCours`
- le visuel est reconstruit sans repasser par `ZonePli`

Recommendation retenue: Approche 2.

Implementation attendue:

- `useControleurJeu` continue de posseder `etatJeu.pliEnCours`
- un effet ou une synchronisation explicite alimente `cartesPoseesAuPli` quand necessaire
- si une carte est deja en vol, elle ne doit pas etre dupliquee en carte posee

## Cas limites

### Callback de fin de vol

Le callback appele a la fin du vol doit rester ordonne correctement:

1. la carte devient visible comme carte posee
2. l'evenement metier est envoye
3. aucun trou visuel ne doit apparaitre

### Nouveau pli detecte depuis l'historique

Quand la machine vide deja `pliEnCours` mais que l'UI re-affiche temporairement le pli termine:

- la reconstruction des cartes posees doit utiliser le dernier pli visible
- le ramassage doit s'appuyer sur cette meme reconstruction

### Annulation / demontage

`annulerAnimations()` doit aussi:

- vider `cartesPoseesAuPli`
- annuler les retraits differes et timeouts lies au handoff visuel

## Impacts composants

### Fichiers principalement touches

- `apps/mobile/hooks/useAnimations.ts`
- `apps/mobile/hooks/useControleurJeu.ts`
- `apps/mobile/components/game/CoucheAnimation.tsx`
- `apps/mobile/components/game/ZonePli.tsx`

### Fichiers probablement inchanges ou peu touches

- `apps/mobile/components/game/CarteAnimee.tsx`
- `apps/mobile/components/game/Carte.tsx`
- logique metier `packages/game-logic/*`
- logique bot `packages/bot-engine/*`

## Strategie de tests

### Tests unitaires a ajouter ou adapter

#### `useAnimations.test.ts`

Verifier que:

- une carte qui termine son vol quitte `cartesEnVol`
- cette meme carte apparait dans `cartesPoseesAuPli`
- elle n'est retiree qu'au moment du ramassage ou de l'annulation

Verifier aussi que:

- le ramassage repart depuis `cartesPoseesAuPli`
- `cartesPoseesAuPli` est vide a la fin du ramassage

#### `CoucheAnimation.test.tsx`

Verifier que:

- la couche rend les cartes posees et les cartes en vol
- les cartes posees restent visibles quand aucun vol n'est actif

#### `ZonePli.test.tsx`

Verifier que:

- le cadre decoratif continue d'exister
- les cartes ne sont plus rendues par `ZonePli`

#### `useControleurJeuPli.test.ts`

Verifier que:

- `etatJeu.pliEnCours` reste correctement alimente
- l'envoi de l'evenement metier n'est pas casse par le nouveau flux visuel

## Verification finale

Minimum avant cloture:

- tests cibles mobile sur les composants et hooks du pli
- `pnpm --filter @belote/mobile typecheck`

Si le refactor touche d'autres rendus ou hooks du plateau:

- `pnpm turbo typecheck test`

Si validation visuelle web jugee necessaire:

- `pnpm --filter @belote/mobile test:e2e`

## Risques connus

- duplication temporaire si la reconstruction depuis `pliEnCours` ne filtre pas une carte encore en vol
- perte de carte visible si `cartesPoseesAuPli` n'est pas rehydrate apres un rerender
- regression de timing si le callback de fin de vol est declenche avant que la carte posee soit visible

## Critere de succes

Le refactor est considere reussi si:

- les cartes du pli ne passent plus par `ZonePli`
- la meme representation visuelle reste visible entre atterrissage et ramassage
- le clignotement a l'arrivee disparait
- le ramassage reutilise les cartes deja visibles au centre
- `etatJeu.pliEnCours` reste la verite metier sans nouvelle duplication de logique
