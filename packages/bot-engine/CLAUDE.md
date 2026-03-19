# CLAUDE.md — bot-engine

Package pur TypeScript pour l'IA des bots. Dépend de `shared-types` + `game-logic`.

## Modules

- `bot.ts` — Dispatcher principal (`deciderBot()`)
- `strategie-encheres.ts` — Stratégies d'enchères par difficulté (facile/moyen/difficile)
- `strategie-jeu.ts` — Stratégies de jeu de carte par difficulté
- `comptage-cartes.ts` — Comptage et mémorisation des cartes jouées

## Types clés

- `Difficulte` : `"facile" | "moyen" | "difficile"`
- `VueBotJeu` : vue restreinte du jeu pour les décisions IA (main, pli courant, atout, cartes jouées...)
- `ActionBot` : `PRENDRE | ANNONCER(couleur) | PASSER | JOUER_CARTE(carte)`

## Architecture des stratégies

Chaque niveau de difficulté a ses propres seuils et heuristiques :

- **Facile** : jeu quasi-aléatoire parmi les cartes jouables
- **Moyen** : heuristiques simples (jouer maître, couper si possible)
- **Difficile** : comptage de cartes, entame et réponse avancées, seuils adaptatifs

## Couverture de tests

57 tests (enchères, jeu, comptage, dispatcher)

## Commandes

```bash
pnpm --filter @belote/bot-engine test
pnpm --filter @belote/bot-engine typecheck
```
