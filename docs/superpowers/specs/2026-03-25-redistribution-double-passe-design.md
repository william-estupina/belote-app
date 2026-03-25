# Redistribution double passe â€” jeton dealer et rappel des mains

**Date :** 2026-03-25

## Contexte

Quand les 4 joueurs passent au premier puis au deuxieme tour d'encheres, la machine met bien en place une redistribution. En revanche, le ressenti visuel est encore abrupt :

- le jeton dealer ne part pas assez tot vers le nouveau donneur
- les mains visibles disparaissent sans vraie impression de redistribution
- la nouvelle distribution repart directement sans "retour au paquet"

## Objectif

Ameliorer uniquement le cas de double passe pour que :

1. le jeton dealer parte vers le nouveau distributeur des le debut de la sequence
2. les cartes visibles dans les mains reviennent vers le paquet central en face cachee
3. la distribution initiale existante reparte ensuite normalement

## Hors scope

- les distributions normales de debut de manche
- la distribution restante apres une prise ou une annonce
- la logique metier XState de redistribution

## Approche retenue

Le controleur mobile orchestre une sequence UI specifique au moment ou `nombreRedistributions` augmente :

1. conserver temporairement les mains actuellement visibles
2. appliquer tout de suite le nouvel `indexDonneur` a l'etat UI pour faire partir le jeton dealer
3. lancer une animation de retour des cartes vers l'origine du paquet central
4. vider visuellement les mains une fois ce retour termine
5. relancer la distribution initiale existante avec les nouvelles mains du contexte XState

La machine `game-logic` ne change pas.

## Details de conception

### 1. Jeton dealer

Le composant `JetonDealer` anime deja les changements de `positionDonneur`. Il suffit donc de pousser le nouvel `indexDonneur` dans l'etat UI avant de relancer la distribution animee.

### 2. Animation de retour au paquet

Le hook `useAnimations` gagne une nouvelle animation dediee :

- entree : une liste de cartes a faire revenir au paquet, chacune avec une position de depart
- rendu : `CarteAnimee` existant, avec `faceVisible: false`
- sortie : callback unique appele a la fin du mouvement

Les cartes du joueur sud utilisent les positions calculees a partir de l'eventail visible. Les cartes adverses sont anonymes visuellement (dos de carte uniquement), donc seules leurs positions de depart et leur quantite comptent.

### 3. Orchestration du controleur

`useControleurJeu` detecte la redistribution comme aujourd'hui via `nombreRedistributions`, mais au lieu d'appeler immediatement `lancerDistributionAnimee`, il demarre une sequence intermediaire :

- construire les trajectoires de retour a partir de l'etat UI courant
- mettre `phaseUI` sur `distribution`
- conserver `mainJoueur` et `nbCartesAdversaires` le temps de l'animation
- mettre a jour `indexDonneur`
- lancer le rappel des mains
- a la fin, reinitialiser les mains visibles et appeler `lancerDistributionAnimee`

### 4. Tests

- etendre `useControleurJeuDistribution.test.ts` pour verifier que le dealer bascule immediatement vers le nouveau donneur et que le retour au paquet est declenche avant la nouvelle distribution
- etendre `useAnimations.test.ts` pour verifier la creation des cartes de retour au paquet et l'appel du callback de fin
