# CLAUDE.md — game-logic

Package pur TypeScript contenant toute la logique métier de la Belote. Aucune dépendance UI.

## Modules

- `machine.ts` — Machine à états XState v5 (10 phases de jeu)
- `paquet.ts` — Création paquet 32 cartes, mélange Fisher-Yates, distribution
- `regles.ts` — Cartes jouables (fournir, couper, monter, défausser)
- `pli.ts` — Évaluation du gagnant d'un pli
- `score.ts` — Calcul des scores (points, belote-rebelote, capot, dix de der)

## Machine à états XState — flux

```
inactif → distribution → encheres1 → (encheres2 si tous passent)
    → distributionRestante → jeu ⇄ verificationPli ⇄ finPli (×8 plis)
    → scoresManche → distribution (nouvelle manche) ou finPartie

Redistribution : si tous passent aux 2 tours → redistribution → distribution
```

## Événements XState

- `DEMARRER` — lance une nouvelle partie
- `PRENDRE` — prend à l'atout retourné (enchères tour 1)
- `ANNONCER { couleur }` — annonce un autre atout (enchères tour 2)
- `PASSER` — passe son tour d'enchères
- `JOUER_CARTE { carte }` — joue une carte (guard `coupValide` vérifie la légalité)
- `CONTINUER` — après scoresManche, lance la manche suivante
- `REJOUER` — après finPartie, relance une nouvelle partie

## Types clés (shared-types/src/game.ts)

- `Couleur` : `"pique" | "coeur" | "carreau" | "trefle"`
- `Rang` : `"7" | "8" | "9" | "10" | "valet" | "dame" | "roi" | "as"`
- `PositionJoueur` : `"sud"` (humain) `| "ouest" | "nord" | "est"` (sens horaire)
- `IdEquipe` : `"equipe1"` (sud+nord) `| "equipe2"` (ouest+est)
- `PhaseJeu` : les 10 états de la machine
- `Carte` : `{ couleur: Couleur; rang: Rang }`

## Couverture de tests

98.63% statements, 94.93% branches (25 tests machine + modules)

## Commandes

```bash
pnpm --filter @belote/game-logic test
pnpm --filter @belote/game-logic test:coverage
pnpm --filter @belote/game-logic typecheck
```
