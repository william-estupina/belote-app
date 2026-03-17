const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// Support monorepo : permettre à Metro de résoudre les packages workspace
config.watchFolders = [monorepoRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

// Zustand ESM (.mjs) utilise import.meta.env qui n'est pas supporté
// dans les scripts non-module (Metro web). On force la résolution vers
// le build CJS (condition "react-native" / "default") pour toutes les plateformes.
// Sur mobile, canvaskit-wasm n'est pas nécessaire (Skia utilise les bindings C++ natifs).
// On retourne un module vide pour éviter l'erreur "attempted to import fs".
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform !== "web" && moduleName === "canvaskit-wasm/bin/full/canvaskit.js") {
    return { type: "empty" };
  }

  // Forcer Zustand à utiliser le build CJS sur web (évite import.meta.env)
  if (platform === "web" && moduleName === "zustand") {
    return context.resolveRequest(
      { ...context, unstable_conditionNames: ["react-native", "require", "default"] },
      moduleName,
      platform,
    );
  }
  if (platform === "web" && moduleName === "zustand/vanilla") {
    return context.resolveRequest(
      { ...context, unstable_conditionNames: ["react-native", "require", "default"] },
      moduleName,
      platform,
    );
  }

  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
