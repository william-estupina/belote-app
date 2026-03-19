# AGENTS.md

## Regles globales

- Code, noms metier et commentaires en francais
- TypeScript strict, pas de `any`
- Named exports uniquement
- Exception autorisee : routes Expo Router
- Correction minimale, sure et testable
- Ne jamais melanger logique metier pure et UI
- `game-logic` et `bot-engine` n'importent jamais React ou React Native

## Carte du repo

- `apps/mobile/` : app Expo
- `packages/game-logic/` : regles, machine, scoring
- `packages/bot-engine/` : IA des bots
- `packages/shared-types/` : types partages

## Reflexes de validation

- logique metier : `pnpm --filter @belote/game-logic test`
- bots : `pnpm --filter @belote/bot-engine test`
- impacts transverses : `pnpm turbo typecheck test`
- parcours web : `pnpm --filter @belote/mobile test:e2e`

## Contexte projet

- `PROMPT.md` : plan d'implementation
- `AVANCEMENT.md` : progression du plan

Mettre a jour `AVANCEMENT.md` uniquement apres une progression significative sur le plan.

## Lire aussi

- `apps/mobile/AGENTS.md`
- `packages/game-logic/AGENTS.md`
- `packages/bot-engine/AGENTS.md`
