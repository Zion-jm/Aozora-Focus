const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

const workspaceRoot = path.resolve(__dirname, "../..");
const projectRoot = __dirname;

// Watch entire monorepo so Metro can resolve workspace packages
config.watchFolders = [workspaceRoot];

config.resolver = {
  ...config.resolver,
  // Tell Metro where to look for node_modules — project-local first,
  // then the workspace root (where pnpm hoists shared deps like react-dom)
  nodeModulesPaths: [
    path.resolve(projectRoot, "node_modules"),
    path.resolve(workspaceRoot, "node_modules"),
  ],
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
