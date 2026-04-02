# Workflow Android WSL-first avec bridge Windows

## Contexte

Le projet Belote est developpe principalement depuis WSL, mais le rendu Android repose sur un emulateur et une toolchain natifs Windows.

Un lancement direct du build Android depuis `\\wsl.localhost\...` ou depuis un chemin Linux profond est fragile pour trois raisons :

- `cmd.exe`, Gradle et certains outils Android supportent mal les chemins UNC WSL comme repertoire de travail
- les chemins generes par CMake/Ninja deviennent vite trop longs
- un simple lien symbolique Windows vers WSL ne supprime ni la nature UNC du chemin, ni les limites de longueur, ni les fragilites du file watching

Le besoin valide est de conserver WSL comme environnement principal de developpement, tout en obtenant une commande simple pour demarrer l'emulateur Android, installer l'application et l'ouvrir rapidement.

## Decision retenue

Le code source reste dans le repo WSL. Le build Android natif s'appuie sur un miroir technique Windows court et regenerable.

Le workflow ajoute un bridge Node execute depuis WSL qui :

- detecte la distribution WSL et construit le chemin UNC source
- synchronise le repo vers un dossier Windows court via `robocopy`
- demarre et sonde l'emulateur Android via les binaires Windows (`emulator.exe`, `adb.exe`)
- installe une dev build Android depuis le miroir Windows avec `expo run:android --no-bundler --no-install`
- demarre Metro dans WSL en mode `--dev-client --localhost`
- relance l'application sur l'emulateur une fois Metro disponible

## Solution

### Script central `apps/mobile/scripts/android-bridge.cjs`

Le script expose des sous-commandes dediees :

- `emulator-start`
- `emulator-status`
- `android-sync`
- `android-install`
- `android-open`
- `android-dev`
- `android-start`

Le script centralise :

- la resolution des chemins WSL, UNC et Windows montes
- la configuration par variables d'environnement optionnelles
- la synchronisation du miroir Windows
- le demarrage de Metro et l'ouverture de l'app

### Variables d'environnement optionnelles

Le bridge accepte des surcharges sans rendre la configuration obligatoire :

- `BELOTE_ANDROID_AVD`
- `BELOTE_ANDROID_SERIAL`
- `BELOTE_ANDROID_SDK_WINDOWS`
- `BELOTE_ANDROID_BRIDGE_WINDOWS`
- `BELOTE_ANDROID_APP_ID`
- `BELOTE_ANDROID_ACTIVITY`
- `BELOTE_ANDROID_METRO_PORT`

Par defaut :

- AVD : `belote-api35`
- serial : `emulator-5554`
- package Android : `com.chiienton.belote`
- activity : `.MainActivity`
- port Metro : `8081`
- bridge Windows : `%USERPROFILE%\\projects\\belote-android-bridge`

### Synchronisation WSL -> Windows

Le miroir Windows n'est jamais une source de verite. Il est traite comme un artefact local.

La synchronisation :

- part du chemin UNC `\\wsl.localhost\<distribution>\...`
- cible un chemin Windows court
- exclut les dossiers lourds ou generes (`.git`, `node_modules`, `.turbo`, `.worktrees`, `apps/mobile/android`, `apps/mobile/ios`, etc.)
- autorise la regeneration complete du miroir sans impact sur le repo WSL

### Gestion des dependances

Le bridge calcule une empreinte des manifests (`pnpm-lock.yaml` + `package.json` du workspace) et ne relance `pnpm install --frozen-lockfile` dans le miroir Windows que si cette empreinte change ou si `node_modules` est absent.

### Commandes utilisateur

Les scripts racine exposes sont :

- `pnpm mobile:emulator:start`
- `pnpm mobile:emulator:status`
- `pnpm mobile:android:sync`
- `pnpm mobile:android:install`
- `pnpm mobile:android:open`
- `pnpm mobile:android:dev`
- `pnpm mobile:android:start`

Le flux quotidien vise :

1. `pnpm mobile:android:start`
2. l'emulateur demarre
3. l'app s'installe si necessaire
4. Metro s'ouvre depuis WSL
5. l'application s'affiche sur l'emulateur

`Maestro` reste ensuite l'outil de tests E2E automatises. Il n'est pas responsable du demarrage de l'app.

## Tests

Des tests unitaires verrouillent :

- la conversion des chemins Linux -> UNC et Windows -> `/mnt/...`
- la configuration par defaut du bridge
- la logique de reinstallation conditionnelle des dependances
- la construction du script de synchronisation Windows

## Criteres de succes

La fonctionnalite est reussie si :

- un developpeur peut rester dans WSL pour coder et lancer le workflow Android
- l'emulateur Windows peut etre demarre via une commande du repo
- l'installation Android n'utilise plus le chemin UNC WSL comme dossier de build
- Metro peut etre lance depuis WSL puis l'app ouverte sur l'emulateur
- la documentation explique clairement a quoi sert Maestro par rapport au rendu rapide de l'application
