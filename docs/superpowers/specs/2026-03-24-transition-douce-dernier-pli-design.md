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

La correction reste entierement cote UI mobile.

- `PlateauJeu` continue d'utiliser l'historique des plis, mais affiche `DernierPli` aussi pendant `finPli`
- `DernierPli` gere localement une transition entre l'ancien pli et le nouveau
- la transition retenue est une version douce:
  - ancien pli legerement voile et tres legerement translate vers le haut
  - nouveau pli qui apparait avec un fondu et un petit glissement vertical
  - accent lumineux bref sur la couche entrante

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

Recommendation retenue: Option C.

## Architecture cible

### `PlateauJeu.tsx`

- afficher `DernierPli` en phase `jeu` et `finPli`
- continuer a fournir le dernier pli metier via `historiquePlis[historiquePlis.length - 1]`

### `DernierPli.tsx`

- memoriser le pli actuellement affiche
- detecter un changement de signature du pli recu en props
- pendant la transition:
  - conserver une couche sortante
  - rendre une couche entrante au-dessus
  - lancer une animation douce
- quand l'animation se termine:
  - supprimer la couche sortante
  - garder uniquement le nouveau pli

La verite metier reste la prop `dernierPli`. Le composant ne cree qu'un cache visuel temporaire pour la transition.

## Comportement de transition

Sequence cible:

1. l'ancien dernier pli reste visible pendant `finPli`
2. quand un nouveau pli apparait dans `historiquePlis`, `DernierPli` garde temporairement l'ancien en couche sortante
3. le nouveau pli entre avec:
   - opacite 0 -> 1
   - translation verticale legere -> 0
   - echelle 0.97 -> 1
4. l'ancien pli sort avec:
   - opacite 1 -> 0.4
   - translation verticale 0 -> -6
   - echelle 1 -> 0.97
5. une lueur breve accompagne l'arrivee

Contraintes:

- animation assez courte pour ne pas ralentir le rythme du jeu
- pas de rotation 3D, pas d'effet tape-a-l'oeil
- lisibilite des cartes et du gagnant preservee pendant tout le passage

## Strategie de tests

### `apps/mobile/__tests__/dernier-pli.test.tsx`

Verifier que:

- le composant affiche le contenu compact habituel
- quand la prop `dernierPli` change, une couche sortante est conservee temporairement
- la couche entrante apparait en meme temps
- a la fin de l'animation, seule la nouvelle couche reste

### `apps/mobile/__tests__/PlateauJeu.test` ou test de condition indirecte

Pour cette correction minimale, il suffit de verifier que la condition d'affichage accepte `finPli`, soit par test cible si un test existe deja, soit via un helper simple si l'on extrait la condition.

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
