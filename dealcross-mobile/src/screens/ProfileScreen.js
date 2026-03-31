// src/screens/ProfileScreen.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, Image, Modal, TextInput, KeyboardAvoidingView,
  Platform, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useAuth } from '../context/AuthContext';
import API from '../utils/api';

const Field = ({ label, value, onChangeText, editable = true, keyboardType = 'default', multiline = false }) => (
  <View style={styles.field}>
    <Text style={styles.fieldLabel}>{label}</Text>
    {editable ? (
      <TextInput
        style={[styles.fieldInput, multiline && { height: 80, textAlignVertical: 'top' }]}
        value={value || ''}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        multiline={multiline}
        placeholderTextColor="#9ca3af"
        placeholder={`Enter ${label.toLowerCase()}`}
      />
    ) : (
      <View style={styles.fieldReadOnly}>
        <Text style={styles.fieldReadOnlyText}>{value || 'Not set'}</Text>
        <Ionicons name="lock-closed" size={14} color="#9ca3af" />
      </View>
    )}
  </View>
);

const ProfileScreen = () => {
  const { user, updateUser, logout } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState(false);
  const [passwordModal, setPasswordModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [verifyingPass, setVerifyingPass] = useState(false);
  const [form, setForm] = useState({
    bio: '', phone: '',
    socialLinks: { twitter: '', linkedin: '', website: '' },
    address: { street: '', city: '', state: '', country: '' },
  });

  useEffect(() => { fetchProfile(); }, []);

  const fetchProfile = async () => {
    try {
      const res = await API.get('/profile');
      const data = res.data?.data || res.data;
      setProfile(data);
      setForm({
        bio: data?.bio || '',
        phone: data?.phone || '',
        socialLinks: {
          twitter: data?.socialLinks?.twitter || '',
          linkedin: data?.socialLinks?.linkedin || '',
          website: data?.socialLinks?.website || '',
        },
        address: {
          street: data?.address?.street || '',
          city: data?.address?.city || '',
          state: data?.address?.state || '',
          country: data?.address?.country || '',
        },
      });
    } catch (e) {
      console.log('Profile fetch error:', e.message);
    } finally { setLoading(false); }
  };

  const set = (key, value) => setForm(f => ({ ...f, [key]: value }));
  const setNested = (parent, key, value) =>
    setForm(f => ({ ...f, [parent]: { ...f[parent], [key]: value } }));

  const handleSaveRequest = () => setPasswordModal(true);

  const handleVerifyAndSave = async () => {
    if (!password.trim()) {
      Toast.show({ type: 'error', text1: 'Enter your password' });
      return;
    }
    setVerifyingPass(true);
    try {
      const vRes = await API.post('/users/verify-password', { password });
      if (!vRes.data?.success) {
        Toast.show({ type: 'error', text1: 'Incorrect password' });
        return;
      }
      setPasswordModal(false);
      setPassword('');
      await doSave();
    } catch (err) {
      Toast.show({ type: 'error', text1: err?.response?.data?.message || 'Incorrect password' });
    } finally { setVerifyingPass(false); }
  };

  const doSave = async () => {
    setSaving(true);
    try {
      const res = await API.put('/profile', {
        bio: form.bio,
        phone: form.phone,
        socialLinks: form.socialLinks,
        address: form.address,
      });
      if (res.data?.success) {
        Toast.show({ type: 'success', text1: 'Profile updated!' });
        await fetchProfile();
        setEditModal(false);
      } else {
        Toast.show({ type: 'error', text1: res.data?.message || 'Update failed' });
      }
    } catch (err) {
      Toast.show({ type: 'error', text1: err?.response?.data?.message || 'Update failed' });
    } finally { setSaving(false); }
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  const kycApproved = profile?.isKYCVerified && profile?.kycStatus?.status === 'approved';
  const tierColors = { starter: '#6b7280', growth: '#3b82f6', enterprise: '#8b5cf6', api: '#f59e0b' };
  const tier = profile?.tier || 'starter';
  const tierColor = tierColors[tier] || '#6b7280';
  const initials = (profile?.name || user?.email || 'U').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#1e3a5f" /></View>;

  return (
    <>
      <ScrollView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          {profile?.profilePicture ? (
            <Image source={{ uri: profile.profilePicture }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          )}
          <Text style={styles.name}>{profile?.name || user?.email}</Text>
          <Text style={styles.email}>{profile?.email}</Text>
          <View style={styles.tierBadge}>
            <View style={[styles.tierDot, { backgroundColor: tierColor }]} />
            <Text style={[styles.tierText, { color: tierColor }]}>{tier.toUpperCase()} PLAN</Text>
          </View>
          <View style={styles.verifiedRow}>
            {profile?.verified && (
              <View style={styles.badge}>
                <Ionicons name="checkmark-circle" size={13} color="#10b981" />
                <Text style={[styles.badgeText, { color: '#10b981' }]}>Email Verified</Text>
              </View>
            )}
            {profile?.isKYCVerified && (
              <View style={[styles.badge, { backgroundColor: '#eff6ff' }]}>
                <Ionicons name="shield-checkmark" size={13} color="#1e3a5f" />
                <Text style={[styles.badgeText, { color: '#1e3a5f' }]}>KYC Verified</Text>
              </View>
            )}
          </View>
        </View>

        {/* Profile Info */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Personal Information</Text>
            <TouchableOpacity style={styles.editBtn} onPress={() => setEditModal(true)}>
              <Ionicons name="pencil" size={14} color="#1e3a5f" />
              <Text style={styles.editBtnText}>Edit</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.infoCard}>
            {[
              { label: 'Full Name', value: profile?.name },
              { label: 'Phone', value: profile?.phone },
              { label: 'Bio', value: profile?.bio },
              { label: 'Country', value: profile?.address?.country },
              { label: 'City', value: profile?.address?.city },
            ].map(item => (
              <View key={item.label} style={styles.infoRow}>
                <Text style={styles.infoLabel}>{item.label}</Text>
                <Text style={styles.infoValue} numberOfLines={2}>{item.value || 'Not set'}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Business Info */}
        {profile?.accountType === 'business' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Business Information</Text>
            <View style={styles.infoCard}>
              {[
                { label: 'Company Name', value: profile?.businessInfo?.companyName },
                { label: 'Business Type', value: profile?.businessInfo?.businessType || profile?.businessInfo?.companyType },
                { label: 'Registration No', value: profile?.businessInfo?.registrationNo || profile?.businessInfo?.registrationNumber },
                { label: 'Business Website', value: profile?.businessInfo?.website },
              ].map(item => (
                <View key={item.label} style={styles.infoRow}>
                  <Text style={styles.infoLabel}>{item.label}</Text>
                  <Text style={styles.infoValue} numberOfLines={1}>{item.value || 'Not set'}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Social Links */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Social Links</Text>
          <View style={styles.infoCard}>
            {[
              { label: 'Twitter', value: profile?.socialLinks?.twitter },
              { label: 'LinkedIn', value: profile?.socialLinks?.linkedin },
              { label: 'Website', value: profile?.socialLinks?.website },
            ].map(item => (
              <View key={item.label} style={styles.infoRow}>
                <Text style={styles.infoLabel}>{item.label}</Text>
                <Text style={styles.infoValue} numberOfLines={1}>{item.value || 'Not set'}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Menu */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          {[
            { icon: 'shield-outline', label: 'KYC Verification', value: profile?.isKYCVerified ? 'Verified' : 'Not verified' },
            { icon: 'card-outline', label: 'Subscription', value: tier.charAt(0).toUpperCase() + tier.slice(1) },
            { icon: 'lock-closed-outline', label: 'Change Password' },
            { icon: 'phone-portrait-outline', label: 'Two-Factor Auth', value: profile?.twoFactorEnabled ? 'Enabled' : 'Disabled' },
            { icon: 'help-circle-outline', label: 'Help Center' },
          ].map(item => (
            <TouchableOpacity key={item.label} style={styles.menuItem}>
              <View style={styles.menuIcon}>
                <Ionicons name={item.icon} size={20} color="#1e3a5f" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.menuLabel}>{item.label}</Text>
                {item.value && <Text style={styles.menuValue}>{item.value}</Text>}
              </View>
              <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout */}
        <View style={[styles.section, { marginBottom: 40 }]}>
          <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
            <View style={[styles.menuIcon, { backgroundColor: '#fef2f2' }]}>
              <Ionicons name="log-out-outline" size={20} color="#ef4444" />
            </View>
            <Text style={[styles.menuLabel, { color: '#ef4444', marginLeft: 12 }]}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal visible={editModal} transparent animationType="slide">
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setEditModal(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {kycApproved && (
                <View style={styles.kycNote}>
                  <Ionicons name="shield-checkmark" size={14} color="#10b981" />
                  <Text style={styles.kycNoteText}>Identity fields are locked after KYC verification</Text>
                </View>
              )}
              <Field label="Phone" value={form.phone}
                onChangeText={v => set('phone', v)}
                editable={!kycApproved}
                keyboardType="phone-pad" />
              <Field label="Bio" value={form.bio}
                onChangeText={v => set('bio', v)} multiline />
              <Text style={styles.groupLabel}>Address</Text>
              <Field label="Street" value={form.address.street}
                onChangeText={v => setNested('address', 'street', v)} editable={!kycApproved} />
              <Field label="City" value={form.address.city}
                onChangeText={v => setNested('address', 'city', v)} editable={!kycApproved} />
              <Field label="Country" value={form.address.country}
                onChangeText={v => setNested('address', 'country', v)} editable={!kycApproved} />
              <Text style={styles.groupLabel}>Social Links</Text>
              <Field label="Twitter" value={form.socialLinks.twitter}
                onChangeText={v => setNested('socialLinks', 'twitter', v)} />
              <Field label="LinkedIn" value={form.socialLinks.linkedin}
                onChangeText={v => setNested('socialLinks', 'linkedin', v)} />
              <Field label="Website" value={form.socialLinks.website}
                onChangeText={v => setNested('socialLinks', 'website', v)} />
              <TouchableOpacity
                style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                onPress={handleSaveRequest}
                disabled={saving}
              >
                {saving
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.saveBtnText}>Save Changes</Text>
                }
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Password Confirm Modal */}
      <Modal visible={passwordModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modal, { borderRadius: 20 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Confirm Password</Text>
              <TouchableOpacity onPress={() => { setPasswordModal(false); setPassword(''); }}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <Text style={styles.passNote}>Enter your password to save changes</Text>
            <View style={styles.passInputWrap}>
              <TextInput
                style={{ flex: 1, fontSize: 15, color: '#111827' }}
                placeholder="Current password"
                placeholderTextColor="#9ca3af"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPass}
                autoFocus
              />
              <TouchableOpacity onPress={() => setShowPass(v => !v)}>
                <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={20} color="#9ca3af" />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[styles.saveBtn, verifyingPass && { opacity: 0.6 }]}
              onPress={handleVerifyAndSave}
              disabled={verifyingPass}
            >
              {verifyingPass
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.saveBtnText}>Confirm & Save</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { backgroundColor: '#1e3a5f', alignItems: 'center', paddingTop: 60, paddingBottom: 28, paddingHorizontal: 20 },
  avatar: { width: 84, height: 84, borderRadius: 42, borderWidth: 3, borderColor: 'rgba(255,255,255,0.4)', marginBottom: 12 },
  avatarFallback: { width: 84, height: 84, borderRadius: 42, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarText: { fontSize: 32, fontWeight: '800', color: '#fff' },
  name: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 4 },
  email: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 10 },
  tierBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, marginBottom: 10 },
  tierDot: { width: 8, height: 8, borderRadius: 4 },
  tierText: { fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  verifiedRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#d1fae5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  section: { paddingHorizontal: 16, marginTop: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1, paddingHorizontal: 4 },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#eff6ff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  editBtnText: { fontSize: 13, fontWeight: '600', color: '#1e3a5f' },
  infoCard: { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', elevation: 1 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  infoLabel: { fontSize: 13, color: '#9ca3af', fontWeight: '600' },
  infoValue: { fontSize: 13, color: '#111827', fontWeight: '500', maxWidth: '60%', textAlign: 'right' },
  menuItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 6, elevation: 1 },
  menuIcon: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' },
  menuLabel: { fontSize: 15, fontWeight: '600', color: '#111827' },
  menuValue: { fontSize: 12, color: '#9ca3af', marginTop: 1 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#111827' },
  kycNote: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#d1fae5', padding: 10, borderRadius: 10, marginBottom: 16 },
  kycNoteText: { fontSize: 12, color: '#065f46', flex: 1 },
  field: { marginBottom: 14 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 6 },
  fieldInput: { borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 10, height: 46, paddingHorizontal: 12, fontSize: 14, color: '#111827', backgroundColor: '#f9fafb' },
  fieldReadOnly: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 10, height: 46, paddingHorizontal: 12, backgroundColor: '#f3f4f6', borderStyle: 'dashed' },
  fieldReadOnlyText: { fontSize: 14, color: '#6b7280' },
  groupLabel: { fontSize: 12, fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, marginTop: 8 },
  saveBtn: { backgroundColor: '#1e3a5f', borderRadius: 12, height: 52, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  passNote: { fontSize: 13, color: '#6b7280', marginBottom: 16 },
  passInputWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 12, height: 52, paddingHorizontal: 14, backgroundColor: '#f9fafb', marginBottom: 16 },
});

export default ProfileScreen;
