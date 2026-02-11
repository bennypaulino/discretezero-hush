import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { useAppTheme } from '../hooks/useAppTheme';

export const BiometricGate = ({ children }: { children: React.ReactNode }) => {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const activeTheme = useAppTheme();

  // Run immediately on mount
  useEffect(() => {
    authenticate();
  }, []);

  const authenticate = async () => {
    // 1. Check if phone has hardware (FaceID/TouchID)
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();

    if (!hasHardware || !isEnrolled) {
      // If no security on phone, just let them in (or show error in real app)
      setIsUnlocked(true);
      return;
    }

    // 2. Prompt for FaceID
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Verify Identity',
      fallbackLabel: 'Enter Passcode',
    });

    if (result.success) {
      setIsUnlocked(true);
    } else {
      // If failed, they can try again by tapping a button
    }
  };

  if (isUnlocked) {
    return <>{children}</>;
  }

  // THE LOCKED SCREEN UI
  return (
    <View style={[styles.container, { backgroundColor: activeTheme.colors.background }]}>
      <View style={styles.lockIcon}>
        <Text style={{ fontSize: 50 }}>🔒</Text>
      </View>

      <Text style={[styles.title, { color: activeTheme.colors.text }]}>
        {activeTheme.fonts.display === 'Courier-Bold' ? 'RESTRICTED ACCESS' : 'Locked'}
      </Text>

      <TouchableOpacity onPress={authenticate} style={[styles.button, { borderColor: activeTheme.colors.primary }]}>
        <Text style={{ color: activeTheme.colors.primary, fontWeight: 'bold' }}>
          {activeTheme.fonts.display === 'Courier-Bold' ? 'RETRY BIOMETRICS' : 'Unlock'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 20 },
  lockIcon: { marginBottom: 20 },
  title: { fontSize: 24, fontWeight: 'bold', letterSpacing: 2 },
  button: { paddingHorizontal: 30, paddingVertical: 15, borderWidth: 1, borderRadius: 10 },
});
