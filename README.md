# Belote

Application de **Belote française** (jeu de cartes à 4 joueurs, 2 équipes de 2) fonctionnant sur iOS, Android et Web avec un seul codebase.

## Technologies

| Couche                   | Technologie                          | Version  |
| ------------------------ | ------------------------------------ | -------- |
| Framework app            | **Expo SDK 52** + **Expo Router v4** | SDK 52   |
| Langage                  | **TypeScript** (strict mode)         | 5.7+     |
| Rendu du jeu             | **@shopify/react-native-skia**       | 1.x      |
| Animations               | **react-native-reanimated**          | v3       |
| Gestes                   | **react-native-gesture-handler**     | v2       |
| Machine à états          | **XState**                           | v5       |
| État applicatif          | **Zustand**                          | v4+      |
| Monorepo                 | **Turborepo** + **pnpm** workspaces  | -        |
| Tests unitaires (TS pur) | **Vitest**                           | 2.x      |
| Tests unitaires (Expo)   | **Jest** + **jest-expo**             | 29+ / 52 |
| Tests composants         | **React Native Testing Library**     | 12+      |
| Tests E2E                | **Maestro**                          | 1.x      |
| Validation runtime       | **Zod**                              | v3       |

### Qualité et sécurité

| Outil                       | Rôle                                                  |
| --------------------------- | ----------------------------------------------------- |
| **ESLint** (flat config)    | Linting TS, React, import-sort, unused-imports        |
| **Prettier**                | Formatage automatique                                 |
| **Husky** + **lint-staged** | Hooks git (pre-commit)                                |
| **commitlint**              | Conventional Commits (`feat:`, `fix:`, `test:`, etc.) |
| **Gitleaks**                | Scan des secrets en pre-commit                        |
| **Knip**                    | Détection de code mort                                |
| **Syncpack**                | Cohérence des versions dans le monorepo               |

## Structure du monorepo

```
belote/
├── apps/
│   └── mobile/               # App Expo (iOS, Android, Web)
├── packages/
│   ├── game-logic/            # Logique métier (pur TS, aucune dépendance UI)
│   ├── bot-engine/            # IA des bots (pur TS, 3 niveaux de difficulté)
│   └── shared-types/          # Types TypeScript partagés
└── tooling/
    ├── eslint-config/         # Config ESLint partagée
    └── tsconfig/              # Configs TypeScript partagées
```

## Prérequis

- **Node.js** >= 18
- **pnpm** >= 10 (`npm install -g pnpm`)
- **Expo CLI** (`npx expo` — inclus avec le SDK)
- **Gitleaks** (optionnel, pour le scan de secrets) — [Installation](https://github.com/gitleaks/gitleaks#installing)

### Pour le développement mobile

- **iOS** : macOS + Xcode + iOS Simulator
- **Android** : Android Studio + un émulateur ou un appareil physique
- **Expo Go** : installer l'app [Expo Go](https://expo.dev/go) sur votre téléphone pour tester sans build natif

## Installation

```bash
# Cloner le repo
git clone https://github.com/william-estupina/belote-app.git
cd belote-app

# Installer les dépendances
pnpm install
```

## Commandes principales

### Développement

```bash
# Lancer l'app (serveur Metro — scannez le QR code avec Expo Go)
pnpm dev

# Lancer uniquement en web
pnpm --filter @belote/mobile dev:web

# Lancer uniquement l'app mobile
pnpm --filter @belote/mobile dev
```

### Tests

```bash
# Tous les tests (game-logic + bot-engine + mobile)
pnpm turbo test

# Tests d'un package spécifique
pnpm --filter @belote/game-logic test
pnpm --filter @belote/bot-engine test
pnpm --filter @belote/mobile test

# Tests en mode watch
pnpm --filter @belote/game-logic test:watch
pnpm --filter @belote/bot-engine test:watch

# Couverture de code (game-logic)
pnpm --filter @belote/game-logic test:coverage
```

### Qualité de code

```bash
# Vérification TypeScript
pnpm turbo typecheck

# Linting ESLint
pnpm turbo lint

# Formatage Prettier
pnpm format              # Formater tout
pnpm format:check        # Vérifier le formatage

# Détection de code mort
pnpm knip

# Cohérence des versions
pnpm syncpack:check
```

### Build mobile

```bash
# Build Android (nécessite un compte Expo et EAS CLI)
pnpm --filter @belote/mobile build:android

# Build iOS (nécessite macOS + Xcode)
pnpm --filter @belote/mobile build:ios
```

## Lancer l'app sur mobile

### Option 1 : Expo Go (le plus simple)

1. Installer [Expo Go](https://expo.dev/go) sur votre téléphone
2. Lancer le serveur de dev :
   ```bash
   pnpm dev
   ```
3. Scanner le QR code affiché dans le terminal avec :
   - **iOS** : l'app Appareil photo
   - **Android** : l'app Expo Go

### Option 2 : Émulateur Android

1. Ouvrir Android Studio et lancer un émulateur
2. Lancer le serveur :
   ```bash
   pnpm --filter @belote/mobile dev
   ```
3. Appuyer sur `a` dans le terminal pour ouvrir sur l'émulateur Android

### Option 3 : Simulateur iOS (macOS uniquement)

1. Ouvrir Xcode et lancer un simulateur
2. Lancer le serveur :
   ```bash
   pnpm --filter @belote/mobile dev
   ```
3. Appuyer sur `i` dans le terminal pour ouvrir sur le simulateur iOS

### Option 4 : Build natif avec EAS

```bash
# Installer EAS CLI
npm install -g eas-cli

# Se connecter à Expo
eas login

# Build de développement (génère un APK/IPA installable)
eas build --profile development --platform android
eas build --profile development --platform ios
```

## Lancer l'app sur le web

```bash
pnpm --filter @belote/mobile dev:web
```

Ouvrir [http://localhost:8081](http://localhost:8081) dans le navigateur.

## Conventions

- **Code en français** : variables, fonctions, types, commentaires
- **Fichiers** : `kebab-case.ts` pour les modules, `PascalCase.tsx` pour les composants React
- **Commits** : [Conventional Commits](https://www.conventionalcommits.org/) avec scopes : `game-logic`, `bot-engine`, `mobile`, `server`, `shared`, `ci`, `deps`
  ```
  feat(game-logic): ajouter l'évaluation du pli
  fix(bot-engine): corriger le seuil d'enchères du bot difficile
  test(game-logic): ajouter les cas limites du capot
  ```

## Licence

Projet privé.
