# AGENTS.md - game-logic

## Checklist

- Package pur TypeScript, aucune dependance UI
- Ne jamais contourner une regle metier pour simplifier l'app ou les bots
- Garder les regles deterministes et testables
- Mettre a jour les tests dans la meme intervention

## Invariants

- `coupValide` garantit toujours la legalite des cartes jouees
- Le flux XState reste coherent jusqu'a `finPartie`
- La redistribution apres double passe continue a fonctionner
- Le scoring reste correct pour atout, plis et bonus pris en charge

## Fichiers clefs

- `machine.ts`
- `regles.ts`
- `pli.ts`
- `score.ts`
- `paquet.ts`

## Validation

- `pnpm --filter @belote/game-logic test`
- `pnpm --filter @belote/game-logic test:coverage`
- `pnpm --filter @belote/game-logic typecheck`
