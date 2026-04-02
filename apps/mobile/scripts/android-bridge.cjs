const crypto = require("node:crypto");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { spawn, spawnSync } = require("node:child_process");

const { construireCommandeExpo } = require("./lancer-expo.cjs");

const NOM_FICHIER_ETAT = ".belote-android-bridge.json";
const DELAI_BOUCLE_MS = 2000;
const DELAI_BOOT_MS = 180000;
const DELAI_METRO_MS = 90000;

function convertirCheminLinuxVersUncWsl(cheminLinux, distributionWsl) {
  if (!path.posix.isAbsolute(cheminLinux)) {
    throw new Error(`Chemin Linux absolu attendu: ${cheminLinux}`);
  }

  const segments = cheminLinux.split("/").filter(Boolean);
  return `\\\\wsl.localhost\\${distributionWsl}\\${segments.join("\\")}`;
}

function convertirCheminWindowsVersLinuxMonte(cheminWindows) {
  const correspondance = cheminWindows.match(/^([A-Za-z]):\\(.*)$/);

  if (!correspondance) {
    throw new Error(`Chemin Windows avec lettre de lecteur attendu: ${cheminWindows}`);
  }

  const lecteur = correspondance[1].toLowerCase();
  const reste = correspondance[2].replace(/\\/g, "/");
  return `/mnt/${lecteur}/${reste}`;
}

function echapperPowerShell(valeur) {
  return valeur.replace(/'/g, "''");
}

function construireConfigurationBridge({
  env,
  repertoireRacine,
  distributionWsl,
  userProfileWindows,
}) {
  const cheminBridgeWindows =
    env.BELOTE_ANDROID_BRIDGE_WINDOWS ??
    path.win32.join(userProfileWindows, "projects", "belote-android-bridge");
  const sdkWindows =
    env.BELOTE_ANDROID_SDK_WINDOWS ??
    path.win32.join(userProfileWindows, "AppData", "Local", "Android", "Sdk");
  const packageAndroid = env.BELOTE_ANDROID_APP_ID ?? "com.chiienton.belote";
  const activite = env.BELOTE_ANDROID_ACTIVITY ?? ".MainActivity";
  const serial = env.BELOTE_ANDROID_SERIAL ?? env.ANDROID_SERIAL ?? "emulator-5554";
  const avd = env.BELOTE_ANDROID_AVD ?? "belote-api35";
  const portMetro = Number.parseInt(env.BELOTE_ANDROID_METRO_PORT ?? "8081", 10);

  return {
    activite,
    adbLinux: convertirCheminWindowsVersLinuxMonte(
      env.BELOTE_ANDROID_ADB_WINDOWS ??
        path.win32.join(sdkWindows, "platform-tools", "adb.exe"),
    ),
    adbWindows:
      env.BELOTE_ANDROID_ADB_WINDOWS ??
      path.win32.join(sdkWindows, "platform-tools", "adb.exe"),
    avd,
    cheminBridgeLinux: convertirCheminWindowsVersLinuxMonte(cheminBridgeWindows),
    cheminBridgeWindows,
    cheminProjetLinux: repertoireRacine,
    cheminProjetUnc: convertirCheminLinuxVersUncWsl(repertoireRacine, distributionWsl),
    emulatorLinux: convertirCheminWindowsVersLinuxMonte(
      env.BELOTE_ANDROID_EMULATOR_WINDOWS ??
        path.win32.join(sdkWindows, "emulator", "emulator.exe"),
    ),
    emulatorWindows:
      env.BELOTE_ANDROID_EMULATOR_WINDOWS ??
      path.win32.join(sdkWindows, "emulator", "emulator.exe"),
    packageAndroid,
    portMetro,
    serial,
  };
}

function doitInstallerDependances({
  empreinteCourante,
  empreintePrecedente,
  nodeModulesPresent,
}) {
  return !nodeModulesPresent || empreinteCourante !== empreintePrecedente;
}

function construireScriptPowerShellSynchronisation({
  cheminSourceUnc,
  cheminBridgeWindows,
}) {
  const source = echapperPowerShell(cheminSourceUnc);
  const destination = echapperPowerShell(cheminBridgeWindows);

  return `
$source = '${source}'
$destination = '${destination}'
$repertoiresExclus = @(
  '.git',
  'node_modules',
  '.turbo',
  '.worktrees',
  'coverage',
  'dist',
  'build',
  [System.IO.Path]::Combine($source, 'apps', 'mobile', 'android'),
  [System.IO.Path]::Combine($source, 'apps', 'mobile', 'ios')
)
New-Item -ItemType Directory -Path $destination -Force | Out-Null
$arguments = @(
  $source,
  $destination,
  '/MIR',
  '/FFT',
  '/R:2',
  '/W:1',
  '/NFL',
  '/NDL',
  '/NJH',
  '/NJS',
  '/NP',
  '/XD'
) + $repertoiresExclus
& robocopy @arguments | Out-Host
if ($LASTEXITCODE -gt 7) {
  exit $LASTEXITCODE
}
`.trim();
}

function construireArgumentsRobocopy({ cheminSourceUnc, cheminBridgeWindows }) {
  return [
    cheminSourceUnc,
    cheminBridgeWindows,
    "/MIR",
    "/FFT",
    "/R:2",
    "/W:1",
    "/NFL",
    "/NDL",
    "/NJH",
    "/NJS",
    "/NP",
    "/XD",
    ".git",
    "node_modules",
    ".turbo",
    ".worktrees",
    "coverage",
    "dist",
    "build",
    path.win32.join(cheminSourceUnc, "apps", "mobile", "android"),
    path.win32.join(cheminSourceUnc, "apps", "mobile", "ios"),
  ];
}

function construireScriptCmdInstallBridge({ cheminBridgeWindows }) {
  return [
    "@echo off",
    `cd /d "${cheminBridgeWindows}"`,
    "if errorlevel 1 exit /b %errorlevel%",
    "set HUSKY=0",
    "pnpm.cmd install --frozen-lockfile",
  ].join("\r\n");
}

function construireScriptCmdBuildAndroid({
  cheminBridgeWindows,
  serial,
}) {
  return [
    "@echo off",
    `cd /d "${cheminBridgeWindows}"`,
    "if errorlevel 1 exit /b %errorlevel%",
    "set CI=1",
    "set HUSKY=0",
    `set ANDROID_SERIAL=${serial}`,
    "pnpm.cmd --filter @belote/mobile exec expo run:android --no-install --no-bundler --variant debug",
  ].join("\r\n");
}

function executerCommandeSync(commande, args, options = {}) {
  const resultat = spawnSync(commande, args, {
    encoding: "utf8",
    stdio: options.stdio ?? "pipe",
    cwd: options.cwd,
    env: options.env,
  });

  if (resultat.error) {
    throw resultat.error;
  }

  if (resultat.status !== 0) {
    const details = [resultat.stdout, resultat.stderr].filter(Boolean).join("\n");
    throw new Error(details || `Echec de ${commande} ${args.join(" ")}`);
  }

  return {
    stderr: resultat.stderr ?? "",
    stdout: resultat.stdout ?? "",
  };
}

function executerScriptCmdTemporaire(contenuScript, prefixeNom) {
  const nomFichier = `${prefixeNom}-${Date.now()}-${Math.random()
    .toString(16)
    .slice(2)}.cmd`;
  const cheminWindows = path.win32.join(process.env.TEMP ?? "C:\\Windows\\Temp", nomFichier);
  const cheminLinux = convertirCheminWindowsVersLinuxMonte(cheminWindows);

  fs.writeFileSync(cheminLinux, `${contenuScript}\r\n`, "utf8");

  try {
    executerCommandeSync("cmd.exe", ["/d", "/c", cheminWindows], {
      stdio: "inherit",
    });
  } finally {
    if (fs.existsSync(cheminLinux)) {
      fs.unlinkSync(cheminLinux);
    }
  }
}

function estErreurAdbRecuperable(erreur) {
  const message =
    erreur instanceof Error ? erreur.message : typeof erreur === "string" ? erreur : "";

  return (
    /error:\s*closed/i.test(message) ||
    /device '.*' not found/i.test(message) ||
    /\bdevice offline\b/i.test(message)
  );
}

function obtenirUserProfileWindows() {
  return executerCommandeSync("cmd.exe", ["/d", "/c", "echo %USERPROFILE%"], {
    encoding: "utf8",
  }).stdout.trim();
}

function obtenirDistributionWsl() {
  const distribution = process.env.WSL_DISTRO_NAME;

  if (!distribution) {
    throw new Error(
      "Ces commandes Android sont prevues depuis WSL. WSL_DISTRO_NAME est introuvable.",
    );
  }

  return distribution;
}

function pause(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function listerFichiersPackageJson(repertoire) {
  if (!fs.existsSync(repertoire)) {
    return [];
  }

  const entrees = fs.readdirSync(repertoire, { withFileTypes: true });
  const resultats = [];

  for (const entree of entrees) {
    if (entree.name === "node_modules" || entree.name === ".turbo" || entree.name === ".git") {
      continue;
    }

    const cheminEntree = path.join(repertoire, entree.name);

    if (entree.isDirectory()) {
      resultats.push(...listerFichiersPackageJson(cheminEntree));
      continue;
    }

    if (entree.isFile() && entree.name === "package.json") {
      resultats.push(cheminEntree);
    }
  }

  return resultats;
}

function calculerEmpreinteDependances(repertoireRacine) {
  const hachage = crypto.createHash("sha1");
  const fichiers = [
    path.join(repertoireRacine, "pnpm-lock.yaml"),
    path.join(repertoireRacine, "package.json"),
    ...listerFichiersPackageJson(path.join(repertoireRacine, "apps")),
    ...listerFichiersPackageJson(path.join(repertoireRacine, "packages")),
    ...listerFichiersPackageJson(path.join(repertoireRacine, "tooling")),
  ]
    .filter((cheminFichier, index, collection) => collection.indexOf(cheminFichier) === index)
    .sort();

  for (const cheminFichier of fichiers) {
    if (!fs.existsSync(cheminFichier)) {
      continue;
    }

    hachage.update(path.relative(repertoireRacine, cheminFichier));
    hachage.update("\n");
    hachage.update(fs.readFileSync(cheminFichier));
    hachage.update("\n");
  }

  return hachage.digest("hex");
}

function lireEtatBridge(cheminBridgeLinux) {
  const cheminEtat = path.join(cheminBridgeLinux, NOM_FICHIER_ETAT);

  if (!fs.existsSync(cheminEtat)) {
    return null;
  }

  return JSON.parse(fs.readFileSync(cheminEtat, "utf8"));
}

function ecrireEtatBridge(cheminBridgeLinux, etat) {
  fs.mkdirSync(cheminBridgeLinux, { recursive: true });
  fs.writeFileSync(
    path.join(cheminBridgeLinux, NOM_FICHIER_ETAT),
    `${JSON.stringify(etat, null, 2)}\n`,
    "utf8",
  );
}

function obtenirConfigurationCourante() {
  const repertoireRacine = path.resolve(__dirname, "../../..");
  return construireConfigurationBridge({
    distributionWsl: obtenirDistributionWsl(),
    env: process.env,
    repertoireRacine,
    userProfileWindows: obtenirUserProfileWindows(),
  });
}

function obtenirEtatAppareil(configuration) {
  try {
    return executerCommandeSync(
      configuration.adbLinux,
      ["-s", configuration.serial, "get-state"],
      { env: process.env },
    ).stdout.trim();
  } catch {
    return null;
  }
}

async function attendreEmulateurPret(configuration) {
  executerCommandeSync(configuration.adbLinux, ["-s", configuration.serial, "wait-for-device"], {
    env: process.env,
    stdio: "inherit",
  });

  const debut = Date.now();

  while (Date.now() - debut < DELAI_BOOT_MS) {
    const sortie = executerCommandeSync(
      configuration.adbLinux,
      ["-s", configuration.serial, "shell", "getprop", "sys.boot_completed"],
      { env: process.env },
    ).stdout.trim();

    if (sortie === "1") {
      return;
    }

    await pause(DELAI_BOUCLE_MS);
  }

  throw new Error(`L'emulateur ${configuration.serial} n'a pas termine son boot a temps.`);
}

function lancerProcessusEmulateur(configuration) {
  console.log(`Demarrage de l'AVD ${configuration.avd}...`);
  const processus = spawn(
    configuration.emulatorLinux,
    ["-avd", configuration.avd],
    {
      detached: true,
      stdio: "ignore",
    },
  );
  processus.unref();
}

async function demarrerEmulateur(configuration) {
  for (let tentative = 0; tentative < 2; tentative += 1) {
    const etat = obtenirEtatAppareil(configuration);

    if (etat === "device") {
      console.log(`Emulateur deja disponible: ${configuration.serial}`);
    } else {
      lancerProcessusEmulateur(configuration);
    }

    try {
      await attendreEmulateurPret(configuration);
      return;
    } catch (erreur) {
      if (tentative === 0 && estErreurAdbRecuperable(erreur)) {
        console.log(
          `Connexion adb perdue pour ${configuration.serial}, nouvelle tentative...`,
        );
        await pause(DELAI_BOUCLE_MS);
        continue;
      }

      throw erreur;
    }
  }
}

function afficherStatutEmulateur(configuration) {
  const sortie = executerCommandeSync(configuration.adbLinux, ["devices"], {
    env: process.env,
  }).stdout;

  console.log(sortie.trim());

  const etat = obtenirEtatAppareil(configuration);

  if (!etat) {
    console.log(`Etat ${configuration.serial}: indisponible`);
    return;
  }

  const boot = executerCommandeSync(
    configuration.adbLinux,
    ["-s", configuration.serial, "shell", "getprop", "sys.boot_completed"],
    { env: process.env },
  ).stdout.trim();

  console.log(`Etat ${configuration.serial}: ${etat}`);
  console.log(`Boot complete: ${boot === "1" ? "oui" : "non"}`);
}

function synchroniserBridge(configuration) {
  console.log(`Synchronisation vers ${configuration.cheminBridgeWindows}...`);
  fs.mkdirSync(configuration.cheminBridgeLinux, { recursive: true });

  const argumentsRobocopy = construireArgumentsRobocopy({
    cheminBridgeWindows: configuration.cheminBridgeWindows,
    cheminSourceUnc: configuration.cheminProjetUnc,
  });

  const cheminRobocopyLinux = convertirCheminWindowsVersLinuxMonte(
    path.win32.join(process.env.WINDIR ?? "C:\\Windows", "System32", "robocopy.exe"),
  );
  const resultat = spawnSync(cheminRobocopyLinux, argumentsRobocopy, {
    encoding: "utf8",
    stdio: "inherit",
  });

  if (resultat.error) {
    throw resultat.error;
  }

  if ((resultat.status ?? 16) > 7) {
    throw new Error(`Robocopy a echoue avec le code ${resultat.status}.`);
  }
}

function assurerDependancesBridge(configuration) {
  const empreinteCourante = calculerEmpreinteDependances(configuration.cheminProjetLinux);
  const etatPrecedent = lireEtatBridge(configuration.cheminBridgeLinux);
  const nodeModulesPresent = fs.existsSync(
    path.join(configuration.cheminBridgeLinux, "node_modules"),
  );

  if (
    !doitInstallerDependances({
      empreinteCourante,
      empreintePrecedente: etatPrecedent?.empreinteDependances ?? null,
      nodeModulesPresent,
    })
  ) {
    console.log("Dependances bridge deja a jour.");
    return;
  }

  console.log("Installation des dependances bridge...");
  executerScriptCmdTemporaire(
    construireScriptCmdInstallBridge({
      cheminBridgeWindows: configuration.cheminBridgeWindows,
    }),
    "belote-bridge-install",
  );

  ecrireEtatBridge(configuration.cheminBridgeLinux, {
    empreinteDependances: empreinteCourante,
  });
}

function installerApplicationAndroid(configuration) {
  synchroniserBridge(configuration);
  assurerDependancesBridge(configuration);

  console.log("Build et installation Android...");
  executerScriptCmdTemporaire(
    construireScriptCmdBuildAndroid({
      cheminBridgeWindows: configuration.cheminBridgeWindows,
      serial: configuration.serial,
    }),
    "belote-bridge-build",
  );
}

function ouvrirApplication(configuration) {
  const cibleActivite = `${configuration.packageAndroid}/${configuration.activite}`;
  console.log(`Ouverture de ${cibleActivite}...`);
  executerCommandeSync(
    configuration.adbLinux,
    [
      "-s",
      configuration.serial,
      "shell",
      "am",
      "start",
      "-n",
      cibleActivite,
    ],
    {
      env: process.env,
      stdio: "inherit",
    },
  );
}

function interrogerStatutMetro(port) {
  return new Promise((resolve) => {
    const requete = http.get(
      {
        host: "127.0.0.1",
        path: "/status",
        port,
        timeout: 2000,
      },
      (reponse) => {
        let contenu = "";

        reponse.setEncoding("utf8");
        reponse.on("data", (morceau) => {
          contenu += morceau;
        });
        reponse.on("end", () => {
          resolve({
            actif: reponse.statusCode === 200 && contenu.includes("packager-status:running"),
          });
        });
      },
    );

    requete.on("timeout", () => {
      requete.destroy();
      resolve({ actif: false });
    });
    requete.on("error", () => {
      resolve({ actif: false });
    });
  });
}

async function attendreMetro(port) {
  const debut = Date.now();

  while (Date.now() - debut < DELAI_METRO_MS) {
    const statut = await interrogerStatutMetro(port);

    if (statut.actif) {
      return;
    }

    await pause(DELAI_BOUCLE_MS);
  }

  throw new Error(`Metro n'a pas repondu sur http://127.0.0.1:${port}/status.`);
}

function demarrerMetro(configuration) {
  const commande = construireCommandeExpo(
    [
      "start",
      "--dev-client",
      "--localhost",
      "--port",
      String(configuration.portMetro),
    ],
    path.join(configuration.cheminProjetLinux, "apps", "mobile"),
    process.platform,
  );

  return spawn(commande.commande, commande.args, {
    cwd: commande.cwd,
    env: process.env,
    stdio: "inherit",
  });
}

async function lancerMetroSeulement(configuration) {
  const statut = await interrogerStatutMetro(configuration.portMetro);

  if (statut.actif) {
    console.log(`Metro deja disponible sur le port ${configuration.portMetro}.`);
    return;
  }

  const processusMetro = demarrerMetro(configuration);
  const code = await new Promise((resolve) => {
    processusMetro.on("exit", (codeSortie) => {
      resolve(codeSortie ?? 0);
    });
    processusMetro.on("error", () => {
      resolve(1);
    });
  });

  process.exit(code);
}

async function demarrerWorkflowComplet(configuration) {
  await demarrerEmulateur(configuration);
  installerApplicationAndroid(configuration);

  const statutMetro = await interrogerStatutMetro(configuration.portMetro);

  if (statutMetro.actif) {
    console.log(`Metro deja disponible sur le port ${configuration.portMetro}.`);
    ouvrirApplication(configuration);
    return;
  }

  const processusMetro = demarrerMetro(configuration);

  const relayerSignal = (signal) => {
    if (!processusMetro.killed) {
      processusMetro.kill(signal);
    }
  };

  process.on("SIGINT", relayerSignal);
  process.on("SIGTERM", relayerSignal);

  await attendreMetro(configuration.portMetro);
  ouvrirApplication(configuration);

  const code = await new Promise((resolve) => {
    processusMetro.on("exit", (codeSortie) => {
      resolve(codeSortie ?? 0);
    });
    processusMetro.on("error", () => {
      resolve(1);
    });
  });

  process.exit(code);
}

async function executerCommandeCli(commande) {
  const configuration = obtenirConfigurationCourante();

  switch (commande) {
    case "emulator-start":
      await demarrerEmulateur(configuration);
      return;
    case "emulator-status":
      afficherStatutEmulateur(configuration);
      return;
    case "android-sync":
      synchroniserBridge(configuration);
      return;
    case "android-install":
      await demarrerEmulateur(configuration);
      installerApplicationAndroid(configuration);
      return;
    case "android-open":
      ouvrirApplication(configuration);
      return;
    case "android-dev":
      await lancerMetroSeulement(configuration);
      return;
    case "android-start":
      await demarrerWorkflowComplet(configuration);
      return;
    default:
      throw new Error(
        `Commande inconnue: ${commande}. Attendu: emulator-start, emulator-status, android-sync, android-install, android-open, android-dev, android-start.`,
      );
  }
}

module.exports = {
  construireArgumentsRobocopy,
  construireScriptCmdBuildAndroid,
  construireScriptCmdInstallBridge,
  construireConfigurationBridge,
  construireScriptPowerShellSynchronisation,
  convertirCheminLinuxVersUncWsl,
  convertirCheminWindowsVersLinuxMonte,
  estErreurAdbRecuperable,
  doitInstallerDependances,
  obtenirConfigurationCourante,
};

if (require.main === module) {
  const commande = process.argv[2];

  if (!commande) {
    console.error("Commande bridge Android manquante.");
    process.exit(1);
  }

  executerCommandeCli(commande).catch((erreur) => {
    console.error(erreur instanceof Error ? erreur.message : erreur);
    process.exit(1);
  });
}
