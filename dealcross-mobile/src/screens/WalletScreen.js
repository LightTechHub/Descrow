// src/screens/WalletScreen.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import API from '../utils/api';

const WalletScreen = ({ navigation }) => {
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchWallet = async () => {
    try {
      const [wRes, tRes] = await Promise.allSettled([
        API.get('/wallet/balance'),
        API.get('/wallet/transactions?limit=20'),
      ]);
      if (wRes.status === 'fulfilled') setWallet(wRes.value.data?.data || wRes.value.data);
      if (tRes.status === 'fulfilled') setTransactions(tRes.value.data?.data?.transactions || []);
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { fetchWallet(); }, []);

  const typeIcon = { credit: 'arrow-down-circle', debit: 'arrow-up-circle', escrow_hold: 'lock-closed', escrow_release: 'lock-open' };
  const typeColor = { credit: '#10b981', debit: '#ef4444', escrow_hold: '#f59e0b', escrow_release: '#3b82f6' };

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#1e3a5f" /></View>;

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchWallet(); }} colors={['#1e3a5f']} />}>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Wallet</Text>
      </View>

      {/* Balance Card */}
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Available Balance</Text>
        <Text style={styles.balance}>${parseFloat(wallet?.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</Text>
        {wallet?.escrowHold > 0 && (
          <Text style={styles.holdText}>+ ${parseFloat(wallet.escrowHold).toLocaleString()} in escrow hold</Text>
        )}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionBtn}>
            <Ionicons name="add-circle-outline" size={20} color="#fff" />
            <Text style={styles.actionText}>Add Funds</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.actionOutline]}>
            <Ionicons name="arrow-up-outline" size={20} color="#1e3a5f" />
            <Text style={[styles.actionText, { color: '#1e3a5f' }]}>Withdraw</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Total In</Text>
          <Text style={[styles.statValue, { color: '#10b981' }]}>${parseFloat(wallet?.totalCredit || 0).toLocaleString()}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Total Out</Text>
          <Text style={[styles.statValue, { color: '#ef4444' }]}>${parseFloat(wallet?.totalDebit || 0).toLocaleString()}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>In Escrow</Text>
          <Text style={[styles.statValue, { color: '#f59e0b' }]}>${parseFloat(wallet?.escrowHold || 0).toLocaleString()}</Text>
        </View>
      </View>

      {/* Transactions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Transaction History</Text>
        {transactions.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="receipt-outline" size={40} color="#d1d5db" />
            <Text style={styles.emptyText}>No transactions yet</Text>
          </View>
        ) : (
          transactions.map((t, i) => (
            <View key={t._id || i} style={styles.txRow}>
              <View style={[styles.txIcon, { backgroundColor: (typeColor[t.type] || '#9ca3af') + '20' }]}>
                <Ionicons name={typeIcon[t.type] || 'swap-horizontal'} size={20} color={typeColor[t.type] || '#9ca3af'} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.txDesc} numberOfLines={1}>{t.description || t.type}</Text>
                <Text style={styles.txDate}>{new Date(t.createdAt).toLocaleDateString()}</Text>
              </View>
              <Text style={[styles.txAmount, { color: typeColor[t.type] || '#6b7280' }]}>
                {['credit', 'escrow_release'].includes(t.type) ? '+' : '-'}${parseFloat(t.amount || 0).toLocaleString()}
              </Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { backgroundColor: '#1e3a5f', paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16 },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: '800' },
  balanceCard: { margin: 16, backgroundColor: '#2d4a7c', borderRadius: 20, padding: 20 },
  balanceLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginBottom: 4 },
  balance: { color: '#fff', fontSize: 38, fontWeight: '900', marginBottom: 4 },
  holdText: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginBottom: 16 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10 },
  actionOutline: { backgroundColor: '#fff' },
  actionText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  statsRow: { flexDirection: 'row', paddingHorizontal: 12, gap: 8, marginBottom: 8 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 12, elevation: 1, alignItems: 'center' },
  statLabel: { fontSize: 11, color: '#9ca3af', fontWeight: '600', marginBottom: 4 },
  statValue: { fontSize: 16, fontWeight: '800' },
  section: { padding: 16 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 12 },
  empty: { alignItems: 'center', paddingVertical: 32 },
  emptyText: { color: '#9ca3af', fontSize: 14, marginTop: 10 },
  txRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8, elevation: 1 },
  txIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  txDesc: { fontSize: 14, fontWeight: '600', color: '#111827' },
  txDate: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  txAmount: { fontSize: 15, fontWeight: '800' },
});

export default WalletScreen;
