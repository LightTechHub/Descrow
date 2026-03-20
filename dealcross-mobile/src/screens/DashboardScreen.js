// src/screens/DashboardScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import escrowService from '../services/escrowService';
import API from '../utils/api';

const StatCard = ({ icon, label, value, color }) => (
  <View style={[styles.statCard, { borderLeftColor: color }]}>
    <Ionicons name={icon} size={22} color={color} style={{ marginBottom: 6 }} />
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const EscrowItem = ({ item, onPress }) => {
  const statusColors = { pending: '#f59e0b', funded: '#3b82f6', completed: '#10b981', disputed: '#ef4444', cancelled: '#6b7280' };
  const color = statusColors[item.status] || '#6b7280';
  return (
    <TouchableOpacity style={styles.escrowItem} onPress={onPress}>
      <View style={styles.escrowLeft}>
        <View style={[styles.escrowDot, { backgroundColor: color }]} />
        <View>
          <Text style={styles.escrowTitle} numberOfLines={1}>{item.title || 'Escrow Transaction'}</Text>
          <Text style={styles.escrowAmount}>${parseFloat(item.amount || 0).toLocaleString()} {item.currency || 'USD'}</Text>
        </View>
      </View>
      <View style={[styles.statusBadge, { backgroundColor: color + '20' }]}>
        <Text style={[styles.statusText, { color }]}>{item.status}</Text>
      </View>
    </TouchableOpacity>
  );
};

const DashboardScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [escrows, setEscrows] = useState([]);
  const [walletBalance, setWalletBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [escrowRes, walletRes] = await Promise.allSettled([
        escrowService.getMyEscrows({ limit: 5 }),
        API.get('/wallet/balance'),
      ]);
      if (escrowRes.status === 'fulfilled' && escrowRes.value.success) {
        setEscrows(escrowRes.value.data?.escrows || []);
        setStats(escrowRes.value.data?.stats || null);
      }
      if (walletRes.status === 'fulfilled') {
        setWalletBalance(walletRes.value.data?.data?.balance || 0);
      }
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchData(); }, []);

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const displayName = user?.name || user?.firstName || user?.email?.split('@')[0] || 'User';

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#1e3a5f" /></View>;
  }

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1e3a5f']} />}>

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Good day,</Text>
          <Text style={styles.username}>{displayName}</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('Notifications')} style={styles.notifBtn}>
          <Ionicons name="notifications-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Wallet Card */}
      <View style={styles.walletCard}>
        <Text style={styles.walletLabel}>Wallet Balance</Text>
        <Text style={styles.walletBalance}>${parseFloat(walletBalance).toLocaleString('en-US', { minimumFractionDigits: 2 })}</Text>
        <View style={styles.walletActions}>
          <TouchableOpacity style={styles.walletBtn} onPress={() => navigation.navigate('Wallet')}>
            <Ionicons name="add-circle-outline" size={18} color="#fff" />
            <Text style={styles.walletBtnText}>Fund</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.walletBtn, styles.walletBtnOutline]} onPress={() => navigation.navigate('Wallet')}>
            <Ionicons name="arrow-up-outline" size={18} color="#1e3a5f" />
            <Text style={[styles.walletBtnText, { color: '#1e3a5f' }]}>Withdraw</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <StatCard icon="shield-checkmark-outline" label="Total" value={stats?.total || 0} color="#1e3a5f" />
        <StatCard icon="time-outline" label="Active" value={(stats?.pending || 0) + (stats?.funded || 0)} color="#f59e0b" />
        <StatCard icon="checkmark-circle-outline" label="Done" value={stats?.completed || 0} color="#10b981" />
        <StatCard icon="alert-circle-outline" label="Disputes" value={stats?.disputed || 0} color="#ef4444" />
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('CreateEscrow')}>
            <Ionicons name="add-circle" size={28} color="#1e3a5f" />
            <Text style={styles.actionText}>New Escrow</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Escrows')}>
            <Ionicons name="list" size={28} color="#1e3a5f" />
            <Text style={styles.actionText}>My Escrows</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Wallet')}>
            <Ionicons name="wallet" size={28} color="#1e3a5f" />
            <Text style={styles.actionText}>Wallet</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Profile')}>
            <Ionicons name="person-circle" size={28} color="#1e3a5f" />
            <Text style={styles.actionText}>Profile</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Recent Escrows */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Escrows</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Escrows')}>
            <Text style={styles.seeAll}>See all</Text>
          </TouchableOpacity>
        </View>
        {escrows.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="shield-outline" size={40} color="#d1d5db" />
            <Text style={styles.emptyText}>No escrows yet</Text>
            <TouchableOpacity style={styles.createBtn} onPress={() => navigation.navigate('CreateEscrow')}>
              <Text style={styles.createBtnText}>Create your first escrow</Text>
            </TouchableOpacity>
          </View>
        ) : (
          escrows.map(e => (
            <EscrowItem key={e._id} item={e} onPress={() => navigation.navigate('EscrowDetail', { escrowId: e._id })} />
          ))
        )}
      </View>

    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { backgroundColor: '#1e3a5f', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 56, paddingBottom: 20 },
  greeting: { color: 'rgba(255,255,255,0.7)', fontSize: 14 },
  username: { color: '#fff', fontSize: 22, fontWeight: '800' },
  notifBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  walletCard: { margin: 16, backgroundColor: '#2d4a7c', borderRadius: 20, padding: 20 },
  walletLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginBottom: 4 },
  walletBalance: { color: '#fff', fontSize: 36, fontWeight: '800', marginBottom: 16 },
  walletActions: { flexDirection: 'row', gap: 10 },
  walletBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  walletBtnOutline: { backgroundColor: '#fff' },
  walletBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  statsRow: { flexDirection: 'row', paddingHorizontal: 12, gap: 8, marginBottom: 4 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 12, borderLeftWidth: 3, elevation: 1 },
  statValue: { fontSize: 20, fontWeight: '800', color: '#111827' },
  statLabel: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  section: { paddingHorizontal: 16, marginTop: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 12 },
  seeAll: { color: '#1e3a5f', fontSize: 13, fontWeight: '600' },
  actionsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  actionBtn: { alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 16, flex: 1, marginHorizontal: 4, elevation: 1 },
  actionText: { fontSize: 11, color: '#374151', fontWeight: '600', marginTop: 6, textAlign: 'center' },
  escrowItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 8, elevation: 1 },
  escrowLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  escrowDot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  escrowTitle: { fontSize: 14, fontWeight: '600', color: '#111827', maxWidth: 180 },
  escrowAmount: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  emptyBox: { alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 32, elevation: 1 },
  emptyText: { color: '#9ca3af', fontSize: 15, marginTop: 10, marginBottom: 16 },
  createBtn: { backgroundColor: '#1e3a5f', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  createBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});

export default DashboardScreen;
