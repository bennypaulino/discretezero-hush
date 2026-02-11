const { withDangerousMod, withXcodeProject } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Expo config plugin for VolumeButtonModule (iOS)
 *
 * This plugin:
 * 1. Copies native module files from ios-module/ to ios/ directory (BEFORE pods install)
 * 2. Adds them to the Xcode project
 * 3. Configures Swift support and bridging header
 */

/**
 * Copy native module files to ios project (runs early, before pods)
 */
function withVolumeButtonIOSFiles(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;

      console.log('[withVolumeButtonIOS] Copying VolumeButtonModule files');

      // Source: ios-module/VolumeButtonModule/
      const sourceDir = path.join(projectRoot, 'ios-module', 'VolumeButtonModule');

      // Target: ios/Hush/VolumeButtonModule/
      const targetDir = path.join(projectRoot, 'ios', 'Hush', 'VolumeButtonModule');

      // Create target directory if it doesn't exist
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
        console.log('[withVolumeButtonIOS] Created directory:', targetDir);
      }

      // Copy VolumeButtonModule.swift
      const swiftSrc = path.join(sourceDir, 'VolumeButtonModule.swift');
      const swiftDst = path.join(targetDir, 'VolumeButtonModule.swift');
      if (fs.existsSync(swiftSrc)) {
        fs.copyFileSync(swiftSrc, swiftDst);
        console.log('[withVolumeButtonIOS] ✅ Copied VolumeButtonModule.swift');
      } else {
        throw new Error(`[withVolumeButtonIOS] ❌ Source file not found: ${swiftSrc}`);
      }

      // Copy VolumeButtonModule.m
      const objcSrc = path.join(sourceDir, 'VolumeButtonModule.m');
      const objcDst = path.join(targetDir, 'VolumeButtonModule.m');
      if (fs.existsSync(objcSrc)) {
        fs.copyFileSync(objcSrc, objcDst);
        console.log('[withVolumeButtonIOS] ✅ Copied VolumeButtonModule.m');
      } else {
        throw new Error(`[withVolumeButtonIOS] ❌ Source file not found: ${objcSrc}`);
      }

      // Copy or ensure bridging header exists
      const bridgingSrc = path.join(sourceDir, 'Hush-Bridging-Header.h');
      const bridgingDst = path.join(projectRoot, 'ios', 'Hush', 'Hush-Bridging-Header.h');
      if (fs.existsSync(bridgingSrc)) {
        fs.copyFileSync(bridgingSrc, bridgingDst);
        console.log('[withVolumeButtonIOS] ✅ Copied Hush-Bridging-Header.h');
      } else if (!fs.existsSync(bridgingDst)) {
        // Create minimal bridging header if neither exists
        const bridgingContent = `//
// Use this file to import your target's public headers that you would like to expose to Swift.
//

#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>
`;
        fs.writeFileSync(bridgingDst, bridgingContent);
        console.log('[withVolumeButtonIOS] ✅ Created Hush-Bridging-Header.h');
      }

      return config;
    },
  ]);
}

/**
 * Add VolumeButtonModule files to Xcode project
 */
function withVolumeButtonXcodeProject(config) {
  return withXcodeProject(config, async (config) => {
    const xcodeProject = config.modResults;

    console.log('[withVolumeButtonIOS] Adding files to Xcode project');

    // File paths (relative to ios/ directory)
    const swiftFile = 'Hush/VolumeButtonModule/VolumeButtonModule.swift';
    const objcFile = 'Hush/VolumeButtonModule/VolumeButtonModule.m';

    try {
      // Add Swift file
      if (!xcodeProject.hasFile(swiftFile)) {
        xcodeProject.addSourceFile(
          swiftFile,
          {},
          xcodeProject.findPBXGroupKey({ name: 'Hush' })
        );
        console.log('[withVolumeButtonIOS] ✅ Added VolumeButtonModule.swift to Xcode project');
      } else {
        console.log('[withVolumeButtonIOS] VolumeButtonModule.swift already in project');
      }

      // Add Objective-C bridge file
      if (!xcodeProject.hasFile(objcFile)) {
        xcodeProject.addSourceFile(
          objcFile,
          {},
          xcodeProject.findPBXGroupKey({ name: 'Hush' })
        );
        console.log('[withVolumeButtonIOS] ✅ Added VolumeButtonModule.m to Xcode project');
      } else {
        console.log('[withVolumeButtonIOS] VolumeButtonModule.m already in project');
      }
    } catch (error) {
      console.error('[withVolumeButtonIOS] ❌ Failed to add files to Xcode project:', error.message);
      throw error;
    }

    return config;
  });
}

/**
 * Ensure Swift support is enabled in Xcode project
 */
function withSwiftSupport(config) {
  return withXcodeProject(config, async (config) => {
    const xcodeProject = config.modResults;

    console.log('[withVolumeButtonIOS] Configuring Swift support');

    // Get build configurations
    const configurations = xcodeProject.pbxXCBuildConfigurationSection();
    const buildSettings = Object.keys(configurations)
      .filter(key => !key.endsWith('_comment'))
      .map(key => configurations[key].buildSettings)
      .filter(Boolean);

    // Set Swift-related build settings
    buildSettings.forEach(settings => {
      // Enable Swift
      settings.SWIFT_VERSION = settings.SWIFT_VERSION || '5.0';

      // Set bridging header path (relative path, not using $(SRCROOT) to avoid parser errors)
      settings.SWIFT_OBJC_BRIDGING_HEADER = settings.SWIFT_OBJC_BRIDGING_HEADER || 'Hush/Hush-Bridging-Header.h';

      // Enable Swift optimization for release
      if (settings.name === 'Release') {
        settings.SWIFT_OPTIMIZATION_LEVEL = settings.SWIFT_OPTIMIZATION_LEVEL || '-O';
      }
    });

    console.log('[withVolumeButtonIOS] ✅ Swift support configured');

    return config;
  });
}

/**
 * Main iOS plugin - applies all modifications in correct order
 */
const withVolumeButtonIOS = (config) => {
  // 1. Copy files FIRST (before pods install) using dangerousMod
  config = withVolumeButtonIOSFiles(config);

  // 2. Configure Swift support
  config = withSwiftSupport(config);

  // 3. Add to Xcode project (after files exist)
  config = withVolumeButtonXcodeProject(config);

  return config;
};

module.exports = withVolumeButtonIOS;
