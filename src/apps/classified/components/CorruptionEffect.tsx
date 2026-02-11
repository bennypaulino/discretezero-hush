import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import { useAnimatedValue } from '../../../core/hooks/useAnimatedValue';
import type { GlitchBlock } from '../../../types/animations';
import { CLASSIFIED_THEMES } from '../../../core/themes/themes';
import { useChatStore } from '../../../core/state/rootStore';

const { width, height } = Dimensions.get('window');

interface CorruptionEffectProps {
  onComplete: () => void;
}

/**
 * Aggressive Corruption Animation
 *
 * Timeline (synced to 3.03s sound file):
 * 0.0s - 2.0s: Aggressive glitch frames (15 frames × 133ms)
 * 2.0s - 2.5s: Fade to red (500ms)
 * 2.5s - 3.0s: Fade to black (500ms)
 * 3.0s: Complete
 */
export const CorruptionEffect = ({ onComplete }: CorruptionEffectProps) => {
  const classifiedTheme = useChatStore((state) => state.classifiedTheme);
  const themeData = CLASSIFIED_THEMES[classifiedTheme as keyof typeof CLASSIFIED_THEMES] || CLASSIFIED_THEMES.TERMINAL_RED;
  const themeColor = themeData.colors.primary; // Theme-aware color
  const [glitchFrame, setGlitchFrame] = useState(0);
  const [showGlitch, setShowGlitch] = useState(true);
  const [glitchData, setGlitchData] = useState<GlitchBlock[][]>([]);

  const redOverlayOpacity = useAnimatedValue(0);
  const blackOverlayOpacity = useAnimatedValue(0);

  // Generate aggressive glitch frames
  useEffect(() => {
    const frames: GlitchBlock[][] = [];

    // 15 frames for 2 seconds of aggressive corruption
    for (let f = 0; f < 15; f++) {
      const blocks: GlitchBlock[] = [];
      const clusterCount = 6 + Math.floor(Math.random() * 3); // 6-8 clusters (more than discovery)

      for (let c = 0; c < clusterCount; c++) {
        const cx = Math.random() * width;
        const cy = Math.random() * height; // Full screen corruption
        const size = 100 + Math.random() * 150; // Larger blocks

        // Large dark base block
        blocks.push({
          x: cx - size/2,
          y: cy - size/2,
          w: size,
          h: size * 0.9,
          color: '#0a0000',
          opacity: 0.8
        });

        // Medium corruption blocks (more than discovery)
        for (let i = 0; i < 8; i++) {
          const s = size * (0.25 + Math.random() * 0.35);
          blocks.push({
            x: cx + (Math.random() - 0.5) * size * 0.9 - s/2,
            y: cy + (Math.random() - 0.5) * size * 0.9 - s/2,
            w: s,
            h: s * (0.4 + Math.random() * 0.6),
            color: Math.random() > 0.6 ? '#220000' : '#1a0000',
            opacity: 0.6 + Math.random() * 0.3
          });
        }

        // Bright red accent pixels (MORE red than discovery)
        for (let i = 0; i < 6; i++) {
          const s = 10 + Math.random() * 20;
          blocks.push({
            x: cx + (Math.random() - 0.5) * size - s/2,
            y: cy + (Math.random() - 0.5) * size - s/2,
            w: s,
            h: s,
            color: Math.random() > 0.2 ? themeColor : '#FF6666', // More bright red
            opacity: 0.7 + Math.random() * 0.3
          });
        }
      }

      // Horizontal scan lines (more aggressive)
      for (let i = 0; i < 6; i++) {
        blocks.push({
          x: 0,
          y: Math.random() * height,
          w: width,
          h: 2 + Math.random() * 3,
          color: Math.random() > 0.5 ? '#551111' : '#000',
          opacity: 0.6
        });
      }

      // Vertical glitch bars (new - adds to chaos)
      if (Math.random() > 0.5) {
        blocks.push({
          x: Math.random() * width,
          y: 0,
          w: 3 + Math.random() * 8,
          h: height,
          color: '#330000',
          opacity: 0.4
        });
      }

      frames.push(blocks);
    }

    setGlitchData(frames);
  }, [themeColor]);

  // Glitch animation: 15 frames × 133ms = 2000ms
  useEffect(() => {
    let frame = 0;
    const interval = setInterval(() => {
      frame++;
      if (frame >= 15) {
        setShowGlitch(false);
        clearInterval(interval);
      } else {
        setGlitchFrame(frame);
      }
    }, 133); // 133ms per frame for 2 seconds total

    return () => clearInterval(interval);
  }, []);

  // Fade to red: starts at 2000ms, duration 500ms
  useEffect(() => {
    let animation: Animated.CompositeAnimation | null = null;

    const timer = setTimeout(() => {
      animation = Animated.timing(redOverlayOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      });
      animation.start();
    }, 2000);

    return () => {
      clearTimeout(timer);
      if (animation) animation.stop();
      redOverlayOpacity.stopAnimation();
    };
  }, [redOverlayOpacity]);

  // Fade to black: starts at 2500ms, duration 500ms
  useEffect(() => {
    let animation: Animated.CompositeAnimation | null = null;

    const timer = setTimeout(() => {
      animation = Animated.timing(blackOverlayOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      });
      animation.start(() => {
        // Complete at 3000ms (synced to sound)
        onComplete();
      });
    }, 2500);

    return () => {
      clearTimeout(timer);
      if (animation) animation.stop();
      blackOverlayOpacity.stopAnimation();
    };
  }, [blackOverlayOpacity, onComplete]);

  const currentGlitch = glitchData[glitchFrame] || [];

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Glitch blocks */}
      {showGlitch && (
        <View style={StyleSheet.absoluteFill}>
          {currentGlitch.map((block: GlitchBlock, i: number) => (
            <View
              key={i}
              style={{
                position: 'absolute',
                left: block.x,
                top: block.y,
                width: block.w,
                height: block.h,
                backgroundColor: block.color,
                opacity: block.opacity,
              }}
            />
          ))}
        </View>
      )}

      {/* Red overlay (the part you liked) */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: themeColor,
            opacity: redOverlayOpacity,
            zIndex: 100,
          }
        ]}
      />

      {/* Black overlay (final fade) */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: '#000',
            opacity: blackOverlayOpacity,
            zIndex: 101,
          }
        ]}
      />
    </View>
  );
};
