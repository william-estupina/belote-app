const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Transformer import.meta.env pour éviter l'erreur dans les builds web statiques
// Zustand utilise import.meta.env.MODE pour les warnings de dev
config.transformer = {
  ...config.transformer,
  minifierConfig: {
    ...config.transformer?.minifierConfig,
    compress: {
      ...config.transformer?.minifierConfig?.compress,
      global_defs: {
        "import.meta.env": { MODE: "production" },
      },
    },
  },
};

module.exports = config;
