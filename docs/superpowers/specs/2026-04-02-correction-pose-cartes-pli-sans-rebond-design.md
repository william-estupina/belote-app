# Correction de la pose des cartes au pli sans rebond

## Contexte

La pose des cartes jouees vers le pli a ete ralentie lors d'un ajustement recent.

Ce changement a introduit un effet de rebond final perceptible au moment ou la carte arrive sur sa position finale. Ce rebond nuit a la lecture et donne une sensation artificielle sur une action tres frequente.

Le besoin valide avec l'utilisateur est simple :

- ralentir encore un peu la pose des cartes
- supprimer le rebond final
- conserver une animation lisible et discrete

## Decision retenue

La correction reste strictement dans la couche UI mobile.

On ne change pas :

- la trajectoire Bezier actuelle
- les positions de depart et d'arrivee
- le cycle de vie de `useAnimations`

On ajuste uniquement :

- la duree de `ANIMATIONS.jeuCarte` pour ralentir legerement la pose
- l'easing des cartes jouees pour revenir a une deceleration propre sans overshoot

## Solution

### `apps/mobile/constants/layout.ts`

- augmenter legerement `ANIMATIONS.jeuCarte.duree`
- cible retenue : `420` ms

### `apps/mobile/hooks/useAnimations.ts`

- remplacer l'easing `out-back-soft` des cartes jouees par `out-cubic`

### Tests

- mettre a jour `apps/mobile/__tests__/useAnimations.test.ts` pour figer la nouvelle configuration
- retirer le test qui verrouillait explicitement l'easing avec rebond dans `apps/mobile/__tests__/CarteAnimee.test.tsx`

## Critere de succes

La correction est reussie si :

- les cartes jouees arrivent un peu plus lentement
- la pose finale ne depasse plus la position cible
- aucun autre type d'animation n'est modifie
- les tests mobiles cibles passent
