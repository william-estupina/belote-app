/** @type {import('jest').Config} */
module.exports = {
  preset: "jest-expo",
  transformIgnorePatterns: [
    // Avec pnpm, on doit transformer tout node_modules sauf les packages déjà compilés
    "node_modules/\\.pnpm/(?!(react-native|@react-native|expo|@expo|react-navigation|@react-navigation|@belote|@sentry|native-base|react-native-svg|jest-expo))",
    "node_modules/(?!\\.pnpm)((?!(react-native|@react-native|expo|@expo|react-navigation|@react-navigation|@belote|@sentry|native-base|react-native-svg|jest-expo)).)*$",
  ],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],
  testPathIgnorePatterns: ["/node_modules/", "/e2e/"],
};
