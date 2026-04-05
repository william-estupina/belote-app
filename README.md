# Belote

Application de **Belote française** (jeu de cartes à 4 joueurs, 2 équipes de 2) fonctionnant sur iOS, Android et Web avec un seul codebase.

## Démarrage rapide

```bash
# Lancer l'app sur l'émulateur Android (WSL → émulateur Windows)
pnpm mobile:android:start
```

> Démarre l'émulateur si besoin, installe la dev build si absente, lance Metro, et ouvre l'app.
> Pour forcer un rebuild natif : `BELOTE_ANDROID_FORCE_INSTALL=1 pnpm mobile:android:start`

```bash
# Lancer l'app dans le navigateur
pnpm dev:web
```

## Technologies

| Couche                   | Technologie                          | Version  |
| ------------------------ | ------------------------------------ | -------- |
| Framework app            | **Expo SDK 54** + **Expo Router v6** | SDK 54   |
| Langage                  | **TypeScript** (strict mode)         | 5.7+     |
| Rendu du jeu             | **@shopify/react-native-skia**       | 2.x      |
| Animations               | **react-native-reanimated**          | v4       |
| Gestes                   | **react-native-gesture-handler**     | v2       |
| Machine à états          | **XState**                           | v5       |
| État applicatif          | **Zustand**                          | v4+      |
| Monorepo                 | **Turborepo** + **pnpm** workspaces  | -        |
| Tests unitaires (TS pur) | **Vitest**                           | 2.x      |
| Tests unitaires (Expo)   | **Jest** + **jest-expo**             | 29+ / 54 |
| Tests composants         | **React Native Testing Library**     | 12+      |
| Tests E2E (web)          | **Playwright**                       | 1.x      |
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

### Pour le workflow Android WSL-first

- travailler depuis **WSL** dans le repo Linux
- avoir **Android Studio** et le **SDK Android** installes sous Windows
- disposer d'un AVD Android, par defaut `belote-api35`
- laisser le bridge utiliser un miroir technique Windows court, par defaut `%USERPROFILE%\\projects\\belote-android-bridge`

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
pnpm dev:web
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

#### Tests E2E (web)

Les tests E2E utilisent Playwright sur un build statique web (`expo export`).

```bash
# Lancer les tests e2e en headless (build + test automatique)
pnpm --filter @belote/mobile test:e2e

# Lancer avec l'interface visuelle (navigateur visible)
cd apps/mobile
npx expo export --platform web        # Build statique dans dist/
npx playwright test --headed           # Tests avec navigateur visible

# Lancer sur un seul projet (desktop ou mobile)
npx playwright test --project=desktop-chromium --headed
npx playwright test --project=mobile-chrome --headed

# Mode debug (pas-à-pas avec Playwright Inspector)
npx playwright test --debug

# Mode UI (interface graphique Playwright)
npx playwright test --ui
```

#### Tests E2E (mobile natif)

Les tests E2E mobiles utilisent `Maestro` et des flows declares dans `apps/mobile/.maestro/`.

Important :

- `Maestro` automatise des parcours E2E une fois que l'application tourne deja sur un emulateur ou un appareil
- `Maestro` ne remplace ni l'emulateur Android, ni l'installation initiale de l'application, ni Metro

Prerequis locaux :

- CLI `maestro` disponible dans le `PATH`
- emulateur Android lance, ou appareil Android visible par `adb`
- application Expo installee et lancable sur Android

Commandes :

```bash
# Verifier la syntaxe des flows Maestro
pnpm mobile:test:e2e:check

# Lancer tous les flows Maestro Android
pnpm mobile:test:e2e:android
```

Flows initiaux disponibles :

- `apps/mobile/.maestro/accueil.yaml`
- `apps/mobile/.maestro/partie.yaml`
- `apps/mobile/.maestro/parametres.yaml`
- `apps/mobile/.maestro/regles.yaml`

Notes :

- les parcours s'appuient d'abord sur des `testID` React Native pour rester stables
- dans un checkout Windows via chemin UNC (`\\\\wsl.localhost\\...`), les scripts Maestro passent par PowerShell pour eviter les limites de `cmd.exe`

### Workflow Android WSL-first

Si vous developpez depuis WSL et voulez voir rapidement l'app sur un emulateur Android Windows, utilisez les commandes suivantes depuis la racine du repo WSL :

```bash
# Demarrer l'emulateur Android Windows et attendre le boot
pnpm mobile:emulator:start

# Verifier l'etat vu par adb
pnpm mobile:emulator:status

# Synchroniser le repo WSL vers le miroir Windows court
pnpm mobile:android:sync

# Builder et installer la dev build Android sans lancer Metro
pnpm mobile:android:install

# Demarrer Metro dans WSL pour le dev client
pnpm mobile:android:dev

# Ouvrir l'application deja installee sur l'emulateur
pnpm mobile:android:open
```

Commande confort :

```bash
# Demarre l'emulateur, synchronise le bridge, installe l'app,
# lance Metro puis ouvre l'application.
# Si la dev build est deja installee, le rebuild est saute.
pnpm mobile:android:start
```

Le bridge Android :

- garde WSL comme source de verite
- synchronise le code vers un dossier Windows court pour eviter les problemes Gradle/CMake/Ninja sur `\\\\wsl.localhost\\...`
- lance l'app Android depuis ce miroir Windows uniquement pour le build natif
- reutilise la dev build deja installee pour les relances rapides

Pour forcer un rebuild natif :

```bash
pnpm mobile:android:install

# ou, ponctuellement
BELOTE_ANDROID_FORCE_INSTALL=1 pnpm mobile:android:start
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
# Reproduire localement le bundling Android du build distant
pnpm --filter @belote/mobile verifier:bundle:android
pnpm mobile:verifier:bundle:android

# Build Android (nécessite un compte Expo et EAS CLI)
pnpm --filter @belote/mobile build:android
pnpm --filter @belote/mobile build:android:apk
pnpm mobile:build:android
pnpm mobile:build:android:apk

# Build iOS (nécessite macOS + Xcode)
pnpm --filter @belote/mobile build:ios
pnpm mobile:build:ios
```

### Build preview Android depuis GitHub Actions

Un workflow manuel GitHub Actions permet de verifier le repo puis de lancer un build EAS Android `preview` pour recuperer un APK sur telephone.

Pre-requis:

- ajouter le secret GitHub Actions `EXPO_TOKEN`
- ce token doit avoir acces au projet Expo lie dans `apps/mobile/app.json`

Parcours:

1. Ouvrir l'onglet `Actions` du repository
2. Choisir le workflow `Build preview Android`
3. Cliquer sur `Run workflow`
4. Attendre la fin des verifications (`pnpm lint`, `pnpm turbo typecheck test`)
5. Recuperer le lien Expo du build et le QR code dans le `Job summary`

Le QR code pointe vers l'URL directe de l'APK quand EAS la fournit, sinon vers la page Expo du build.

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

Depuis WSL, le plus fiable est d'utiliser le bridge Android :

```bash
pnpm mobile:android:start
```

Si vous preferez les commandes detaillees :

```bash
pnpm mobile:emulator:start
pnpm mobile:android:install
pnpm mobile:android:dev
pnpm mobile:android:open
```

### Option 3 : Simulateur iOS (macOS uniquement)

1. Ouvrir Xcode et lancer un simulateur
2. Lancer le serveur :
   ```bash
   pnpm dev
   ```
3. Appuyer sur `i` dans le terminal pour ouvrir sur le simulateur iOS

### Option 4 : Build natif avec EAS

```bash
# Installer EAS CLI
npm install -g eas-cli

# Se connecter à Expo
eas login

# Depuis la racine du monorepo, cibler explicitement l'app mobile
pnpm --filter @belote/mobile verifier:bundle:android
pnpm --filter @belote/mobile build:android:apk
pnpm mobile:verifier:bundle:android
pnpm mobile:build:android:apk

# Ou, depuis apps/mobile
cd apps/mobile
npx expo export:embed --eager --platform android --dev false
eas build --platform android --profile preview
```

## Lancer l'app sur le web

```bash
pnpm dev:web
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
