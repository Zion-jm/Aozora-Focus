const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");
const fs = require("fs");

const config = getDefaultConfig(__dirname);

const workspaceRoot = path.resolve(__dirname, "../..");

config.watchFolders = [workspaceRoot];

// Exclude pnpm temp dirs and node_modules from being watched directly
// to avoid ENOENT crashes on symlinked tmp directories
config.resolver = {
  ...config.resolver,
  blockList: [
    // Exclude pnpm temp/intermediate build files
    /node_modules\/\.pnpm\/.*\/_tmp_.*/,
    /node_modules\/\.pnpm\/.*\/node_modules\/.*_tmp_.*/,
  ],
};

config.watcher = {
  watchman: {
    deferStates: ["hg.update"],
  },
  healthCheck: {
    enabled: false,
  },
  // Use native watcher, fallback watcher has issues with pnpm symlinks
  additionalExts: [],
};

module.exports = config;
