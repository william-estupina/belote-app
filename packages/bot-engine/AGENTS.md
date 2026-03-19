# AGENTS.md - bot-engine

## Checklist

- Package pur TypeScript
- Le bot ne triche jamais
- Les actions retournees restent compatibles avec `game-logic`
- Les strategies restent stables et testables
- Mettre a jour les tests a chaque changement de comportement

## Invariants

- `deciderBot()` ne retourne que des actions valides
- `VueBotJeu` reste une vue partielle
- Les niveaux `facile`, `moyen`, `difficile` restent clairement differencies

## Fichiers clefs

- `bot.ts`
- `strategie-encheres.ts`
- `strategie-jeu.ts`
- `comptage-cartes.ts`

## Validation

- `pnpm --filter @belote/bot-engine test`
- `pnpm --filter @belote/bot-engine typecheck`
