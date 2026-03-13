const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Zustand ESM (.mjs) utilise import.meta.env qui n'est pas supporté
// dans les scripts non-module (Metro web). On force la résolution vers
// le build CJS (condition "react-native" / "default") pour toutes les plateformes.
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
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
