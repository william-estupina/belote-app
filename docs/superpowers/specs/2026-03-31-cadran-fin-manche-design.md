# Cadran emotionnel de fin de manche

**Date :** 2026-03-31

## Contexte

Le dialogue de fin de manche affiche aujourd'hui un verdict textuel simple (`Contrat rempli !`, `Vous etes dedans`, `Ils sont dedans`) puis, plus bas, un bloc `Capot` eventuel.

Le besoin valide est de remplacer cette ligne de verdict par un cadran emotionnel place juste sous `Fin de manche`, afin que l'etat de la manche soit compris visuellement avant la lecture du detail des points.

## Decision retenue

Le rendu garde l'architecture actuelle de `DialogueFinManche`, mais :

- le verdict principal devient un cadran anime unique juste sous le titre
- ce cadran porte a la fois le texte principal et l'accent visuel
- le cas `capot` n'affiche plus un bloc separe plus bas : il reutilise le meme cadran avec une intensite plus forte
- le cadran emploie une echelle emotionnelle a 6 niveaux, du point de vue du joueur humain

## Echelle emotionnelle validee

### Victoires

- victoire normale : chaleur legere
- `Ils sont dedans` : chaleur plus celebratoire
- `Capot` : celebration maximale

### Defaites

- defaite normale : bleu glace leger
- `Vous etes dedans` : bleu plus froid et plus sec
- `Capot` : bleu glacial maximal

## Regles de texte

- ne jamais afficher `Capot adverse`
- afficher simplement `Capot` quand un capot a eu lieu, quel que soit le camp
- conserver les libelles metier existants pour les cas non-capot :
  - `Contrat rempli !`
  - `Vous etes dedans`
  - `Ils sont dedans`
- pour une defaite normale sans chute ni capot, le cadran affiche `Defaite`

## Architecture cible

`DialogueFinManche.tsx` reste responsable de la timeline visuelle, mais calcule une configuration de cadran purement UI a partir de `resumeFinManche`.

Cette configuration doit definir :

- le titre du cadran
- le sous-texte d'ambiance
- la famille visuelle (`chaud` ou `froid`)
- l'intensite (`leger`, `fort`, `max`)
- les accents graphiques a jouer (`halo`, `traits`, `etoiles`, `cristaux`)
- la couleur du surlignage du score total et du bouton

La logique metier reste hors du composant :

- `resumeFinManche` continue de porter `verdict`, `estChute`, `estCapot`, `equipeCapot`
- le composant ne deduit pas les regles de belote, il ne mappe que ces donnees vers un style

## Comportement visuel

Sequence conservee :

1. `Fin de manche`
2. apparition du cadran emotionnel
3. apparition des points de manche
4. apparition du score total et comptage anime
5. apparition du bouton `Continuer`

Details :

- le cadran remplace completement l'ancienne ligne de verdict
- il n'y a plus de bloc `Capot` sous les points
- l'accent visuel doit rester sobre, avec quelques particules ou halos, pas un feu d'artifice bruyant
- l'equipe gagnante de la manche reste mise en avant dans les points et dans le surlignage du score total

## Strategie de tests

Verifier au minimum :

- le cadran apparait a la place de l'ancien verdict
- le bloc `Capot` separe n'est plus rendu
- une defaite normale affiche `Defaite`
- un capot affiche toujours `Capot`
- les cas chaud et froid changent bien les couleurs et les accents exposes par le rendu

## Fichiers impactes

- `apps/mobile/components/game/DialogueFinManche.tsx`
- `apps/mobile/__tests__/DialogueFinManche.test.tsx`
- eventuellement `apps/mobile/constants/animations-visuelles.ts` si le cadran demande des timings dedies
