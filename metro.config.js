const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add .gguf files as asset extensions so Metro treats them as raw assets
config.resolver.assetExts.push('gguf');

// Increase Metro's max worker memory for large assets
config.maxWorkers = 2;
config.transformer.minifierConfig = {
  keep_classnames: true,
  keep_fnames: true,
  mangle: {
    keep_classnames: true,
    keep_fnames: true,
  },
  // P1.11: Remove all console.* calls in production builds
  compress: {
    drop_console: true, // Strip console.log, console.warn, console.error in production
  },
};

module.exports = config;
