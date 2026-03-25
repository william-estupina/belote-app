# Tableau de score de fin de manche

**Date :** 2026-03-25

## Contexte

Le rendu actuel de `DialogueFinManche` affiche directement les points de manche puis le score total anime.

Ce comportement manque de mise en scene:

- la transition ne marque pas assez clairement la fin de manche
- le verdict metier (contrat rempli ou chute) n'est pas mis en avant
- le cas du capot n'a pas de traitement visuel dedie
- la lecture des points ajoutes au score total arrive sans vrai resume de la manche

Le besoin valide est:

- afficher d'abord uniquement `Fin de manche`
- enchainer automatiquement sans interaction utilisateur
- afficher ensuite un verdict principal selon l'issue de la manche
- montrer les points gagnes par chaque equipe avant le comptage du total
- jouer une animation sobre si un capot a eu lieu
- conserver l'animation finale d'ajout des points au score total

## Decision retenue

La solution retenue garde un seul composant `DialogueFinManche`, mais son rendu est pilote par une petite timeline d'etapes internes et par un resume de fin de manche explicite fourni par `useControleurJeu`.

Recommendation retenue:

- conserver l'architecture actuelle du dialogue pour limiter le diff
- enrichir l'etat UI mobile avec un objet `resumeFinManche`
- laisser la logique metier de verdict hors du composant visuel
- faire enchainer automatiquement les etapes du dialogue sans tap intermediaire

## Alternatives ecartees

### Option A - empiler des conditions et `setTimeout` dans le composant actuel

Avantages:

- rapide a brancher
- peu de fichiers modifies

Inconvenients:

- logique metier implicite dans l'UI
- timings difficiles a maintenir
- faible lisibilite des cas `chute` et `capot`

### Option B - decouper la fin de manche en plusieurs dialogues distincts

Avantages:

- structure tres explicite
- facile a lire par ecran

Inconvenients:

- surcout de complexite pour une sequence courte
- plus de transitions a synchroniser

### Option C - conserver un seul dialogue avec un resume de manche dedie

Avantages:

- correction ciblee et testable
- responsabilites plus nettes entre controleur et composant UI
- facilite l'ajout d'animations progressives sans heuristiques fragiles

Recommendation retenue: Option C.

## Architecture cible

### Resume de fin de manche

`useControleurJeu` expose un objet `resumeFinManche` destine uniquement a l'UI mobile.

Structure cible:

```ts
interface ResumeFinManche {
  verdict: "contrat-rempli" | "dedans-nous" | "dedans-eux";
  messageVerdict: "Contrat rempli !" | "Vous etes dedans" | "Ils sont dedans";
  equipePreneur: "equipe1" | "equipe2";
  equipeGagnanteManche: "equipe1" | "equipe2" | null;
  estContratRempli: boolean;
  estChute: boolean;
  estCapot: boolean;
  equipeCapot: "equipe1" | "equipe2" | null;
  scoreAvantEquipe1: number;
  scoreAvantEquipe2: number;
  scoreMancheEquipe1: number;
  scoreMancheEquipe2: number;
  scoreApresEquipe1: number;
  scoreApresEquipe2: number;
}
```

Regles:

- `verdict` et `messageVerdict` sont calcules dans le controleur, pas dans le composant
- `scoreAvantEquipe1` et `scoreAvantEquipe2` sont derives des scores cumules moins les points de la manche
- `equipeCapot` vaut l'equipe qui realise le capot, sinon `null`
- `equipeGagnanteManche` peut etre utile pour le style visuel des lignes de points

### `useControleurJeu.ts`

Nouveaux champs dans `EtatJeu`:

- `resumeFinManche: ResumeFinManche | null`

Comportement attendu:

- `resumeFinManche` est alimente quand l'etat machine entre dans `scoresManche`
- la construction repose sur les donnees deja disponibles: `indexPreneur`, `scoreMancheEquipe1`, `scoreMancheEquipe2`, scores cumules
- la determination de `estChute` et `estCapot` doit etre explicite cote mobile, sans faire reposer l'UI sur des comparaisons implicites de texte ou de styles
- le resume est remis a `null` des que la manche suivante redemarre

### `DialogueFinManche.tsx`

Le composant garde son role de popup animee, mais son rendu devient sequentiel.

Etapes recommandees:

1. `intro`
   - affiche uniquement `Fin de manche`
2. `verdict`
   - revele `Contrat rempli !`, `Vous etes dedans` ou `Ils sont dedans`
3. `details`
   - revele `Vous +X` et `Adversaires +Y`
4. `capot`
   - joue une animation breve et sobre si `estCapot` est vrai
5. `total`
   - revele le bloc `Score total`
   - anime `scoreAvant -> scoreApres` pour chaque equipe
6. `action`
   - revele le bouton `Continuer`

Contraintes:

- aucun tap intermediaire pour avancer
- delais courts et reguliers, sans effet demonstratif
- le bouton `Continuer` n'apparait qu'apres la fin du comptage total
- si `estCapot` est faux, l'etape `capot` est sautee sans trou visible

## Comportement visuel

### Verdict

Ordre des messages:

- toujours commencer par `Fin de manche`
- afficher ensuite un seul verdict principal

Verdicts:

- si l'equipe preneuse remplit: `Contrat rempli !`
- si l'equipe du joueur humain prend et chute: `Vous etes dedans`
- si l'equipe adverse prend et chute: `Ils sont dedans`

### Details de points

Le dialogue montre ensuite les points de manche ajoutes au total:

- `Vous +scoreMancheEquipe1`
- `Adversaires +scoreMancheEquipe2`

Le design conserve une mise en valeur discrete de l'equipe gagnante de la manche, mais sans voler la priorite au verdict principal.

### Animation capot

Le capot doit rester sobre.

Recommendation:

- ajouter un halo ou un bandeau lumineux bref sur la ligne de l'equipe qui capote
- duree courte
- pas de rebond excessif
- pas d'effet celebratoire bruyant

Le capot doit etre compris comme une issue speciale, pas comme une animation de victoire arcade.

### Score total

Le bloc `Score total` reste proche du comportement actuel:

- affichage des anciens scores au debut du comptage
- animation numerique jusqu'aux nouveaux scores
- accent lumineux discret pendant la progression des compteurs

## Timings cibles

Les valeurs exactes pourront etre ajustees a l'implementation, mais la sequence visee est:

- `Fin de manche` visible seule pendant environ 300 a 450 ms
- verdict visible pendant environ 450 a 700 ms avant les details
- details de points visibles avant le total pendant environ 400 a 600 ms
- animation `capot` optionnelle inseree dans la meme dynamique, sur environ 500 ms
- comptage du score total proche du timing actuel

Le ressenti doit etre fluide et rapide, pas ceremoniel.

## Strategie de tests

### `apps/mobile/__tests__/DialogueFinManche.test.tsx` ou fichier existant equivalent

Verifier que:

- le premier rendu visible montre seulement `Fin de manche`
- le verdict apparait ensuite automatiquement selon `resumeFinManche`
- les lignes `Vous +X` et `Adversaires +Y` apparaissent avant le bloc total
- le bloc total anime les scores depuis `scoreAvant` vers `scoreApres`
- le bouton `Continuer` n'apparait qu'a la fin de la sequence
- le cas `estCapot` active bien le rendu dedie

### `apps/mobile/__tests__/useControleurJeu*.test.ts`

Verifier que:

- le controleur produit le bon `messageVerdict` pour les cas contrat rempli, dedans nous, dedans eux
- les scores avant et apres manche sont coherents
- `resumeFinManche` est reinitialise lors du passage a la manche suivante

## Fichiers impactes

- `apps/mobile/hooks/useControleurJeu.ts`
- `apps/mobile/components/game/DialogueFinManche.tsx`
- tests mobile associes au dialogue ou au controleur

Si un helper de mapping devient necessaire pour garder `useControleurJeu` lisible, il peut etre extrait dans un module dedie au resume de fin de manche cote mobile.

## Hors scope

- refonte visuelle du tableau de score permanent en haut du plateau
- changement du scoring metier dans `game-logic`
- ajout d'effets sonores
- animation celebratoire complexe pour le capot

## Critere de succes

La correction est reussie si:

- la fin de manche se lit en plusieurs temps clairs sans interaction utilisateur
- le verdict principal est compris avant le comptage du total
- les points ajoutes par equipe sont visibles avant l'animation du score cumule
- le capot est signale par un effet dedie, sobre et lisible
- la logique metier reste hors du composant UI
