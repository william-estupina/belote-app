# Prompt de construction — Application de Belote

## Contexte du projet

Tu vas construire une application mobile et web de **Belote française** (jeu de cartes à 4 joueurs, 2 équipes de 2). L'application doit fonctionner sur **iOS, Android et Web** avec un seul codebase.

### Phases du projet

- **Phase 1 (MVP)** : Jeu hors-ligne contre 3 bots (IA locale)
- **Phase 2** : Multijoueur en ligne temps réel contre d'autres joueurs
- **Phase 3 (optionnelle)** : Ajout de la variante "Belote coinchée"

---

## Stack technique

| Couche | Technologie | Version minimum |
|---|---|---|
| Framework app | **Expo SDK 52+** avec **Expo Router v4** | SDK 52 |
| Langage | **TypeScript** (strict mode) | 5.4+ |
| Rendu du jeu | **@shopify/react-native-skia** | 1.x |
| Animations | **react-native-reanimated** | v3 |
| Gestes | **react-native-gesture-handler** | v2 |
| Machine à états (jeu) | **XState** | v5 |
| État applicatif | **Zustand** | v4+ |
| Monorepo | **Turborepo** + **pnpm** workspaces | - |
| Tests unitaires (packages TS purs) | **Vitest** | 2.x |
| Tests unitaires (app Expo) | **Jest** + **jest-expo** | 29+ |
| Tests composants | **React Native Testing Library** | 12+ |
| Tests E2E | **Maestro** | 1.x |
| Validation runtime | **Zod** | v3 |
| Serveur multijoueur (Phase 2) | **Colyseus** (Node.js) | 0.15+ |
| Build mobile | **EAS Build** + **EAS Workflows** | - |

### Qualité de code et sécurité

| Outil | Rôle |
|---|---|
| **ESLint** (flat config) | Linting avec plugins : `@typescript-eslint`, `react`, `react-hooks`, `react-native` |
| **Prettier** | Formatage automatique du code |
| **eslint-plugin-simple-import-sort** | Tri automatique des imports |
| **eslint-plugin-unused-imports** | Suppression automatique des imports inutilisés |
| **Knip** | Détection de code mort, fichiers orphelins, dépendances inutilisées dans le monorepo |
| **Husky** | Gestionnaire de git hooks (pre-commit, commit-msg) |
| **lint-staged** | Exécute lint/format uniquement sur les fichiers staged |
| **commitlint** (`@commitlint/config-conventional`) | Impose les Conventional Commits (`feat:`, `fix:`, `chore:`, etc.) |
| **Gitleaks** | Scan des secrets (clés API, tokens) en pre-commit hook + CI |
| **npm audit** | Scan des vulnérabilités connues dans les dépendances |
| **Snyk** | Base de vulnérabilités étendue + analyse SAST du code TypeScript |
| **@total-typescript/ts-reset** | Corrige les faiblesses de TS (`JSON.parse` → `unknown`, `.filter(Boolean)` typé, etc.) |
| **Syncpack** | Cohérence des versions de dépendances à travers le monorepo |

---

## Structure du monorepo

```
belote/
├── package.json                    # pnpm workspace root
├── pnpm-workspace.yaml
├── turbo.json
├── .gitignore
├── .gitleaksignore                 # Exceptions Gitleaks si nécessaire
├── eslint.config.mjs              # ESLint flat config (nouveau format)
├── .prettierrc
├── .prettierignore
├── .commitlintrc.json             # Config commitlint (Conventional Commits)
├── .lintstagedrc.json             # Config lint-staged
├── knip.json                      # Config Knip (détection code mort)
├── syncpack.config.ts             # Config Syncpack (versions cohérentes)
├── tsconfig.base.json
│
├── apps/
│   ├── mobile/                     # Expo app (iOS, Android, Web)
│   │   ├── app/                    # Expo Router — file-based routing
│   │   │   ├── _layout.tsx         # Root layout (providers, fonts)
│   │   │   ├── index.tsx           # Écran d'accueil / Menu principal
│   │   │   ├── game.tsx            # Écran de jeu (tapis + HUD)
│   │   │   ├── settings.tsx        # Paramètres (difficulté, style cartes, langue)
│   │   │   └── rules.tsx           # Règles de la Belote
│   │   ├── components/
│   │   │   ├── game/
│   │   │   │   ├── GameBoard.tsx       # Canvas Skia principal (le tapis de jeu)
│   │   │   │   ├── Card.tsx            # Rendu d'une carte (Skia Image + ombre)
│   │   │   │   ├── PlayerHand.tsx      # Main du joueur (éventail de cartes en bas)
│   │   │   │   ├── OpponentHand.tsx    # Cartes adverses (dos visible)
│   │   │   │   ├── TrickArea.tsx       # Zone centrale (les 4 cartes du pli)
│   │   │   │   ├── TrumpIndicator.tsx  # Indicateur de l'atout en cours
│   │   │   │   └── ScoreBoard.tsx      # Tableau des scores
│   │   │   ├── bidding/
│   │   │   │   ├── BiddingPanel.tsx    # Interface d'enchères
│   │   │   │   └── BidOption.tsx       # Bouton pour chaque enchère (couleur ou passer)
│   │   │   ├── ui/
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Modal.tsx
│   │   │   │   └── Layout.tsx          # Layout responsive (breakpoints mobile/web)
│   │   │   └── animations/
│   │   │       ├── useDealAnimation.ts     # Animation de distribution
│   │   │       ├── usePlayCardAnimation.ts # Animation jouer une carte
│   │   │       └── useCollectTrick.ts      # Animation ramasser le pli
│   │   ├── hooks/
│   │   │   ├── useGameController.ts    # Orchestre le jeu (connecte XState + UI + bots)
│   │   │   ├── useResponsive.ts        # Hook pour dimensions responsives
│   │   │   └── useCardAssets.ts        # Chargement des images de cartes
│   │   ├── stores/
│   │   │   └── appStore.ts            # Zustand : préférences, stats, etc.
│   │   ├── assets/
│   │   │   ├── cards/                 # Images des 32 cartes + dos
│   │   │   ├── sounds/               # Sons (distribution, jouer, gagner)
│   │   │   └── fonts/
│   │   ├── constants/
│   │   │   ├── theme.ts              # Couleurs, spacing, typography
│   │   │   └── layout.ts             # Breakpoints, tailles de cartes proportionnelles
│   │   ├── app.json
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── server/                     # (Phase 2) Colyseus game server
│       ├── src/
│       │   ├── rooms/
│       │   │   └── BeloteRoom.ts   # Room Colyseus avec state machine
│       │   ├── schema/
│       │   │   └── GameState.ts    # Colyseus Schema (état synchronisé)
│       │   ├── matchmaking.ts      # Logique de matchmaking
│       │   └── index.ts            # Entry point serveur
│       ├── Dockerfile
│       ├── tsconfig.json
│       └── package.json
│
├── packages/
│   ├── game-logic/                 # CŒUR : logique métier partagée client ↔ serveur
│   │   ├── src/
│   │   │   ├── types.ts            # Types : Card, Suit, Rank, Player, Team, GamePhase
│   │   │   ├── deck.ts             # Création du deck 32 cartes, mélange, distribution
│   │   │   ├── rules.ts            # Règles : cartes jouables, obligation de couper/monter
│   │   │   ├── scoring.ts          # Comptage des points, Belote/Rebelote, Dix de der, Capot
│   │   │   ├── trick.ts            # Évaluation du pli (qui gagne ?)
│   │   │   ├── machine.ts          # XState v5 : state machine de la partie
│   │   │   └── index.ts            # Export public
│   │   ├── __tests__/
│   │   │   ├── deck.test.ts
│   │   │   ├── rules.test.ts
│   │   │   ├── scoring.test.ts
│   │   │   ├── trick.test.ts
│   │   │   └── machine.test.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   ├── bot-engine/                 # IA des bots (pur TypeScript, aucune dépendance UI)
│   │   ├── src/
│   │   │   ├── bot.ts              # Fonction principale : (gameView, difficulty) → action
│   │   │   ├── bidding-strategy.ts # Évaluation de la main pour enchérir
│   │   │   ├── play-strategy.ts    # Heuristiques de jeu de carte
│   │   │   ├── card-counting.ts    # Suivi des cartes jouées
│   │   │   ├── difficulty.ts       # Profils : easy, medium, hard
│   │   │   └── index.ts
│   │   ├── __tests__/
│   │   │   ├── bidding-strategy.test.ts
│   │   │   └── play-strategy.test.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── shared-types/              # Types TypeScript partagés partout
│       ├── src/
│       │   ├── game.ts            # Types du jeu
│       │   ├── network.ts         # Types messages réseau (Phase 2)
│       │   └── index.ts
│       ├── tsconfig.json
│       └── package.json
│
├── .github/
│   └── workflows/
│       ├── ci.yml                 # Lint, typecheck, tests, sécurité (sur chaque PR)
│       ├── claude-review.yml      # Review IA automatique par Claude (sur chaque PR)
│       └── build.yml              # Build mobile + E2E Maestro (sur merge main)
│
├── .husky/
│   ├── pre-commit                 # lint-staged + gitleaks
│   └── commit-msg                 # commitlint
│
└── tooling/
    ├── eslint-config/
    │   └── base.mjs               # ESLint flat config partagée
    └── tsconfig/
        ├── base.json
        ├── expo.json
        └── node.json
```

---

## Règles de la Belote classique (à implémenter)

### Le deck

- **32 cartes** : 4 couleurs (Pique ♠, Cœur ♥, Carreau ♦, Trèfle ♣)
- **8 rangs par couleur** : 7, 8, 9, 10, Valet, Dame, Roi, As

### Valeur des cartes

**À l'atout :**

| Carte | Points |
|---|---|
| Valet | 20 |
| 9 | 14 |
| As | 11 |
| 10 | 10 |
| Roi | 4 |
| Dame | 3 |
| 8 | 0 |
| 7 | 0 |

**Hors atout :**

| Carte | Points |
|---|---|
| As | 11 |
| 10 | 10 |
| Roi | 4 |
| Dame | 3 |
| Valet | 2 |
| 9 | 0 |
| 8 | 0 |
| 7 | 0 |

**Total** : 152 points (62 à l'atout + 30×3 hors atout). Le dernier pli vaut **10 points bonus** ("Dix de der").

### Ordre de force des cartes

- **À l'atout** : Valet > 9 > As > 10 > Roi > Dame > 8 > 7
- **Hors atout** : As > 10 > Roi > Dame > Valet > 9 > 8 > 7

### Distribution

1. Le donneur distribue 3 cartes à chaque joueur, puis 2 cartes à chaque joueur (total : 5 cartes chacun)
2. Une carte est retournée face visible au centre (la "retourne")
3. Phase d'enchères (voir ci-dessous)
4. Après les enchères, le donneur distribue les 3 cartes restantes à chaque joueur (le preneur reçoit la retourne + 2 cartes, les autres reçoivent 3 cartes). Chaque joueur a alors 8 cartes.

### Enchères (2 tours)

**Tour 1** : Chaque joueur, dans le sens des aiguilles d'une montre en commençant par celui à droite du donneur, peut :
- **Prendre** : accepter la retourne comme atout (la couleur de la retourne devient l'atout)
- **Passer**

Si personne ne prend au tour 1 :

**Tour 2** : Chaque joueur peut :
- **Proposer une autre couleur** comme atout (n'importe quelle couleur SAUF celle de la retourne)
- **Passer**

Si personne ne prend au tour 2 → les cartes sont redistribuées (le donneur tourne).

Le joueur qui prend est appelé le **preneur**. Son équipe doit réaliser **au minimum 82 points** pour remporter la manche. L'équipe adverse doit réaliser au minimum 71 points.

### Règles de jeu (plis)

Les joueurs jouent **dans le sens des aiguilles d'une montre**. Le joueur qui a gagné le pli précédent entame le suivant.

**Obligations :**

1. **Fournir** : Si tu as une carte de la couleur demandée, tu DOIS la jouer (n'importe laquelle de cette couleur)
2. **Couper** : Si tu n'as pas la couleur demandée ET que tu as de l'atout, tu DOIS couper (jouer un atout). Exception : si ton partenaire est actuellement maître du pli, tu peux défausser au lieu de couper.
3. **Monter** : Si tu joues à l'atout (que ce soit en fournissant ou en coupant), tu DOIS jouer un atout supérieur au plus fort atout déjà joué dans ce pli, **si tu en as un**. Sinon, tu peux jouer un atout inférieur (on appelle ça "pisser").
4. **Défausser** : Si tu n'as ni la couleur demandée ni d'atout, tu joues n'importe quelle carte.

### Évaluation du pli

- Si un ou plusieurs atouts ont été joués → l'atout le plus fort gagne
- Sinon → la carte la plus forte **de la couleur demandée** (la couleur de la première carte) gagne
- Le gagnant du pli ramasse les cartes et entame le pli suivant

### Belote / Rebelote

Si un joueur possède le **Roi ET la Dame d'atout**, il annonce "Belote" en jouant la première de ces deux cartes et "Rebelote" en jouant la seconde. Cela rapporte **20 points bonus** à son équipe. Ces points ne sont jamais perdus, même si l'équipe chute.

### Scoring de la manche

Après les 8 plis :
1. Chaque équipe compte ses points (cartes remportées + 10 de der si applicable)
2. Ajouter les 20 points de Belote/Rebelote si annoncée

**Cas du preneur :**
- Si l'équipe du preneur atteint **82+ points** → chaque équipe marque ses propres points
- Si l'équipe du preneur fait **moins de 82 points** ("chute") → l'équipe adverse marque **252 points** (totalité : 162 de base + 90 restants). L'équipe du preneur marque 0 (mais conserve les 20 de Belote/Rebelote si annoncée)

**Capot** (tous les plis gagnés par une même équipe) :
- L'équipe qui fait capot marque **252 points**
- Si le preneur fait capot → il marque 252
- Si le preneur se fait "capoter" → l'adversaire marque 252

### Fin de partie

La partie se joue en **plusieurs manches** jusqu'à ce qu'une équipe atteigne **1000 points** (ou 501, à rendre configurable). L'équipe qui atteint ce score en premier gagne.

---

## State machine XState — Flux du jeu

```
idle
  → START_GAME

dealing
  → [distribuer 5 cartes + retourner 1 carte]
  → biddingRound1

biddingRound1
  → TAKE        → dealRemaining (le joueur prend la retourne)
  → PASS        → biddingRound1 (joueur suivant) si pas tous passé
  → ALL_PASSED  → biddingRound2

biddingRound2
  → BID(suit)   → dealRemaining (le joueur choisit un atout)
  → PASS        → biddingRound2 (joueur suivant) si pas tous passé
  → ALL_PASSED  → dealing (redistribution, donneur tourne)

dealRemaining
  → [distribuer les 3 cartes restantes, preneur récupère la retourne]
  → playing

playing
  → PLAY_CARD(card)
    → [valider selon les règles]
    → playing (pli pas fini, joueur suivant)
    → trickEnd (4 cartes jouées)

trickEnd
  → [déterminer le gagnant, compter les points du pli]
  → playing (encore des cartes en main)
  → roundScoring (plus de cartes = 8 plis joués)

roundScoring
  → [calculer les scores de la manche, vérifier chute/capot]
  → dealing (score < objectif, nouvelle manche)
  → gameOver (une équipe a atteint le score objectif)

gameOver
  → RESTART → idle
```

---

## IA des bots — Stratégie par niveau

### Facile
- **Enchères** : Prend aléatoirement si ≥ 3 atouts en main
- **Jeu** : Joue une carte légale au hasard parmi les cartes jouables

### Moyen
- **Enchères** : Évalue la main (Valet + 9 d'atout = très bon, 3+ atouts avec des points = prendre)
- **Jeu** :
  - Entame avec un As hors-atout si disponible
  - Joue la plus forte quand il est en position de gagner le pli
  - Joue la plus faible quand le partenaire est maître
  - Coupe dès que possible si l'adversaire est maître
  - Monte à l'atout quand obligé

### Difficile
- **Enchères** : Compte les points potentiels si cette couleur est atout. Prend si ≥ 5 points attendus au-delà du minimum (82)
- **Jeu** :
  - Tout ce que fait le bot moyen +
  - Compte les cartes jouées (sait quelles cartes restent)
  - Signale au partenaire (joue gros = "j'ai de la force dans cette couleur")
  - Gère la Belote/Rebelote stratégiquement
  - En fin de manche, calcule les cartes restantes et optimise

### Interface du bot

```typescript
// Le bot reçoit uniquement ce qu'un vrai joueur verrait
interface BotGameView {
  myHand: Card[];
  myPosition: PlayerPosition;        // north | south | east | west
  partnerPosition: PlayerPosition;
  trumpSuit: Suit | null;
  currentTrick: { player: PlayerPosition; card: Card }[];
  leadSuit: Suit | null;             // couleur demandée dans ce pli
  trickHistory: CompletedTrick[];    // plis précédents (visibles)
  myTeamScore: number;
  opponentTeamScore: number;
  gamePhase: 'bidding1' | 'bidding2' | 'playing';
  turnedCard: Card | null;           // la retourne (pendant les enchères)
  biddingHistory: BidAction[];       // qui a passé/pris
}

type BotAction =
  | { type: 'TAKE' }                          // prendre la retourne (tour 1)
  | { type: 'BID'; suit: Suit }               // proposer un atout (tour 2)
  | { type: 'PASS' }                          // passer
  | { type: 'PLAY_CARD'; card: Card }         // jouer une carte
  | { type: 'ANNOUNCE_BELOTE' }               // annoncer belote/rebelote

function botDecide(view: BotGameView, difficulty: Difficulty): BotAction;
```

---

## Rendu visuel — GameBoard (Skia)

### Layout du tapis de jeu

```
┌─────────────────────────────────────┐
│           Adversaire Nord           │
│          ┌──┐┌──┐┌──┐┌──┐          │
│          │░░││░░││░░││░░│ (dos)     │
│          └──┘└──┘└──┘└──┘          │
│                                     │
│  Adv.     ┌─────────────┐    Adv.  │
│  Ouest    │  Zone du     │    Est   │
│  ┌──┐     │  pli (4      │    ┌──┐  │
│  │░░│     │  cartes)     │    │░░│  │
│  │░░│     │              │    │░░│  │
│  │░░│     └─────────────┘    │░░│  │
│  └──┘                        └──┘  │
│          [Atout: ♥] [Score]         │
│                                     │
│     ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐      │
│     │7♠│ │V♥│ │A♦│ │10♣│ │R♥│      │
│     └──┘ └──┘ └──┘ └──┘ └──┘      │
│           Joueur (Sud)              │
│                                     │
│  [Passer]  [Prendre / Enchérir]     │ ← (visible pendant les enchères)
└─────────────────────────────────────┘
```

### Principes de rendu

- Toutes les dimensions sont **proportionnelles** à `useWindowDimensions()` — jamais de pixels fixes
- La main du joueur est en éventail léger (rotation de ±15° entre la première et dernière carte)
- Les adversaires montrent le **dos des cartes**
- La zone du pli au centre accueille les 4 cartes jouées, légèrement décalées
- L'atout en cours et le score sont toujours visibles
- Pendant les enchères, la retourne est affichée au centre

### Animations clés

| Animation | Déclencheur | Description |
|---|---|---|
| Distribution | Début de manche | Les cartes glissent du centre vers chaque joueur avec un délai progressif (spring) |
| Jouer une carte | Le joueur tap/drag une carte | La carte se déplace de la main vers la zone du pli (timing 300ms) |
| Bot joue | C'est le tour du bot | Après un délai de 500-1000ms, la carte glisse vers le pli |
| Ramasser le pli | Les 4 cartes sont posées | Les 4 cartes glissent vers le vainqueur du pli (timing 400ms) |
| Retourner carte | Enchères | La retourne apparaît au centre avec un flip 3D |

### Responsive

- **Mobile** (< 768px) : Layout vertical, cartes plus petites, boutons d'enchères en bas
- **Tablette / Web** (≥ 768px) : Plus d'espace, cartes plus grandes, sidebar possible pour le score

---

## Gestion des gestes

- **Tap** sur une carte de la main → la joue (si c'est le tour du joueur et la carte est légale)
- **Cartes non jouables** → visuellement grisées / légèrement transparentes
- **Drag (optionnel)** → le joueur peut glisser la carte vers le centre pour la jouer
- Retour haptique léger sur mobile quand on joue une carte

---

## Zustand — État applicatif

```typescript
interface AppState {
  // Préférences
  settings: {
    difficulty: 'easy' | 'medium' | 'hard';
    cardStyle: 'classic' | 'modern';
    soundEnabled: boolean;
    targetScore: 501 | 1000;
    language: 'fr' | 'en';
  };

  // Statistiques
  stats: {
    gamesPlayed: number;
    gamesWon: number;
    totalPointsScored: number;
    bestScore: number;
    capotsAchieved: number;
  };
}
```

Persister avec `zustand/middleware` + `AsyncStorage` (Expo).

---

## Stratégie de tests

### Tests unitaires — Packages purs TS (`game-logic`, `bot-engine`)

**Runner : Vitest** (plus rapide, meilleur DX pour du TS pur sans dépendance React Native)

```
packages/game-logic/__tests__/
├── deck.test.ts          # Création du deck, mélange, distribution correcte
├── rules.test.ts         # Cartes jouables : fournir, couper, monter, défausser
├── trick.test.ts         # Évaluation du gagnant d'un pli
├── scoring.test.ts       # Points, Belote/Rebelote, Dix de der, Capot, chute
└── machine.test.ts       # State machine : transitions, guards, parties complètes simulées

packages/bot-engine/__tests__/
├── bidding-strategy.test.ts  # Décisions d'enchères par niveau de difficulté
└── play-strategy.test.ts     # Décisions de jeu par niveau de difficulté
```

**Couverture cible : > 90%** pour `game-logic` (c'est le cœur métier).

Exemples de tests critiques :
- Une partie complète simulée (8 plis) doit donner un total de 162 points entre les deux équipes
- Le joueur DOIT fournir si il a la couleur demandée
- Le joueur DOIT couper si il n'a pas la couleur ET a de l'atout (sauf si partenaire maître)
- Le joueur DOIT monter à l'atout si il en a la possibilité
- La chute donne 252 points à l'adversaire
- Belote/Rebelote = 20 points conservés même en cas de chute

### Tests de composants — App Expo

**Runner : Jest + jest-expo + React Native Testing Library**

```
apps/mobile/__tests__/
├── components/
│   ├── BiddingPanel.test.tsx   # Boutons d'enchères, état actif/inactif
│   ├── ScoreBoard.test.tsx     # Affichage correct des scores
│   └── PlayerHand.test.tsx     # Cartes affichées, cartes grisées si non jouables
├── hooks/
│   └── useGameController.test.ts  # Orchestration jeu + bots
└── stores/
    └── appStore.test.ts        # Persistence des préférences
```

Tests orientés **comportement utilisateur** (pas d'implementation details) :
- "Quand c'est mon tour, les cartes jouables sont interactives"
- "Quand je clique sur Passer, le joueur suivant enchérit"
- "Le score s'affiche correctement après un pli"

### Tests E2E — Maestro

**Runner : Maestro** (YAML déclaratif, simple, supporté par EAS Workflows)

```
e2e/
├── flows/
│   ├── start-game.yaml         # Lancer une partie, vérifier l'affichage initial
│   ├── play-full-round.yaml    # Jouer une manche complète (enchères + 8 plis)
│   ├── settings.yaml           # Changer la difficulté, vérifier la persistence
│   └── redeal.yaml             # Vérifier la redistribution quand personne ne prend
```

Exemple de flow Maestro :
```yaml
appId: com.belote.app
---
- launchApp
- tapOn: "Jouer"
- assertVisible: "Enchères"
- tapOn: "Prendre"
- assertVisible: "Atout"
- tapOn:
    id: "playable-card-0"
- assertVisible: "Pli"
```

### Validation runtime — Zod

Utiliser Zod pour valider :
- Les données persistées dans AsyncStorage (au chargement)
- Les messages réseau en Phase 2 (Colyseus)
- Les paramètres de configuration

```typescript
import { z } from 'zod';

const SettingsSchema = z.object({
  difficulty: z.enum(['easy', 'medium', 'hard']),
  cardStyle: z.enum(['classic', 'modern']),
  soundEnabled: z.boolean(),
  targetScore: z.union([z.literal(501), z.literal(1000)]),
  language: z.enum(['fr', 'en']),
});

// Chargement sécurisé depuis AsyncStorage
const loadSettings = async (): Promise<Settings> => {
  const raw = await AsyncStorage.getItem('settings');
  if (!raw) return DEFAULT_SETTINGS;
  const parsed = SettingsSchema.safeParse(JSON.parse(raw));
  return parsed.success ? parsed.data : DEFAULT_SETTINGS;
};
```

---

## CI/CD — GitHub Actions + EAS

### Pipeline CI (sur chaque PR)

```yaml
# .github/workflows/ci.yml
name: CI
on: [pull_request]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
      - run: pnpm install --frozen-lockfile
      - run: pnpm turbo typecheck      # Vérification TypeScript
      - run: pnpm turbo lint            # ESLint
      - run: pnpm turbo test            # Tests unitaires (Vitest + Jest)
      - run: pnpm knip                  # Détection code mort
      - run: pnpm syncpack list-mismatches  # Versions cohérentes

  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: gitleaks/gitleaks-action@v2   # Scan des secrets
      - run: pnpm audit --audit-level=high  # Vulnérabilités dépendances
      - uses: snyk/actions/node@master      # Scan Snyk
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
```

### Pipeline Claude Code Review (review IA automatique sur chaque PR)

```yaml
# .github/workflows/claude-review.yml
name: Claude Code Review

on:
  pull_request:
    types: [opened, synchronize]
  issue_comment:
    types: [created]
  pull_request_review_comment:
    types: [created]

jobs:
  claude-review:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write
      issues: write
    steps:
      - uses: actions/checkout@v4

      - name: Claude Code Review
        uses: anthropics/claude-code-action@v1
        with:
          prompt: |
            Tu es un reviewer expert pour un projet de jeu de Belote (Expo + TypeScript + XState).
            Review cette PR en vérifiant :

            1. **Qualité TypeScript** : strict mode respecté, pas de `any`, types explicites
            2. **Règles de la Belote** : si le code touche à game-logic, vérifie la conformité avec les règles
               (fournir, couper, monter, défausser, scoring, Belote/Rebelote, capot, chute)
            3. **Sécurité** : pas de secrets dans le code, pas de eval(), validation Zod sur les entrées externes
            4. **Tests** : game-logic doit avoir >90% de couverture, chaque nouveau module doit avoir ses tests
            5. **Architecture** : game-logic et bot-engine ne doivent JAMAIS importer de React/React Native
            6. **Conventions** : kebab-case.ts pour les modules, PascalCase.tsx pour les composants,
               named exports uniquement, Conventional Commits
            7. **Performance** : pas de re-renders inutiles, animations sur le UI thread (reanimated worklets)
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
```

**Setup requis** :
1. Lancer `/install-github-app` dans Claude Code pour configurer le GitHub App
2. Ajouter `ANTHROPIC_API_KEY` dans les secrets du repo GitHub (Settings → Secrets → Actions)

**Fonctionnement** :
- Chaque PR ouverte/mise à jour → Claude review automatiquement et poste des commentaires
- `@claude` dans un commentaire de PR/issue → Claude répond à la question
- Les reviews sont contextuelles : Claude lit le PROMPT.md et les skills pour comprendre le projet

---

### Pipeline Build + E2E (sur merge dans main)

```yaml
# .github/workflows/build.yml
name: Build & E2E
on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
      - run: eas build --platform all --non-interactive --no-wait

  e2e:
    runs-on: macos-latest   # Nécessaire pour le simulateur iOS
    steps:
      - uses: actions/checkout@v4
      - run: |
          curl -Ls "https://get.maestro.mobile.dev" | bash
          maestro test e2e/flows/
```

---

## Pre-commit hooks — Configuration

### .husky/pre-commit
```bash
#!/bin/sh
# Lint et format les fichiers staged
pnpm lint-staged

# Scan des secrets dans les changements staged
gitleaks protect --staged --verbose
```

### .husky/commit-msg
```bash
#!/bin/sh
# Valide le format du message de commit (Conventional Commits)
pnpm commitlint --edit "$1"
```

### .lintstagedrc.json
```json
{
  "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
  "*.{json,md,yaml}": ["prettier --write"]
}
```

### .commitlintrc.json
```json
{
  "extends": ["@commitlint/config-conventional"],
  "rules": {
    "scope-enum": [2, "always", ["game-logic", "bot-engine", "mobile", "server", "shared", "ci", "deps"]],
    "subject-case": [2, "always", "lower-case"]
  }
}
```

Exemples de commits valides :
- `feat(game-logic): add trick evaluation`
- `fix(bot-engine): correct bidding threshold for hard difficulty`
- `test(game-logic): add scoring edge cases for capot`
- `chore(deps): update expo sdk to 53`

---

## Sécurité — Checklist OWASP Mobile

Mesures à appliquer dès la Phase 1 :

1. **Pas de secrets dans le bundle JS** — Aucune clé API, token, ou mot de passe dans le code source
2. **Stockage sécurisé** — Utiliser `expo-secure-store` pour les données sensibles (tokens Phase 2), `AsyncStorage` uniquement pour les préférences non sensibles
3. **Validation des entrées** — Toute donnée chargée depuis le stockage ou le réseau est validée avec Zod
4. **Dépendances à jour** — `npm audit` + Snyk en CI, Dependabot activé sur le repo GitHub
5. **Gitleaks en pre-commit** — Empêche de committer des secrets accidentellement
6. **Pas de `eval()` ou `new Function()`** — Jamais d'exécution dynamique de code

Mesures supplémentaires pour la Phase 2 (multijoueur) :
- Serveur Colyseus autoritaire (le client ne peut pas tricher)
- Rate limiting sur les connexions WebSocket
- Validation côté serveur de chaque action (le client envoie des intentions, le serveur valide)
- HTTPS/WSS obligatoire

---

## Plan d'implémentation — Phase 1 (MVP hors-ligne)

### Étape 1 : Setup du monorepo et outillage
- Initialiser le monorepo Turborepo + pnpm
- Configurer les workspaces (`packages/*`, `apps/*`)
- Setup TypeScript configs partagés (`tsconfig.base.json`, `@total-typescript/ts-reset`)
- Setup ESLint flat config + tous les plugins (TS, React, React Native, import-sort, unused-imports)
- Setup Prettier + intégration ESLint (`eslint-config-prettier`)
- Setup Husky + lint-staged + commitlint (Conventional Commits)
- Setup Gitleaks en pre-commit hook
- Setup Knip pour la détection de code mort
- Setup Syncpack pour la cohérence des versions
- Configurer Vitest pour les packages TS purs (`game-logic`, `bot-engine`)
- Configurer Jest + jest-expo pour l'app Expo
- Créer l'app Expo avec Expo Router
- Vérifier que `pnpm dev` lance l'app sur web et mobile
- Vérifier que `pnpm turbo test`, `pnpm turbo lint`, `pnpm turbo typecheck` fonctionnent

### Étape 2 : Package `game-logic`
- Définir tous les types (`Card`, `Suit`, `Rank`, `Player`, `Team`, `GamePhase`, etc.)
- Implémenter `deck.ts` : création du deck 32 cartes, mélange (Fisher-Yates), distribution
- Implémenter `rules.ts` : calculer les cartes jouables selon les règles (fournir, couper, monter, défausser)
- Implémenter `trick.ts` : évaluer qui gagne un pli
- Implémenter `scoring.ts` : compter les points, gérer Belote/Rebelote, Dix de der, Capot, chute
- Écrire les tests unitaires pour chaque module (couverture > 90%)

### Étape 3 : State machine XState
- Implémenter la machine à états complète dans `machine.ts`
- Tous les états : idle → dealing → bidding → playing → trickEnd → roundScoring → gameOver
- Les guards : `isValidPlay`, `trickComplete`, `allPassed`, `gameNotOver`, etc.
- Les actions : `dealCards`, `playCard`, `scoreTrick`, `calculateRoundScore`, etc.
- Tests unitaires de la machine (simuler des parties complètes)

### Étape 4 : Package `bot-engine`
- Implémenter le bot facile (jeu aléatoire légal)
- Implémenter le bot moyen (heuristiques de base)
- Implémenter le bot difficile (comptage de cartes, stratégie avancée)
- Implémenter la stratégie d'enchères par niveau
- Tests unitaires

### Étape 5 : UI — Écrans et navigation
- Écran d'accueil (menu principal : Jouer, Paramètres, Règles)
- Écran de paramètres (difficulté, son, style, score objectif)
- Navigation avec Expo Router
- Thème et constantes visuelles

### Étape 6 : UI — GameBoard (Skia)
- Rendu du tapis de jeu (fond vert)
- Rendu d'une carte (image Skia + ombre)
- Position des 4 joueurs (sud = humain, nord = partenaire bot, est/ouest = adversaires)
- Main du joueur en éventail
- Dos des cartes pour les adversaires
- Zone centrale pour le pli
- Indicateur d'atout + scores

### Étape 7 : Animations et interactions
- Animation de distribution
- Tap pour jouer une carte
- Griser les cartes non jouables
- Animation de jeu de carte (main → centre)
- Animation de ramassage du pli
- Délai réaliste pour les bots (500-1000ms)
- Sons (optionnel)

### Étape 8 : Game Controller (orchestration)
- Hook `useGameController` qui :
  - Crée et pilote la machine XState
  - Gère le tour du joueur humain (attend le tap)
  - Déclenche les bots automatiquement quand c'est leur tour
  - Synchronise l'état du jeu avec les animations
  - Gère les transitions entre enchères et jeu
  - Gère la fin de manche et la fin de partie

### Étape 9 : Tests d'intégration et E2E
- Tests d'intégration : simuler des parties complètes (enchères → 8 plis → scoring)
- Tests de composants avec React Native Testing Library
- Tests E2E avec Maestro (flows complets : démarrer une partie, jouer, vérifier le score)
- Vérifier le responsive (web desktop + mobile)

### Étape 10 : CI/CD et polish
- Mettre en place la pipeline GitHub Actions (CI : lint, typecheck, tests, sécurité)
- Configurer EAS Build pour les builds mobiles
- Gestion des edge cases (redistribution si personne ne prend, etc.)
- Persistence de l'état (préférences + statistiques) avec AsyncStorage + validation Zod
- Lancer Knip et nettoyer tout code mort
- Lancer `npm audit` + Snyk et résoudre les vulnérabilités

---

## Conventions de code

- **TypeScript strict** : `strict: true`, pas de `any`
- **Nommage** :
  - Fichiers : `kebab-case.ts` pour les modules, `PascalCase.tsx` pour les composants React
  - Variables/fonctions : `camelCase`
  - Types/Interfaces : `PascalCase`
  - Constantes : `UPPER_SNAKE_CASE`
- **Exports** : named exports uniquement (pas de `export default`)
- **Packages purs** : `game-logic` et `bot-engine` n'importent JAMAIS de React, React Native, ou quoi que ce soit lié à l'UI
- **Tests** : chaque module de `game-logic` et `bot-engine` a un fichier de test correspondant
- **Commentaires** : en français pour le domaine métier (noms des concepts de Belote), en anglais pour le code technique

---

## Notes importantes

1. **Commencer par `game-logic`** : c'est le cœur du projet. Si les règles sont bien implémentées et testées, tout le reste en découle.
2. **Les bots sont des fonctions pures** : `(gameView, difficulty) → action`. Pas d'état interne, pas d'effets de bord. Facile à tester et à réutiliser côté serveur.
3. **La machine XState est la source de vérité** : toute la logique de transition passe par elle. L'UI ne fait que refléter l'état actuel et envoyer des événements.
4. **Penser multijoueur dès le début** : même si Phase 2, la séparation `game-logic` / `bot-engine` / `mobile` prépare déjà le terrain. Le serveur Colyseus importera `game-logic` tel quel.
5. **Le sens de jeu** est dans le sens des aiguilles d'une montre.
