// src/screens/WalletScreen.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, Modal, TextInput,
  KeyboardAvoidingView, Platform, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import API from '../utils/api';

const WalletScreen = () => {
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [showFund, setShowFund] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [fundAmount, setFundAmount] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchWallet = async () => {
    try {
      // Try multiple possible endpoints
      const [wRes, tRes] = await Promise.allSettled([
        API.get('/wallet/balance'),
        API.get('/wallet/transactions?limit=20'),
      ]);
      if (wRes.status === 'fulfilled' && wRes.value.data?.success) {
        const d = wRes.value.data?.data || wRes.value.data;
        setWallet(d);
      }
      if (tRes.status === 'fulfilled') {
        const txs = tRes.value.data?.data?.transactions ||
                    tRes.value.data?.transactions ||
                    tRes.value.data?.data || [];
        setTransactions(Array.isArray(txs) ? txs : []);
      }
    } catch (e) {
      console.log('Wallet fetch error:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchWallet(); }, []);

  const handleWithdraw = async () => {
    if (!withdrawAmount || isNaN(parseFloat(withdrawAmount))) {
      Toast.show({ type: 'error', text1: 'Enter a valid amount' });
      return;
    }
    const amt = parseFloat(withdrawAmount);
    const balance = parseFloat(wallet?.balance || 0);
    if (amt > balance) {
      Toast.show({ type: 'error', text1: 'Insufficient balance' });
      return;
    }
    setActionLoading(true);
    try {
      const res = await API.post('/wallet/withdraw', { amount: amt });
      if (res.data?.success) {
        Toast.show({ type: 'success', text1: 'Withdrawal initiated', text2: res.data.message });
        setShowWithdraw(false);
        setWithdrawAmount('');
        fetchWallet();
      } else {
        Toast.show({ type: 'error', text1: res.data?.message || 'Withdrawal failed' });
      }
    } catch (err) {
      Toast.show({ type: 'error', text1: err?.response?.data?.message || 'Withdrawal failed' });
    } finally {
      setActionLoading(false); }
  };

  const handleFund = async () => {
    if (!fundAmount || isNaN(parseFloat(fundAmount))) {
      Toast.show({ type: 'error', text1: 'Enter a valid amount' });
      return;
    }
    setActionLoading(true);
    try {
      const res = await API.post('/wallet/fund', { amount: parseFloat(fundAmount) });
      if (res.data?.success) {
        Toast.show({ type: 'success', text1: 'Wallet funded!', text2: res.data.message });
        setShowFund(false);
        setFundAmount('');
        fetchWallet();
      } else {
        Toast.show({ type: 'error', text1: res.data?.message || 'Funding failed' });
      }
    } catch (err) {
      Toast.show({ type: 'error', text1: err?.response?.data?.message || 'Funding failed' });
    } finally { setActionLoading(false); }
  };

  const typeIcon = {
    credit: 'arrow-down-circle',
    debit: 'arrow-up-circle',
    escrow_hold: 'lock-closed',
    escrow_release: 'lock-open',
    withdrawal: 'arrow-up-circle',
    deposit: 'arrow-down-circle',
  };
  const typeColor = {
    credit: '#10b981', deposit: '#10b981', escrow_release: '#3b82f6',
    debit: '#ef4444', withdrawal: '#ef4444', escrow_hold: '#f59e0b',
  };

  const balance = parseFloat(wallet?.balance || wallet?.availableBalance || 0);
  const escrowHold = parseFloat(wallet?.escrowHold || wallet?.holdBalance || 0);

  if (loading) return (
    <View style={styles.centered}><ActivityIndicator size="large" color="#1e3a5f" /></View>
  );

  return (
    <>
      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchWallet(); }} colors={['#1e3a5f']} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Wallet</Text>
        </View>

        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Available Balance</Text>
          <Text style={styles.balance}>
            ${balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </Text>
          {escrowHold > 0 && (
            <Text style={styles.holdText}>
              + ${escrowHold.toLocaleString()} held in escrow
            </Text>
          )}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => setShowFund(true)}>
              <Ionicons name="add-circle-outline" size={20} color="#fff" />
              <Text style={styles.actionText}>Add Funds</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.actionOutline]} onPress={() => setShowWithdraw(true)}>
              <Ionicons name="arrow-up-outline" size={20} color="#1e3a5f" />
              <Text style={[styles.actionText, { color: '#1e3a5f' }]}>Withdraw</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Total In</Text>
            <Text style={[styles.statValue, { color: '#10b981' }]}>
              ${parseFloat(wallet?.totalCredit || wallet?.totalDeposits || 0).toLocaleString()}
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Total Out</Text>
            <Text style={[styles.statValue, { color: '#ef4444' }]}>
              ${parseFloat(wallet?.totalDebit || wallet?.totalWithdrawals || 0).toLocaleString()}
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>In Escrow</Text>
            <Text style={[styles.statValue, { color: '#f59e0b' }]}>
              ${escrowHold.toLocaleString()}
            </Text>
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
            transactions.map((t, i) => {
              const color = typeColor[t.type] || '#9ca3af';
              const icon = typeIcon[t.type] || 'swap-horizontal';
              const isCredit = ['credit', 'deposit', 'escrow_release'].includes(t.type);
              return (
                <View key={t._id || i} style={styles.txRow}>
                  <View style={[styles.txIcon, { backgroundColor: color + '20' }]}>
                    <Ionicons name={icon} size={20} color={color} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.txDesc} numberOfLines={1}>
                      {t.description || t.type || 'Transaction'}
                    </Text>
                    <Text style={styles.txDate}>
                      {new Date(t.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                  <Text style={[styles.txAmount, { color }]}>
                    {isCredit ? '+' : '-'}${parseFloat(t.amount || 0).toLocaleString()}
                  </Text>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Withdraw Modal */}
      <Modal visible={showWithdraw} transparent animationType="slide">
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Withdraw Funds</Text>
              <TouchableOpacity onPress={() => setShowWithdraw(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalBalance}>
              Available: ${balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Amount to withdraw"
              placeholderTextColor="#9ca3af"
              value={withdrawAmount}
              onChangeText={setWithdrawAmount}
              keyboardType="decimal-pad"
              autoFocus
            />
            <TouchableOpacity
              style={[styles.modalBtn, actionLoading && { opacity: 0.6 }]}
              onPress={handleWithdraw}
              disabled={actionLoading}
            >
              {actionLoading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.modalBtnText}>Withdraw</Text>
              }
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Fund Modal */}
      <Modal visible={showFund} transparent animationType="slide">
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Funds</Text>
              <TouchableOpacity onPress={() => setShowFund(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.modalInput}
              placeholder="Amount to add"
              placeholderTextColor="#9ca3af"
              value={fundAmount}
              onChangeText={setFundAmount}
              keyboardType="decimal-pad"
              autoFocus
            />
            <TouchableOpacity
              style={[styles.modalBtn, actionLoading && { opacity: 0.6 }]}
              onPress={handleFund}
              disabled={actionLoading}
            >
              {actionLoading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.modalBtnText}>Add Funds</Text>
              }
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
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
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#111827' },
  modalBalance: { fontSize: 14, color: '#6b7280', marginBottom: 16 },
  modalInput: { borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 12, height: 54, paddingHorizontal: 16, fontSize: 18, color: '#111827', backgroundColor: '#f9fafb', marginBottom: 16 },
  modalBtn: { backgroundColor: '#1e3a5f', borderRadius: 12, height: 52, alignItems: 'center', justifyContent: 'center' },
  modalBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

export default WalletScreen;
