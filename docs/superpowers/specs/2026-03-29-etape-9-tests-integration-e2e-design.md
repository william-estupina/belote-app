# Etape 9 - tests d'integration et e2e Design

**Date :** 2026-03-29

## Contexte

L'application dispose deja d'une base de tests utile :

- tests unitaires metier solides dans `packages/game-logic` et `packages/bot-engine`
- plusieurs tests React Native Testing Library dans `apps/mobile/__tests__`
- une base Playwright web dans `apps/mobile/e2e`

En revanche, l'etape 9 n'est pas encore fermee car la couverture reste fragmentee :

- les tests d'integration ne valident pas encore de scenario complet autour de `useControleurJeu`
- les tests composants ne garantissent pas encore suffisamment les etats critiques visibles par le joueur
- les e2e web couvrent surtout la navigation initiale
- il n'existe pas encore de runner natif mobile pour verifier un vrai parcours utilisateur sur Android/iOS

## Objectif

Finaliser l'etape 9 avec une strategie de tests coherente sur quatre niveaux :

1. tests d'integration pour l'orchestration du jeu
2. tests composants pour les etats visibles critiques
3. tests e2e web responsives avec Playwright
4. tests e2e natifs avec Maestro

## Hors scope

- refonte de l'architecture du controleur de jeu
- remplacement de Playwright par un autre runner web
- migration des tests existants vers Detox
- couverture exhaustive de tous les cas metier deja testes dans `game-logic`
- mise en place CI complete de l'etape 10

## Approche retenue

L'etape 9 sera fermee avec un dispositif hybride :

- `React Native Testing Library` reste l'outil principal pour les tests d'integration et de composants Expo
- `Playwright` reste le runner e2e web pour la verification responsive desktop + mobile
- `Maestro` est ajoute comme runner e2e natif pour les flows Android/iOS les plus robustes

Cette approche preserve l'existant, limite le cout d'integration et colle au besoin reel :

- verification comportementale profonde dans la session JS via RNTL
- verification navigateur et responsive reel via Playwright
- verification native hors navigateur via Maestro

## Architecture de test

### 1. Integration autour de `useControleurJeu`

Le coeur de l'etape 9 repose sur `apps/mobile/hooks/useControleurJeu.ts`.

Les tests d'integration doivent couvrir des sequences completes et lisibles, en pilotant le hook plutot qu'en sur-maquettant l'UI :

- demarrage de partie et apparition des encheres
- prise ou annonce, puis distribution restante
- entree en phase de jeu avec tour humain et cartes jouables
- completion d'un pli puis mise a jour du dernier pli et des piles
- fin de manche avec affichage du resume
- redistribution apres double passe

Le but n'est pas de rejouer toute la logique metier deja couverte dans `game-logic`, mais de verifier que l'orchestration UI, les delais bots et les transitions visuelles restent coherents.

### 2. Tests composants cibles

Les tests composants doivent privilegier les composants qui rendent les etats critiques plutot que les composants purement decoratifs.

Priorites :

- `apps/mobile/components/game/PlateauJeu.tsx`
- `apps/mobile/components/game/PanneauEncheres.tsx`
- `apps/mobile/components/game/TableauScores.tsx`
- `apps/mobile/components/game/DialogueFinManche.tsx`
- `apps/mobile/components/game/DialogueFinPartie.tsx`

Les assertions viseront :

- la presence ou l'absence des controles d'encheres selon la phase
- la visibilite des scores et des resumes de manche
- l'affichage des elements indispensables sur petit et grand viewport
- la preservation des invariants utilisateur quand une animation ou une transition est en cours

### 3. E2E web responsive avec Playwright

Les specs Playwright existantes dans `apps/mobile/e2e` sont conservees et etendues.

Le socle cible devient :

- navigation accueil -> partie -> retour ecrans auxiliaires si necessaire
- verification qu'une partie demarre sans erreur JS
- verification qu'une phase d'encheres exploitable apparait
- verification qu'au moins une action joueur visible est possible sur web
- verification des elements critiques en mode desktop et mobile :
  - score visible
  - zone de jeu visible
  - controles d'encheres visibles quand requis

Les assertions resteront robustes et semantiques. On evitera les checks pixel-perfect fragiles.

### 4. E2E natifs avec Maestro

Un nouveau dossier `apps/mobile/maestro` contiendra les flows natifs.

Le runner natif doit couvrir des parcours simples, stables et orientes utilisateur :

- lancement de l'application
- ouverture des parametres
- demarrage d'une partie
- verification de l'ecran d'encheres
- interaction sur une action utilisateur simple si le contexte le permet

Les flows Maestro serviront surtout a confirmer que le build natif lance correctement l'application et que les parcours critiques ne cassent pas hors web.

## Organisation des fichiers

### Fichiers a modifier

- `apps/mobile/package.json`
- `apps/mobile/playwright.config.ts`
- `apps/mobile/e2e/navigation.spec.ts`
- `apps/mobile/e2e/distribution.spec.ts`
- `apps/mobile/__tests__/useControleurJeuDistribution.test.ts`
- `apps/mobile/__tests__/useControleurJeuPli.test.ts`

### Fichiers a ajouter

- `apps/mobile/e2e/partie-responsive.spec.ts`
- `apps/mobile/__tests__/PlateauJeu.integration.test.tsx`
- `apps/mobile/maestro/demarrer-partie.yaml`
- `apps/mobile/maestro/navigation-parametres.yaml`
- `apps/mobile/maestro/README.md`

Les noms exacts pourront legerement evoluer si un meilleur regroupement apparait lors de l'implementation, mais la separation par niveau de test doit rester nette.

## Strategie de donnees et stabilite

- reutiliser autant que possible les helpers et mocks deja presents dans les tests mobiles
- privilegier des assertions sur texte, `testID` et etats fonctionnels
- n'ajouter de nouveaux `testID` que pour les interactions e2e qui n'ont pas d'alternative fiable
- eviter les attentes arbitraires quand un signal de fin de transition existe deja

Pour Maestro, il faudra accepter une couverture plus coarse-grained que Playwright ou RNTL : le but est la fiabilite des parcours, pas l'inspection fine de l'arbre React Native.

## Verification prevue

- `pnpm --filter @belote/mobile test -- --runInBand`
- `pnpm --filter @belote/mobile test:e2e`
- commande Maestro dediee depuis `apps/mobile` pour executer les flows natifs
- si l'impact est transverse, `pnpm turbo typecheck test`

## Risques identifies

- fragilite de certains tests si les animations restent trop presentes dans les assertions
- ecart entre comportement web exporte et comportement natif Expo dev build
- besoin possible d'ajouter quelques `testID` dans l'UI pour rendre Playwright et Maestro fiables

La mitigation retenue est simple : viser peu de parcours, mais des parcours robustes, et concentrer la finesse des assertions dans les tests d'integration plutot que dans les e2e.
