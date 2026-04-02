# Design - Distribution atlas continue jusqu'a main jouable

## Contexte

Le rendu actuel de la distribution melange encore plusieurs moteurs visuels :

- `CanvasAdversaires` garde les mains adverses en atlas Skia
- `DistributionCanvasSud` dessine temporairement les cartes sud en atlas Skia
- `MainJoueur` reprend ensuite le rendu sud via des composants React Native
- `ReserveCentrale` et `CarteRevelation` couvrent encore une partie de la narration de distribution hors du pipeline atlas unifie

Le resultat est deja meilleur qu'au debut du projet, mais il reste une couture structurelle : la main sud change de moteur visuel avant le moment ou elle devient jouable. Cette couture complique aussi le raisonnement sur les timings web, iOS et Android.

## Objectif

Obtenir un pipeline visuel unique pour **toute** la sequence de distribution :

1. distribution initiale
2. revelation de la carte retournee
3. attente des encheres
4. redistribution si tout le monde passe
5. distribution restante apres prise
6. tri final de la main sud
7. handoff unique vers `MainJoueur` exactement quand la main devient jouable

## Non-objectifs

- Rendre les cartes jouables dans Skia pendant la phase de jeu
- Refaire la logique metier de distribution ou d'encheres
- Modifier les animations de jeu de carte et de ramassage de pli, sauf si une API partagee doit etre nettoyee

## Probleme a resoudre

Le probleme n'est pas seulement "faire voler les cartes en atlas". Il faut aussi garantir :

- une seule source de verite visuelle pendant toute la sequence de distribution
- aucune apparition intermediaire de `MainJoueur` avant le handoff final
- une geometrie finale strictement identique entre atlas et React Native
- un critere de sortie unique pour declarer "la cinematique de distribution est terminee"

Sans cela, on remplace juste un clignotement par un autre.

## Decision de design

### 1. Deux modes de rendu explicites

Le plateau doit raisonner avec deux modes exclusifs :

- `cinematique-distribution` : tout le visible lie a la distribution appartient a Skia atlas
- `jeu-interactif` : la main sud appartient a `MainJoueur` et les interactions React Native sont actives

Pendant `cinematique-distribution`, `MainJoueur` ne porte aucune responsabilite visuelle. Il peut etre non rendu, ou prechauffe hors champ, mais il ne doit pas participer au film.

### 2. Un handoff unique et non anime

Le handoff ne se fait pas "quand huit cartes existent dans l'etat". Il se fait quand ces conditions sont vraies ensemble :

- la distribution visible est totalement terminee
- la main sud est deja dans son ordre final et sa position finale a l'ecran
- aucun mouvement supplementaire n'est necessaire avant l'interaction

Le handoff n'est donc pas une nouvelle animation. C'est un switch de surface de rendu sur une geometrie strictement identique :

- Skia affiche la main sud dans sa position finale triee
- React Native prepare la meme main, deja triee et deja placee
- un seul frame bascule la visibilite de l'une vers l'autre
- l'interaction n'est activee qu'apres cette bascule

### 3. Scene atlas unifiee

Le repo contient deja [`CanvasCartesUnifie`](/home/westupina/projects/belote/apps/mobile/components/game/CanvasCartesUnifie.tsx), base utile pour aller vers la cible.

La recommandation est d'en faire la scene atlas unique de distribution, en couvrant :

- les 8 slots sud
- les 24 slots adversaires
- les cartes transitoires du centre (paquet, carte retournee, carte glissee vers le preneur)

On ne cherche pas forcement un unique draw call absolu a tout prix, mais une **unique scene atlas** gouvernee par un meme contrat. Si une contrainte technique impose deux groupes internes de sprites, ils doivent rester derriere la meme orchestration et le meme cycle de vie.

### 4. Orchestrateur unique de distribution

`useAnimationsDistribution` devient le moteur principal du mode `cinematique-distribution`.

Responsabilites cibles :

- allouer et remplir les slots atlas de la scene de distribution
- piloter les progressions et trajectoires de toutes les cartes visibles pendant la distribution
- conserver les cartes sud visibles dans l'atlas jusqu'au handoff final
- piloter les etats persistants du centre pendant revelation, attente d'encheres et redistribution
- exposer un critere unique `distributionCinematiqueTerminee`
- fournir les donnees finales necessaires au handoff vers `MainJoueur`

Responsabilites qui doivent rester hors du hook :

- logique metier de belote
- decision des bots
- composants React Native interactifs de la phase de jeu

## Architecture cible

### Etat expose par le controleur

`useControleurJeu` doit exposer un contrat explicite plutot qu'une accumulation de drapeaux disperses :

```ts
type ModeRenduCartes = "cinematique-distribution" | "jeu-interactif";

type PhaseDistributionCinematique =
  | "distribution-initiale"
  | "revelation-carte"
  | "attente-encheres"
  | "redistribution"
  | "distribution-restante"
  | "tri-final-sud"
  | "pre-handoff"
  | "terminee";
```

`triMainDiffere` peut rester transitoirement pendant la migration, mais la cible est qu'il ne soit plus le mecanisme central du handoff.

### Geometrie partagee

La geometrie finale de la main sud doit venir d'une seule famille de fonctions :

- [`calculerDispositionMainJoueur`](/home/westupina/projects/belote/apps/mobile/components/game/mainJoueurDisposition.ts)
- [`calculerPointAncrageCarteMainJoueurNormalisee`](/home/westupina/projects/belote/apps/mobile/components/game/mainJoueurDisposition.ts)

L'atlas et `MainJoueur` ne doivent pas recalculer chacun leur interpretation finale. Ils doivent consommer les memes positions et les memes angles.

### Surface de rendu

La scene visible pendant la distribution doit etre portee par `CoucheAnimation`.

Evolution cible :

- `CoucheAnimation` ne se limite plus a "cartes en vol"
- `CoucheAnimation` heberge la scene atlas complete tant que le mode est `cinematique-distribution`
- `MainJoueur` n'est rendu comme composant principal que quand le mode devient `jeu-interactif`

### Centre de table

Pour tenir la promesse "tout en skia atlas jusqu'a la fin de la distribution", la reserve centrale et la carte retournee ne doivent plus etre percuees comme des exceptions hors pipeline.

La solution recommandee est :

- representer paquet central, carte retournee et eventuel glissement vers le preneur comme des slots atlas de la scene de distribution
- conserver les composants React existants (`ReserveCentrale`, `CarteRevelation`) uniquement comme filet de securite ou comme etape intermediaire de migration

## Handoff final

Le handoff final doit suivre cet ordre strict :

1. calcul de la main sud finale triee
2. application de cette geometrie finale dans l'atlas
3. preparation de `MainJoueur` avec exactement les memes cartes et la meme disposition
4. frame de bascule de visibilite
5. activation des interactions React Native

Ce qui est interdit :

- monter `MainJoueur` apres avoir demonte l'atlas
- lancer un fondu visible entre atlas et React Native
- rendre la main React Native interactive pendant que Skia est encore visible
- recalculer la disposition finale dans deux branches differentes

## Fichiers a faire evoluer

### Fichiers principaux

- [`apps/mobile/hooks/useAnimationsDistribution.ts`](/home/westupina/projects/belote/apps/mobile/hooks/useAnimationsDistribution.ts)
  Role cible : orchestrateur atlas unique de la distribution

- [`apps/mobile/components/game/CoucheAnimation.tsx`](/home/westupina/projects/belote/apps/mobile/components/game/CoucheAnimation.tsx)
  Role cible : surface de rendu de la scene atlas complete

- [`apps/mobile/components/game/CanvasCartesUnifie.tsx`](/home/westupina/projects/belote/apps/mobile/components/game/CanvasCartesUnifie.tsx)
  Role cible : base de scene atlas persistante pour sud, adversaires et centre

- [`apps/mobile/hooks/useOrchestrationDistribution.ts`](/home/westupina/projects/belote/apps/mobile/hooks/useOrchestrationDistribution.ts)
  Role cible : traduire les phases metier en sous-phases cine et piloter le handoff unique

- [`apps/mobile/hooks/useControleurJeu.ts`](/home/westupina/projects/belote/apps/mobile/hooks/useControleurJeu.ts)
  Role cible : exposer un mode de rendu explicite et supprimer les mises a jour visuelles concurrentes

- [`apps/mobile/components/game/MainJoueur.tsx`](/home/westupina/projects/belote/apps/mobile/components/game/MainJoueur.tsx)
  Role cible : rendu interactif uniquement, plus aucun role narratif dans la distribution

### Fichiers potentiellement introduits

- `apps/mobile/hooks/scene-distribution-atlas.ts`
  Helpers purs pour decrire les slots de la scene atlas

- `apps/mobile/hooks/handoff-main-joueur.ts`
  Contrat explicite de preparation puis bascule RN si `useAnimationsDistribution.ts` devient trop gros

Le choix exact depend de la taille finale du hook. La contrainte est d'eviter un monolithe difficile a tester.

## Strategie de migration

### Etape 1

Figer le contrat attendu avec des tests :

- pas de rendu principal React Native pour la main sud pendant la cinematique
- handoff unique seulement quand la geometrie finale est atteinte
- meme geometrie finale entre atlas et `MainJoueur`

### Etape 2

Unifier la scene atlas autour de `CanvasCartesUnifie` et des slots persistants sud/adversaires.

### Etape 3

Faire entrer le centre de table dans le meme pipeline atlas.

### Etape 4

Remplacer le handoff actuel par le contrat unique `pre-handoff -> jeu-interactif`.

### Etape 5

Supprimer les drapeaux et chemins de rendu devenus redondants.

## Strategie de tests

### Tests unitaires et hooks

- etendre `useAnimationsDistribution.test.ts` pour couvrir les sous-phases cine
- ajouter des tests de geometrie finale partagee
- verifier que la main RN n'est pas utilisee comme surface principale avant le handoff

### Tests composants

- `CoucheAnimation.test.tsx` doit verifier la presence de la scene atlas complete pendant la distribution
- `PlateauJeu.test.tsx` doit verifier le basculement propre entre mode cine et mode interactif
- `MainJoueur.test.tsx` doit rester centre sur l'interaction, pas sur la distribution

### Tests integration

- etendre `useControleurJeuDistribution.test.ts` pour couvrir :
  - distribution initiale -> encheres
  - prise -> distribution restante
  - double passe -> redistribution -> nouvelle distribution
  - handoff final juste avant la premiere interaction possible

### Verification web

Une verification web ciblee est obligatoire, car c'est la plateforme la plus sensible aux ecarts de timing et de layout :

- aucune disparition d'une carte sud avant le handoff
- aucun saut de position entre la fin du tri atlas et `MainJoueur`
- aucun clignotement de la carte retournee pendant revelation et redistribution

## Risques et mitigations

### Hook trop gros

Risque :
`useAnimationsDistribution.ts` absorbe trop de responsabilites.

Mitigation :
extraire les helpers de scene et de handoff dans des modules purs, sans React.

### Regression web

Risque :
le handoff est propre en natif mais laisse un trou visuel sur le web.

Mitigation :
faire du web une cible de test explicite, pas un simple passage final.

### Multiplication des etats transitoires

Risque :
des callbacks ponctuels recreent des sous-etats implicites.

Mitigation :
formaliser les phases de la cinematique dans le controleur et dans le hook atlas.

## Resultat attendu

A la fin de cette evolution :

- toute la distribution visible est portee par Skia atlas
- la main sud reste en atlas jusqu'a sa position finale triee
- la reserve centrale et la carte retournee ne cassent plus le pipeline visuel
- `MainJoueur` n'apparait qu'au moment exact ou la main devient jouable
- le comportement est identique en perception sur web, iOS et Android
