# CLAUDE.md — Projet Belote

## Contexte

Application de **Belote française** (jeu de cartes à 4 joueurs, 2 équipes de 2).
Plan d'implémentation dans `PROMPT.md`, progression dans `AVANCEMENT.md`.

**État actuel** : Phase 1 MVP — Étapes 1-8 terminées (logique, bots, UI, animations, orchestration). Prochaine : étape 9 (tests d'intégration/E2E) et 10 (CI/CD, polish).

> **AVANCEMENT.md** : consulter uniquement quand on fait avancer le plan du projet (nouvelles étapes, progression). Pas nécessaire pour du bugfix ou du travail sur une feature en cours.

## Stack technique

- **Monorepo** : Turborepo + pnpm workspaces
- **Langage** : TypeScript strict (`strict: true`, pas de `any`)
- **App** : Expo SDK 54 avec Expo Router v6 (iOS, Android, Web)
- **Rendu du jeu** : @shopify/react-native-skia (cartes PNG via `useImage`)
- **Animations** : react-native-reanimated v4
- **Machine à états** : XState v5 (`createActor` + `machine.provide`)
- **État applicatif** : Zustand v4+
- **Tests** : Vitest (packages TS purs), Jest + jest-expo (app Expo), Playwright (e2e web)
- **Validation runtime** : Zod v3

## Structure du monorepo

```
apps/mobile/          → App Expo (iOS, Android, Web)
packages/game-logic/  → Logique métier (pur TS, aucune dépendance UI)
packages/bot-engine/  → IA des bots (pur TS, aucune dépendance UI)
packages/shared-types/ → Types TypeScript partagés (game.ts)
tooling/              → ESLint config + TypeScript configs partagées
```

## Dépendances entre packages

```
shared-types  ← game-logic  ← bot-engine
     ↑              ↑              ↑
     └──────── mobile (apps) ──────┘
```

- `shared-types` : aucune dépendance (types purs)
- `game-logic` : dépend de `shared-types`
- `bot-engine` : dépend de `shared-types` + `game-logic`
- `mobile` : dépend des 3 packages

## Commandes courantes

```bash
pnpm turbo test          # Tous les tests unitaires
pnpm turbo typecheck     # Vérification TypeScript
pnpm turbo lint          # ESLint
pnpm --filter @belote/game-logic test              # Tests game-logic
pnpm --filter @belote/game-logic test:coverage      # Couverture game-logic
pnpm --filter @belote/mobile test:e2e              # Tests e2e web (Playwright)
```

## Validation après modification

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

Après chaque progression significative sur le plan du projet, **mettre à jour `AVANCEMENT.md`**.
