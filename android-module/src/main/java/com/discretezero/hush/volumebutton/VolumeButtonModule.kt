package com.discretezero.hush.volumebutton

import android.view.KeyEvent
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule

/**
 * VolumeButtonModule
 *
 * React Native native module for detecting hardware volume button presses on Android.
 * Intercepts KEYCODE_VOLUME_DOWN events via MainActivity's onKeyDown override.
 *
 * Security features:
 * - Validates event source (rejects ADB-injected events via deviceId check)
 * - Suppresses system volume dialog for intercepted events
 * - Emits events to React Native for panic wipe pattern detection
 *
 * Usage:
 * - Events emitted via DeviceEventManagerModule as "onVolumeButtonPress"
 * - MainActivity must call VolumeButtonModule.handleVolumeKey() in onKeyDown
 */
class VolumeButtonModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return NAME
    }

    /**
     * Emit volume button press event to JavaScript
     * Called from MainActivity.onKeyDown when Volume Down is pressed
     */
    private fun emitVolumeButtonEvent(direction: String) {
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            ?.emit(EVENT_VOLUME_BUTTON_PRESS, Arguments.createMap().apply {
                putString("direction", direction)
            })
    }

    /**
     * Emit error event to JavaScript
     */
    private fun emitErrorEvent(errorMessage: String, errorCode: String) {
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            ?.emit(EVENT_VOLUME_BUTTON_ERROR, Arguments.createMap().apply {
                putString("error", errorMessage)
                putString("code", errorCode)
            })
    }

    companion object {
        private const val NAME = "VolumeButtonModule"
        private const val EVENT_VOLUME_BUTTON_PRESS = "onVolumeButtonPress"
        private const val EVENT_VOLUME_BUTTON_ERROR = "onVolumeButtonError"
        private const val TAG = "VolumeButtonModule"

        // Singleton instance for MainActivity access
        private var instance: VolumeButtonModule? = null

        fun setInstance(module: VolumeButtonModule) {
            instance = module
        }

        /**
         * Handle volume key press from MainActivity.onKeyDown
         *
         * SECURITY: Validates event source - deviceId < 0 indicates injected event (ADB)
         *
         * @param keyCode The key code from KeyEvent
         * @param event The KeyEvent from onKeyDown
         * @return true if event was handled (suppresses system volume dialog), false otherwise
         */
        fun handleVolumeKey(keyCode: Int, event: KeyEvent): Boolean {
            if (keyCode != KeyEvent.KEYCODE_VOLUME_DOWN) {
                return false // Not a volume down key, let it pass through
            }

            // SECURITY: Validate event source - deviceId < 0 indicates injected event (ADB)
            if (event.deviceId < 0) {
                android.util.Log.w(TAG, "Rejecting injected KeyEvent (deviceId: ${event.deviceId})")
                return false // Reject injected events, don't suppress dialog
            }

            val moduleInstance = instance
            if (moduleInstance == null) {
                android.util.Log.w(TAG, "VolumeButtonModule not initialized")
                return false
            }

            // Check if React context is available
            if (!moduleInstance.reactApplicationContext.hasActiveReactInstance()) {
                android.util.Log.w(TAG, "React context not active")
                return false
            }

            try {
                // Emit event to React Native
                moduleInstance.emitVolumeButtonEvent("down")

                // Return true to consume the event and suppress system volume dialog
                return true
            } catch (e: Exception) {
                android.util.Log.e(TAG, "Failed to emit volume button event", e)
                moduleInstance.emitErrorEvent(
                    e.message ?: "Unknown error",
                    "VOLUME_EVENT_EMISSION_FAILED"
                )
                return false
            }
        }
    }

    init {
        // Register this instance for MainActivity access
        setInstance(this)
    }
}
