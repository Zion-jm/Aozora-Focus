const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

// Use native file watcher to avoid FallbackWatcher ENOENT crashes on pnpm tmp dirs
config.watcher = {
  watchman: {
    deferStates: ["hg.update"],
  },
  healthCheck: {
    enabled: false,
  },
};

// Limit watched folders to avoid Metro scanning pnpm temp files
const workspaceRoot = path.resolve(__dirname, "../..");
config.watchFolders = [workspaceRoot];

module.exports = config;
