import Foundation
import AVFoundation
import MediaPlayer
import React

@objc(VolumeButtonModule)
class VolumeButtonModule: RCTEventEmitter {

  private var audioSession: AVAudioSession?
  private var volumeView: MPVolumeView?
  private var volumeObservation: NSKeyValueObservation?
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
    guard !isObserving else { return }
    isObserving = true

    // Setup audio session
    audioSession = AVAudioSession.sharedInstance()

    do {
      // Use playback category to ensure volume events fire
      try audioSession?.setCategory(.playback, mode: .default, options: [])
      try audioSession?.setActive(true, options: [])

      // Store initial volume
      lastVolume = audioSession?.outputVolume ?? 0.5

      print("[VolumeButtonModule] Audio session activated, initial volume: \(lastVolume)")
    } catch {
      print("[VolumeButtonModule] Failed to setup audio session: \(error.localizedDescription)")
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
        print("[VolumeButtonModule] Hidden MPVolumeView added to window")
      }
    }

    // Observe volume changes using KVO on AVAudioSession
    volumeObservation = audioSession?.observe(\.outputVolume, options: [.new, .old]) { [weak self] session, change in
      guard let self = self else { return }
      guard let newVolume = change.newValue else { return }

      let oldVolume = self.lastVolume

      // Detect Volume UP press (volume increased)
      if newVolume > oldVolume {
        print("[VolumeButtonModule] Volume UP detected: \(oldVolume) -> \(newVolume)")
        self.sendEvent(withName: "onVolumeButtonPress", body: ["direction": "up"])
      }
      // Detect Volume DOWN press (volume decreased)
      else if newVolume < oldVolume {
        print("[VolumeButtonModule] Volume DOWN detected: \(oldVolume) -> \(newVolume)")
        self.sendEvent(withName: "onVolumeButtonPress", body: ["direction": "down"])
      }

      // Update last known volume
      self.lastVolume = newVolume
    }

    print("[VolumeButtonModule] Volume monitoring active")
  }

  private func cleanup() {
    isObserving = false

    // Remove volume observation
    volumeObservation?.invalidate()
    volumeObservation = nil

    // Remove hidden volume view
    DispatchQueue.main.async { [weak self] in
      self?.volumeView?.removeFromSuperview()
      self?.volumeView = nil
    }

    // Deactivate audio session
    do {
      try audioSession?.setActive(false, options: [])
    } catch {
      print("[VolumeButtonModule] Failed to deactivate audio session: \(error.localizedDescription)")
    }

    audioSession = nil

    print("[VolumeButtonModule] Volume monitoring stopped")
  }

  // React Native EventEmitter lifecycle
  override func startObserving() {
    print("[VolumeButtonModule] startObserving() called from JavaScript")
    setupVolumeMonitoring()
  }

  override func stopObserving() {
    print("[VolumeButtonModule] stopObserving() called from JavaScript")
    cleanup()
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
