# AGENTS.md

## Contexte

Application de **Belote francaise** (jeu de cartes a 4 joueurs, 2 equipes de 2).
Plan d'implementation dans `PROMPT.md`, progression dans `AVANCEMENT.md`.

> **AVANCEMENT.md** : consulter et mettre a jour uniquement apres une progression significative sur le plan du projet. Pas necessaire pour du bugfix ou du travail sur une feature en cours.

## Regles globales

- Code, noms metier et commentaires en francais
- TypeScript strict, pas de `any`
- Named exports uniquement (exception : routes Expo Router)
- Fichiers : `kebab-case.ts` pour les modules, `PascalCase.tsx` pour les composants React
- Variables/fonctions : `camelCase` (en francais) — Types/Interfaces : `PascalCase` (en francais)
- Commits : Conventional Commits (`feat:`, `fix:`, `test:`, `chore:`) — scopes : `game-logic`, `bot-engine`, `mobile`, `server`, `shared`, `ci`, `deps`
- Correction minimale, sure et testable
- Apres chaque correction de bug ou implementation de feature, faire le commit directement sans attendre une demande explicite
- Si l'utilisateur fait ensuite des retours, ajuster avec un nouveau commit ou remplacer le commit precedent selon le besoin
- Ne jamais melanger logique metier pure et UI
- `game-logic` et `bot-engine` n'importent jamais React ou React Native
- Pour les postures de collaboration et modes de reponse specifiques, voir `comportement.md`

## Stack technique

- **Monorepo** : Turborepo + pnpm workspaces
- **Langage** : TypeScript strict
- **App** : Expo SDK 54 + Expo Router v6 (iOS, Android, Web)
- **Rendu du jeu** : @shopify/react-native-skia (cartes PNG via `useImage`)
- **Animations** : react-native-reanimated v4
- **Machine a etats** : XState v5 (`createActor` + `machine.provide`)
- **Etat applicatif** : Zustand v4+
- **Tests** : Vitest (packages TS purs), Jest + jest-expo (app Expo), Playwright (e2e web)
- **Validation runtime** : Zod v3
- **Qualite** : ESLint flat config + Prettier, Husky + lint-staged + commitlint, Knip, Syncpack

## Carte du repo

```
apps/mobile/          → App Expo (iOS, Android, Web)
packages/game-logic/  → Logique metier (pur TS, aucune dependance UI)
packages/bot-engine/  → IA des bots (pur TS, aucune dependance UI)
packages/shared-types/ → Types TypeScript partages (game.ts)
tooling/              → ESLint config + TypeScript configs partagees
```

### Dependances entre packages

```
shared-types  ← game-logic  ← bot-engine
     ↑              ↑              ↑
     └──────── mobile (apps) ──────┘
```

## Reflexes de validation

```bash
pnpm --filter @belote/game-logic test        # logique metier
pnpm --filter @belote/bot-engine test        # bots
pnpm turbo typecheck test                    # impacts transverses
pnpm --filter @belote/mobile test:e2e        # parcours web
```

## Lire aussi

- `comportement.md`
- `apps/mobile/AGENTS.md`
- `packages/game-logic/AGENTS.md`
- `packages/bot-engine/AGENTS.md`
