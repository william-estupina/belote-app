# AGENTS.md — mobile (App Expo)

App Expo SDK 54 + Expo Router v6. Rendu des cartes via @shopify/react-native-skia, animations via react-native-reanimated v4.

## Architecture et flux de donnees

```
XState Machine (game-logic/machine.ts)
    ↕ evenements / etat
useControleurJeu (hook orchestrateur)
    ├─ construit EtatJeu pour l'UI (phaseUI, mainJoueur, cartesJouables, scores...)
    ├─ appelle deciderBot() (bot-engine) pour les tours IA avec delai realiste
    └─ declenche useAnimations (distribution, jeu carte, ramassage pli)
        ↓
PlateauJeu (composant racine du jeu)
    └─ sous-composants : MainJoueur, MainAdversaire, ZonePli, PanneauEncheres, etc.
```

## Composants UI principaux (components/game/)

| Composant                  | Role                                                              |
| -------------------------- | ----------------------------------------------------------------- |
| `PlateauJeu.tsx`           | Composant racine, orchestre tout le rendu du jeu                  |
| `MainJoueur.tsx`           | Main du joueur en eventail (arc), tap pour jouer                  |
| `MainAdversaire.tsx`       | Dos de cartes pour les 3 bots (horizontal/vertical)               |
| `Carte.tsx`                | Rendu d'une carte (image Skia + overlay grise si non jouable)     |
| `ZonePli.tsx`              | Zone centrale : 4 positions avec rotation pseudo-aleatoire        |
| `PanneauEncheres.tsx`      | UI encheres (Prendre/Passer tour 1, choix couleur tour 2)         |
| `ZoneCarteRetournee.tsx`   | Carte retournee pendant les encheres                              |
| `CoucheAnimation.tsx`      | Layer de rendu des cartes en vol (Reanimated)                     |
| `CarteAnimee.tsx`          | Carte individuelle animee (interpolation position/rotation/scale) |
| `DialogueFinManche.tsx`    | Popup fin de manche (scores detailles)                            |
| `DialogueFinPartie.tsx`    | Popup fin de partie (victoire/defaite + rejouer)                  |
| `IndicateurAtout.tsx`      | Affiche l'atout courant                                           |
| `TableauScores.tsx`        | Scores des deux equipes                                           |
| `DernierPli.tsx`           | Apercu du dernier pli joue                                        |
| `HistoriqueEncheresUI.tsx` | Historique des encheres                                           |

## Hooks principaux

| Hook               | Role                                                                            |
| ------------------ | ------------------------------------------------------------------------------- |
| `useControleurJeu` | Orchestre XState + UI + bots. Retourne `EtatJeu` complet                        |
| `useAnimations`    | Gere les cartes en vol (distribution, jeu, ramassage). Retourne `cartesEnVol[]` |
| `useDelaiBot`      | Delai realiste : 500-1000ms (jeu), 2000-3000ms (encheres)                       |

## Routes Expo Router (app/)

- `index.tsx` — Ecran d'accueil
- `partie.tsx` — Ecran de jeu (PlateauJeu)
- `parametres.tsx` — Parametres
- `regles.tsx` — Regles du jeu

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
- positions pli : sud(0.5, 0.52), nord(0.5, 0.41), ouest(0.42, 0.47), est(0.58, 0.47)
- timings : distribution 200ms/carte + 80ms stagger, jeu 300ms, ramassage 400ms + pause 800ms

## Validation

- `pnpm --filter @belote/mobile test:e2e`
- si impact transverse : `pnpm turbo typecheck test`
