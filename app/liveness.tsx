import { BSColors } from '@/constants/theme';
import { AuthStore } from '@/store/auth';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
// import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, BackHandler, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LivenessScreen() {
  const router = useRouter();
  const [phase, setPhase] = useState<'ready' | 'preview'>('ready');
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);

  const flowConfig = AuthStore.getFlowConfig();

  // Intercept Android back
  React.useEffect(() => {
    const onBack = () => {
      const flow = AuthStore.getFlow();
      if (flow === 'login') {
        router.replace('/(banking)/profile' as any);
      } else {
        router.replace('/otp' as any);
      }
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
    return () => sub.remove();
  }, []);

  React.useEffect(() => {
    if (!flowConfig.cameraInjection) {
      navigateNext();
    }
  }, []);

  const navigateNext = () => {
    const flow = AuthStore.getFlow();
    // When called from profile (login flow), go back to profile
    if (flow === 'login') {
      router.replace('/(banking)/profile' as any);
      return;
    }
    // Signup flow — original chain (biometric removed per new spec, go to home)
    router.replace('/(banking)/home' as any);
  };

  const handleLaunchCamera = async () => {
    // FILE UPLOAD COMMENTED OUT — uncomment import and body below to re-enable
    // const { status } = await ImagePicker.requestCameraPermissionsAsync();
    // if (status !== 'granted') {
    //   // Permission denied — skip
    //   navigateNext();
    //   return;
    // }
    // // Launch native OS camera — leaves the app, user takes photo, returns here
    // const result = await ImagePicker.launchCameraAsync({
    //   mediaTypes: 'images',
    //   quality: 0.85,
    //   allowsEditing: false,
    // });
    // if (!result.canceled && result.assets?.[0]?.uri) {
    //   setCapturedUri(result.assets[0].uri);
    //   setPhase('preview');
    // }
    // // If cancelled, stay on ready screen
    navigateNext();
  };

  const handleRecapture = () => {
    setCapturedUri(null);
    setPhase('ready');
  };

  const handleSetProfile = async () => {
    // FILE UPLOAD COMMENTED OUT — uncomment below to re-enable Cloudinary upload
    // if (!capturedUri) return;
    // setUploadLoading(true);
    // try {
    //   const cloudName = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME ?? 'fhyftzkc';
    //   const uploadPreset = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET ?? 'bs_banking_unsigned';
    //   const formData = new FormData();
    //   formData.append('file', { uri: capturedUri, type: 'image/jpeg', name: 'liveness.jpg' } as any);
    //   formData.append('upload_preset', uploadPreset);
    //   formData.append('folder', 'bs_banking/profiles');
    //   const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    //     method: 'POST',
    //     body: formData,
    //   });
    //   const data = await res.json();
    //   if (data.secure_url) {
    //     const currentUser = AuthStore.getUser();
    //     if (currentUser) {
    //       AuthStore.setUser({ ...currentUser, avatarUrl: data.secure_url });
    //     }
    //   }
    // } catch {
    //   // Non-fatal
    // } finally {
    //   setUploadLoading(false);
    // }
    navigateNext();
  };

  const handleSkip = () => navigateNext();

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.container}>
        <Image source={require('@/assets/images/bstack-bank-logo.png')} style={s.logo} contentFit="contain" />

        <View style={s.stepBadge}>
          <Text style={s.stepBadgeText}>Step 3 of 5 — Liveness Check</Text>
        </View>

        <Text style={s.title}>Liveness Verification</Text>
        <Text style={s.subtitle}>
          {phase === 'preview'
            ? 'Review your photo — Set Profile or Recapture'
            : 'Take a photo using your device camera'}
        </Text>

        {phase === 'ready' && (
          <>
            <View style={s.iconCircle}>
              <Ionicons name="camera-outline" size={56} color={BSColors.primary} />
            </View>

            <TouchableOpacity style={s.primaryBtn} onPress={handleLaunchCamera} testID="launch-camera-btn" accessibilityLabel="Open camera to take liveness photo" accessibilityRole="button">
              <Ionicons name="camera-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={s.primaryBtnText}>Open Camera</Text>
            </TouchableOpacity>

            <TouchableOpacity style={s.skipBtn} onPress={handleSkip} testID="skip-liveness-btn" accessibilityLabel="Skip liveness verification" accessibilityRole="button">
              <Text style={s.skipBtnText}>Skip this step</Text>
            </TouchableOpacity>
          </>
        )}

        {phase === 'preview' && capturedUri && (
          <>
            <View style={s.previewFrame}>
              <Image
                source={{ uri: capturedUri }}
                style={s.previewImage}
                contentFit="cover"
                testID="captured-photo"
              />
              <View style={s.previewBadge}>
                <Ionicons name="checkmark-circle" size={14} color="#fff" />
                <Text style={s.previewBadgeText}>Photo captured</Text>
              </View>
            </View>

            <View style={s.previewActions}>
              <TouchableOpacity style={s.retakeBtn} onPress={handleRecapture} disabled={uploadLoading} testID="recapture-btn" accessibilityLabel="Retake photo" accessibilityRole="button">
                <Ionicons name="refresh-outline" size={18} color={BSColors.primary} style={{ marginRight: 6 }} />
                <Text style={s.retakeBtnText}>Recapture</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.continueBtn, uploadLoading && { opacity: 0.7 }]}
                onPress={handleSetProfile}
                disabled={uploadLoading}
                testID="set-profile-btn"
                accessibilityLabel={uploadLoading ? 'Uploading profile photo' : 'Set as profile photo'}
                accessibilityRole="button"
                accessibilityState={{ disabled: uploadLoading }}
              >
                {uploadLoading
                  ? <ActivityIndicator size="small" color="#fff" style={{ marginRight: 6 }} />
                  : <Ionicons name="person-circle-outline" size={18} color="#fff" style={{ marginRight: 6 }} />}
                <Text style={s.continueBtnText}>Set Profile</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={s.skipBtn} onPress={handleSkip} testID="skip-after-preview-btn">
              <Text style={s.skipBtnText}>Skip this step</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BSColors.bgPageAlt },
  container: { flex: 1, alignItems: 'center', paddingHorizontal: 28, paddingTop: 32, paddingBottom: 32 },
  logo: { width: 160, height: 44, marginBottom: 16 },
  stepBadge: { backgroundColor: BSColors.indigoBg, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5, marginBottom: 16, borderWidth: 1, borderColor: BSColors.primary + '40' },
  stepBadgeText: { color: BSColors.primary, fontSize: 12, fontWeight: '600' },
  title: { color: '#111', fontSize: 22, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  subtitle: { color: '#888', fontSize: 14, textAlign: 'center', marginBottom: 24 },
  iconCircle: { width: 120, height: 120, borderRadius: 60, backgroundColor: BSColors.indigoBg, borderWidth: 2, borderColor: BSColors.indigoBorder, alignItems: 'center', justifyContent: 'center', marginBottom: 28 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#000', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 28, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  primaryBtnText: { color: BSColors.white, fontSize: 15, fontWeight: '700' },
  skipBtn: { marginTop: 8, paddingVertical: 10, paddingHorizontal: 24 },
  skipBtnText: { color: BSColors.slate300, fontSize: 14, fontWeight: '600', textDecorationLine: 'underline' },
  previewFrame: { width: 300, height: 360, borderRadius: 16, overflow: 'hidden', borderWidth: 4, borderColor: BSColors.successDark, marginBottom: 20, shadowColor: BSColors.successDark, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 6 },
  previewImage: { width: '100%', height: '100%' },
  previewBadge: { position: 'absolute', bottom: 10, left: 10, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(5,150,105,0.85)', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
  previewBadgeText: { color: BSColors.white, fontSize: 10, fontWeight: '700' },
  previewActions: { flexDirection: 'row', gap: 12, width: '100%' },
  retakeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: BSColors.indigoBg, borderRadius: 12, paddingVertical: 14, borderWidth: 1.5, borderColor: BSColors.primary + '40' },
  retakeBtnText: { color: BSColors.primary, fontSize: 15, fontWeight: '700' },
  continueBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#000', borderRadius: 12, paddingVertical: 14 },
  continueBtnText: { color: BSColors.white, fontSize: 15, fontWeight: '700' },
});