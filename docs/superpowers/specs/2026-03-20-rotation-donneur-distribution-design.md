# Rotation du donneur et ancrage visuel de la distribution

**Contexte**

La machine de jeu fait deja tourner le donneur entre les manches et apres une redistribution. En revanche, l'animation de distribution mobile sert encore les joueurs dans un ordre fixe et le paquet reste ancre a une position centrale fixe, ce qui ne reflète pas le donneur courant.

**Objectif**

Faire en sorte que la distribution ressemble davantage a une vraie belote :

- l'ordre visuel de distribution suit le donneur courant ;
- le premier joueur servi est toujours le joueur situe juste apres le donneur dans le sens deja utilise par le projet ;
- le paquet visible et l'origine des cartes sont places pres du donneur ;
- le meme comportement s'applique aussi apres une redistribution.

**Portee**

Le changement reste localise a l'application mobile, avec un petit socle de calcul pur dedie a la distribution visuelle. La logique metier de rotation du donneur dans `packages/game-logic` n'est pas modifiee.

**Conception**

Un module pur dans `apps/mobile/hooks/distributionLayoutAtlas.ts` devient la source de verite pour :

- calculer le premier joueur servi a partir de `indexDonneur` ;
- construire l'ordre complet de distribution pour une donne ;
- fournir une origine de distribution proche du donneur, legerement ramenee vers le centre pour garder un rendu lisible ;
- continuer a fournir les cibles de fin de trajectoire deja utilisees par l'Atlas.

L'animation de distribution consomme ensuite ces helpers pour :

- parcourir les joueurs dans le bon ordre au lieu d'utiliser l'ordre fixe des positions ;
- calculer les trajectoires depuis une origine dependante du donneur ;
- garder les callbacks `onPaquetArrive` et le reste de l'orchestration inchanges.

Le controleur de jeu transmet `indexDonneur` a la distribution initiale et restante afin que l'animation et le paquet visible suivent la meme regle a chaque donne, y compris apres une redistribution.

Le composant `PaquetCentral` reutilise le meme calcul d'origine afin que le paquet affiche et l'origine des cartes racontent la meme histoire visuelle.

**Tests**

Des tests unitaires couvrent :

- le calcul du premier servi selon plusieurs donneurs ;
- l'ordre complet de distribution ;
- la variation de l'origine selon le donneur ;
- la coherence du positionnement du paquet pres du donneur.

Les tests existants de logique metier restent inchanges, car la rotation du donneur est deja couverte et correcte.

**Risques et garde-fous**

- Eviter toute divergence entre le paquet affiche et l'origine reelle des trajectoires en centralisant le calcul dans un helper pur partage.
- Eviter toute regression sur la donne restante apres prise en reutilisant la meme entree `indexDonneur` pour la distribution initiale et la distribution restante.
- Limiter la modification a la couche mobile pour ne pas destabiliser la machine metier ni les bots.
