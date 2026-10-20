import { BSColors } from '@/constants/theme';
import { AuthStore } from '@/store/auth';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as LegacyFS from 'expo-file-system/legacy';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, BackHandler, Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function KYCScreen() {
  const router = useRouter();
  const [docName, setDocName] = useState<string | null>(null);
  const [docUri, setDocUri] = useState<string | null>(null);
  const [docSize, setDocSize] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [showConsent, setShowConsent] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadDone, setDownloadDone] = useState(false);

  const flowConfig = AuthStore.getFlowConfig();

  // Intercept Android back — go to previous signup step
  useEffect(() => {
    const onBack = () => {
      if (flowConfig.biometric) {
        router.replace('/biometric' as any);
      } else if (flowConfig.cameraInjection) {
        router.replace('/liveness' as any);
      } else {
        router.replace('/otp' as any);
      }
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
    return () => sub.remove();
  }, []);

  // Skip this step if fileUpload is disabled in flow config
  useEffect(() => {
    if (!flowConfig.fileUpload) {
      import('@/store/api').then(({ api }) => api.markKyc().catch(() => {})).finally(() => {
        router.replace('/(banking)/home' as any);
      });
    }
  }, []);

  const handlePickDocument = () => {
    setShowConsent(true);
  };

  const handleConsentAccept = async () => {
    setShowConsent(false);
    setError('');
    try {
      // iOS: use '*/*' to open the Files app broadly, then validate PDF client-side
      // Android: restrict to application/pdf directly
      const mimeType = Platform.OS === 'ios' ? '*/*' : 'application/pdf';
      const result = await DocumentPicker.getDocumentAsync({
        type: mimeType,
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        // Validate PDF on iOS (since we opened with */* to avoid the blank picker bug)
        if (Platform.OS === 'ios') {
          const name = asset.name?.toLowerCase() ?? '';
          const mime = asset.mimeType?.toLowerCase() ?? '';
          if (!name.endsWith('.pdf') && !mime.includes('pdf')) {
            setError('Only PDF files are accepted. Please select a PDF document.');
            return;
          }
        }
        setDocName(asset.name);
        setDocUri(asset.uri);
        setDocSize(asset.size ?? null);
        setDownloadDone(false);
      }
    } catch {
      setError('Failed to pick document. Please try again.');
    }
  };

  const handleDownload = async () => {
    if (!docUri || !docName) return;
    setDownloading(true);
    try {
      const dest = (LegacyFS.documentDirectory ?? '') + docName;
      await LegacyFS.copyAsync({ from: docUri, to: dest });
      setDownloadDone(true);
      Alert.alert('Download Complete', `"${docName}" has been saved to your documents.`);
    } catch {
      Alert.alert('Download Failed', 'Could not save the file. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const handleComplete = async () => {
    if (!docName) { setError('Please upload your identity document to continue.'); return; }
    try { await (await import('@/store/api')).api.markKyc(); } catch { /* ignore */ }
    router.replace('/(banking)/home' as any);
  };

  const handleSkip = () => {
    router.replace('/(banking)/home' as any);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
        <Image source={require('@/assets/images/bstack-bank-logo.png')} style={s.logo} contentFit="contain" />

        <View style={s.stepBadge}>
          <Text style={s.stepBadgeText}>Step 5 of 5 — KYC Verification</Text>
        </View>

        <Text style={s.title}>KYC Verification</Text>
        <Text style={s.subtitle}>Upload a government-issued ID document to complete your KYC</Text>

        <View style={s.requirementsCard}>
          <Text style={s.requirementsTitle}>Document Requirements</Text>
          {[
            "Government-issued photo ID (Passport, Driver's License)",
            'File must be in PDF format',
            'Document must be clearly legible',
            'File size should not exceed 10 MB',
          ].map((req, i) => (
            <View key={i} style={s.reqRow}>
              <Ionicons name="checkmark-circle-outline" size={15} color={BSColors.primary} />
              <Text style={s.reqText}>{req}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity style={[s.uploadArea, docName && s.uploadAreaDone]} onPress={handlePickDocument} testID="upload-btn" accessibilityLabel={docName ? `Document selected: ${docName}. Tap to replace` : 'Upload identity document PDF'} accessibilityRole="button">
          {docName ? (
            <View style={s.uploadedContent}>
              <View style={s.uploadedIcon}>
                <Ionicons name="document-text" size={32} color="#059669" />
              </View>
              <View style={s.uploadedInfo}>
                <Text style={s.uploadedName} numberOfLines={2}>{docName}</Text>
                {docSize && <Text style={s.uploadedSize}>{formatSize(docSize)}</Text>}
              </View>
              <Ionicons name="checkmark-circle" size={24} color="#059669" />
            </View>
          ) : (
            <View style={s.uploadPrompt}>
              <View style={s.uploadIconCircle}>
                <Ionicons name="cloud-upload-outline" size={36} color={BSColors.primary} />
              </View>
              <Text style={s.uploadTitle}>Upload Identity PDF</Text>
              <Text style={s.uploadSub}>Tap to browse and select your document</Text>
              <View style={s.uploadBadge}>
                <Ionicons name="document-outline" size={12} color={BSColors.primary} />
                <Text style={s.uploadBadgeText}>PDF only</Text>
              </View>
            </View>
          )}
        </TouchableOpacity>

        {docName && (
          <View style={s.docActions}>
            <TouchableOpacity style={s.reuploadBtn} onPress={handlePickDocument} accessibilityLabel="Replace document" accessibilityRole="button">
              <Ionicons name="refresh-outline" size={14} color={BSColors.primary} />
              <Text style={s.reuploadText}>Replace document</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.downloadBtn, downloading && s.downloadBtnDisabled]}
              onPress={handleDownload}
              disabled={downloading}
              testID="download-btn"
            >
              <Ionicons name={downloadDone ? 'checkmark-circle-outline' : 'download-outline'} size={14} color={downloadDone ? BSColors.successDark : BSColors.accent} />
              <Text style={[s.downloadBtnText, downloadDone && s.downloadBtnTextDone]}>
                {downloading ? 'Saving...' : downloadDone ? 'Downloaded' : 'Download Report'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {error ? <Text style={s.error} testID="kyc-error">{error}</Text> : null}

        <TouchableOpacity
          style={[s.completeBtn, !docName && s.completeBtnDisabled]}
          onPress={handleComplete}
          testID="complete-btn"
          accessibilityLabel="Complete registration"
          accessibilityRole="button"
          accessibilityState={{ disabled: !docName }}
        >
          <Ionicons name="checkmark-circle-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
          <Text style={s.completeBtnText}>Complete Registration</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.skipBtn} onPress={handleSkip} testID="skip-kyc-btn" accessibilityLabel="Skip KYC verification" accessibilityRole="button">
          <Text style={s.skipBtnText}>Skip this step</Text>
        </TouchableOpacity>

        <View style={s.secureNote}>
          <Ionicons name="lock-closed-outline" size={13} color="#888" />
          <Text style={s.secureNoteText}>Your document is encrypted and stored securely</Text>
        </View>
      </ScrollView>

      {/* Consent Modal */}
      <Modal visible={showConsent} transparent animationType="slide">
        <View style={s.overlay}>
          <View style={s.consentModal}>
            <View style={s.consentIcon}>
              <Ionicons name="shield-checkmark" size={40} color={BSColors.primary} />
            </View>
            <Text style={s.consentTitle}>Data Privacy Consent</Text>
            <Text style={s.consentBody}>
              By uploading your identity document, you consent to BrowserStack Bank collecting and processing your personal data for KYC (Know Your Customer) verification purposes.{'\n\n'}
              Your document will be:{'\n'}
              • Encrypted during transmission{'\n'}
              • Stored securely on our servers{'\n'}
              • Used solely for identity verification{'\n'}
              • Retained as per regulatory requirements{'\n\n'}
              You may request deletion of your data at any time by contacting support.
            </Text>
            <View style={s.consentBtns}>
              <TouchableOpacity style={s.consentDecline} onPress={() => setShowConsent(false)} testID="consent-decline">
                <Text style={s.consentDeclineText}>Decline</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.consentAccept} onPress={handleConsentAccept} testID="consent-accept">
                <Text style={s.consentAcceptText}>I Agree & Continue</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BSColors.bgPageAlt },
  container: { alignItems: 'center', paddingHorizontal: 24, paddingTop: 32, paddingBottom: 40 },
  logo: { width: 160, height: 44, marginBottom: 16 },
  stepBadge: { backgroundColor: BSColors.indigoBg, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5, marginBottom: 16, borderWidth: 1, borderColor: BSColors.primary + '40' },
  stepBadgeText: { color: BSColors.primary, fontSize: 12, fontWeight: '600' },
  title: { color: '#111', fontSize: 22, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  subtitle: { color: '#888', fontSize: 14, textAlign: 'center', marginBottom: 24 },
  requirementsCard: { width: '100%', backgroundColor: BSColors.bgPageLight, borderRadius: 14, padding: 16, marginBottom: 24 },
  requirementsTitle: { color: '#333', fontSize: 13, fontWeight: '700', marginBottom: 10 },
  reqRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
  reqText: { color: '#555', fontSize: 13, flex: 1 },
  uploadArea: { width: '100%', borderRadius: 16, borderWidth: 2, borderColor: BSColors.indigoBorder, borderStyle: 'dashed', padding: 24, alignItems: 'center', marginBottom: 12, backgroundColor: BSColors.neutralFaint },
  uploadAreaDone: { borderColor: BSColors.successDark, borderStyle: 'solid', backgroundColor: BSColors.successBg },
  uploadPrompt: { alignItems: 'center', gap: 8 },
  uploadIconCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: BSColors.indigoBg, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  uploadTitle: { color: '#111', fontSize: 16, fontWeight: '700' },
  uploadSub: { color: '#888', fontSize: 13 },
  uploadBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: BSColors.indigoBg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: BSColors.primary + '40' },
  uploadBadgeText: { color: BSColors.primary, fontSize: 11, fontWeight: '600' },
  uploadedContent: { flexDirection: 'row', alignItems: 'center', width: '100%', gap: 12 },
  uploadedIcon: { width: 48, height: 48, borderRadius: 12, backgroundColor: BSColors.successBgLight, alignItems: 'center', justifyContent: 'center' },
  uploadedInfo: { flex: 1 },
  uploadedName: { color: '#111', fontSize: 14, fontWeight: '600', marginBottom: 2 },
  uploadedSize: { color: '#888', fontSize: 12 },
  docActions: { flexDirection: 'row', gap: 12, marginBottom: 16, width: '100%' },
  reuploadBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: BSColors.indigoBg, borderRadius: 10, paddingVertical: 10, borderWidth: 1, borderColor: BSColors.primary + '40' },
  reuploadText: { color: BSColors.primary, fontSize: 13, fontWeight: '600' },
  downloadBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: BSColors.indigoBg, borderRadius: 10, paddingVertical: 10, borderWidth: 1, borderColor: BSColors.indigoBorder },
  downloadBtnDisabled: { opacity: 0.5 },
  downloadBtnText: { color: BSColors.accent, fontSize: 13, fontWeight: '600' },
  downloadBtnTextDone: { color: BSColors.successDark },
  error: { color: BSColors.errorDark, fontSize: 13, marginBottom: 14, textAlign: 'center' },
  completeBtn: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: BSColors.primary, borderRadius: 12, paddingVertical: 16, marginBottom: 16, shadowColor: BSColors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  completeBtnDisabled: { opacity: 0.45 },
  completeBtnText: { color: BSColors.white, fontSize: 15, fontWeight: '700' },
  secureNote: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  secureNoteText: { color: '#AAA', fontSize: 12 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  consentModal: { backgroundColor: BSColors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  consentIcon: { alignItems: 'center', marginBottom: 12 },
  consentTitle: { color: '#111', fontSize: 20, fontWeight: '700', textAlign: 'center', marginBottom: 12 },
  consentBody: { color: '#555', fontSize: 14, lineHeight: 22, marginBottom: 24 },
  consentBtns: { flexDirection: 'row', gap: 12 },
  consentDecline: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', backgroundColor: BSColors.bgPageNeutral },
  consentDeclineText: { color: '#666', fontSize: 15, fontWeight: '600' },
  consentAccept: { flex: 2, paddingVertical: 14, borderRadius: 12, alignItems: 'center', backgroundColor: BSColors.primary },
  consentAcceptText: { color: BSColors.white, fontSize: 15, fontWeight: '700' },
  skipBtn: { marginTop: 4, marginBottom: 8, paddingVertical: 8, paddingHorizontal: 20, alignSelf: 'center' },
  skipBtnText: { color: BSColors.slate300, fontSize: 13, fontWeight: '600', textDecorationLine: 'underline' },
});