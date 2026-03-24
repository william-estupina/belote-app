# AGENTS.md — game-logic

Package pur TypeScript contenant toute la logique metier de la Belote. Aucune dependance UI.

## Modules

- `machine.ts` — Machine a etats XState v5 (10 phases de jeu)
- `paquet.ts` — Creation paquet 32 cartes, melange Fisher-Yates, distribution
- `regles.ts` — Cartes jouables (fournir, couper, monter, defausser)
- `pli.ts` — Evaluation du gagnant d'un pli
- `score.ts` — Calcul des scores (points, belote-rebelote, capot, dix de der)

## Machine a etats XState — flux

```
inactif → distribution → encheres1 → (encheres2 si tous passent)
    → distributionRestante → jeu ⇄ verificationPli ⇄ finPli (×8 plis)
    → scoresManche → distribution (nouvelle manche) ou finPartie

Redistribution : si tous passent aux 2 tours → redistribution → distribution
```

## Evenements XState

- `DEMARRER` — lance une nouvelle partie
- `PRENDRE` — prend a l'atout retourne (encheres tour 1)
- `ANNONCER { couleur }` — annonce un autre atout (encheres tour 2)
- `PASSER` — passe son tour d'encheres
- `JOUER_CARTE { carte }` — joue une carte (guard `coupValide` verifie la legalite)
- `CONTINUER` — apres scoresManche, lance la manche suivante
- `REJOUER` — apres finPartie, relance une nouvelle partie

## Types cles (shared-types/src/game.ts)

- `Couleur` : `"pique" | "coeur" | "carreau" | "trefle"`
- `Rang` : `"7" | "8" | "9" | "10" | "valet" | "dame" | "roi" | "as"`
- `PositionJoueur` : `"sud"` (humain) `| "ouest" | "nord" | "est"` (sens horaire)
- `IdEquipe` : `"equipe1"` (sud+nord) `| "equipe2"` (ouest+est)
- `PhaseJeu` : les 10 etats de la machine
- `Carte` : `{ couleur: Couleur; rang: Rang }`

## Checklist

- Ne jamais contourner une regle metier pour simplifier l'app ou les bots
- Garder les regles deterministes et testables
- Mettre a jour les tests dans la meme intervention

## Invariants

- `coupValide` garantit toujours la legalite des cartes jouees
- Le flux XState reste coherent jusqu'a `finPartie`
- La redistribution apres double passe continue a fonctionner
- Le scoring reste correct pour atout, plis et bonus pris en charge

## Validation

- `pnpm --filter @belote/game-logic test`
- `pnpm --filter @belote/game-logic test:coverage`
- `pnpm --filter @belote/game-logic typecheck`
