# Retournement fluide de la carte d'atout

## Contexte

Depuis l'unification du rendu de distribution autour de Skia/Atlas, le moment ou la carte d'atout est retournee pendant la donne parait en retrait.

La distribution principale est devenue plus continue et plus propre, alors que la carte d'atout reste animee a part dans `CarteRevelation` avec une choregraphie plus marquee :

- un soulevement assez visible ;
- un flip en trois temps un peu demonstratif ;
- une sensation de decalage avec le reste de la donne.

Le besoin valide avec l'utilisateur est la direction **B fluide** :

- rendre le retournement plus naturel ;
- integrer le flip dans le deplacement ;
- rester court et lisible ;
- ne pas ralentir la donne ni donner un effet trop theatral.

## Decision retenue

La correction reste locale a la couche UI mobile existante.

On garde :

- `CarteRevelation` comme point d'entree pour la revelation et le retour inverse ;
- l'orchestration actuelle dans `PlateauJeu` et `useControleurJeu` ;
- les callbacks `onRevelationTerminee` et `onRetourCarteRetourneeTerminee` ;
- la reserve centrale telle qu'elle est deja stabilisee contre le clignotement.

On ajuste seulement la choregraphie visuelle de `CarteRevelation` :

- soulevement plus faible ;
- translation plus continue du paquet vers la zone d'atout ;
- flip centre au milieu du trajet ;
- rotation globale plus discrete ;
- variation d'echelle et d'ombre plus subtile ;
- arrivee presque a plat, sans effet de pose demonstratif.

Cette approche est retenue car elle est :

- minimale ;
- sure ;
- testable ;
- coherente avec le langage visuel deja retenu pour la donne atlas.

## Alternatives ecartees

### Option A - garder l'architecture actuelle et pousser une animation plus cinematique

Avantages :

- implementation locale ;
- rendu plus spectaculaire.

Inconvenients :

- risque de casser le rythme de la distribution ;
- effet trop demonstratif par rapport a la demande ;
- contraste encore plus fort avec la donne atlas.

### Option B - recalibrer `CarteRevelation` vers une animation fluide et discrete

Avantages :

- repond directement au choix utilisateur ;
- ne change pas le pipeline metier ;
- limite le risque de regression ;
- permet de reutiliser le meme langage visuel pour l'animation inverse.

Inconvenients :

- la carte retournee reste encore hors du pipeline atlas unifie ;
- le gain visuel depend d'un bon calibrage des timings et interpolations.

Recommendation retenue : Option B.

### Option C - integrer des maintenant la carte retournee dans la scene Skia/Atlas unifiee

Avantages :

- coherence maximale de rendu ;
- base plus propre pour des raffinements futurs.

Inconvenients :

- portee nettement plus large ;
- besoin de revoir le pipeline de revelation et de redistribution ;
- plus de risques sur les etats transitoires et les callbacks de fin.

## Architecture cible

### `apps/mobile/components/game/CarteRevelation.tsx`

- recalibrer les trois phases pour obtenir un trajet plus continu ;
- reduire le soulevement vertical ;
- rapprocher temporellement le flip du coeur du deplacement ;
- adoucir la rotation du conteneur ;
- limiter l'effet de scale a une respiration legere ;
- harmoniser les opacites face/dos pour eviter l'impression de swap abrupt.

### `apps/mobile/constants/animations-visuelles.ts`

- introduire des constantes nommees pour la revelation fluide de la carte d'atout si cela clarifie les timings ;
- garder des durees coherentes avec les animations majeures deja accelerees puis ralenties dans l'application.

### `apps/mobile/components/game/PlateauJeu.tsx`

- conserver l'API actuelle de `CarteRevelation` ;
- ne pas modifier le flux de rendu entre reserve centrale, revelation et redistribution.

## Strategie de tests

Tester surtout la continuite du flux et la stabilite du rendu, pas chaque interpolation visuelle.

### `apps/mobile/__tests__/PlateauJeu.test.tsx`

- conserver le test qui garantit que la carte retournee est deja presente dans la reserve pendant la revelation ;
- verifier que l'integration de `CarteRevelation` ne remet pas ce garde-fou en cause.

### Tests cibles additionnels

Si necessaire, ajouter un test leger qui fige la configuration de `CarteRevelation` sur les points suivants :

- l'animation inverse reste supportee ;
- la completion continue a appeler le callback attendu ;
- les nouvelles durees ou constantes sont bien centralisees.

Le design n'impose pas de test sur les valeurs exactes de chaque interpolation si cela rend les tests trop fragiles.

## Criteres de succes

La correction est reussie si :

- la carte d'atout semble glisser puis se retourner dans un seul geste ;
- le mouvement parait plus naturel que la version actuelle ;
- la duree totale reste courte et ne casse pas le tempo de la donne ;
- le retour inverse pendant la redistribution reste coherent ;
- l'entree en encheres et le rappel de redistribution restent synchronises ;
- les tests mobiles cibles passent.

## Hors scope

- refonte immediate de la revelation vers un rendu 100% Skia/Atlas ;
- ajout d'effets 3D lourds ou d'une mise en scene cinematographique ;
- modification de la logique metier de distribution ou d'encheres ;
- retouche globale des autres animations de cartes.
