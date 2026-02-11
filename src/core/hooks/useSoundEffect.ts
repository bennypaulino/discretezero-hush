import { useEffect, useRef } from 'react';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { useChatStore } from '../state/rootStore';
import type { HushBurnType, ClassifiedBurnType } from '../state/rootStore';
import type { AudioPlayer } from 'expo-audio';

const sounds = {
  breeze: require('../../../assets/sounds/gentle-breeze.mp3'),
  charging: require('../../../assets/sounds/charging.mp3'),
  gong: require('../../../assets/sounds/gong.mp3'),
  dotmatrix: require('../../../assets/sounds/dot-matrix.mp3'),
  corruption: require('../../../assets/sounds/corruption-glitch.mp3'),
  matrixcode: require('../../../assets/sounds/matrix-code.mp3'),
  drizzle: require('../../../assets/sounds/drizzle-distant-thunder.mp3'),
};

// Fade configuration for each sound
interface FadeConfig {
  fadeIn?: number;  // Fade-in duration in ms (omit for no fade-in)
  fadeOut?: number; // Fade-out duration in ms (omit for no fade-out)
  animationDuration: number; // Total animation duration in ms
}

const SOUND_FADE_CONFIG: Record<string, FadeConfig> = {
  matrixcode: {
    fadeIn: 1000,      // 1 second fade-in
    fadeOut: 1000,     // 1 second fade-out
    animationDuration: 4000,
  },
  drizzle: {
    fadeOut: 2500,     // 2.5 second fade-out for gentle, gradual ending
    animationDuration: 4000, // Match actual rain animation duration
  },
  gong: {
    fadeOut: 2000,     // 2 second fade-out for gentle ending
    animationDuration: 5500, // Match ripple animation duration
  },
  corruption: {
    fadeIn: 800,       // 800ms fade-in
    fadeOut: 800,      // 800ms fade-out
    animationDuration: 3000,
  },
  charging: {
    fadeOut: 400,      // Sharp 400ms fade-out
    animationDuration: 2000,
  },
};

// Animation-to-sound mapping
const HUSH_SOUND_MAP: Record<HushBurnType, 'breeze' | 'gong' | 'drizzle' | null> = {
  clear: null,             // Silent (FREE tier)
  disintegrate: 'breeze',  // Sound (PRO tier, respects toggle)
  dissolve: null,          // Silent (FREE tier)
  ripple: 'gong',          // Sound (PRO tier, respects toggle)
  rain: 'drizzle',         // Sound (PRO tier, respects toggle)
};

const CLASSIFIED_SOUND_MAP: Record<ClassifiedBurnType, 'charging' | 'dotmatrix' | 'corruption' | 'matrixcode' | null> = {
  cls: null,               // Silent (terminal command aesthetic)
  purge: 'charging',       // Sound (respects toggle)
  redaction: 'dotmatrix',  // Sound (respects toggle)
  corruption: 'corruption',// Sound (respects toggle)
  matrix: 'matrixcode',    // Sound (respects toggle)
};

export const useSoundEffect = () => {
  const { animationSounds } = useChatStore();
  const loadedSounds = useRef<Record<string, AudioPlayer | null>>({
    breeze: null,
    charging: null,
    gong: null,
    dotmatrix: null,
    corruption: null,
    matrixcode: null,
    drizzle: null,
  });

  useEffect(() => {
    const setupAudio = async () => {
      // Configure audio mode once
      try {
        await setAudioModeAsync({
          playsInSilentMode: true, // Allow sounds even when silent switch is on
        });
      } catch (error) {
        // Silently fail if audio mode can't be set (non-critical)
        if (__DEV__) {
          console.warn('Audio mode configuration skipped:', error);
        }
      }

      // Preload sounds for instant playback
      if (!animationSounds) return;

      try {
        // Load all sounds in parallel for better performance
        const loadPromises = Object.keys(sounds).map(async (key) => {
          try {
            const player = createAudioPlayer(sounds[key as keyof typeof sounds]);
            player.volume = 0.4;
            loadedSounds.current[key] = player;
          } catch (error) {
            // Individual sound loading failure - log but don't break other sounds
            if (__DEV__) {
              console.warn(`Failed to preload sound: ${key}`, error);
            }
          }
        });

        // Wait for all sounds to finish loading (or fail)
        await Promise.all(loadPromises);
      } catch (error) {
        // Catastrophic failure during sound preload
        if (__DEV__) {
          console.error('Sound preload failed:', error);
        }
      }
    };

    setupAudio();

    return () => {
      // Cleanup on unmount
      Object.values(loadedSounds.current).forEach((player) => {
        if (player) player.remove();
      });
    };
  }, [animationSounds]);

  const playForAnimation = async (animation: HushBurnType | ClassifiedBurnType) => {
    // Check both system-wide toggle AND Pro toggle
    const { animationSoundsPro } = useChatStore.getState();

    if (!animationSounds) return; // System-wide toggle OFF

    // Determine which sound to play based on animation type
    let soundName: 'breeze' | 'charging' | 'gong' | 'dotmatrix' | 'corruption' | 'matrixcode' | 'drizzle' | null = null;

    if (animation in HUSH_SOUND_MAP) {
      soundName = HUSH_SOUND_MAP[animation as HushBurnType];
    } else if (animation in CLASSIFIED_SOUND_MAP) {
      soundName = CLASSIFIED_SOUND_MAP[animation as ClassifiedBurnType];
    }

    // Pro toggle: If OFF, silence all animations (stealth mode)
    if (!animationSoundsPro) {
      soundName = null;
    }

    if (!soundName) return; // Animation has no sound or Pro toggle OFF

    const fadeConfig = SOUND_FADE_CONFIG[soundName];
    const targetVolume = 0.4;

    try {
      const player = loadedSounds.current[soundName];
      let activePlayer = player || createAudioPlayer(sounds[soundName]);

      // Defensive: wrap audio operations in try-catch
      try {
        activePlayer.seekTo(0); // Reset to beginning
      } catch (e) {
        // Session might be invalid during hot reload, recreate player
        if (__DEV__) {
          console.log(`[useSoundEffect] Player session invalid, recreating: ${soundName}`);
        }

        // Clear the invalid cached player
        loadedSounds.current[soundName] = null;

        // Try to create a fresh player
        try {
          activePlayer = createAudioPlayer(sounds[soundName]);
          activePlayer.volume = 0.4;
          loadedSounds.current[soundName] = activePlayer;
          activePlayer.seekTo(0);

          if (__DEV__) {
            console.log(`[useSoundEffect] Successfully recreated player: ${soundName}`);
          }
        } catch (recreateError) {
          if (__DEV__) {
            console.log(`[useSoundEffect] Failed to recreate player, skipping: ${soundName}`);
          }
          return;
        }
      }

      // Setup fade-in if configured
      if (fadeConfig?.fadeIn) {
        try {
          activePlayer.volume = 0; // Start silent
          activePlayer.play();

          // Gradual fade-in
          const fadeInSteps = 20;
          const fadeInStepDuration = fadeConfig.fadeIn / fadeInSteps;
          const volumeIncrement = targetVolume / fadeInSteps;

          let fadeInStep = 0;
          const fadeInInterval = setInterval(() => {
            try {
              fadeInStep++;
              activePlayer.volume = Math.min(volumeIncrement * fadeInStep, targetVolume);

              if (fadeInStep >= fadeInSteps) {
                clearInterval(fadeInInterval);
              }
            } catch (e) {
              clearInterval(fadeInInterval); // Stop trying if player is invalid
            }
          }, fadeInStepDuration);
        } catch (e) {
          if (__DEV__) {
            console.log(`[useSoundEffect] Failed to start fade-in for ${soundName}, attempting recovery:`, e);
          }

          // Try recovery
          try {
            loadedSounds.current[soundName] = null;
            const freshPlayer = createAudioPlayer(sounds[soundName]);
            freshPlayer.volume = 0;
            loadedSounds.current[soundName] = freshPlayer;
            freshPlayer.play();

            // Restart fade-in with fresh player
            const fadeInSteps = 20;
            const fadeInStepDuration = fadeConfig.fadeIn / fadeInSteps;
            const volumeIncrement = targetVolume / fadeInSteps;

            let fadeInStep = 0;
            const fadeInInterval = setInterval(() => {
              try {
                fadeInStep++;
                freshPlayer.volume = Math.min(volumeIncrement * fadeInStep, targetVolume);

                if (fadeInStep >= fadeInSteps) {
                  clearInterval(fadeInInterval);
                }
              } catch (e) {
                clearInterval(fadeInInterval);
              }
            }, fadeInStepDuration);

            if (__DEV__) {
              console.log(`[useSoundEffect] Recovery successful for ${soundName} with fade-in`);
            }
          } catch (recoveryError) {
            if (__DEV__) {
              console.log(`[useSoundEffect] Recovery failed for ${soundName}, giving up`);
            }
            return;
          }
        }
      } else {
        // No fade-in, start at full volume
        try {
          activePlayer.volume = targetVolume;
          activePlayer.play();
        } catch (e) {
          if (__DEV__) {
            console.log(`[useSoundEffect] Failed to play ${soundName}, attempting recovery:`, e);
          }

          // Try recovery one more time
          try {
            loadedSounds.current[soundName] = null;
            const freshPlayer = createAudioPlayer(sounds[soundName]);
            freshPlayer.volume = targetVolume;
            loadedSounds.current[soundName] = freshPlayer;
            freshPlayer.play();

            if (__DEV__) {
              console.log(`[useSoundEffect] Recovery successful for ${soundName}`);
            }
          } catch (recoveryError) {
            if (__DEV__) {
              console.log(`[useSoundEffect] Recovery failed for ${soundName}, giving up`);
            }
            return;
          }
        }
      }

      // Setup fade-out if configured
      if (fadeConfig?.fadeOut) {
        const fadeOutDuration = fadeConfig.fadeOut; // Capture for closure
        const fadeOutStartTime = fadeConfig.animationDuration - fadeOutDuration;

        setTimeout(() => {
          try {
            // Gradual fade-out
            const fadeOutSteps = 20;
            const fadeOutStepDuration = fadeOutDuration / fadeOutSteps;
            const volumeDecrement = targetVolume / fadeOutSteps;

            let fadeOutStep = 0;
            const fadeOutInterval = setInterval(() => {
              try {
                fadeOutStep++;
                activePlayer.volume = Math.max(targetVolume - (volumeDecrement * fadeOutStep), 0);

                if (fadeOutStep >= fadeOutSteps) {
                  clearInterval(fadeOutInterval);
                  activePlayer.volume = 0;
                }
              } catch (e) {
                clearInterval(fadeOutInterval); // Stop trying if player is invalid
              }
            }, fadeOutStepDuration);
          } catch (e) {
            // Ignore fade-out errors (player might be gone)
          }
        }, fadeOutStartTime);
      }

      // Cleanup fallback players
      if (!player) {
        setTimeout(() => {
          try {
            activePlayer.remove();
          } catch (e) {
            // Ignore cleanup errors
          }
        }, (fadeConfig?.animationDuration || 5000) + 500);
      }
    } catch (error) {
      if (__DEV__) {
        console.warn(`Failed to play sound for animation: ${animation}`, error);
      }
    }
  };

  return { playForAnimation };
};
