type CommandeExpo = {
  commande: string;
  args: string[];
  cwd?: string;
};

type ModuleLancerExpo = {
  construireCommandeExpo: (
    argsExpo: string[],
    cwd: string,
    plateforme?: NodeJS.Platform,
  ) => CommandeExpo;
  determinerRepertoirePackage: (cwd?: string) => string;
  convertirCheminWslDepuisWindows: (
    cwd: string,
  ) => { distribution: string; cheminLinux: string } | null;
};

const {
  construireCommandeExpo,
  determinerRepertoirePackage,
  convertirCheminWslDepuisWindows,
} = require("../scripts/lancer-expo.cjs") as ModuleLancerExpo;

const { readFileSync } = require("node:fs") as typeof import("node:fs");

describe("lancer-expo", () => {
  afterEach(() => {
    delete process.env.npm_package_json;
  });

  it("convertit un chemin UNC WSL en distribution et chemin Linux", () => {
    expect(
      convertirCheminWslDepuisWindows(
        "\\\\wsl.localhost\\Ubuntu-24.04\\home\\westupina\\projects\\belote\\apps\\mobile",
      ),
    ).toEqual({
      distribution: "Ubuntu-24.04",
      cheminLinux: "/home/westupina/projects/belote/apps/mobile",
    });
  });

  it("construit une commande wsl pour expo depuis un chemin UNC", () => {
    expect(
      construireCommandeExpo(
        ["start", "--web", "--host", "lan"],
        "\\\\wsl.localhost\\Ubuntu-24.04\\home\\westupina\\projects\\belote\\apps\\mobile",
        "win32",
      ),
    ).toEqual({
      commande: "wsl.exe",
      args: [
        "-d",
        "Ubuntu-24.04",
        "bash",
        "-lc",
        'export PNPM_HOME="${PNPM_HOME:-$HOME/.local/share/pnpm}" && export NVM_DIR="${NVM_DIR:-$HOME/.nvm}" && export PATH="$PNPM_HOME:$HOME/.local/bin:$HOME/bin:/usr/local/bin:/usr/bin:/bin:$PATH" && if [ -s "$NVM_DIR/nvm.sh" ]; then . "$NVM_DIR/nvm.sh" >/dev/null 2>&1 && nvm use --silent default >/dev/null 2>&1 || nvm use --silent node >/dev/null 2>&1 || true; fi && hash -r && cd \'/home/westupina/projects/belote/apps/mobile\' && pnpm exec expo start --web --host lan',
      ],
    });
  });

  it("ignore le separateur d'arguments pnpm avant les options expo", () => {
    expect(
      construireCommandeExpo(
        ["start", "--", "--go", "--host", "tunnel", "--clear"],
        "C:\\projets\\belote\\apps\\mobile",
        "win32",
      ),
    ).toEqual({
      commande: "pnpm",
      args: ["exec", "expo", "start", "--go", "--host", "tunnel", "--clear"],
      cwd: "C:\\projets\\belote\\apps\\mobile",
    });
  });

  it("lance pnpm dev en mode Expo Go LAN sans tunnel", () => {
    const packageJson = JSON.parse(
      readFileSync(`${__dirname}/../package.json`, "utf8"),
    ) as {
      devDependencies?: Record<string, string>;
      scripts: Record<string, string>;
    };

    expect(packageJson.scripts.dev).toBe(
      "node ./scripts/lancer-expo.cjs start --go --lan",
    );
    expect(packageJson.devDependencies).not.toHaveProperty("@expo/ngrok");
  });

  it("garde une commande pnpm exec expo hors chemin UNC WSL", () => {
    expect(
      construireCommandeExpo(["start"], "C:\\projets\\belote\\apps\\mobile", "win32"),
    ).toEqual({
      commande: "pnpm",
      args: ["exec", "expo", "start"],
      cwd: "C:\\projets\\belote\\apps\\mobile",
    });
  });

  it("privilegie npm_package_json pour retrouver le vrai dossier du package", () => {
    process.env.npm_package_json =
      "\\\\wsl.localhost\\Ubuntu-24.04\\home\\westupina\\projects\\belote\\apps\\mobile\\package.json";

    expect(determinerRepertoirePackage("C:\\Windows")).toBe(
      "\\\\wsl.localhost\\Ubuntu-24.04\\home\\westupina\\projects\\belote\\apps\\mobile",
    );
  });
});
