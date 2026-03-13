# Avancement du projet Belote

> Ce fichier suit la progression des étapes définies dans `PROMPT.md`.
> Il est mis à jour automatiquement à chaque avancée.

## Phase 1 — MVP hors-ligne

### Étape 1 : Setup du monorepo et outillage ✅

- [x] Initialiser le monorepo Turborepo + pnpm
- [x] Configurer les workspaces (`packages/*`, `apps/*`, `tooling/*`)
- [x] Setup TypeScript configs partagés (`tsconfig.base.json`, `tooling/tsconfig/*`)
- [x] Setup ESLint flat config + plugins (TS, import-sort, unused-imports)
- [x] Setup Prettier + intégration ESLint
- [x] Setup Husky + lint-staged + commitlint (Conventional Commits)
- [x] Setup Gitleaks en pre-commit hook (v8.30.0, fallback gracieux si absent)
- [x] Setup Knip pour la détection de code mort
- [x] Setup Syncpack pour la cohérence des versions
- [x] Configurer Vitest pour les packages TS purs (`game-logic`, `bot-engine`)
- [x] Configurer Jest + jest-expo pour l'app Expo (babel-preset-expo, transformIgnorePatterns pnpm)
- [x] Créer l'app Expo avec Expo Router
- [x] Vérifier que `pnpm dev` lance l'app sur web et mobile (Metro Bundler démarre)
- [x] Vérifier que `pnpm turbo test`, `pnpm turbo typecheck` fonctionnent

### Étape 2 : Package `game-logic` ✅

- [x] Définir tous les types (`Carte`, `Couleur`, `Rang`, `PositionJoueur`, `Equipe`, `PhaseJeu`, etc.)
- [x] Implémenter `paquet.ts` : création du paquet 32 cartes, mélange (Fisher-Yates), distribution
- [x] Implémenter `regles.ts` : calculer les cartes jouables (fournir, couper, monter, défausser)
- [x] Implémenter `pli.ts` : évaluer qui gagne un pli
- [x] Implémenter `score.ts` : compter les points, Belote/Rebelote, Dix de der, Capot, chute
- [x] Écrire les tests unitaires pour chaque module (couverture > 90% — 98.63% statements, 94.93% branches)

### Étape 3 : State machine XState ✅

- [x] Implémenter la machine à états complète dans `machine.ts`
- [x] Tous les états : inactif → distribution → encheres1 → encheres2 → distributionRestante → jeu → verificationPli → finPli → scoresManche → finPartie
- [x] Les guards : `coupValide`, `pliComplet`, `tousPasseTour1`, `tousPasseTour2`, `mancheTerminee`, `partieTerminee`, `annonceValide`
- [x] Les actions : `distribuer`, `jouerCarte`, `evaluerPli`, `calculerScoreManche`, `enregistrerPrise`, `enregistrerAnnonce`, `enregistrerPasse`, etc.
- [x] Tests unitaires de la machine (25 tests — parties complètes simulées, enchères, redistribution, fin de partie)

### Étape 4 : Package `bot-engine` ✅

- [x] Implémenter le bot facile (jeu aléatoire légal)
- [x] Implémenter le bot moyen (heuristiques de base : entame As, jouer fort/faible selon position)
- [x] Implémenter le bot difficile (comptage de cartes, cartes maîtresses, signalisation, stratégie avancée)
- [x] Implémenter la stratégie d'enchères par niveau (tour 1 + tour 2)
- [x] Implémenter le module de comptage de cartes (`comptage-cartes.ts` : suivi cartes jouées/restantes, cartes maîtresses)
- [x] Tests unitaires (57 tests — enchères, jeu, comptage de cartes, dispatcher bot)

### Étape 5 : UI — Écrans et navigation ✅

- [x] Écran d'accueil (menu principal : Jouer, Paramètres, Règles)
- [x] Écran de paramètres (difficulté, son, score objectif)
- [x] Écran des règles du jeu (8 sections détaillées)
- [x] Navigation avec Expo Router (Stack : accueil, partie, paramètres, règles)
- [x] Thème et constantes visuelles (`constants/theme.ts` : couleurs, typographie, espacements, bordures)
- [x] Store Zustand (`stores/app-store.ts` : préférences utilisateur avec difficulté, son, score objectif)
- [x] Composant réutilisable `BoutonMenu` (primaire/secondaire)
- [x] Config Metro pour compatibilité web (transformation `import.meta.env`)
- [x] Tests unitaires (9 tests : accueil, paramètres, règles)
- [x] Tests e2e Playwright (6 tests : accueil + navigation paramètres + navigation règles, desktop + mobile)

### Étape 6 : UI — GameBoard (Skia) 🔲

- [ ] Rendu du tapis de jeu (fond vert)
- [ ] Rendu d'une carte (image Skia + ombre)
- [ ] Position des 4 joueurs (sud = humain, nord = partenaire bot, est/ouest = adversaires)
- [ ] Main du joueur en éventail
- [ ] Dos des cartes pour les adversaires
- [ ] Zone centrale pour le pli
- [ ] Indicateur d'atout + scores

### Étape 7 : Animations et interactions 🔲

- [ ] Animation de distribution
- [ ] Tap pour jouer une carte
- [ ] Griser les cartes non jouables
- [ ] Animation de jeu de carte (main → centre)
- [ ] Animation de ramassage du pli
- [ ] Délai réaliste pour les bots (500-1000ms)
- [ ] Sons (optionnel)

### Étape 8 : Game Controller (orchestration) 🔲

- [ ] Hook `useControleurJeu` qui orchestre XState + UI + bots
- [ ] Gestion du tour du joueur humain (attend le tap)
- [ ] Déclenchement automatique des bots
- [ ] Synchronisation état du jeu ↔ animations
- [ ] Transitions enchères ↔ jeu
- [ ] Fin de manche et fin de partie

### Étape 9 : Tests d'intégration et E2E 🔲

- [ ] Tests d'intégration : parties complètes simulées
- [ ] Tests de composants avec React Native Testing Library
- [ ] Tests E2E avec Maestro
- [ ] Vérifier le responsive (web desktop + mobile)

### Étape 10 : CI/CD et polish 🔲

- [ ] Pipeline GitHub Actions (CI : lint, typecheck, tests, sécurité)
- [ ] Configurer EAS Build pour les builds mobiles
- [ ] Edge cases (redistribution si personne ne prend, etc.)
- [ ] Persistence (préférences + statistiques) avec AsyncStorage + Zod
- [ ] Knip : nettoyer le code mort
- [ ] `npm audit` + Snyk : résoudre les vulnérabilités

---

## Phase 2 — Multijoueur en ligne 🔲

_Non commencée_

## Phase 3 — Belote coinchée (optionnelle) 🔲

_Non commencée_
