import Foundation
import AVFoundation
import MediaPlayer
import React

@objc(VolumeButtonModule)
class VolumeButtonModule: RCTEventEmitter {

  private var audioSession: AVAudioSession?
  private var volumeView: MPVolumeView?
  private var volumeSlider: UISlider?
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

        // CRITICAL: Monitor the volume slider's value changes
        // This fires even when volume is at min/max limits
        if let slider = volumeView.subviews.first(where: { $0 is UISlider }) as? UISlider {
          self.volumeSlider = slider
          slider.addTarget(self, action: #selector(self.volumeSliderChanged), for: .valueChanged)
          NSLog("[VolumeButtonModule] Volume slider monitoring active")
        } else {
          NSLog("[VolumeButtonModule] ⚠️ Could not find volume slider in MPVolumeView")
        }
      }
    }

    NSLog("[VolumeButtonModule] Volume monitoring setup complete")
  }

  // Volume slider value changed handler
  // This fires on hardware button press even when volume is at min/max limits
  @objc private func volumeSliderChanged() {
    // Get current volume from audio session
    let newVolume = audioSession?.outputVolume ?? lastVolume
    let oldVolume = lastVolume

    // Detect direction based on volume change
    if newVolume > oldVolume {
      NSLog("[VolumeButtonModule] Volume UP detected: %f -> %f (slider)", oldVolume, newVolume)
      self.sendEvent(withName: "onVolumeButtonPress", body: ["direction": "up"])
    } else if newVolume < oldVolume {
      NSLog("[VolumeButtonModule] Volume DOWN detected: %f -> %f (slider)", oldVolume, newVolume)
      self.sendEvent(withName: "onVolumeButtonPress", body: ["direction": "down"])
    } else {
      // CRITICAL: Slider changed but volume didn't (at min/max limit)
      // Determine button based on current volume level
      if newVolume <= 0.05 {
        NSLog("[VolumeButtonModule] Volume DOWN detected at minimum limit: %f", newVolume)
        self.sendEvent(withName: "onVolumeButtonPress", body: ["direction": "down"])
      } else if newVolume >= 0.95 {
        NSLog("[VolumeButtonModule] Volume UP detected at maximum limit: %f", newVolume)
        self.sendEvent(withName: "onVolumeButtonPress", body: ["direction": "up"])
      } else {
        NSLog("[VolumeButtonModule] ⚠️ Slider changed but volume unchanged (mid-range): %f", newVolume)
      }
    }

    // Update last known volume
    lastVolume = newVolume
  }

  private func cleanup() {
    isObserving = false

    // Remove slider target and view on main thread
    DispatchQueue.main.async { [weak self] in
      guard let self = self else { return }

      // Remove slider target
      if let slider = self.volumeSlider {
        slider.removeTarget(self, action: #selector(self.volumeSliderChanged), for: .valueChanged)
        self.volumeSlider = nil
        NSLog("[VolumeButtonModule] Volume slider target removed")
      }

      // Remove hidden volume view
      self.volumeView?.removeFromSuperview()
      self.volumeView = nil
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
