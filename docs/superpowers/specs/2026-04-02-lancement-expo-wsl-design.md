# Correction du lancement Expo via WSL

## Contexte

Le projet Belote est developpe depuis Windows sur un workspace WSL expose en chemin UNC `\\wsl.localhost\...`.

Dans cette configuration, `pnpm dev` et `pnpm dev:web` lancent aujourd'hui `expo start` via un processus Node Windows sur des fichiers Linux. Le premier chargement de l'accueil peut alors prendre plusieurs dizaines de secondes, alors que l'ecran d'accueil lui-meme reste tres leger.

Le besoin valide est de reduire ce temps de demarrage percu sans changer la logique metier, l'UI ou le bundling de production.

## Decision retenue

La correction cible le mode de lancement de l'outil de dev, pas le code de l'application.

Les scripts `dev`, `dev:web`, `dev:android` et `dev:ios` du package mobile passent par un lanceur Node dedie qui :

- detecte un lancement Windows sur un chemin UNC WSL
- convertit ce chemin en chemin Linux
- delegue `pnpm exec expo ...` a `wsl.exe`
- conserve le comportement direct actuel hors de ce cas

## Solution

### `apps/mobile/scripts/lancer-expo.cjs`

- convertir un chemin `\\wsl.localhost\<distro>\...` en couple `{ distribution, cheminLinux }`
- construire soit une commande `wsl.exe ... pnpm exec expo ...`, soit une commande `pnpm exec expo ...`
- reutiliser `npm_package_json` pour retrouver le vrai repertoire du package si necessaire

### `apps/mobile/package.json`

- faire passer `dev`, `dev:web`, `dev:android` et `dev:ios` par le lanceur
- conserver les arguments Expo existants, notamment `--host lan` pour le web

### Tests

- ajouter un test cible sur la conversion du chemin UNC et la commande construite
- figer le fallback hors WSL pour eviter une regression sur un environnement classique

## Criteres de succes

La correction est reussie si :

- `pnpm dev` et `pnpm dev:web` deleguent Expo a WSL lorsqu'ils sont lances depuis Windows sur `\\wsl.localhost\...`
- le comportement ne change pas hors chemin UNC WSL
- le test du lanceur passe
