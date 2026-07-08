const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    // jest.setup.js jest global'ini kullanır (mock kaydı); jest ortamını tanımla.
    files: ["jest.setup.js"],
    languageOptions: {
      globals: { jest: "readonly", require: "readonly", module: "readonly" },
    },
  },
  {
    ignores: ["dist/*", "node_modules/*"],
  },
]);
