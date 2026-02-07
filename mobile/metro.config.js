const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

// Follow the convex symlink to the shared backend at the repo root
config.watchFolders = [path.resolve(__dirname, "../convex")];
config.resolver.nodeModulesPaths = [path.resolve(__dirname, "node_modules")];

module.exports = config;
