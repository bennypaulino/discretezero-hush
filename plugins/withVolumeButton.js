const { withMainActivity, withMainApplication, withProjectBuildGradle } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Expo config plugin for VolumeButtonModule (Android)
 *
 * This plugin:
 * 1. Copies native module files to android project
 * 2. Registers VolumeButtonPackage in MainApplication.kt
 * 3. Adds minimal onKeyDown override to MainActivity.kt
 *
 * Replaces the fragile regex-based injection approach with a proper native module.
 */

/**
 * Copy native module files to android project
 */
function withVolumeButtonNativeFiles(config) {
  return withProjectBuildGradle(config, async (config) => {
    const projectRoot = config.modRequest.projectRoot;
    const sourceDir = path.join(projectRoot, 'android-module', 'src', 'main', 'java', 'com', 'discretezero', 'hush', 'volumebutton');
    const targetDir = path.join(projectRoot, 'android', 'app', 'src', 'main', 'java', 'com', 'discretezero', 'hush', 'volumebutton');

    // Create target directory if it doesn't exist
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // Copy VolumeButtonModule.kt
    const moduleSrc = path.join(sourceDir, 'VolumeButtonModule.kt');
    const moduleDst = path.join(targetDir, 'VolumeButtonModule.kt');
    if (fs.existsSync(moduleSrc)) {
      fs.copyFileSync(moduleSrc, moduleDst);
      console.log('[withVolumeButton] Copied VolumeButtonModule.kt');
    } else {
      console.warn('[withVolumeButton] VolumeButtonModule.kt not found at', moduleSrc);
    }

    // Copy VolumeButtonPackage.kt
    const packageSrc = path.join(sourceDir, 'VolumeButtonPackage.kt');
    const packageDst = path.join(targetDir, 'VolumeButtonPackage.kt');
    if (fs.existsSync(packageSrc)) {
      fs.copyFileSync(packageSrc, packageDst);
      console.log('[withVolumeButton] Copied VolumeButtonPackage.kt');
    } else {
      console.warn('[withVolumeButton] VolumeButtonPackage.kt not found at', packageSrc);
    }

    return config;
  });
}

/**
 * Register VolumeButtonPackage in MainApplication.kt
 */
function withVolumeButtonPackage(config) {
  return withMainApplication(config, async (config) => {
    const { modResults } = config;
    let { contents } = modResults;

    // Add import for VolumeButtonPackage
    if (!contents.includes('import com.discretezero.hush.volumebutton.VolumeButtonPackage')) {
      // Find the package declaration and add import after other imports
      const lastImportMatch = contents.match(/import .+\n(?=\n)/);
      if (lastImportMatch) {
        contents = contents.replace(
          lastImportMatch[0],
          `${lastImportMatch[0]}import com.discretezero.hush.volumebutton.VolumeButtonPackage\n`
        );
      } else {
        // Fallback: add after package declaration
        const packageMatch = contents.match(/package\s+[\w.]+/);
        if (packageMatch) {
          contents = contents.replace(
            packageMatch[0],
            `${packageMatch[0]}\n\nimport com.discretezero.hush.volumebutton.VolumeButtonPackage`
          );
        }
      }
    }

    // Add VolumeButtonPackage to the packages list
    if (!contents.includes('VolumeButtonPackage()')) {
      // Find the getPackages method and add the package
      // Look for: PackageList(this).packages or PackageList(this).packages.apply
      const packagesMatch = contents.match(
        /(PackageList\(this\)\.packages)(\s*\.apply\s*\{)?/
      );

      if (packagesMatch) {
        if (packagesMatch[2]) {
          // Has .apply block - add inside it
          const applyBlockMatch = contents.match(
            /PackageList\(this\)\.packages\.apply\s*\{[\s\S]*?\}/
          );
          if (applyBlockMatch) {
            const block = applyBlockMatch[0];
            // Add before the closing brace
            const updatedBlock = block.replace(
              /(\s*)\}/,
              '$1  add(VolumeButtonPackage())\n$1}'
            );
            contents = contents.replace(block, updatedBlock);
          }
        } else {
          // No .apply block - create one
          contents = contents.replace(
            /PackageList\(this\)\.packages/,
            `PackageList(this).packages.apply {
      add(VolumeButtonPackage())
    }`
          );
        }
      } else {
        throw new Error(
          '[withVolumeButton] Could not find PackageList(this).packages in MainApplication.kt. ' +
          'Please add VolumeButtonPackage() manually.'
        );
      }
    }

    modResults.contents = contents;
    return config;
  });
}

/**
 * Add minimal onKeyDown override to MainActivity.kt
 */
function withVolumeButtonMainActivity(config) {
  return withMainActivity(config, async (config) => {
    const { modResults } = config;
    let { contents } = modResults;

    // Add import for VolumeButtonModule
    if (!contents.includes('import com.discretezero.hush.volumebutton.VolumeButtonModule')) {
      const packageMatch = contents.match(/package\s+[\w.]+/);
      if (packageMatch) {
        contents = contents.replace(
          packageMatch[0],
          `${packageMatch[0]}

import android.view.KeyEvent
import com.discretezero.hush.volumebutton.VolumeButtonModule`
        );
      }
    }

    // Add minimal onKeyDown override
    if (!contents.includes('override fun onKeyDown')) {
      const onKeyDownMethod = `
  override fun onKeyDown(keyCode: Int, event: KeyEvent): Boolean {
    // Delegate volume button handling to VolumeButtonModule
    if (VolumeButtonModule.handleVolumeKey(keyCode, event)) {
      return true // Event handled, suppress system dialog
    }
    return super.onKeyDown(keyCode, event)
  }
`;

      // Find MainActivity class and inject method
      const classMatch = contents.match(/class\s+MainActivity\s*:\s*ReactActivity\(\)\s*\{/);
      if (classMatch) {
        contents = contents.replace(
          /class\s+MainActivity\s*:\s*ReactActivity\(\)\s*\{/,
          `class MainActivity : ReactActivity() {${onKeyDownMethod}`
        );
      } else {
        throw new Error(
          '[withVolumeButton] Could not find MainActivity class declaration. ' +
          'Expected format: class MainActivity : ReactActivity() {'
        );
      }
    }

    modResults.contents = contents;
    return config;
  });
}

/**
 * Main plugin function - applies all modifications
 */
const withVolumeButtonAndroid = (config) => {
  config = withVolumeButtonNativeFiles(config);
  config = withVolumeButtonPackage(config);
  config = withVolumeButtonMainActivity(config);
  return config;
};

module.exports = withVolumeButtonAndroid;
