package com.discretezero.hush.volumebutton

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

/**
 * VolumeButtonPackage
 *
 * React Native package class for the VolumeButtonModule.
 * Registers the VolumeButtonModule with the React Native bridge.
 *
 * This package must be added to the list of packages in MainApplication.kt:
 * ```kotlin
 * override fun getPackages(): List<ReactPackage> =
 *     PackageList(this).packages.apply {
 *         add(VolumeButtonPackage())
 *     }
 * ```
 */
class VolumeButtonPackage : ReactPackage {
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        return listOf(VolumeButtonModule(reactContext))
    }

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        return emptyList()
    }
}
