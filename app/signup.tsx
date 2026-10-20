import { BSColors } from '@/constants/theme';
import { api } from '@/store/api';
import { AuthStore } from '@/store/auth';
import { firstError, validateEmail, validatePassword, validatePasswordMatch, validateRequired } from '@/utils/validation';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type FlowConfig = { biometric: boolean; fileUpload: boolean; cameraInjection: boolean };

const FLOW_OPTIONS: { key: keyof FlowConfig; label: string; desc: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'cameraInjection', label: 'Camera Injection (Liveness)', desc: 'Face video verification step', icon: 'videocam-outline' },
  { key: 'biometric', label: 'Biometric Setup', desc: 'Fingerprint / Face ID setup step', icon: 'finger-print-outline' },
  { key: 'fileUpload', label: 'File Upload (KYC)', desc: 'Identity document upload step', icon: 'document-outline' },
];

export default function SignupScreen() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [flowConfig, setFlowConfig] = useState<FlowConfig>({ biometric: true, fileUpload: true, cameraInjection: true });

  const autoFillNewUser = () => {
    const firstNames = ['Alex', 'Jordan', 'Morgan', 'Taylor', 'Casey', 'Riley', 'Jamie', 'Avery', 'Quinn', 'Blake'];
    const lastNames = ['Johnson', 'Smith', 'Williams', 'Brown', 'Davis', 'Miller', 'Wilson', 'Moore', 'Anderson', 'Thomas'];
    const first = firstNames[Math.floor(Math.random() * firstNames.length)];
    const last = lastNames[Math.floor(Math.random() * lastNames.length)];
    // timestamp + random guarantees uniqueness across runs — no duplicate emails
    const suffix = Date.now().toString().slice(-5) + Math.floor(10 + Math.random() * 90);
    const name = `${first} ${last}`;
    const generatedEmail = `${first.toLowerCase()}.${last.toLowerCase()}${suffix}@example.com`;
    setFullName(name);
    setEmail(generatedEmail);
    setPassword('SecurePass@123');
    setConfirmPassword('SecurePass@123');
    setError('');
  };

  const handleSignup = async () => {
    const validationError = firstError(
      validateRequired(fullName, 'Full name'),
      validateEmail(email),
      validatePassword(password),
      validatePasswordMatch(password, confirmPassword),
    );
    if (validationError) { setError(validationError); return; }
    setError('');
    setLoading(true);
    try {
      const res = await api.signup(fullName, email, password);
      await AuthStore.setToken(res.token);
      AuthStore.setUser(res.user);
    } catch (err: any) {
      // Fix 9: Never silently log in an existing user on signup failure.
      setError(err.message || 'Signup failed. Please try again.');
      setLoading(false);
      return;
    }
    AuthStore.setRole('user');
    AuthStore.setFlow('signup');
    AuthStore.setEmail(email);
    AuthStore.setFlowConfig(flowConfig);
    router.replace('/(banking)/home' as any);
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        <View style={styles.logoContainer}>
          <Image source={require('@/assets/images/bstack-bank-logo.png')} style={styles.logo} contentFit="contain" testID="bs-logo-signup" />
        </View>

        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Join BrowserStack today</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input} placeholder="Enter your full name"
            placeholderTextColor="#AAA" value={fullName}
            onChangeText={setFullName} testID="fullname-input"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input} placeholder="Enter your email"
            placeholderTextColor="#AAA" value={email}
            onChangeText={setEmail} keyboardType="email-address"
            autoCapitalize="none" testID="email-input"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Password</Text>
          <View style={styles.passwordWrap}>
            <TextInput
              style={styles.passwordInput} placeholder="Create a password"
              placeholderTextColor="#AAA" value={password}
              onChangeText={setPassword} secureTextEntry={!showPassword} testID="password-input"
            />
            <TouchableOpacity onPress={() => setShowPassword(v => !v)} style={styles.eyeBtn} testID="toggle-password-visibility" accessibilityLabel={showPassword ? 'Hide password' : 'Show password'} accessibilityRole="button">
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Confirm Password</Text>
          <View style={styles.passwordWrap}>
            <TextInput
              style={styles.passwordInput} placeholder="Confirm your password"
              placeholderTextColor="#AAA" value={confirmPassword}
              onChangeText={setConfirmPassword} secureTextEntry={!showConfirmPassword} testID="confirm-password-input"
            />
            <TouchableOpacity onPress={() => setShowConfirmPassword(v => !v)} style={styles.eyeBtn} testID="toggle-confirm-password-visibility" accessibilityLabel={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'} accessibilityRole="button">
              <Ionicons name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>
        </View>

        {error ? <Text style={styles.error} testID="signup-error">{error}</Text> : null}

        <TouchableOpacity style={[styles.primaryBtn, loading && { opacity: 0.7 }]} onPress={handleSignup} disabled={loading} testID="signup-btn" accessibilityLabel="Create your account" accessibilityRole="button" accessibilityState={{ disabled: loading }}>
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.primaryBtnText}>Create Account</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={styles.linkRow} onPress={() => router.replace('/' as any)} testID="goto-login">
          <Text style={styles.linkText}>Already have an account? <Text style={styles.link}>Sign In</Text></Text>
        </TouchableOpacity>

        {/* Mock Data Controller Bar */}
        <View style={styles.mockBar}>
          <Text style={styles.mockBarTitle}>Mock Data Controller</Text>
          <View style={styles.mockBtnRow}>
            <TouchableOpacity style={[styles.mockBtn, { flex: 1 }]} onPress={autoFillNewUser} testID="autofill-new-user">
              <Text style={styles.mockBtnText}>Auto-fill</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.mockBtn, styles.customizeBtn]}
              onPress={() => setShowCustomize(true)}
              testID="customize-signup-btn"
            >
              <Ionicons name="settings-outline" size={14} color="#fff" style={{ marginRight: 4 }} />
              <Text style={styles.mockBtnText}>Customize Signup</Text>
            </TouchableOpacity>
          </View>
        </View>

      </ScrollView>

      {/* Customize Signup Modal */}
      <Modal visible={showCustomize} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.customizeModal}>
            <View style={styles.customizeHeader}>
              <Text style={styles.customizeTitle}>Customize Signup Flow</Text>
              <TouchableOpacity onPress={() => setShowCustomize(false)} testID="customize-close">
                <Ionicons name="close" size={22} color="#333" />
              </TouchableOpacity>
            </View>
            <Text style={styles.customizeSub}>Toggle steps to include or skip in the signup flow</Text>

            {FLOW_OPTIONS.map(opt => (
              <View key={opt.key} style={styles.flowRow}>
                <View style={[styles.flowIcon, { backgroundColor: flowConfig[opt.key] ? BSColors.primary + '15' : BSColors.lightGray }]}>
                  <Ionicons name={opt.icon} size={20} color={flowConfig[opt.key] ? BSColors.primary : BSColors.slate300} />
                </View>
                <View style={styles.flowText}>
                  <Text style={styles.flowLabel}>{opt.label}</Text>
                  <Text style={styles.flowDesc}>{opt.desc}</Text>
                </View>
                <Switch
                  value={flowConfig[opt.key]}
                  onValueChange={() => setFlowConfig(prev => ({ ...prev, [opt.key]: !prev[opt.key] }))}
                  trackColor={{ false: BSColors.mediumGray, true: BSColors.primary + '80' }}
                  thumbColor={flowConfig[opt.key] ? BSColors.primary : BSColors.slate300}
                  testID={`toggle-${opt.key}`}
                />
              </View>
            ))}

            <TouchableOpacity style={styles.customizeDone} onPress={() => setShowCustomize(false)} testID="customize-done">
              <Text style={styles.customizeDoneText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BSColors.bgPageAlt },
  container: { flex: 1, backgroundColor: BSColors.bgPageAlt },
  content: { paddingHorizontal: 28, paddingTop: 48, paddingBottom: 32 },
  logoContainer: { alignItems: 'center', marginBottom: 36 },
  logo: { width: 200, height: 54 },
  title: { color: '#111', fontSize: 28, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  subtitle: { color: '#666', fontSize: 15, textAlign: 'center', marginBottom: 36 },
  inputGroup: { marginBottom: 20 },
  label: { color: '#333', fontSize: 14, fontWeight: '600', marginBottom: 8 },
  input: {
    backgroundColor: BSColors.white, borderRadius: 12, borderWidth: 1.5,
    borderColor: BSColors.indigoBorder, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, color: '#111',
  },
  passwordWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: BSColors.white, borderRadius: 12, borderWidth: 1.5, borderColor: BSColors.indigoBorder,
  },
  passwordInput: { flex: 1, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: '#111' },
  eyeBtn: { paddingHorizontal: 14, paddingVertical: 14 },
  error: { color: BSColors.errorDeeper, fontSize: 13, marginBottom: 14, textAlign: 'center' },
  primaryBtn: {
    backgroundColor: BSColors.primary, borderRadius: 12, paddingVertical: 16,
    alignItems: 'center', marginBottom: 20, marginTop: 8,
    shadowColor: BSColors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  primaryBtnText: { color: BSColors.white, fontSize: 16, fontWeight: '700' },
  linkRow: { marginBottom: 36 },
  linkText: { color: '#666', textAlign: 'center', fontSize: 14 },
  link: { color: BSColors.primary, fontWeight: '700' },
  mockBar: { backgroundColor: BSColors.indigoBg, borderRadius: 14, padding: 16, borderWidth: 1.5, borderColor: BSColors.primary, marginTop: 8 },
  mockBarTitle: { color: BSColors.primary, fontWeight: '700', fontSize: 11, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 },
  mockBtnRow: { flexDirection: 'row', gap: 8 },
  mockBtn: { backgroundColor: BSColors.primary, borderRadius: 8, paddingVertical: 11, alignItems: 'center', justifyContent: 'center' },
  customizeBtn: { flexDirection: 'row', paddingHorizontal: 12 },
  mockBtnText: { color: BSColors.white, fontSize: 13, fontWeight: '600' },
  // Modal
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  customizeModal: { backgroundColor: BSColors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 36 },
  customizeHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  customizeTitle: { color: BSColors.textPrimary, fontSize: 18, fontWeight: '800' },
  customizeSub: { color: BSColors.darkGray, fontSize: 13, marginBottom: 20 },
  flowRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: BSColors.lightGray, gap: 12 },
  flowIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  flowText: { flex: 1 },
  flowLabel: { color: BSColors.textPrimary, fontSize: 14, fontWeight: '700', marginBottom: 2 },
  flowDesc: { color: BSColors.darkGray, fontSize: 12 },
  customizeDone: { backgroundColor: BSColors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
  customizeDoneText: { color: BSColors.white, fontSize: 15, fontWeight: '700' },
});