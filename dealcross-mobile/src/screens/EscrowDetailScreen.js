// src/screens/EscrowDetailScreen.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import escrowService from '../services/escrowService';
import { useAuth } from '../context/AuthContext';

// Safe amount parser - handles multiple field names from API
const getCurrency = (item) => item?.currency || item?.escrowCurrency || 'USD';
const getAmount = (item) => {
  let raw = item?.amount ?? item?.escrowAmount ?? item?.totalAmount ?? item?.price ?? 0;
  if (raw && typeof raw === 'object') {
    const currency = getCurrency(item);
    raw = raw[currency] || raw['USD'] || Object.values(raw)[0] || 0;
  }
  const num = parseFloat(raw);
  return isNaN(num) ? 0 : num;
};

const EscrowDetailScreen = ({ route, navigation }) => {
  const { escrowId } = route.params;
  const { user } = useAuth();
  const [escrow, setEscrow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => { fetchEscrow(); }, []);

  const fetchEscrow = async () => {
    try {
      const res = await escrowService.getEscrowById(escrowId);
      if (res.success) setEscrow(res.data?.escrow || res.data);
    } catch { Toast.show({ type: 'error', text1: 'Failed to load escrow' }); }
    finally { setLoading(false); }
  };

  const handleAction = async (action, label) => {
    Alert.alert('Confirm', `Are you sure you want to ${label}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm', onPress: async () => {
          setActionLoading(true);
          try {
            let res;
            if (action === 'accept') res = await escrowService.acceptEscrow(escrowId);
            else if (action === 'confirm') res = await escrowService.confirmDelivery(escrowId);
            else if (action === 'fund') res = await escrowService.fundFromWallet(escrowId);
            else if (action === 'cancel') res = await escrowService.cancelEscrow(escrowId);
            if (res?.success) { Toast.show({ type: 'success', text1: res.message || 'Done' }); fetchEscrow(); }
            else Toast.show({ type: 'error', text1: res?.message || 'Action failed' });
          } catch (err) {
            Toast.show({ type: 'error', text1: err?.response?.data?.message || 'Action failed' });
          } finally { setActionLoading(false); }
        }
      }
    ]);
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#1e3a5f" /></View>;
  if (!escrow) return <View style={styles.centered}><Text>Escrow not found</Text></View>;

  const isBuyer = escrow.buyer?._id === user?._id || escrow.buyer === user?._id;
  const statusColors = { pending: '#f59e0b', funded: '#3b82f6', completed: '#10b981', disputed: '#ef4444', cancelled: '#6b7280', accepted: '#8b5cf6' };
  const color = statusColors[escrow.status] || '#6b7280';

  return (
    <ScrollView style={styles.container}>
      {/* Status Banner */}
      <View style={[styles.banner, { backgroundColor: color }]}>
        <Text style={styles.bannerStatus}>{escrow.status?.toUpperCase()}</Text>
        <Text style={styles.bannerAmount}>${getAmount(escrow).toLocaleString()} {getCurrency(escrow)}</Text>
      </View>

      <View style={styles.content}>
        {/* Title & Description */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Transaction</Text>
          <Text style={styles.cardTitle}>{escrow.title || 'Escrow Transaction'}</Text>
          {escrow.description ? <Text style={styles.cardDesc}>{escrow.description}</Text> : null}
        </View>

        {/* Parties */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Parties</Text>
          <View style={styles.partyRow}>
            <View style={styles.party}>
              <Ionicons name="person-circle-outline" size={22} color="#1e3a5f" />
              <View style={{ marginLeft: 8 }}>
                <Text style={styles.partyRole}>Buyer</Text>
                <Text style={styles.partyName}>{escrow.buyer?.name || escrow.buyer?.email || 'Unknown'}</Text>
              </View>
              {isBuyer && <View style={styles.youBadge}><Text style={styles.youText}>You</Text></View>}
            </View>
            <Ionicons name="swap-horizontal" size={20} color="#9ca3af" />
            <View style={styles.party}>
              <Ionicons name="business-outline" size={22} color="#10b981" />
              <View style={{ marginLeft: 8 }}>
                <Text style={styles.partyRole}>Seller</Text>
                <Text style={styles.partyName}>{escrow.seller?.name || escrow.seller?.email || 'Unknown'}</Text>
              </View>
              {!isBuyer && <View style={[styles.youBadge, { backgroundColor: '#d1fae5' }]}><Text style={[styles.youText, { color: '#10b981' }]}>You</Text></View>}
            </View>
          </View>
        </View>

        {/* Details */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Details</Text>
          {[
            { label: 'Created', value: new Date(escrow.createdAt).toLocaleDateString() },
            { label: 'Deadline', value: escrow.deadline ? new Date(escrow.deadline).toLocaleDateString() : 'No deadline' },
            { label: 'Category', value: escrow.category || 'General' },
            { label: 'Escrow ID', value: escrow._id?.slice(-8).toUpperCase() },
          ].map(row => (
            <View key={row.label} style={styles.detailRow}>
              <Text style={styles.detailLabel}>{row.label}</Text>
              <Text style={styles.detailValue}>{row.value}</Text>
            </View>
          ))}
        </View>

        {/* Actions */}
        {!['completed', 'cancelled'].includes(escrow.status) && (
          <View style={styles.actionsCard}>
            {escrow.status === 'pending' && !isBuyer && (
              <TouchableOpacity style={styles.actionBtn} onPress={() => handleAction('accept', 'accept this escrow')} disabled={actionLoading}>
                <Text style={styles.actionBtnText}>Accept Escrow</Text>
              </TouchableOpacity>
            )}
            {escrow.status === 'accepted' && isBuyer && (
              <TouchableOpacity style={styles.actionBtn} onPress={() => handleAction('fund', 'fund this escrow from wallet')} disabled={actionLoading}>
                <Text style={styles.actionBtnText}>Fund from Wallet</Text>
              </TouchableOpacity>
            )}
            {escrow.status === 'funded' && isBuyer && (
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#10b981' }]} onPress={() => handleAction('confirm', 'confirm delivery')} disabled={actionLoading}>
                <Text style={styles.actionBtnText}>Confirm Delivery</Text>
              </TouchableOpacity>
            )}
            {!['completed'].includes(escrow.status) && (
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#ef4444', marginTop: 8 }]} onPress={() => handleAction('cancel', 'cancel this escrow')} disabled={actionLoading}>
                <Text style={styles.actionBtnText}>Cancel</Text>
              </TouchableOpacity>
            )}
            {actionLoading && <ActivityIndicator color="#1e3a5f" style={{ marginTop: 12 }} />}
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  banner: { padding: 24, alignItems: 'center' },
  bannerStatus: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '700', letterSpacing: 2, marginBottom: 4 },
  bannerAmount: { color: '#fff', fontSize: 32, fontWeight: '900' },
  content: { padding: 16 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, elevation: 1 },
  cardLabel: { fontSize: 11, fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 4 },
  cardDesc: { fontSize: 14, color: '#6b7280', lineHeight: 20 },
  partyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  party: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  partyRole: { fontSize: 11, color: '#9ca3af', fontWeight: '600' },
  partyName: { fontSize: 13, color: '#111827', fontWeight: '600' },
  youBadge: { backgroundColor: '#eff6ff', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginLeft: 6 },
  youText: { fontSize: 10, color: '#1e3a5f', fontWeight: '700' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  detailLabel: { fontSize: 13, color: '#6b7280' },
  detailValue: { fontSize: 13, color: '#111827', fontWeight: '600' },
  actionsCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 32, elevation: 1 },
  actionBtn: { backgroundColor: '#1e3a5f', borderRadius: 12, height: 50, alignItems: 'center', justifyContent: 'center' },
  actionBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});

export default EscrowDetailScreen;