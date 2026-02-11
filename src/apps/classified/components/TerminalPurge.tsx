import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useAppTheme } from '../../../core/hooks/useAppTheme';

const { width, height } = Dimensions.get('window');
const TACTICAL_COLOR = '#FF3333';

const HEX_CHARS = '0123456789ABCDEF';

// Generate a random line of Hex
const generateHexLine = () => {
  let line = '';
  for (let i = 0; i < 40; i++) {
    line += HEX_CHARS.charAt(Math.floor(Math.random() * HEX_CHARS.length)) + ' ';
  }
  return line;
};

export const TerminalPurge = ({ onComplete }: { onComplete: () => void }) => {
  const theme = useAppTheme();
  const themeColor = theme.colors.primary; // Use theme color for background hex

  const [lines, setLines] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('INITIATING SEQUENCE...');

  useEffect(() => {
    // 1. Start the Hex Scroll
    const hexInterval = setInterval(() => {
      setLines(prev => {
        const next = [generateHexLine(), ...prev];
        if (next.length > 25) next.pop(); // Keep memory usage low
        return next;
      });
    }, 50);

    // 2. Progress Bar Logic (2 seconds total)
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        const next = prev + 2; // +2% every 30ms approx
        if (next >= 20 && next < 40) setStatus('OVERWRITING SECTORS...');
        if (next >= 40 && next < 70) setStatus('SCRAMBLING ENCRYPTION...');
        if (next >= 70 && next < 95) setStatus('VERIFYING DELETION...');
        if (next >= 100) {
           setStatus('PURGE COMPLETE');
           clearInterval(hexInterval);
           clearInterval(progressInterval);

           // Small delay to read "COMPLETE" before closing
           setTimeout(() => {
               onComplete();
           }, 400);
           return 100;
        }

        // Haptic feedback every 10%
        if (next % 10 === 0) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }

        return next;
      });
    }, 30);

    return () => {
      clearInterval(hexInterval);
      clearInterval(progressInterval);
    };
  }, []);

  return (
    <View style={[StyleSheet.absoluteFill, styles.container]}>
      {/* Background Matrix Scroll */}
      <View style={styles.matrixLayer}>
        {lines.map((line, i) => (
          <Text key={i} style={[styles.hexText, { color: themeColor }]}>
            {line}
          </Text>
        ))}
      </View>

      {/* Foreground Progress UI */}
      <View style={styles.overlay}>
        <Text style={styles.label}>// SECURE WIPE IN PROGRESS //</Text>

        <View style={styles.barContainer}>
            <View style={[styles.barFill, { width: `${progress}%` }]} />
        </View>

        <View style={styles.statsRow}>
            <Text style={styles.statusText}>{status}</Text>
            <Text style={styles.percentText}>{progress}%</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(0,0,0,0.95)',
    zIndex: 999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  matrixLayer: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.3,
    overflow: 'hidden',
  },
  hexText: {
    fontFamily: 'Courier',
    fontSize: 10,
    lineHeight: 12,
    opacity: 0.6,
    // Color is set inline based on theme
  },
  overlay: {
    width: '80%',
    padding: 20,
    backgroundColor: '#000',
    borderWidth: 1,
    borderColor: TACTICAL_COLOR,
    alignItems: 'center',
  },
  label: {
    color: TACTICAL_COLOR,
    fontFamily: 'Courier',
    fontWeight: 'bold',
    marginBottom: 20,
    fontSize: 12,
  },
  barContainer: {
    width: '100%',
    height: 12,
    borderWidth: 1,
    borderColor: '#333',
    padding: 2,
    marginBottom: 10,
  },
  barFill: {
    height: '100%',
    backgroundColor: TACTICAL_COLOR,
  },
  statsRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statusText: {
    color: TACTICAL_COLOR,
    fontFamily: 'Courier',
    fontSize: 10,
  },
  percentText: {
    color: '#FFF',
    fontFamily: 'Courier',
    fontSize: 10,
  }
});
