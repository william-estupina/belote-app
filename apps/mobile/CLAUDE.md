# CLAUDE.md — mobile (App Expo)

App Expo SDK 54 + Expo Router v6. Rendu des cartes via @shopify/react-native-skia, animations via react-native-reanimated v4.

## Architecture et flux de données

```
XState Machine (game-logic/machine.ts)
    ↕ événements / état
useControleurJeu (hook orchestrateur)
    ├─ construit EtatJeu pour l'UI (phaseUI, mainJoueur, cartesJouables, scores...)
    ├─ appelle deciderBot() (bot-engine) pour les tours IA avec délai réaliste
    └─ déclenche useAnimations (distribution, jeu carte, ramassage pli)
        ↓
PlateauJeu (composant racine du jeu)
    └─ sous-composants : MainJoueur, MainAdversaire, ZonePli, PanneauEncheres, etc.
```

## Composants UI principaux (components/game/)

| Composant                  | Rôle                                                              |
| -------------------------- | ----------------------------------------------------------------- |
| `PlateauJeu.tsx`           | Composant racine, orchestre tout le rendu du jeu                  |
| `MainJoueur.tsx`           | Main du joueur en éventail (arc), tap pour jouer                  |
| `MainAdversaire.tsx`       | Dos de cartes pour les 3 bots (horizontal/vertical)               |
| `Carte.tsx`                | Rendu d'une carte (image Skia + overlay grisé si non jouable)     |
| `ZonePli.tsx`              | Zone centrale : 4 positions avec rotation pseudo-aléatoire        |
| `PanneauEncheres.tsx`      | UI enchères (Prendre/Passer tour 1, choix couleur tour 2)         |
| `ZoneCarteRetournee.tsx`   | Carte retournée pendant les enchères                              |
| `CoucheAnimation.tsx`      | Layer de rendu des cartes en vol (Reanimated)                     |
| `CarteAnimee.tsx`          | Carte individuelle animée (interpolation position/rotation/scale) |
| `DialogueFinManche.tsx`    | Popup fin de manche (scores détaillés)                            |
| `DialogueFinPartie.tsx`    | Popup fin de partie (victoire/défaite + rejouer)                  |
| `IndicateurAtout.tsx`      | Affiche l'atout courant                                           |
| `TableauScores.tsx`        | Scores des deux équipes                                           |
| `DernierPli.tsx`           | Aperçu du dernier pli joué                                        |
| `HistoriqueEncheresUI.tsx` | Historique des enchères                                           |

## Hooks principaux

| Hook               | Rôle                                                                            |
| ------------------ | ------------------------------------------------------------------------------- |
| `useControleurJeu` | Orchestre XState + UI + bots. Retourne `EtatJeu` complet                        |
| `useAnimations`    | Gère les cartes en vol (distribution, jeu, ramassage). Retourne `cartesEnVol[]` |
| `useDelaiBot`      | Délai réaliste : 500-1000ms (jeu), 2000-3000ms (enchères)                       |

## Constantes de layout (constants/layout.ts)

- Carte : 9% largeur écran, ratio 1.45
- Éventail joueur : 40° spread, 55% overlap, 4% arc
- Positions pli : sud(0.5, 0.52), nord(0.5, 0.41), ouest(0.42, 0.47), est(0.58, 0.47)
- Timings animation : distribution 200ms/carte + 80ms stagger, jeu 300ms, ramassage 400ms + 800ms pause

## Routes Expo Router (app/)

- `index.tsx` — Écran d'accueil
- `partie.tsx` — Écran de jeu (PlateauJeu)
- `parametres.tsx` — Paramètres
- `regles.tsx` — Règles du jeu

## Couverture de tests

9 tests unitaires, 6 tests e2e Playwright (navigation)

## Commandes

```bash
pnpm --filter @belote/mobile test:e2e    # Tests e2e web (Playwright)
```
