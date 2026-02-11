const withVolumeButtonAndroid = require('./withVolumeButton');
const withVolumeButtonIOS = require('./withVolumeButtonIOS');

/**
 * Combined Volume Button Plugin (iOS + Android)
 *
 * Registers the native VolumeButtonModule on both platforms.
 */
const withVolumeButtonCombined = (config) => {
  console.log('[withVolumeButtonCombined] Configuring VolumeButtonModule for both platforms');

  // Apply Android plugin
  config = withVolumeButtonAndroid(config);

  // Apply iOS plugin
  config = withVolumeButtonIOS(config);

  console.log('[withVolumeButtonCombined] ✅ Volume button configuration complete');

  return config;
};

module.exports = withVolumeButtonCombined;
