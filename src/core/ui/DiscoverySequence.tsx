import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import { useAnimatedValue } from '../hooks/useAnimatedValue';
import type { GlitchBlock } from '../../types/animations';

const { width, height } = Dimensions.get('window');
const TERMINAL_RED = '#FF3B30';

interface DiscoverySequenceProps {
  onEffectsComplete: () => void;
  quickMode?: boolean;  // Skip glitch/sweep, just fade
}

/**
 * Discovery Animation - Effects Phase
 * 
 * FULL MODE (quickMode=false):
 * 0.0s - 0.8s: Glitch blocks
 * 0.3s - 0.7s: Desaturation fade IN
 * 0.7s - 1.0s: Sweep
 * 0.7s - 1.1s: Desaturation fade OUT
 * 1.1s: onEffectsComplete
 * 
 * QUICK MODE (quickMode=true):
 * 0.0s - 0.2s: Fast desaturation fade in/out
 * 0.2s: onEffectsComplete
 */
export const DiscoverySequence = ({ onEffectsComplete, quickMode = false }: DiscoverySequenceProps) => {
  const [glitchFrame, setGlitchFrame] = useState(0);
  const [showGlitch, setShowGlitch] = useState(!quickMode);
  const [glitchData, setGlitchData] = useState<GlitchBlock[][]>([]);
  const [isComplete, setIsComplete] = useState(false);
  
  const desaturationOpacity = useAnimatedValue(0);
  const sweepPosition = useAnimatedValue(-30);

  // Generate glitch frames (only if not quick mode)
  useEffect(() => {
    if (quickMode) return;

    const frames: GlitchBlock[][] = [];
    for (let f = 0; f < 6; f++) {
      const blocks: GlitchBlock[] = [];
      const clusterCount = 4 + Math.floor(Math.random() * 3);
      
      for (let c = 0; c < clusterCount; c++) {
        const cx = Math.random() * width;
        const cy = 100 + Math.random() * (height - 150);
        const size = 80 + Math.random() * 120;
        
        blocks.push({ x: cx - size/2, y: cy - size/2, w: size, h: size * 0.8, color: '#0a0000', opacity: 0.7 });
        
        for (let i = 0; i < 5; i++) {
          const s = size * (0.2 + Math.random() * 0.3);
          blocks.push({
            x: cx + (Math.random() - 0.5) * size * 0.8 - s/2,
            y: cy + (Math.random() - 0.5) * size * 0.8 - s/2,
            w: s, h: s * (0.5 + Math.random()),
            color: Math.random() > 0.5 ? '#330000' : '#1a0000',
            opacity: 0.5 + Math.random() * 0.3
          });
        }
        
        for (let i = 0; i < 3; i++) {
          const s = 8 + Math.random() * 15;
          blocks.push({
            x: cx + (Math.random() - 0.5) * size - s/2,
            y: cy + (Math.random() - 0.5) * size - s/2,
            w: s, h: s,
            color: Math.random() > 0.3 ? '#CC2222' : '#FF4444',
            opacity: 0.6 + Math.random() * 0.3
          });
        }
      }
      
      for (let i = 0; i < 4; i++) {
        blocks.push({
          x: 0, y: 100 + Math.random() * (height - 150),
          w: width, h: 1 + Math.random() * 2,
          color: Math.random() > 0.5 ? '#441111' : '#000',
          opacity: 0.5
        });
      }
      
      frames.push(blocks);
    }
    setGlitchData(frames);
  }, [quickMode]);

  // QUICK MODE: Simple fast fade
  useEffect(() => {
    if (!quickMode) return;

    // Quick fade in then out
    const animation = Animated.sequence([
      Animated.timing(desaturationOpacity, {
        toValue: 0.7,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(desaturationOpacity, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
      }),
    ]);

    animation.start(() => {
      setIsComplete(true);
      onEffectsComplete();
    });

    return () => {
      animation.stop();
      desaturationOpacity.stopAnimation();
    };
  }, [quickMode, desaturationOpacity, onEffectsComplete]);

  // FULL MODE: Glitch animation (0.0s - 0.8s)
  useEffect(() => {
    if (quickMode) return;
    
    let frame = 0;
    const interval = setInterval(() => {
      frame++;
      if (frame >= 6) {
        setShowGlitch(false);
        clearInterval(interval);
      } else {
        setGlitchFrame(frame);
      }
    }, 130);
    return () => clearInterval(interval);
  }, [quickMode]);

  // FULL MODE: Desaturation fade in then out
  useEffect(() => {
    if (quickMode) return;

    let fadeInAnimation: Animated.CompositeAnimation | null = null;
    let fadeOutAnimation: Animated.CompositeAnimation | null = null;

    const fadeInTimer = setTimeout(() => {
      fadeInAnimation = Animated.timing(desaturationOpacity, {
        toValue: 0.9,
        duration: 400,
        useNativeDriver: true,
      });
      fadeInAnimation.start();
    }, 300);

    const fadeOutTimer = setTimeout(() => {
      fadeOutAnimation = Animated.timing(desaturationOpacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      });
      fadeOutAnimation.start();
    }, 700);

    return () => {
      clearTimeout(fadeInTimer);
      clearTimeout(fadeOutTimer);
      if (fadeInAnimation) fadeInAnimation.stop();
      if (fadeOutAnimation) fadeOutAnimation.stop();
      desaturationOpacity.stopAnimation();
    };
  }, [quickMode, desaturationOpacity]);

  // FULL MODE: Sweep (0.7s - 1.0s)
  useEffect(() => {
    if (quickMode) return;

    let sweepAnimation: Animated.CompositeAnimation | null = null;

    const timer = setTimeout(() => {
      sweepAnimation = Animated.timing(sweepPosition, {
        toValue: height,
        duration: 300,
        useNativeDriver: true,
      });
      sweepAnimation.start();
    }, 700);

    return () => {
      clearTimeout(timer);
      if (sweepAnimation) sweepAnimation.stop();
      sweepPosition.stopAnimation();
    };
  }, [quickMode, sweepPosition]);

  // FULL MODE: Complete at 1.1s
  useEffect(() => {
    if (quickMode) return;

    const timer = setTimeout(() => {
      setIsComplete(true);
      onEffectsComplete();
    }, 1100);
    return () => clearTimeout(timer);
  }, [quickMode, onEffectsComplete]);

  if (isComplete) {
    return null;
  }

  const currentGlitch = glitchData[glitchFrame] || [];

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Desaturation overlay */}
      <Animated.View 
        style={[
          StyleSheet.absoluteFill, 
          { backgroundColor: '#000', opacity: desaturationOpacity }
        ]} 
      />

      {/* Sweep line (full mode only) */}
      {!quickMode && (
        <Animated.View
          style={[
            styles.sweepContainer,
            { transform: [{ translateY: sweepPosition }] }
          ]}
        >
          <View style={styles.sweepLine} />
          <View style={styles.sweepGlow} />
        </Animated.View>
      )}

      {/* Glitch blocks (full mode only) */}
      {showGlitch && !quickMode && (
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
    </View>
  );
};

const styles = StyleSheet.create({
  sweepContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
  },
  sweepLine: {
    height: 2,
    backgroundColor: TERMINAL_RED,
    shadowColor: TERMINAL_RED,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
  },
  sweepGlow: {
    height: 20,
    backgroundColor: TERMINAL_RED,
    opacity: 0.4,
  },
});
