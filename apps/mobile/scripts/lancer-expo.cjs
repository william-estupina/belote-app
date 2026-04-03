const { spawn } = require("node:child_process");
const path = require("node:path");

function convertirCheminWslDepuisWindows(cwd) {
  const correspondance = cwd.match(/^\\\\wsl(?:\.localhost|\$)\\([^\\]+)\\(.+)$/);

  if (!correspondance) {
    return null;
  }

  const distribution = correspondance[1];
  const cheminLinux = `/${correspondance[2].replace(/\\/g, "/")}`;

  return { distribution, cheminLinux };
}

function echapperCheminBash(chemin) {
  return `'${chemin.replace(/'/g, `'\"'\"'`)}'`;
}

function construireCommandePreparationWsl(cheminLinux) {
  return [
    'export PNPM_HOME="${PNPM_HOME:-$HOME/.local/share/pnpm}"',
    'export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"',
    'export PATH="$PNPM_HOME:$HOME/.local/bin:$HOME/bin:/usr/local/bin:/usr/bin:/bin:$PATH"',
    'if [ -s "$NVM_DIR/nvm.sh" ]; then . "$NVM_DIR/nvm.sh" >/dev/null 2>&1 && nvm use --silent default >/dev/null 2>&1 || nvm use --silent node >/dev/null 2>&1 || true; fi',
    "hash -r",
    `cd ${echapperCheminBash(cheminLinux)}`,
  ].join(" && ");
}

function construireCommandeExpo(argsExpo, cwd, plateforme = process.platform) {
  if (plateforme === "win32") {
    const cheminWsl = convertirCheminWslDepuisWindows(cwd);

    if (cheminWsl) {
      return {
        commande: "wsl.exe",
        args: [
          "-d",
          cheminWsl.distribution,
          "bash",
          "-lc",
          `${construireCommandePreparationWsl(
            cheminWsl.cheminLinux,
          )} && pnpm exec expo ${argsExpo.join(" ")}`,
        ],
      };
    }
  }

  return {
    commande: "pnpm",
    args: ["exec", "expo", ...argsExpo],
    cwd,
  };
}

function determinerRepertoirePackage(cwd = process.cwd()) {
  if (process.env.npm_package_json) {
    if (
      process.env.npm_package_json.startsWith("\\\\") ||
      /^[A-Za-z]:\\/.test(process.env.npm_package_json)
    ) {
      return path.win32.dirname(process.env.npm_package_json);
    }

    return path.dirname(process.env.npm_package_json);
  }

  return cwd;
}

function lancerExpo(argsExpo, cwd = determinerRepertoirePackage()) {
  const commande = construireCommandeExpo(argsExpo, cwd);
  const processus = spawn(commande.commande, commande.args, {
    cwd: commande.cwd,
    stdio: "inherit",
    shell: false,
  });

  processus.on("exit", (code) => {
    process.exit(code ?? 0);
  });

  processus.on("error", (erreur) => {
    console.error(erreur);
    process.exit(1);
  });
}

module.exports = {
  construireCommandeExpo,
  convertirCheminWslDepuisWindows,
  determinerRepertoirePackage,
  lancerExpo,
};

if (require.main === module) {
  lancerExpo(process.argv.slice(2));
}
