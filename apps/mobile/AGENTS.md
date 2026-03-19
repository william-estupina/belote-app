# AGENTS.md - mobile

## Checklist

- Respecter la separation logique metier / UI
- Preserver fluidite, lisibilite et navigation
- Verifier les regressions web sur toute modif de rendu ou d'interaction
- Surveiller les etats transitoires entre machine, hook et animation

## Zones sensibles

- `useControleurJeu`
- `useAnimations`
- `PlateauJeu.tsx`
- composants de carte et de pli
- dialogues et panneaux d'encheres

## Reperes UI

- carte : largeur environ 9% ecran, ratio 1.45
- eventail : spread 40 degres, overlap 55%, arc 4%
- timings : distribution 200ms/carte + 80ms, jeu 300ms, ramassage 400ms + pause 800ms

## Validation

- `pnpm --filter @belote/mobile test:e2e`
- si impact transverse : `pnpm turbo typecheck test`
