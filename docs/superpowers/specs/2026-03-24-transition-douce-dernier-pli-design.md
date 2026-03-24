# Transition douce du dernier pli

## Contexte

Le widget `DernierPli` disparait actuellement pendant `finPli` car `PlateauJeu` ne l'affiche qu'en phase `jeu`.

Ce trou visuel casse la lecture du plateau:

- le joueur perd le contexte du dernier pli au moment du ramassage
- le passage vers le pli suivant semble abrupt
- l'historique compact ne joue pas son role de repere continu

Le besoin valide est:

- garder le dernier pli visible pendant le ramassage
- ne remplacer l'ancien apercu que lorsqu'un nouveau dernier pli existe
- effectuer une transition douce et lisible entre les deux apercus

## Decision retenue

La correction reste cote UI mobile, mais le timing de transition n'est plus pilote uniquement par `DernierPli`.

- `PlateauJeu` affiche toujours le widget pendant `jeu` et `finPli`
- `useControleurJeu` garde un `dernierPliVisible` dedie a l'UI
- le widget ne bascule vers le nouveau pli qu'au moment exact ou le ramassage commence
- la transition se termine au meme moment que la fin du ramassage
- la version retenue est `un peu vivante`:
  - ancien pli stable jusqu'au demarrage du ramassage
  - micro glissement vertical du nouveau pli
  - fondu doux entre les deux couches
  - aucune rotation 3D ni effet demonstratif

## Alternatives ecartees

### Option A - ne changer que la condition d'affichage dans `PlateauJeu`

Avantages:

- correction minimale
- quasiment aucun risque technique

Inconvenients:

- pas de transition entre deux derniers plis
- effet percu comme abrupt au changement de contenu

### Option B - stocker un `dernierPliVisible` dedie dans `useControleurJeu`

Avantages:

- maitrise centrale du cycle de vie du widget
- possible si les besoins deviennent plus complexes

Inconvenients:

- etat UI supplementaire dans un hook deja dense
- correction trop lourde pour le besoin actuel

### Option C - corriger l'affichage dans `PlateauJeu` et animer le changement dans `DernierPli`

Avantages:

- supprime le trou visuel pendant `finPli`
- garde la logique de transition pres du composant concerne
- correction minimale, sure et testable

### Option D - piloter la transition depuis le ramassage reel

Avantages:

- synchro exacte entre depart des cartes et depart du widget
- synchro exacte entre fin du ramassage et fin de transition
- permet de garder l'ancien pli strictement immobile tant que le ramassage n'a pas commence

Inconvenients:

- petit etat UI supplementaire dans `useControleurJeu`

Recommendation retenue: Option D.

## Architecture cible

### `PlateauJeu.tsx`

- afficher `DernierPli` en phase `jeu` et `finPli`
- fournir au composant:
  - `dernierPliVisible`
  - `precedentDernierPliVisible`
  - `transitionDernierPliActive`
  - `dureeTransitionDernierPliMs`
  - `cleTransitionDernierPli`

### `useControleurJeu.ts`

Nouveaux champs UI:

- `dernierPliVisible`
- `precedentDernierPliVisible`
- `transitionDernierPliActive`
- `dureeTransitionDernierPliMs`
- `cleTransitionDernierPli`

Regle cle:

- quand `historiquePlis` recoit un nouveau pli, on ne remplace pas encore le widget
- au `onDebutRamassage`, on fait seulement alors basculer le widget vers le nouveau pli
- au `onTerminee` du ramassage, on termine la transition et on retire la couche sortante

### `DernierPli.tsx`

- ne deduit plus seul le bon moment de transition
- anime seulement l'etat qu'on lui donne
- joue une transition courte et legere sur toute la duree du ramassage

Le composant devient un rendu anime pilote par le controleur.

## Comportement de transition

Sequence cible:

1. l'ancien dernier pli reste visible pendant `finPli`
2. l'historique peut deja contenir le nouveau pli sans que le widget ne bouge encore
3. au debut reel du ramassage, `useControleurJeu` active la transition
4. le nouveau pli entre avec:
   - opacite 0 -> 1
   - translation verticale tres legere (environ 4px) -> 0
   - echelle 0.99 -> 1
5. l'ancien pli sort avec:
   - opacite 1 -> 0.72
   - translation verticale 0 -> -2
6. a la fin du ramassage, la couche sortante est retiree

Contraintes:

- animation douce sur toute la duree reelle du ramassage
- pas de rotation 3D, pas d'effet tape-a-l'oeil
- lisibilite des cartes et du gagnant preservee pendant tout le passage

## Strategie de tests

### `apps/mobile/__tests__/dernier-pli.test.tsx`

Verifier que:

- le composant affiche le contenu compact habituel
- si le nouveau pli existe mais que `transitionDernierPliActive` est faux, l'ancien peut rester visible
- quand `transitionDernierPliActive` devient vrai, une couche sortante et une couche entrante coexistent
- a la fin de la transition pilotee, seule la nouvelle couche reste

### `apps/mobile/__tests__/useControleurJeuPli.test.ts`

Verifier que:

- le demarrage de la transition du dernier pli n'arrive qu'au debut du ramassage
- la transition se termine a la fin du ramassage

## Verification finale

Minimum:

- tests cibles sur `DernierPli`
- typecheck mobile

Optionnel si le diff deborde:

- suite mobile plus large

## Critere de succes

La correction est reussie si:

- le widget `DernierPli` ne disparait plus pendant le ramassage
- l'ancien dernier pli reste visible jusqu'a l'arrivee du nouveau
- le passage entre les deux apercus est doux et lisible
- aucune logique metier de `game-logic` ou `bot-engine` n'est impactee
