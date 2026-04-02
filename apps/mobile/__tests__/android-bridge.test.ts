type ConfigurationBridge = {
  activite: string;
  adbLinux?: string;
  adbWindows: string;
  avd: string;
  cheminBridgeLinux: string;
  cheminBridgeWindows: string;
  cheminProjetLinux: string;
  cheminProjetUnc: string;
  emulatorLinux?: string;
  emulatorWindows: string;
  packageAndroid: string;
  portMetro: number;
  serial: string;
};

type ModuleAndroidBridge = {
  construireConfigurationBridge: (options: {
    distributionWsl: string;
    env: NodeJS.ProcessEnv;
    repertoireRacine: string;
    userProfileWindows: string;
  }) => ConfigurationBridge;
  construireScriptPowerShellSynchronisation: (options: {
    cheminBridgeWindows: string;
    cheminSourceUnc: string;
  }) => string;
  convertirCheminLinuxVersUncWsl: (
    cheminLinux: string,
    distributionWsl: string,
  ) => string;
  convertirCheminWindowsVersLinuxMonte: (cheminWindows: string) => string;
  doitInstallerDependances: (options: {
    empreinteCourante: string;
    empreintePrecedente: string | null;
    nodeModulesPresent: boolean;
  }) => boolean;
};

const {
  construireConfigurationBridge,
  construireScriptPowerShellSynchronisation,
  convertirCheminLinuxVersUncWsl,
  convertirCheminWindowsVersLinuxMonte,
  doitInstallerDependances,
} = require("../scripts/android-bridge.cjs") as ModuleAndroidBridge;

describe("android-bridge", () => {
  it("convertit un chemin Linux absolu en chemin UNC WSL", () => {
    expect(
      convertirCheminLinuxVersUncWsl(
        "/home/westupina/projects/belote",
        "Ubuntu-24.04",
      ),
    ).toBe("\\\\wsl.localhost\\Ubuntu-24.04\\home\\westupina\\projects\\belote");
  });

  it("convertit un chemin Windows en chemin monte WSL", () => {
    expect(
      convertirCheminWindowsVersLinuxMonte("C:\\Users\\lemar\\projects\\belote"),
    ).toBe("/mnt/c/Users/lemar/projects/belote");
  });

  it("construit la configuration par defaut du bridge", () => {
    expect(
      construireConfigurationBridge({
        distributionWsl: "Ubuntu-24.04",
        env: {},
        repertoireRacine: "/home/westupina/projects/belote",
        userProfileWindows: "C:\\Users\\lemar",
      }),
    ).toMatchObject<ConfigurationBridge>({
      activite: ".MainActivity",
      adbWindows: "C:\\Users\\lemar\\AppData\\Local\\Android\\Sdk\\platform-tools\\adb.exe",
      avd: "belote-api35",
      cheminBridgeLinux: "/mnt/c/Users/lemar/projects/belote-android-bridge",
      cheminBridgeWindows: "C:\\Users\\lemar\\projects\\belote-android-bridge",
      cheminProjetLinux: "/home/westupina/projects/belote",
      cheminProjetUnc:
        "\\\\wsl.localhost\\Ubuntu-24.04\\home\\westupina\\projects\\belote",
      emulatorWindows: "C:\\Users\\lemar\\AppData\\Local\\Android\\Sdk\\emulator\\emulator.exe",
      packageAndroid: "com.chiienton.belote",
      portMetro: 8081,
      serial: "emulator-5554",
    });
  });

  it("relance pnpm install si l'empreinte change", () => {
    expect(
      doitInstallerDependances({
        empreinteCourante: "nouvelle",
        empreintePrecedente: "ancienne",
        nodeModulesPresent: true,
      }),
    ).toBe(true);
  });

  it("saute l'installation si l'empreinte est identique et node_modules present", () => {
    expect(
      doitInstallerDependances({
        empreinteCourante: "identique",
        empreintePrecedente: "identique",
        nodeModulesPresent: true,
      }),
    ).toBe(false);
  });

  it("construit un script robocopy avec source UNC et destination Windows", () => {
    const script = construireScriptPowerShellSynchronisation({
      cheminBridgeWindows: "C:\\Users\\lemar\\projects\\belote-android-bridge",
      cheminSourceUnc:
        "\\\\wsl.localhost\\Ubuntu-24.04\\home\\westupina\\projects\\belote",
    });

    expect(script).toContain("robocopy");
    expect(script).toContain(
      "$source = '\\\\wsl.localhost\\Ubuntu-24.04\\home\\westupina\\projects\\belote'",
    );
    expect(script).toContain(
      "$destination = 'C:\\Users\\lemar\\projects\\belote-android-bridge'",
    );
    expect(script).toContain("'apps', 'mobile', 'android'");
    expect(script).toContain("if ($LASTEXITCODE -gt 7)");
  });
});
