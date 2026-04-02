# Bridge Android WSL-first Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permettre depuis WSL de demarrer l'emulateur Android Windows, synchroniser un miroir de build court, installer l'application et l'ouvrir rapidement sur l'emulateur.

**Architecture:** Un script Node unique orchestre les conversions de chemins, la synchronisation du repo vers Windows, le pilotage de l'emulateur via `adb.exe`/`emulator.exe`, puis le lancement de Metro dans WSL. Les commandes `pnpm` racine appellent ce bridge et des tests unitaires verrouillent les decisions de configuration.

**Tech Stack:** Node.js CommonJS, Jest, Expo CLI, PowerShell, robocopy, Android SDK

---

## Structure des fichiers

- Create: `apps/mobile/scripts/android-bridge.cjs`
  Role: orchestrer le workflow Android WSL-first.
- Create: `apps/mobile/__tests__/android-bridge.test.ts`
  Role: verrouiller les helpers purs du bridge.
- Modify: `package.json`
  Role: exposer les nouvelles commandes utilisateur.
- Modify: `README.md`
  Role: documenter le workflow Android WSL-first et la place de Maestro.
- Modify: `AVANCEMENT.md`
  Role: tracer cette progression significative.
- Create: `docs/superpowers/specs/2026-04-02-bridge-android-wsl-design.md`
  Role: documenter la decision d'architecture.

### Task 1: Ecrire les tests rouges du bridge

**Files:**

- Create: `apps/mobile/__tests__/android-bridge.test.ts`

- [ ] **Step 1: Ecrire le test de conversion Linux -> UNC WSL**

```ts
it("convertit un chemin Linux absolu en chemin UNC WSL", () => {
  expect(
    convertirCheminLinuxVersUncWsl(
      "/home/westupina/projects/belote",
      "Ubuntu-24.04",
    ),
  ).toBe("\\\\wsl.localhost\\Ubuntu-24.04\\home\\westupina\\projects\\belote");
});
```

- [ ] **Step 2: Ecrire le test de conversion Windows -> /mnt**

```ts
it("convertit un chemin Windows en chemin monte WSL", () => {
  expect(
    convertirCheminWindowsVersLinuxMonte("C:\\Users\\lemar\\projects\\belote"),
  ).toBe("/mnt/c/Users/lemar/projects/belote");
});
```

- [ ] **Step 3: Ecrire le test de configuration par defaut**

```ts
it("construit la configuration par defaut du bridge", () => {
  expect(
    construireConfigurationBridge({
      env: {},
      repertoireRacine: "/home/westupina/projects/belote",
      distributionWsl: "Ubuntu-24.04",
      userProfileWindows: "C:\\Users\\lemar",
    }),
  ).toMatchObject({
    avd: "belote-api35",
    serial: "emulator-5554",
    portMetro: 8081,
    cheminBridgeWindows: "C:\\Users\\lemar\\projects\\belote-android-bridge",
  });
});
```

- [ ] **Step 4: Ecrire le test de la logique d'installation conditionnelle**

```ts
it("relance pnpm install si l'empreinte change", () => {
  expect(
    doitInstallerDependances({
      empreinteCourante: "nouvelle",
      empreintePrecedente: "ancienne",
      nodeModulesPresent: true,
    }),
  ).toBe(true);
});
```

- [ ] **Step 5: Ecrire le test du script PowerShell de synchronisation**

```ts
it("construit un script robocopy avec source UNC et destination Windows", () => {
  const script = construireScriptPowerShellSynchronisation({
    cheminSourceUnc: "\\\\wsl.localhost\\Ubuntu-24.04\\home\\westupina\\projects\\belote",
    cheminBridgeWindows: "C:\\Users\\lemar\\projects\\belote-android-bridge",
  });

  expect(script).toContain("robocopy");
  expect(script).toContain("\\\\wsl.localhost\\Ubuntu-24.04\\home\\westupina\\projects\\belote");
  expect(script).toContain("C:\\Users\\lemar\\projects\\belote-android-bridge");
});
```

- [ ] **Step 6: Lancer le test pour verifier l'echec**

Run:

```bash
pnpm --filter @belote/mobile test -- --runTestsByPath __tests__/android-bridge.test.ts
```

Expected: FAIL car `apps/mobile/scripts/android-bridge.cjs` n'existe pas encore

### Task 2: Implementer le bridge Android

**Files:**

- Create: `apps/mobile/scripts/android-bridge.cjs`

- [ ] **Step 1: Ajouter les helpers purs**

Implementer :

- `convertirCheminLinuxVersUncWsl`
- `convertirCheminWindowsVersLinuxMonte`
- `construireConfigurationBridge`
- `doitInstallerDependances`
- `construireScriptPowerShellSynchronisation`

- [ ] **Step 2: Ajouter la gestion des empreintes de dependances**

Implementer :

- le calcul d'empreinte sur `pnpm-lock.yaml` et les `package.json` du workspace
- la lecture/ecriture du fichier d'etat dans le miroir Windows

- [ ] **Step 3: Ajouter l'orchestration Windows**

Implementer :

- le demarrage de l'emulateur
- l'attente `adb wait-for-device` + `sys.boot_completed`
- la synchronisation `robocopy`
- l'installation via `pnpm install --frozen-lockfile` puis `expo run:android --no-bundler --no-install`
- l'ouverture de l'app avec `adb shell am start`

- [ ] **Step 4: Ajouter le demarrage Metro depuis WSL**

Implementer :

- la creation de la commande Expo `start --dev-client --localhost`
- le polling de `http://127.0.0.1:<port>/status`
- l'ouverture automatique de l'app une fois Metro pret dans `android-start`

### Task 3: Exposer les commandes utilisateur

**Files:**

- Modify: `package.json`

- [ ] **Step 1: Ajouter les scripts racine**

Ajouter :

```json
{
  "mobile:emulator:start": "node ./apps/mobile/scripts/android-bridge.cjs emulator-start",
  "mobile:emulator:status": "node ./apps/mobile/scripts/android-bridge.cjs emulator-status",
  "mobile:android:sync": "node ./apps/mobile/scripts/android-bridge.cjs android-sync",
  "mobile:android:install": "node ./apps/mobile/scripts/android-bridge.cjs android-install",
  "mobile:android:open": "node ./apps/mobile/scripts/android-bridge.cjs android-open",
  "mobile:android:dev": "node ./apps/mobile/scripts/android-bridge.cjs android-dev",
  "mobile:android:start": "node ./apps/mobile/scripts/android-bridge.cjs android-start"
}
```

- [ ] **Step 2: Verifier que les scripts existants restent inchanges**

Conserver :

- `pnpm dev`
- `pnpm dev:web`
- `pnpm mobile:test:e2e:check`
- `pnpm mobile:test:e2e:android`

### Task 4: Documenter le workflow

**Files:**

- Modify: `README.md`
- Modify: `AVANCEMENT.md`

- [ ] **Step 1: Documenter le role de Maestro**

Expliquer que Maestro automatise les parcours E2E mobiles, mais ne remplace ni l'emulateur ni l'installation initiale de l'app.

- [ ] **Step 2: Documenter les commandes Android WSL-first**

Ajouter un parcours minimal :

```bash
pnpm mobile:android:start
pnpm mobile:test:e2e:android
```

- [ ] **Step 3: Reporter l'avancee dans AVANCEMENT**

Ajouter une entree recente mentionnant le bridge Android WSL-first, le miroir Windows court et les commandes de lancement.

### Task 5: Verifier puis commit

**Files:**

- Modify: aucun fichier supplementaire attendu

- [ ] **Step 1: Relancer les tests cibles**

Run:

```bash
pnpm --filter @belote/mobile test -- --runTestsByPath __tests__/lancer-expo.test.ts __tests__/android-bridge.test.ts
```

Expected: PASS

- [ ] **Step 2: Verifier le typecheck mobile**

Run:

```bash
pnpm --filter @belote/mobile typecheck
```

Expected: PASS

- [ ] **Step 3: Verifier les nouvelles commandes sans build complet**

Run:

```bash
node ./apps/mobile/scripts/android-bridge.cjs emulator-status
node ./apps/mobile/scripts/android-bridge.cjs android-sync
```

Expected: commandes executees sans erreur de syntaxe ni de resolution de chemins

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/specs/2026-04-02-bridge-android-wsl-design.md docs/superpowers/plans/2026-04-02-bridge-android-wsl.md package.json README.md AVANCEMENT.md apps/mobile/scripts/android-bridge.cjs apps/mobile/__tests__/android-bridge.test.ts
git commit -m "feat(mobile): ajouter le bridge android depuis wsl"
```
