# CI preview Android manuelle Design

## Objectif

Ajouter une premiere CI GitHub centree sur un seul usage pratique: declencher manuellement un build Android `preview` avec EAS depuis GitHub, mais seulement apres une phase de verification bloquante sur le monorepo.

L'utilisateur pousse directement sur `main`, donc il n'y a pas de flux PR a prendre en charge pour le moment.

## Contraintes

- Le build doit etre lance uniquement a la demande depuis GitHub Actions
- Le workflow doit echouer avant le build si le lint, le typecheck ou les tests echouent
- Le build doit reutiliser le profil `preview` deja configure dans `apps/mobile/eas.json`
- Le resultat doit etre simple a utiliser depuis un telephone Android
- GitHub doit afficher a la fin un lien vers le build et un QR code exploitable pour recuperer l'APK

## Architecture retenue

Un seul workflow GitHub Actions `workflow_dispatch` est ajoute dans `.github/workflows/build-preview.yml`.

Ce workflow contient trois etapes logiques:

1. preparation de l'environnement CI
2. verification bloquante du monorepo
3. build EAS Android preview, puis synthese du resultat dans le resume du job

Le workflow s'executera sur `ubuntu-latest`, installera Node et pnpm, puis lancera:

- `pnpm install --frozen-lockfile`
- `pnpm lint`
- `pnpm turbo typecheck test`

Si ces commandes passent, GitHub installera l'outillage Expo/EAS via `expo/expo-github-action`, puis lancera un build Android `preview` depuis `apps/mobile`.

## Recuperation du lien de build

Le workflow executera `eas build --platform android --profile preview --non-interactive --wait --json`.

Le JSON retourne sera capture dans un fichier temporaire puis analyse par une petite etape Node inline afin d'extraire:

- l'identifiant du build
- l'URL de details Expo du build
- l'URL directe de l'APK si elle est exposee dans les artefacts

Le parsing restera defensif pour tolerer les variations de structure entre versions mineures du CLI.

## Affichage du QR code

Pour eviter les problemes d'affichage d'images locales dans le summary GitHub, le workflow generera un QR code ASCII a partir de l'URL directe de l'APK.

Ce QR code sera ajoute dans `GITHUB_STEP_SUMMARY` dans un bloc monospace, avec:

- le statut du build
- le lien cliquable vers la page Expo du build
- l'URL directe de l'APK
- le QR code ASCII a scanner

Si l'URL directe de l'APK est absente, le workflow affichera au minimum le lien de details du build et le signalera clairement dans le summary.

## Secrets et pre-requis

Le repository GitHub devra definir:

- `EXPO_TOKEN`: token Expo/EAS autorise a lancer les builds sur le projet lie a `apps/mobile/app.json`

Le projet EAS est deja relie via `expo.extra.eas.projectId`, donc aucun changement de configuration Expo n'est requis pour cette premiere iteration.

## Impact repo

Fichiers a ajouter ou modifier:

- creer `.github/workflows/build-preview.yml`
- mettre a jour `README.md` pour documenter le bouton GitHub Actions et le secret `EXPO_TOKEN`
- mettre a jour `AVANCEMENT.md` pour refleter le demarrage de la CI/CD

## Verification prevue

- validation YAML du workflow via linter GitHub implicite lors de l'execution
- verification locale des fichiers modifies via `pnpm lint` et `pnpm turbo typecheck test`
- controle manuel du diff Git avant commit
