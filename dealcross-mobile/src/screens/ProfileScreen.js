// src/screens/ProfileScreen.js
import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

const MenuItem = ({ icon, label, value, onPress, danger, rightIcon }) => (
  <TouchableOpacity style={styles.menuItem} onPress={onPress}>
    <View style={[styles.menuIcon, danger && styles.menuIconDanger]}>
      <Ionicons name={icon} size={20} color={danger ? '#ef4444' : '#1e3a5f'} />
    </View>
    <View style={{ flex: 1, marginLeft: 12 }}>
      <Text style={[styles.menuLabel, danger && styles.menuLabelDanger]}>{label}</Text>
      {value ? <Text style={styles.menuValue}>{value}</Text> : null}
    </View>
    <Ionicons name={rightIcon || 'chevron-forward'} size={16} color="#9ca3af" />
  </TouchableOpacity>
);

const ProfileScreen = ({ navigation }) => {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  const tierColors = { starter: '#6b7280', growth: '#3b82f6', enterprise: '#8b5cf6', api: '#f59e0b' };
  const tierColor = tierColors[user?.tier] || '#6b7280';

  const initials = (user?.name || user?.email || 'U')
    .split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {user?.profilePicture ? (
          <Image source={{ uri: user.profilePicture }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
        )}
        <Text style={styles.name}>{user?.name || user?.email}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        <View style={styles.tierBadge}>
          <View style={[styles.tierDot, { backgroundColor: tierColor }]} />
          <Text style={[styles.tierText, { color: tierColor }]}>{(user?.tier || 'starter').toUpperCase()} PLAN</Text>
        </View>
        <View style={styles.verifiedRow}>
          {user?.verified && (
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={14} color="#10b981" />
              <Text style={styles.verifiedText}>Email Verified</Text>
            </View>
          )}
          {user?.isKYCVerified && (
            <View style={[styles.verifiedBadge, { backgroundColor: '#eff6ff' }]}>
              <Ionicons name="shield-checkmark" size={14} color="#1e3a5f" />
              <Text style={[styles.verifiedText, { color: '#1e3a5f' }]}>KYC Verified</Text>
            </View>
          )}
        </View>
      </View>

      {/* Account */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <MenuItem icon="person-outline" label="Edit Profile" onPress={() => {}} />
        <MenuItem icon="shield-outline" label="KYC Verification"
          value={user?.isKYCVerified ? 'Verified' : 'Not verified'} onPress={() => {}} />
        <MenuItem icon="card-outline" label="Subscription"
          value={(user?.tier || 'starter').charAt(0).toUpperCase() + (user?.tier || 'starter').slice(1)} onPress={() => {}} />
        <MenuItem icon="people-outline" label="Referral Program" onPress={() => {}} />
      </View>

      {/* Security */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Security</Text>
        <MenuItem icon="lock-closed-outline" label="Change Password" onPress={() => {}} />
        <MenuItem icon="phone-portrait-outline" label="Two-Factor Auth"
          value={user?.twoFactorEnabled ? 'Enabled' : 'Disabled'} onPress={() => {}} />
        <MenuItem icon="eye-outline" label="Active Sessions" onPress={() => {}} />
      </View>

      {/* Support */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Support</Text>
        <MenuItem icon="help-circle-outline" label="Help Center" onPress={() => {}} />
        <MenuItem icon="document-text-outline" label="Terms of Service" onPress={() => {}} />
        <MenuItem icon="shield-outline" label="Privacy Policy" onPress={() => {}} />
        <MenuItem icon="information-circle-outline" label="App Version" value="1.0.0" onPress={() => {}} rightIcon="ellipsis-horizontal" />
      </View>

      {/* Logout */}
      <View style={[styles.section, { marginBottom: 40 }]}>
        <MenuItem icon="log-out-outline" label="Sign Out" onPress={handleLogout} danger />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { backgroundColor: '#1e3a5f', alignItems: 'center', paddingTop: 60, paddingBottom: 28, paddingHorizontal: 20 },
  avatar: { width: 84, height: 84, borderRadius: 42, borderWidth: 3, borderColor: 'rgba(255,255,255,0.4)', marginBottom: 12 },
  avatarFallback: { width: 84, height: 84, borderRadius: 42, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarText: { fontSize: 32, fontWeight: '800', color: '#fff' },
  name: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 4 },
  email: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginBottom: 10 },
  tierBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, marginBottom: 10 },
  tierDot: { width: 8, height: 8, borderRadius: 4 },
  tierText: { fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  verifiedRow: { flexDirection: 'row', gap: 8 },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#d1fae5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  verifiedText: { fontSize: 11, fontWeight: '700', color: '#10b981' },
  section: { paddingHorizontal: 16, marginTop: 20 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, paddingHorizontal: 4 },
  menuItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 6, elevation: 1 },
  menuIcon: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' },
  menuIconDanger: { backgroundColor: '#fef2f2' },
  menuLabel: { fontSize: 15, fontWeight: '600', color: '#111827' },
  menuLabelDanger: { color: '#ef4444' },
  menuValue: { fontSize: 12, color: '#9ca3af', marginTop: 1 },
});

export default ProfileScreen;
