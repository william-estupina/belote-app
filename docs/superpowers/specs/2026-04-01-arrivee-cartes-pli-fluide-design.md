# Arrivee plus fluide des cartes au pli

## Contexte

L'arrivee des cartes jouees sur le plateau est actuellement un peu seche.

Le mouvement reste lisible, mais il donne un effet de pose trop rapide:

- la carte quitte bien la main
- la destination au pli est claire
- la fin du mouvement manque un peu de douceur quand les quatre joueurs enchainent

Le besoin valide avec l'utilisateur est la direction **B**:

- ralentir un peu l'arrivee des cartes sur le pli
- rendre le mouvement plus fluide
- rester discret, sans effet demonstratif ni rupture de rythme

## Decision retenue

La correction reste strictement dans la couche UI mobile existante.

On garde:

- la trajectoire actuelle de `CarteAnimee`
- les positions de depart et d'arrivee existantes
- le cycle de vie actuel de `useAnimations`

On ajuste seulement trois leviers:

- une duree de vol un peu plus longue pour `ANIMATIONS.jeuCarte`
- une courbe d'easing plus douce pour les cartes jouees vers le pli
- un amorti final leger sur la pose, porte par un easing `back` tres discret

Cette approche est retenue car elle est:

- minimale
- sure
- testable
- coherente avec la demande "un peu plus lent et plus fluide"

## Alternatives ecartees

### Option A - allonger seulement la duree

Avantages:

- changement minime
- tres peu de risque

Inconvenients:

- l'arrivee peut paraitre lente sans paraitre plus fluide
- la pose reste encore abrupte

### Option B - allonger la duree et adoucir l'easing

Avantages:

- repond directement au ressenti valide avec l'utilisateur
- garde l'animation lisible
- ne modifie pas le cycle de rendu ni la logique du pli

Inconvenients:

- demande un ajustement de test supplementaire pour figer le comportement

Recommendation retenue: Option B, avec un amorti final leger.

### Option C - ajouter une animation de settle en deux temps

Avantages:

- rendu potentiellement encore plus vivant

Inconvenients:

- implementation plus complexe
- risque de sur-animer une action tres frequente
- risque de casser la lecture ou le timing global

## Architecture cible

### `apps/mobile/constants/layout.ts`

- augmenter legerement `ANIMATIONS.jeuCarte.duree`

### `apps/mobile/hooks/useAnimations.ts`

- donner explicitement un easing plus doux aux cartes jouees vers le pli
- basculer sur un easing avec amorti final pour la pose

### `apps/mobile/components/game/CarteAnimee.tsx`

- declarer un easing `out-back-soft`
- mapper ce profil vers un `Easing.back` tres leger pour amortir l'arrivee sans effet demonstratif

### `apps/mobile/__tests__/useAnimations.test.ts`

- ajouter un test qui fixe cette configuration

### `apps/mobile/__tests__/CarteAnimee.test.tsx`

- ajouter un test qui fixe le mapping du nouvel easing

## Strategie de tests

Tester au niveau du hook `useAnimations` que l'animation de jeu creee pour une carte posee:

- utilise la duree attendue
- utilise l'easing `out-back-soft`
- conserve les autres caracteristiques du vol actuel

Tester au niveau de `CarteAnimee` que:

- le profil `out-back-soft` s'appuie sur `Easing.back(0.85)`
- le timing continue a etre pilote via `withTiming`

## Critere de succes

La correction est reussie si:

- l'arrivee des cartes sur le pli parait un peu plus lente
- la pose finale parait legerement amortie
- aucun autre cycle d'animation n'est degrade
- les tests mobiles cibles passent
