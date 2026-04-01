# Avancement du projet Belote

> Ce fichier suit la progression des etapes definies dans `PROMPT.md`.
> Il est mis a jour automatiquement a chaque avancee.

## Phase 1 - MVP hors-ligne

### Etape 1 : Setup du monorepo et outillage

- [x] Initialiser le monorepo Turborepo + pnpm
- [x] Configurer les workspaces (`packages/*`, `apps/*`, `tooling/*`)
- [x] Setup TypeScript configs partages (`tsconfig.base.json`, `tooling/tsconfig/*`)
- [x] Setup ESLint flat config + plugins (TS, import-sort, unused-imports)
- [x] Setup Prettier + integration ESLint
- [x] Setup Husky + lint-staged + commitlint (Conventional Commits)
- [x] Setup Gitleaks en pre-commit hook (v8.30.0, fallback gracieux si absent)
- [x] Setup Knip pour la detection de code mort
- [x] Setup Syncpack pour la coherence des versions
- [x] Configurer Vitest pour les packages TS purs (`game-logic`, `bot-engine`)
- [x] Configurer Jest + jest-expo pour l'app Expo (babel-preset-expo, transformIgnorePatterns pnpm)
- [x] Creer l'app Expo avec Expo Router
- [x] Verifier que `pnpm dev` lance l'app sur web et mobile (Metro Bundler demarre)
- [x] Verifier que `pnpm turbo test`, `pnpm turbo typecheck` fonctionnent

### Etape 2 : Package `game-logic`

- [x] Definir tous les types (`Carte`, `Couleur`, `Rang`, `PositionJoueur`, `Equipe`, `PhaseJeu`, etc.)
- [x] Implementer `paquet.ts` : creation du paquet 32 cartes, melange (Fisher-Yates), distribution
- [x] Implementer `regles.ts` : calculer les cartes jouables (fournir, couper, monter, defausser)
- [x] Implementer `pli.ts` : evaluer qui gagne un pli
- [x] Implementer `score.ts` : compter les points, Belote/Rebelote, Dix de der, Capot, chute
- [x] Ecrire les tests unitaires pour chaque module (couverture > 90% - 98.63% statements, 94.93% branches)

### Etape 3 : State machine XState

- [x] Implementer la machine a etats complete dans `machine.ts`
- [x] Tous les etats : inactif -> distribution -> encheres1 -> encheres2 -> distributionRestante -> jeu -> verificationPli -> finPli -> scoresManche -> finPartie
- [x] Les guards : `coupValide`, `pliComplet`, `tousPasseTour1`, `tousPasseTour2`, `mancheTerminee`, `partieTerminee`, `annonceValide`
- [x] Les actions : `distribuer`, `jouerCarte`, `evaluerPli`, `calculerScoreManche`, `enregistrerPrise`, `enregistrerAnnonce`, `enregistrerPasse`, etc.
- [x] Tests unitaires de la machine (25 tests - parties completes simulees, encheres, redistribution, fin de partie)

### Etape 4 : Package `bot-engine`

- [x] Implementer le bot facile (jeu aleatoire legal)
- [x] Implementer le bot moyen (heuristiques de base : entame As, jouer fort/faible selon position)
- [x] Implementer le bot difficile (comptage de cartes, cartes maitresses, signalisation, strategie avancee)
- [x] Implementer la strategie d'encheres par niveau (tour 1 + tour 2)
- [x] Implementer le module de comptage de cartes (`comptage-cartes.ts` : suivi cartes jouees/restantes, cartes maitresses)
- [x] Tests unitaires (57 tests - encheres, jeu, comptage de cartes, dispatcher bot)
- [x] **Recalibrage des 3 niveaux de difficulte** (branche `feature/recalibrage-bots-expert`) :
  - [x] Enrichir `VueBotJeu` avec `positionPreneur` et `positionDonneur`
  - [x] Suivi cartes avance (`SuiviCartesAvance` : couleurs epuisees, coupes, defausses par joueur)
  - [x] Remapper facile = ancien moyen (heuristiques + 12% erreur), moyen = ancien difficile (comptage)
  - [x] Niveau expert encheres : seuils adaptatifs (position, ecart score), garde anti-chute, detection belote/rebelote, auto-prend V+9
  - [x] Niveau expert jeu : entame 5 priorites, surcoupe intelligente (>15 pts), preservation belote, charge partenaire
  - [x] 79 tests bot-engine (vs 57 avant), couverture 79.5% statements, 84.8% branches

### Etape 5 : UI - Ecrans et navigation

- [x] Ecran d'accueil (menu principal : Jouer, Parametres, Regles)
- [x] Ecran de parametres (difficulte, son, score objectif)
- [x] Ecran des regles du jeu (8 sections detaillees)
- [x] Navigation avec Expo Router (Stack : accueil, partie, parametres, regles)
- [x] Theme et constantes visuelles (`constants/theme.ts` : couleurs, typographie, espacements, bordures)
- [x] Store Zustand (`stores/app-store.ts` : preferences utilisateur avec difficulte, son, score objectif)
- [x] Composant reutilisable `BoutonMenu` (primaire/secondaire)
- [x] Config Metro pour compatibilite web (transformation `import.meta.env`)
- [x] Tests unitaires (9 tests : accueil, parametres, regles)
- [x] Tests e2e Playwright (6 tests : accueil + navigation parametres + navigation regles, desktop + mobile)

### Etape 6 : UI - GameBoard (Skia)

- [x] Rendu du tapis de jeu (fond vert)
- [x] Rendu d'une carte (image Skia + ombre)
- [x] Position des 4 joueurs (sud = humain, nord = partenaire bot, est/ouest = adversaires)
- [x] Main du joueur en eventail (`MainJoueur.tsx` : cartes en arc avec rotation progressive)
- [x] Dos des cartes pour les adversaires (`MainAdversaire.tsx` : horizontal pour nord, vertical pour est/ouest)
- [x] Zone centrale pour le pli (`ZonePli.tsx` : 4 positions avec rotation naturelle)
- [x] Indicateur d'atout + scores (`IndicateurAtout.tsx` + `TableauScores.tsx`)
- [x] Constantes de layout proportionnelles (`constants/layout.ts`)

### Etape 7 : Animations et interactions

- [x] Animation de distribution realiste en 3 phases :
  - Phase 1 : cartes volent du centre vers le tapis face cachee (eventails 3+2 avec position/rotation aleatoire)
  - Phase 2 : prise en main par joueur avec flip 3D (`backfaceVisibility: 'hidden'`, `rotateY` 0->180deg) - face revelee pour sud, dos pour bots
  - Phase 3 : tri de la main (existant)
  - Distribution restante gere la carte retournee du preneur (slide vers tapis + 2 cas preneur premier/non)
  - Types : `CarteSurTapis`, `CarteEnVol` enrichi (`flipDe`, `flipVers`, `easing`)
  - Composants : `CoucheAnimation` (rendu tapis + vol), `CarteAnimee` (flip 3D dual-layer), `useAnimations` (3 methodes), `useControleurJeu` (orchestration)
- [x] **Optimisation distribution via Skia Atlas** (branche `feature/distribution-atlas-skia`) :
  - [x] Sprite sheet 8x5 (32 faces + 1 dos) generee via script `sharp` (`scripts/generer-sprite-sheet.ts`)
  - [x] Hook `useAtlasCartes` : charge le sprite sheet via `useImage`, expose `rectSource`/`rectDos`
  - [x] Hook `useAnimationsDistribution` : orchestration `withDelay`/`withTiming` natives Reanimated (UI thread), `SharedValue<number[]>` plat pour donnees worklet, pool `makeMutable` pour progressions
  - [x] Composant `DistributionCanvas` : unique `<Canvas>` Skia avec `drawAtlas` + `useRSXformBuffer` (single draw call), trajectoires Bezier quadratiques, ease-out cubic
  - [x] Integration dans `CoucheAnimation`/`PlateauJeu`, retrait de `lancerDistribution` de `useAnimations`
- [x] Tap pour jouer une carte (`MainJoueur` avec `Pressable` + feedback visuel au press)
- [x] Griser les cartes non jouables (`CarteSkia` prop `grisee` + overlay semi-transparent)
- [x] Animation de jeu de carte (main -> centre) (`useAnimations.lancerAnimationJeuCarte` avec Reanimated)
- [x] Animation de ramassage du pli (`useAnimations.lancerAnimationRamassagePli` avec delai d'observation)
- [x] Delai realiste pour les bots (500-1000ms) (`useDelaiBot` hook avec delai aleatoire)
- [ ] Sons (optionnel - non implemente, prevu ulterieurement)

### Etape 8 : Game Controller (orchestration)

- [x] Hook `useControleurJeu` qui orchestre XState + UI + bots (`hooks/useControleurJeu.ts`)
- [x] Gestion du tour du joueur humain (attend le tap pour jouer, UI encheres pour prendre/annoncer/passer)
- [x] Declenchement automatique des bots (delai realiste 500-1000ms via `useDelaiBot`)
- [x] Synchronisation etat du jeu <-> animations (distribution animee, jeu de carte anime, ramassage de pli anime)
- [x] Transitions encheres <-> jeu (panneau d'encheres `PanneauEncheres.tsx`, distribution restante animee)
- [x] Fin de manche (`DialogueFinManche.tsx` : points manche + scores cumules) et fin de partie (`DialogueFinPartie.tsx` : victoire/defaite + rejouer)
- [x] Remplacement complet des donnees de demonstration dans `PlateauJeu.tsx` par l'etat XState reel

### Etape 9 : Tests d'integration et E2E

- [x] Tests d'integration : parties completes simulees (7 tests via `useControleurJeu` hook — manche humain/bot prend, annonce tour 2, partie complete, recommencer, redistribution, coherence scores)
- [ ] Tests de composants avec React Native Testing Library
- [ ] Tests E2E avec Maestro
- [ ] Verifier le responsive (web desktop + mobile)

### Etape 10 : CI/CD et polish

- [ ] Pipeline GitHub Actions complet (CI : lint, typecheck, tests, securite)
- [x] Workflow GitHub Actions manuel pour build preview Android avec verifications bloquantes (`.github/workflows/build-preview.yml`)
- [x] Configurer EAS Build pour les builds mobiles
- [ ] Edge cases (redistribution si personne ne prend, etc.)
- [ ] Persistence (preferences + statistiques) avec AsyncStorage + Zod
- [ ] Knip : nettoyer le code mort
- [ ] `npm audit` + Snyk : resoudre les vulnerabilites

---

## Phase 2 - Multijoueur en ligne

_Non commencee_

## Phase 3 - Belote coinchee (optionnelle)

_Non commencee_

## Mise a jour recente

- Setup initial de Maestro pour le mobile natif : ajout des flows Android-first (`accueil`, `partie`, `parametres`, `regles`), des `testID` stables sur les points d'entree UI, et de scripts de verification compatibles avec le checkout WSL/UNC.
- Refactor du pli anime termine : CoucheAnimation est devenue l'unique rendu visuel des cartes du pli, ZonePli ne garde que le cadre, et la resynchronisation visuelle se fait depuis `etatJeu.pliEnCours`.
- Demarrage de la CI/CD : ajout d'un workflow GitHub Actions manuel qui relance lint, typecheck et tests avant un build EAS Android `preview`, puis publie dans le summary GitHub le lien de build et un QR code de recuperation.
