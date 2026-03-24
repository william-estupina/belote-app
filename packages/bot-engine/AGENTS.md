# AGENTS.md — bot-engine

Package pur TypeScript pour l'IA des bots. Depend de `shared-types` + `game-logic`.

## Modules

- `bot.ts` — Dispatcher principal (`deciderBot()`)
- `strategie-encheres.ts` — Strategies d'encheres par difficulte (facile/moyen/difficile)
- `strategie-jeu.ts` — Strategies de jeu de carte par difficulte
- `comptage-cartes.ts` — Comptage et memorisation des cartes jouees

## Types cles

- `Difficulte` : `"facile" | "moyen" | "difficile"`
- `VueBotJeu` : vue restreinte du jeu pour les decisions IA (main, pli courant, atout, cartes jouees...)
- `ActionBot` : `PRENDRE | ANNONCER(couleur) | PASSER | JOUER_CARTE(carte)`

## Architecture des strategies

Chaque niveau de difficulte a ses propres seuils et heuristiques :

- **Facile** : jeu quasi-aleatoire parmi les cartes jouables
- **Moyen** : heuristiques simples (jouer maitre, couper si possible)
- **Difficile** : comptage de cartes, entame et reponse avancees, seuils adaptatifs

## Checklist

- Le bot ne triche jamais
- Les actions retournees restent compatibles avec `game-logic`
- Les strategies restent stables et testables
- Mettre a jour les tests a chaque changement de comportement

## Invariants

- `deciderBot()` ne retourne que des actions valides
- `VueBotJeu` reste une vue partielle
- Les niveaux `facile`, `moyen`, `difficile` restent clairement differencies

## Validation

- `pnpm --filter @belote/bot-engine test`
- `pnpm --filter @belote/bot-engine typecheck`
