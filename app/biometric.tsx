import { BSColors } from '@/constants/theme';
import { AuthStore } from '@/store/auth';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as LocalAuthentication from 'expo-local-authentication';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function BiometricScreen() {
  const router = useRouter();
  const [bioLoading, setBioLoading] = useState(false);
  const [verified, setVerified] = useState(false);
  const [bioError, setBioError] = useState('');
  const isSignup = AuthStore.getFlow() === 'signup';

  useEffect(() => {
    if (isSignup) {
      const cfg = AuthStore.getFlowConfig();
      if (!cfg.biometric) {
        if (cfg.fileUpload) {
          router.replace('/kyc' as any);
        } else {
          router.replace('/(banking)/home' as any);
        }
        return;
      }
    }
    // Delay auto-trigger on iOS — the system biometric prompt gets dismissed
    // if it fires before the screen transition animation completes
    const timer = setTimeout(triggerBiometric, 500);
    return () => clearTimeout(timer);
  }, []);

  const navigateToDashboard = () => {
    const flow = AuthStore.getFlow();
    const role = AuthStore.getRole();
    if (flow === 'signup') {
      const cfg = AuthStore.getFlowConfig();
      if (cfg.fileUpload) {
        router.replace('/kyc' as any);
      } else {
        router.replace('/(banking)/home' as any);
      }
    } else {
      router.replace(role === 'admin' ? '/(admin)/users' as any : '/(banking)/home' as any);
    }
  };

  const handleSuccess = () => {
    setVerified(true);
    setBioError('');
    setTimeout(navigateToDashboard, 600);
  };

  const handleSkip = () => navigateToDashboard();

  const triggerBiometric = async () => {
    setBioLoading(true);
    setBioError('');
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!hasHardware || !isEnrolled) {
        setBioLoading(false);
        handleSuccess();
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Verify your identity to continue',
        cancelLabel: 'Cancel',
        // disableDeviceFallback: true — biometric only, no "Use PIN" fallback button
        // inside the prompt. This means a single Fail press resolves immediately
        // without requiring the user to also dismiss a passcode fallback option.
        disableDeviceFallback: true,
      });
      setBioLoading(false);
      if (result.success) {
        handleSuccess();
      } else {
        setBioError('Biometric authentication failed. Please try again.');
      }
    } catch {
      setBioLoading(false);
      setBioError('Biometric authentication failed. Please try again.');
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.container}>

        <Image source={require('@/assets/images/browserstack-logo.png')} style={s.logo} contentFit="contain" testID="bs-logo-bio" />

        {isSignup && (
          <View style={s.stepBadge}>
            <Text style={s.stepBadgeText}>Step 4 of 5 — Identity Verification</Text>
          </View>
        )}

        <Text style={s.title}>Verify Your Identity</Text>
        <Text style={s.subtitle}>
          {isSignup ? 'Register your identity to secure your account' : 'Confirm your identity to access your account'}
        </Text>

        {verified ? (
          <View style={s.successContainer}>
            <Ionicons name="checkmark-circle" size={80} color={BSColors.successDark} />
            <Text style={s.successText}>Identity Verified!</Text>
          </View>
        ) : (
          <View style={s.modeContent}>
            <View style={s.bioIconCircle}>
              {bioLoading
                ? null
                : <Ionicons name="finger-print" size={72} color={BSColors.primary} />}
            </View>
            <Text style={s.modeHint}>
              {bioLoading ? 'Waiting for biometric...' : 'Use your fingerprint or Face ID to verify'}
            </Text>

            {bioError ? (
              <View style={s.errorBox} testID="bio-error-box">
                <Ionicons name="alert-circle-outline" size={18} color={BSColors.errorDark} style={{ marginRight: 8 }} />
                <Text style={s.error} testID="bio-error">{bioError}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[s.primaryBtn, bioLoading && s.primaryBtnDisabled]}
              onPress={triggerBiometric}
              disabled={bioLoading}
              testID="fingerprint-btn"
              accessibilityLabel={bioLoading ? 'Verifying biometric' : 'Scan biometric to verify identity'}
              accessibilityRole="button"
              accessibilityState={{ disabled: bioLoading }}
            >
              {bioLoading
                ? <Text style={s.primaryBtnText}>Verifying...</Text>
                : <>
                    <Ionicons name="finger-print-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={s.primaryBtnText}>Scan Biometric</Text>
                  </>}
            </TouchableOpacity>

            <TouchableOpacity style={s.skipBtn} onPress={handleSkip} testID="skip-biometric-btn" accessibilityLabel="Skip biometric verification" accessibilityRole="button">
              <Text style={s.skipBtnText}>Skip this step</Text>
            </TouchableOpacity>
          </View>
        )}

      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BSColors.bgPageAlt },
  container: { flex: 1, alignItems: 'center', paddingHorizontal: 28, paddingTop: 36, paddingBottom: 32 },
  logo: { width: 180, height: 48, marginBottom: 16 },
  stepBadge: { backgroundColor: BSColors.indigoBg, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5, marginBottom: 16, borderWidth: 1, borderColor: BSColors.primary + '40' },
  stepBadgeText: { color: BSColors.primary, fontSize: 12, fontWeight: '600' },
  title: { color: '#111', fontSize: 24, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  subtitle: { color: '#888', fontSize: 14, textAlign: 'center', marginBottom: 24 },
  modeContent: { width: '100%', alignItems: 'center' },
  bioIconCircle: { width: 120, height: 120, borderRadius: 60, backgroundColor: BSColors.indigoBg, borderWidth: 2, borderColor: BSColors.indigoBorder, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  modeHint: { color: '#888', fontSize: 14, textAlign: 'center', marginBottom: 24 },
  errorBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF2F2', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 20, borderWidth: 1, borderColor: BSColors.errorDark + '40', width: '100%' },
  error: { color: BSColors.errorDark, fontSize: 13, flex: 1 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#000', borderRadius: 14, paddingVertical: 16, paddingHorizontal: 36, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  primaryBtnDisabled: { opacity: 0.6 },
  primaryBtnText: { color: BSColors.white, fontSize: 16, fontWeight: '700' },
  skipBtn: { marginTop: 16, paddingVertical: 10, paddingHorizontal: 24 },
  skipBtnText: { color: BSColors.slate300, fontSize: 14, fontWeight: '600', textDecorationLine: 'underline' },
  successContainer: { alignItems: 'center', marginTop: 32, gap: 16 },
  successText: { color: BSColors.successDark, fontSize: 20, fontWeight: '700' },
});