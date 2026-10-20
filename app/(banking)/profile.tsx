import { Shimmer } from '@/components/shimmer';
import { BSColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/store/api';
import { AuthStore, useAuthStore } from '@/store/auth';
import { BankStore } from '@/store/banking';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const DEFAULT_USER = {
  name: 'Alex Johnson',
  email: 'alex.johnson@example.com',
  phone: '+1 (555) 234-5678',
  dob: 'March 15, 1990',
  address: '123 Main Street, San Francisco, CA 94102',
  accountNumber: '****4521',
  accountType: 'Premium Checking',
  memberSince: 'January 2022',
  kycStatus: 'Verified',
};

export default function ProfileScreen() {
  const { primaryColor, primaryBorder, greenMode } = useTheme();
  const router = useRouter();
  const [balance, setBalance] = useState(BankStore.getBalance());
  const [txCount, setTxCount] = useState(BankStore.getTransactions().length);
  const [userInfo, setUserInfo] = useState(DEFAULT_USER);
  const [profileLoading, setProfileLoading] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(AuthStore.getUser()?.avatarUrl ?? null);
  const biometricEnabled = useAuthStore(s => s.biometricEnabled);

  // Keep avatar in sync if it's updated (e.g. after liveness upload)
  useEffect(() => {
    const interval = setInterval(() => {
      const url = AuthStore.getUser()?.avatarUrl ?? null;
      setAvatarUrl(prev => (prev !== url ? url : prev));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const unsub = BankStore.subscribe(() => {
      setBalance(BankStore.getBalance());
      setTxCount(BankStore.getTransactions().length);
    });
    // Load real profile from API
    api.getProfile().then(profile => {
      if (profile) {
        setUserInfo(prev => ({
          ...prev,
          name: profile.fullName || prev.name,
          email: profile.email || prev.email,
          kycStatus: profile.kycStatus === 'verified' ? 'Verified' : 'Pending',
          memberSince: profile.memberSince
            ? new Date(profile.memberSince).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
            : prev.memberSince,
        }));
      }
    }).catch(() => { /* use defaults */ }).finally(() => setProfileLoading(false));
    return unsub;
  }, []);

  const PROTECTED_EMAILS = ['yash@gmail.com'];
  const isProtectedAccount = PROTECTED_EMAILS.includes(userInfo.email.toLowerCase());

  const handleDeleteAccount = async () => {
    if (isProtectedAccount) {
      Alert.alert('Cannot Delete', 'This account cannot be deleted.');
      return;
    }
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive', onPress: async () => {
            try {
              await api.deleteAccount();
            } catch (err: any) {
              const msg = err?.message || '';
              if (msg.includes('cannot be deleted')) {
                Alert.alert('Cannot Delete', msg);
                return;
              }
              // Other errors — proceed with local logout
            }
            await AuthStore.logout();
            router.replace('/' as any);
          },
        },
      ],
    );
  };

  const handleLogout = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: async () => {
        await AuthStore.logout();
        router.replace('/' as any);
      }},
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Avatar */}
        <View style={styles.avatarSection}>
          {profileLoading ? (
            <>
              <Shimmer width={80} height={80} borderRadius={40} style={{ marginBottom: 12 }} />
              <Shimmer width={160} height={20} borderRadius={10} style={{ marginBottom: 8 }} />
              <Shimmer width={200} height={14} borderRadius={7} style={{ marginBottom: 10 }} />
              <Shimmer width={100} height={24} borderRadius={12} />
            </>
          ) : (
            <>
              {/* FILE UPLOAD COMMENTED OUT — uncomment to re-enable liveness/photo upload */}
              {/* <TouchableOpacity
                onPress={() => router.push('/liveness' as any)}
                testID="profile-avatar-tap"
                accessibilityLabel="Update profile photo"
                accessibilityRole="button"
              > */}
              <TouchableOpacity
                onPress={() => {}}
                testID="profile-avatar-tap"
                accessibilityLabel="Update profile photo"
                accessibilityRole="button"
              >
              {avatarUrl ? (
                <Image
                  source={{ uri: avatarUrl }}
                  style={styles.avatarImage}
                  resizeMode="cover"
                  testID="profile-avatar-image"
                />
              ) : (
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{userInfo.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}</Text>
                </View>
              )}
              <View style={styles.avatarEditBadge}>
                <Ionicons name="camera-outline" size={12} color={BSColors.white} />
              </View>
              </TouchableOpacity>
              <Text style={styles.userName}>{userInfo.name}</Text>
              <Text style={styles.userEmail}>{userInfo.email}</Text>
              <View style={styles.kycBadge}>
                <Ionicons name="shield-checkmark" size={13} color="#059669" />
                <Text style={styles.kycText}>KYC {userInfo.kycStatus}</Text>
              </View>
            </>
          )}
        </View>

        {/* Stats */}
        <View style={[styles.statsRow, greenMode && { flexDirection: "column" }]}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>${balance.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</Text>
            <Text style={styles.statLabel}>Balance</Text>
          </View>
          <View style={[styles.statCard, styles.statCardMiddle]}>
            <Text style={styles.statValue}>{txCount}</Text>
            <Text style={styles.statLabel}>Transactions</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>2</Text>
            <Text style={styles.statLabel}>Cards</Text>
          </View>
        </View>

        {/* Personal Info */}
        <Text style={styles.sectionTitle}>Personal Information</Text>
        <View style={styles.infoCard}>
          {profileLoading ? (
            [1,2,3,4,5].map(i => (
              <View key={i} style={[styles.infoRow, i === 5 && { borderBottomWidth: 0 }]}>
                <Shimmer width={36} height={36} borderRadius={10} style={{ marginRight: 12 }} />
                <View style={{ flex: 1, gap: 6 }}>
                  <Shimmer width="30%" height={11} borderRadius={6} />
                  <Shimmer width="65%" height={14} borderRadius={7} />
                </View>
              </View>
            ))
          ) : (
            [
              { icon: 'person-outline', label: 'Full Name', value: userInfo.name },
              { icon: 'mail-outline', label: 'Email', value: userInfo.email },
              { icon: 'call-outline', label: 'Phone', value: userInfo.phone },
              { icon: 'calendar-outline', label: 'Date of Birth', value: userInfo.dob },
              { icon: 'location-outline', label: 'Address', value: userInfo.address },
            ].map((item, i, arr) => (
              <View key={item.label} style={[styles.infoRow, i === arr.length - 1 && { borderBottomWidth: 0 }]}>
                <View style={styles.infoIconWrap}>
                  <Ionicons name={item.icon as any} size={18} color={primaryColor} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>{item.label}</Text>
                  <Text style={styles.infoValue}>{item.value}</Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Account Info */}
        <Text style={styles.sectionTitle}>Account Details</Text>
        <View style={styles.infoCard}>
          {profileLoading ? (
            [1,2,3].map(i => (
              <View key={i} style={[styles.infoRow, i === 3 && { borderBottomWidth: 0 }]}>
                <Shimmer width={36} height={36} borderRadius={10} style={{ marginRight: 12 }} />
                <View style={{ flex: 1, gap: 6 }}>
                  <Shimmer width="30%" height={11} borderRadius={6} />
                  <Shimmer width="55%" height={14} borderRadius={7} />
                </View>
              </View>
            ))
          ) : (
            [
              { icon: 'card-outline', label: 'Account Number', value: userInfo.accountNumber },
              { icon: 'briefcase-outline', label: 'Account Type', value: userInfo.accountType },
              { icon: 'time-outline', label: 'Member Since', value: userInfo.memberSince },
            ].map((item, i, arr) => (
              <View key={item.label} style={[styles.infoRow, i === arr.length - 1 && { borderBottomWidth: 0 }]}>
                <View style={styles.infoIconWrap}>
                  <Ionicons name={item.icon as any} size={18} color={primaryColor} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>{item.label}</Text>
                  <Text style={styles.infoValue}>{item.value}</Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Settings */}
        <Text style={styles.sectionTitle}>Settings</Text>
        <View style={styles.infoCard}>
          {/* Biometric Login Toggle */}
          <View style={styles.infoRow}>
            <View style={styles.infoIconWrap}>
              <Ionicons name="finger-print-outline" size={18} color={primaryColor} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoValue}>Biometric Login</Text>
              <Text style={styles.infoLabel}>{biometricEnabled ? 'Enabled' : 'Disabled'}</Text>
            </View>
            <Switch
              value={biometricEnabled}
              onValueChange={(val) => AuthStore.setBiometricEnabled(val)}
              trackColor={{ false: BSColors.mediumGray, true: BSColors.primary + '80' }}
              thumbColor={biometricEnabled ? BSColors.primary : BSColors.slate300}
              testID="biometric-toggle"
              accessibilityLabel={biometricEnabled ? 'Biometric login is enabled, tap to disable' : 'Biometric login is disabled, tap to enable'}
              accessibilityRole="switch"
            />
          </View>
          <TouchableOpacity
            style={[styles.infoRow, { borderBottomWidth: 0 }]}
            onPress={() => router.push({ pathname: '/(banking)/webview' as any, params: { url: 'https://www.reuters.com/finance/', title: 'Financial News' } })}
          >
            <View style={styles.infoIconWrap}>
              <Ionicons name="newspaper-outline" size={18} color={primaryColor} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoValue}>Financial News</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={primaryBorder} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleLogout}
          testID="logout-btn"
          accessibilityLabel="Sign out of your account"
          accessibilityRole="button"
        >
          <Ionicons name="log-out-outline" size={18} color="#DC2626" />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.deleteBtn, isProtectedAccount && styles.deleteBtnDisabled]}
          onPress={handleDeleteAccount}
          testID="delete-account-btn"
          accessibilityLabel={isProtectedAccount ? 'Delete account is disabled for this account' : 'Delete your account permanently'}
          accessibilityRole="button"
          accessibilityState={{ disabled: isProtectedAccount }}
        >
          <Ionicons name="trash-outline" size={18} color={isProtectedAccount ? BSColors.slate300 : '#DC2626'} />
          <Text style={[styles.deleteText, isProtectedAccount && styles.deleteTextDisabled]}>
            {isProtectedAccount ? 'Delete Account (Protected)' : 'Delete Account'}
          </Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BSColors.bgPageAlt },
  content: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },
  avatarSection: { alignItems: 'center', marginBottom: 24 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: BSColors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 12, shadowColor: BSColors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  avatarImage: { width: 80, height: 80, borderRadius: 40, marginBottom: 12, shadowColor: BSColors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  avatarEditBadge: { position: 'absolute', bottom: 12, right: -4, width: 22, height: 22, borderRadius: 11, backgroundColor: BSColors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: BSColors.bgPageAlt },
  avatarText: { color: BSColors.white, fontSize: 28, fontWeight: '800' },
  userName: { color: BSColors.textPrimary, fontSize: 20, fontWeight: '700', marginBottom: 4 },
  userEmail: { color: BSColors.darkGray, fontSize: 14, marginBottom: 10 },
  kycBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: BSColors.successBg, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: BSColors.successBorder },
  kycText: { color: BSColors.successDark, fontSize: 12, fontWeight: '700' },
  statsRow: { flexDirection: 'row', backgroundColor: BSColors.white, borderRadius: 16, marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, overflow: 'hidden' },
  statCard: { flex: 1, alignItems: 'center', paddingVertical: 16 },
  statCardMiddle: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: BSColors.lightGray },
  statValue: { color: BSColors.primary, fontSize: 18, fontWeight: '800', marginBottom: 2 },
  statLabel: { color: BSColors.slate300, fontSize: 11, fontWeight: '600' },
  sectionTitle: { color: BSColors.textPrimary, fontSize: 15, fontWeight: '700', marginBottom: 10 },
  infoCard: { backgroundColor: BSColors.white, borderRadius: 16, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, overflow: 'hidden' },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: BSColors.lightGray },
  infoIconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: BSColors.indigoBg, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  infoContent: { flex: 1 },
  infoLabel: { color: BSColors.slate300, fontSize: 11, marginBottom: 2 },
  infoValue: { color: BSColors.textPrimary, fontSize: 14, fontWeight: '500' },
  deleteBtnDisabled: { opacity: 0.5 },
  deleteTextDisabled: { color: BSColors.slate300 },
  insightsCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 18, padding: 18, marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 6 },
  insightsLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  insightsIconWrap: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  insightsTitle: { color: BSColors.white, fontSize: 15, fontWeight: '800', marginBottom: 2 },
  insightsSub: { color: 'rgba(255,255,255,0.75)', fontSize: 12 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: BSColors.errorBg, borderRadius: 14, paddingVertical: 16, borderWidth: 1.5, borderColor: BSColors.errorBorder, marginBottom: 12 },
  logoutText: { color: BSColors.errorDark, fontSize: 16, fontWeight: '700' },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: BSColors.white, borderRadius: 14, paddingVertical: 14, borderWidth: 1.5, borderColor: BSColors.errorBorder },
  deleteText: { color: BSColors.errorDark, fontSize: 14, fontWeight: '600' },
  verifyCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: BSColors.white, borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, borderWidth: 1, borderColor: BSColors.indigoBorder },
  verifyCardDone: { borderColor: BSColors.successBorder, backgroundColor: BSColors.successBg },
  verifyIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  verifyTitle: { color: BSColors.textPrimary, fontSize: 14, fontWeight: '700', marginBottom: 2 },
  verifySub: { color: BSColors.darkGray, fontSize: 12 },
});