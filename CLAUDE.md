# CLAUDE.md — Projet Belote

## Contexte

Ce projet est une application de **Belote française** (jeu de cartes à 4 joueurs, 2 équipes de 2) en cours de développement.
Il suit un plan d'implémentation détaillé dans `PROMPT.md` et la progression est suivie dans `AVANCEMENT.md`.

**Avant toute action, consulter `AVANCEMENT.md` pour connaître l'état actuel du projet et `PROMPT.md` pour les spécifications.**

**État actuel** : Phase 1 MVP — Étapes 1-8 terminées (logique, bots, UI, animations, orchestration). Prochaine : étape 9 (tests d'intégration/E2E) et 10 (CI/CD, polish).

## Stack technique

- **Monorepo** : Turborepo + pnpm workspaces
- **Langage** : TypeScript strict (`strict: true`, pas de `any`)
- **App** : Expo SDK 54 avec Expo Router v6 (iOS, Android, Web)
- **Rendu du jeu** : @shopify/react-native-skia (cartes PNG via `useImage`)
- **Animations** : react-native-reanimated v4 (cartes en vol, distribution, ramassage pli)
- **Machine à états** : XState v5 (`createActor` + `machine.provide`)
- **État applicatif** : Zustand v4+ (préférences utilisateur)
- **Tests** : Vitest (packages TS purs), Jest + jest-expo (app Expo), Playwright (e2e web)
- **Validation runtime** : Zod v3

## Structure du monorepo

```
apps/mobile/          → App Expo (iOS, Android, Web)
  app/                → Routes Expo Router (index, partie, parametres, regles)
  components/game/    → Composants du plateau de jeu (15+ composants)
  hooks/              → useControleurJeu, useAnimations, useDelaiBot
  stores/             → Zustand (app-store.ts)
  constants/          → theme.ts, layout.ts
  assets/cards/       → Images PNG des 32 cartes + dos
packages/game-logic/  → Logique métier (pur TS, aucune dépendance UI)
  src/                → machine.ts, paquet.ts, regles.ts, pli.ts, score.ts
packages/bot-engine/  → IA des bots (pur TS, aucune dépendance UI)
  src/                → bot.ts, strategie-encheres.ts, strategie-jeu.ts, comptage-cartes.ts
packages/shared-types/ → Types TypeScript partagés (game.ts)
tooling/eslint-config/ → Config ESLint partagée
tooling/tsconfig/      → Configs TypeScript partagées
```

## Architecture et flux de données

```
XState Machine (game-logic/machine.ts)
    ↕ événements / état
useControleurJeu (hook orchestrateur)
    ├─ construit EtatJeu pour l'UI (phaseUI, mainJoueur, cartesJouables, scores...)
    ├─ appelle deciderBot() (bot-engine) pour les tours IA avec délai réaliste
    └─ déclenche useAnimations (distribution, jeu carte, ramassage pli)
        ↓
PlateauJeu (composant racine du jeu)
    └─ sous-composants : MainJoueur, MainAdversaire, ZonePli, PanneauEncheres, etc.
```

### Machine à états XState — flux

```
inactif → distribution → encheres1 → (encheres2 si tous passent)
    → distributionRestante → jeu ⇄ verificationPli ⇄ finPli (×8 plis)
    → scoresManche → distribution (nouvelle manche) ou finPartie

Redistribution : si tous passent aux 2 tours → redistribution → distribution
```

### Types clés (packages/shared-types/src/game.ts)

- `Couleur` : `"pique" | "coeur" | "carreau" | "trefle"`
- `Rang` : `"7" | "8" | "9" | "10" | "valet" | "dame" | "roi" | "as"`
- `PositionJoueur` : `"sud"` (humain) `| "ouest" | "nord" | "est"` (sens horaire)
- `IdEquipe` : `"equipe1"` (sud+nord) `| "equipe2"` (ouest+est)
- `Difficulte` : `"facile" | "moyen" | "difficile"`
- `PhaseJeu` : les 10 états de la machine
- `Carte` : `{ couleur: Couleur; rang: Rang }`
- `VueBotJeu` : vue restreinte du jeu pour les décisions IA
- `ActionBot` : `PRENDRE | ANNONCER(couleur) | PASSER | JOUER_CARTE(carte)`

### Événements XState de la machine

- `DEMARRER` — lance une nouvelle partie
- `PRENDRE` — le joueur prend à l'atout retourné (enchères tour 1)
- `ANNONCER { couleur }` — annonce un autre atout (enchères tour 2)
- `PASSER` — passe son tour d'enchères
- `JOUER_CARTE { carte }` — joue une carte (guard `coupValide` vérifie la légalité)
- `CONTINUER` — après scoresManche, lance la manche suivante
- `REJOUER` — après finPartie, relance une nouvelle partie

### Composants UI principaux (apps/mobile/components/game/)

| Composant                  | Rôle                                                              |
| -------------------------- | ----------------------------------------------------------------- |
| `PlateauJeu.tsx`           | Composant racine, orchestre tout le rendu du jeu                  |
| `MainJoueur.tsx`           | Main du joueur en éventail (arc), tap pour jouer                  |
| `MainAdversaire.tsx`       | Dos de cartes pour les 3 bots (horizontal/vertical)               |
| `Carte.tsx`                | Rendu d'une carte (image Skia + overlay grisé si non jouable)     |
| `ZonePli.tsx`              | Zone centrale : 4 positions avec rotation pseudo-aléatoire        |
| `PanneauEncheres.tsx`      | UI enchères (Prendre/Passer tour 1, choix couleur tour 2)         |
| `ZoneCarteRetournee.tsx`   | Carte retournée pendant les enchères                              |
| `CoucheAnimation.tsx`      | Layer de rendu des cartes en vol (Reanimated)                     |
| `CarteAnimee.tsx`          | Carte individuelle animée (interpolation position/rotation/scale) |
| `DialogueFinManche.tsx`    | Popup fin de manche (scores détaillés)                            |
| `DialogueFinPartie.tsx`    | Popup fin de partie (victoire/défaite + rejouer)                  |
| `IndicateurAtout.tsx`      | Affiche l'atout courant                                           |
| `TableauScores.tsx`        | Scores des deux équipes                                           |
| `DernierPli.tsx`           | Aperçu du dernier pli joué                                        |
| `HistoriqueEncheresUI.tsx` | Historique des enchères                                           |

### Hooks principaux

| Hook               | Rôle                                                                            |
| ------------------ | ------------------------------------------------------------------------------- |
| `useControleurJeu` | Orchestre XState + UI + bots. Retourne `EtatJeu` complet                        |
| `useAnimations`    | Gère les cartes en vol (distribution, jeu, ramassage). Retourne `cartesEnVol[]` |
| `useDelaiBot`      | Délai réaliste : 500-1000ms (jeu), 2000-3000ms (enchères)                       |

### Constantes de layout (constants/layout.ts)

- Carte : 9% largeur écran, ratio 1.45
- Éventail joueur : 40° spread, 55% overlap, 4% arc
- Positions pli : sud(0.5, 0.52), nord(0.5, 0.41), ouest(0.42, 0.47), est(0.58, 0.47)
- Timings animation : distribution 200ms/carte + 80ms stagger, jeu 300ms, ramassage 400ms + 800ms pause

### Couverture de tests actuelle

- `game-logic` : 98.63% statements, 94.93% branches (25 tests machine + modules)
- `bot-engine` : 57 tests (enchères, jeu, comptage, dispatcher)
- `mobile` : 9 tests unitaires, 6 tests e2e Playwright (navigation)

## Commandes courantes

```bash
pnpm turbo test          # Tous les tests unitaires
pnpm turbo typecheck     # Vérification TypeScript
pnpm turbo lint          # ESLint
pnpm --filter @belote/game-logic test              # Tests game-logic
pnpm --filter @belote/game-logic test:coverage      # Couverture game-logic
pnpm --filter @belote/game-logic typecheck          # Typecheck game-logic
pnpm --filter @belote/mobile test:e2e              # Tests e2e web (Playwright)
```

## Validation après modification

Après chaque modification significative, lancer :

```bash
pnpm turbo typecheck test                          # TU + typecheck
pnpm --filter @belote/mobile test:e2e              # Tests e2e (build web + Playwright)
```

## Conventions de code

- **Tout le code est en français** : variables, fonctions, types, commentaires
- **Fichiers** : `kebab-case.ts` pour les modules, `PascalCase.tsx` pour les composants React
- **Variables/fonctions** : `camelCase` (en français)
- **Types/Interfaces** : `PascalCase` (en français)
- **Exports** : named exports uniquement (pas de `export default`), sauf les fichiers route Expo Router (`_layout.tsx`, `index.tsx`, etc.) qui requièrent un `export default`
- **Packages purs** : `game-logic` et `bot-engine` n'importent JAMAIS de React/React Native
- **Commits** : Conventional Commits (`feat:`, `fix:`, `test:`, `chore:`)
  - Scopes autorisés : `game-logic`, `bot-engine`, `mobile`, `server`, `shared`, `ci`, `deps`

## Dépendances entre packages

```
shared-types  ← game-logic  ← bot-engine
     ↑              ↑              ↑
     └──────── mobile (apps) ──────┘
```

- `shared-types` : aucune dépendance (types purs)
- `game-logic` : dépend de `shared-types`
- `bot-engine` : dépend de `shared-types` + `game-logic` (fonctions d'évaluation pli/force)
- `mobile` : dépend des 3 packages

## Qualité

- ESLint flat config + Prettier
- Husky + lint-staged + commitlint
- Knip (détection code mort)
- Syncpack (cohérence des versions)
- Couverture cible > 90% pour `game-logic`

## Méthodologie TDD

**Toujours coder en TDD (Test-Driven Development)** : pour toute nouvelle feature ou bugfix, écrire les tests en premier, puis l'implémentation. Utiliser le skill `superpowers:test-driven-development` avant d'écrire du code d'implémentation.

## Règle importante

Après chaque progression significative, **mettre à jour `AVANCEMENT.md`** pour refléter l'état actuel.
