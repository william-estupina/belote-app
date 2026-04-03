# Pose de la carte sud depuis son etat visuel reel

## Contexte

La pose de la carte du joueur sud vers le pli reste visuellement imparfaite.

Le correctif precedent a deja evite la reorganisation immediate de la main en gardant
l'emplacement vide pendant l'animation. En revanche, la carte animee ne reprend pas
encore exactement l'etat affiche dans l'eventail au moment du clic.

L'effet percu est le suivant :

- la carte disparait de sa vraie position dans la main
- une carte reapparait dans la couche d'animation avec un reset visuel
- elle part ensuite vers le tapis avec la bonne trajectoire generale

Le besoin valide avec l'utilisateur est precis :

- depart depuis la vraie carte en main
- conservation du meme angle que dans l'eventail
- conservation de la meme echelle apparente
- conservation de la trajectoire courbe actuelle jusqu'au pli

## Decision retenue

La correction reste strictement dans la couche UI mobile.

Option retenue : transmettre a l'animation de jeu un etat de depart complet pour la
carte sud, et non plus seulement une position approximative.

On garde :

- le masquage temporaire de la carte dans `MainJoueur`
- la trajectoire Bezier actuelle de `CarteAnimee`
- le cycle de vie actuel de `useControleurJeu` et `useAnimations`
- le comportement existant des bots

On ajuste uniquement :

- les donnees remontees par `MainJoueur` au clic
- le contrat entre `MainJoueur`, `useControleurJeu` et `useAnimations`
- les tests qui figent l'etat visuel de depart

Cette approche est retenue car elle est :

- minimale
- sure
- testable
- directement alignee avec le defaut visuel observe

## Alternatives ecartees

### Option A - ne transmettre que la position reelle de la carte

Avantages :

- changement limite
- peu de surface de modification

Inconvenients :

- ne corrige pas un reset potentiel de rotation ou d'echelle
- laisse subsister une rupture visuelle au decollage

### Option B - transmettre l'etat visuel complet de la carte

Avantages :

- supprime la rupture entre la carte en main et la carte en vol
- garde la courbe actuelle vers le pli
- reste localisee a la couche UI mobile

Inconvenients :

- demande une evolution de type et de tests

Recommendation retenue : Option B.

### Option C - ajouter une animation de sortie en deux temps

Avantages :

- rendu potentiellement plus riche

Inconvenients :

- complexite superieure
- risque de sur-animer une action tres frequente
- depasse le besoin de correction minimale

## Architecture cible

### `apps/mobile/components/game/MainJoueur.tsx`

- remplacer la remontee d'une simple `PositionProportionnelle` par un etat de depart
  complet compatible avec `PositionCarte`
- construire cet etat a partir des memes donnees que le rendu courant de la carte :
  centre de la carte, angle courant, echelle courante
- conserver le comportement actuel de masquage de la carte jouee sans reorganisation
  immediate de la main

### `apps/mobile/hooks/useControleurJeu.ts`

- faire evoluer `jouerCarte` pour recevoir cet etat de depart complet
- relayer cet etat tel quel a `animations.lancerAnimationJeuCarte`
- conserver l'ordre actuel :
  masquage de la carte, blocage de l'interaction, animation, retrait logique de la
  main a la fin, puis ajout au pli

### `apps/mobile/hooks/useAnimations.ts`

- faire evoluer `lancerAnimationJeuCarte` pour accepter un `depart` complet de type
  `PositionCarte`
- utiliser cet etat uniquement quand il est fourni, sinon garder le depart par defaut
  base sur `POSITIONS_MAINS` pour les autres joueurs
- conserver la meme arrivee au pli, la meme duree et le meme easing

### `apps/mobile/components/game/CarteAnimee.tsx`

- ne pas changer la courbe actuelle
- reutiliser sans adaptation le `depart` recu, afin que la premiere frame visible
  corresponde au visuel deja affiche dans la main

## Strategie de tests

### `apps/mobile/__tests__/MainJoueur.test.tsx`

- ajouter ou faire evoluer un test pour verifier que le callback de jeu de carte
  recoit bien un etat complet, incluant angle et echelle

### `apps/mobile/__tests__/useControleurJeuDistribution.test.ts`

- verifier que `jouerCarte` relaie cet etat complet a
  `mockLancerAnimationJeuCarte`
- conserver le test qui garantit que la carte reste dans la main jusqu'a la fin de
  l'animation

### `apps/mobile/__tests__/useAnimations.test.ts`

- verifier qu'un depart personnalise complet est conserve tel quel dans `cartesEnVol`
- verifier que l'absence de depart personnalise garde le comportement par defaut pour
  les autres joueurs

## Critere de succes

La correction est reussie si :

- la carte sud semble partir exactement de sa position visible dans l'eventail
- l'angle et l'echelle de depart ne sont plus reinitialises
- la courbe actuelle vers le pli est conservee
- aucun comportement des cartes bots n'est modifie
- les tests mobiles cibles passent
