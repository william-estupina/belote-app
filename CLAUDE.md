# CLAUDE.md — Projet Belote

## Contexte

Ce projet est une application de **Belote française** (jeu de cartes à 4 joueurs, 2 équipes de 2) en cours de développement.
Il suit un plan d'implémentation détaillé dans `PROMPT.md` et la progression est suivie dans `AVANCEMENT.md`.

**Avant toute action, consulter `AVANCEMENT.md` pour connaître l'état actuel du projet et `PROMPT.md` pour les spécifications.**

## Stack technique

- **Monorepo** : Turborepo + pnpm workspaces
- **Langage** : TypeScript strict (`strict: true`, pas de `any`)
- **App** : Expo SDK 54 avec Expo Router v6 (iOS, Android, Web)
- **Rendu du jeu** : @shopify/react-native-skia
- **Machine à états** : XState v5
- **État applicatif** : Zustand v4+
- **Tests** : Vitest (packages TS purs), Jest + jest-expo (app Expo), Playwright (e2e web)
- **Validation runtime** : Zod v3

## Structure du monorepo

```
apps/mobile/          → App Expo (iOS, Android, Web)
packages/game-logic/  → Logique métier (pur TS, aucune dépendance UI)
packages/bot-engine/  → IA des bots (pur TS, aucune dépendance UI)
packages/shared-types/ → Types TypeScript partagés
tooling/eslint-config/ → Config ESLint partagée
tooling/tsconfig/      → Configs TypeScript partagées
```

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

## Qualité

- ESLint flat config + Prettier
- Husky + lint-staged + commitlint
- Knip (détection code mort)
- Syncpack (cohérence des versions)
- Couverture cible > 90% pour `game-logic`

## Règle importante

Après chaque progression significative, **mettre à jour `AVANCEMENT.md`** pour refléter l'état actuel.
