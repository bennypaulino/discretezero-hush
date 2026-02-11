const { withMainActivity } = require('@expo/config-plugins');

/**
 * Expo config plugin to inject Volume Up button handling into Android MainActivity.
 *
 * This plugin modifies the MainActivity.kt file to:
 * 1. Import necessary Android and React Native modules
 * 2. Override onKeyDown to capture KEYCODE_VOLUME_UP events
 * 3. Emit events to React Native via DeviceEventManagerModule
 * 4. Suppress the system volume dialog by returning true
 */
const withVolumeButton = (config) => {
  return withMainActivity(config, async (config) => {
    const { modResults } = config;
    let { contents } = modResults;

    // Add required imports at the top of the file
    if (!contents.includes('import android.view.KeyEvent')) {
      // Find the package declaration and add imports after it
      const packageMatch = contents.match(/package\s+[\w.]+/);
      if (packageMatch) {
        const packageDeclaration = packageMatch[0];
        contents = contents.replace(
          packageDeclaration,
          `${packageDeclaration}

import android.view.KeyEvent
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.facebook.react.bridge.Arguments`
        );
      }
    }

    // Inject onKeyDown method to capture volume button presses
    const onKeyDownMethod = `
  override fun onKeyDown(keyCode: Int, event: KeyEvent): Boolean {
    // Capture Volume Up button press for panic wipe feature
    if (keyCode == KeyEvent.KEYCODE_VOLUME_UP) {
      // SECURITY: Validate event source - deviceId < 0 indicates injected event (ADB)
      if (event.deviceId < 0) {
        android.util.Log.w("VolumeButtonModule", "Rejecting injected KeyEvent (deviceId: \${event.deviceId})")
        return super.onKeyDown(keyCode, event)
      }

      try {
        // Get React context and emit event to JavaScript
        reactInstanceManager?.currentReactContext
          ?.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
          ?.emit("onVolumeButtonPress", Arguments.createMap().apply {
            putString("direction", "up")
          })

        // Return true to consume the event and suppress system volume dialog
        return true
      } catch (e: Exception) {
        // Log exception for debugging
        android.util.Log.e("VolumeButtonModule", "Failed to emit volume button event", e)
        // If React context not available, fall back to default behavior
        return super.onKeyDown(keyCode, event)
      }
    }

    // Let other key events pass through normally
    return super.onKeyDown(keyCode, event)
  }
`;

    // Inject the method into MainActivity class if not already present
    if (!contents.includes('override fun onKeyDown')) {
      // Find the MainActivity class declaration
      const classMatch = contents.match(/class\s+MainActivity\s*:\s*ReactActivity\(\)\s*\{/);

      if (classMatch) {
        contents = contents.replace(
          /class\s+MainActivity\s*:\s*ReactActivity\(\)\s*\{/,
          `class MainActivity : ReactActivity() {${onKeyDownMethod}`
        );
      } else {
        throw new Error(
          '[withVolumeButton] FATAL: Failed to inject volume button handler into MainActivity. ' +
          'MainActivity class not found or format has changed. ' +
          'The panic wipe feature will NOT work on Android. ' +
          'Please report this issue at https://github.com/anthropics/claude-code/issues with your MainActivity.kt contents.'
        );
      }
    }

    modResults.contents = contents;
    return config;
  });
};

module.exports = withVolumeButton;
