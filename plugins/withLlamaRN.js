// Custom plugin wrapper for llama.rn to fix ES Module compatibility issue
// Uses the CommonJS version of the plugin instead of the ES Module version

const { withDangerousMod } = require("@expo/config-plugins");

// Re-export the commonjs version with proper context
module.exports = require("llama.rn/lib/commonjs/expo-plugin/withLlamaRN").default;
