import Foundation
import AVFoundation
import MediaPlayer
import React

@objc(VolumeButtonModule)
class VolumeButtonModule: RCTEventEmitter {

  private var audioSession: AVAudioSession?
  private var volumeView: MPVolumeView?
  private var lastVolume: Float = 0.5
  private var isObserving: Bool = false

  override init() {
    super.init()
    // Setup will happen when JS starts observing
  }

  deinit {
    cleanup()
  }

  private func setupVolumeMonitoring() {
    // CRITICAL: Always cleanup first to ensure clean re-initialization
    // This fixes the issue where toggling Panic Wipe on/off breaks volume monitoring
    if isObserving {
      NSLog("[VolumeButtonModule] Already observing - cleaning up before re-initialization")
      cleanup()
    }

    isObserving = true
    NSLog("[VolumeButtonModule] Setting up volume monitoring")

    // Setup audio session
    audioSession = AVAudioSession.sharedInstance()

    do {
      // Use playback category to ensure volume events fire
      try audioSession?.setCategory(.playback, mode: .default, options: [])
      try audioSession?.setActive(true, options: [])

      // Store initial volume
      lastVolume = audioSession?.outputVolume ?? 0.5

      NSLog("[VolumeButtonModule] Audio session activated, initial volume: %f", lastVolume)
    } catch {
      NSLog("[VolumeButtonModule] Failed to setup audio session: %@", error.localizedDescription)
      self.sendEvent(withName: "onVolumeButtonError", body: [
        "error": error.localizedDescription,
        "code": "AUDIO_SESSION_SETUP_FAILED"
      ])
    }

    // Create hidden MPVolumeView to ensure volume events fire
    // This is the standard iOS workaround for reliable volume button detection
    DispatchQueue.main.async { [weak self] in
      guard let self = self else { return }

      let volumeView = MPVolumeView(frame: CGRect(x: -1000, y: -1000, width: 1, height: 1))
      volumeView.alpha = 0.01

      // Find the app's key window and add the hidden view
      if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
         let window = windowScene.windows.first {
        window.addSubview(volumeView)
        self.volumeView = volumeView
        NSLog("[VolumeButtonModule] Hidden MPVolumeView added to window")
      }
    }

    // Listen for system volume change notifications
    // This fires on button press even when volume is at min/max limits
    NotificationCenter.default.addObserver(
      self,
      selector: #selector(systemVolumeDidChange),
      name: NSNotification.Name(rawValue: "AVSystemController_SystemVolumeDidChangeNotification"),
      object: nil
    )

    NSLog("[VolumeButtonModule] Volume monitoring active (system notification)")
  }

  // System volume change notification handler
  // This fires on hardware button press regardless of whether volume actually changed
  @objc private func systemVolumeDidChange(notification: NSNotification) {
    guard let userInfo = notification.userInfo else { return }

    // Get the new volume from the notification
    let newVolume = audioSession?.outputVolume ?? lastVolume
    let oldVolume = lastVolume

    // Check if this was an explicit volume change (hardware button press)
    // The notification fires for all volume changes, but we only want hardware buttons
    if let reason = userInfo["AVSystemController_AudioVolumeChangeReasonNotificationParameter"] as? String,
       reason == "ExplicitVolumeChange" {

      // Detect direction based on volume change
      if newVolume > oldVolume {
        NSLog("[VolumeButtonModule] Volume UP detected: %f -> %f (system notification)", oldVolume, newVolume)
        self.sendEvent(withName: "onVolumeButtonPress", body: ["direction": "up"])
      } else if newVolume < oldVolume {
        NSLog("[VolumeButtonModule] Volume DOWN detected: %f -> %f (system notification)", oldVolume, newVolume)
        self.sendEvent(withName: "onVolumeButtonPress", body: ["direction": "down"])
      } else {
        // CRITICAL: Button was pressed but volume didn't change (at min/max limit)
        // Check notification category to determine which button was pressed
        if let category = userInfo["AVSystemController_AudioCategoryNotificationParameter"] as? String {
          NSLog("[VolumeButtonModule] Button pressed at volume limit (volume: %f, category: %@)", newVolume, category)

          // At volume limit: if volume is very low, assume DOWN was pressed; if high, assume UP
          // This is a fallback - ideally we'd detect the actual button pressed
          if newVolume <= 0.05 {
            NSLog("[VolumeButtonModule] Volume DOWN detected at minimum limit")
            self.sendEvent(withName: "onVolumeButtonPress", body: ["direction": "down"])
          } else if newVolume >= 0.95 {
            NSLog("[VolumeButtonModule] Volume UP detected at maximum limit")
            self.sendEvent(withName: "onVolumeButtonPress", body: ["direction": "up"])
          }
        }
      }

      // Update last known volume
      lastVolume = newVolume
    }
  }

  private func cleanup() {
    isObserving = false

    // Remove notification observer
    NotificationCenter.default.removeObserver(
      self,
      name: NSNotification.Name(rawValue: "AVSystemController_SystemVolumeDidChangeNotification"),
      object: nil
    )

    // Remove hidden volume view
    DispatchQueue.main.async { [weak self] in
      self?.volumeView?.removeFromSuperview()
      self?.volumeView = nil
    }

    // Deactivate audio session
    do {
      try audioSession?.setActive(false, options: [])
    } catch {
      NSLog("[VolumeButtonModule] Failed to deactivate audio session: %@", error.localizedDescription)
    }

    audioSession = nil

    NSLog("[VolumeButtonModule] Volume monitoring stopped")
  }

  // React Native EventEmitter lifecycle
  override func startObserving() {
    NSLog("[VolumeButtonModule] startObserving() called from JavaScript")
    setupVolumeMonitoring()
  }

  override func stopObserving() {
    NSLog("[VolumeButtonModule] stopObserving() called from JavaScript")
    cleanup()
  }

  // Manual initialization method (called from JavaScript to force setup)
  @objc
  func initialize() {
    NSLog("[VolumeButtonModule] initialize() called explicitly from JavaScript")
    setupVolumeMonitoring()
  }

  override func supportedEvents() -> [String]! {
    return ["onVolumeButtonPress", "onVolumeButtonError"]
  }

  override static func requiresMainQueueSetup() -> Bool {
    return true
  }

  override static func moduleName() -> String! {
    return "VolumeButtonModule"
  }
}
