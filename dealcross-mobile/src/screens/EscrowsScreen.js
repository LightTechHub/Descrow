// src/screens/EscrowsScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import escrowService from '../services/escrowService';

const TABS = ['all', 'pending', 'funded', 'completed', 'disputed'];

const EscrowsScreen = ({ navigation }) => {
  const [escrows, setEscrows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');

  const fetchEscrows = useCallback(async () => {
    try {
      const params = activeTab !== 'all' ? { status: activeTab } : {};
      const res = await escrowService.getMyEscrows(params);
      if (res.success) setEscrows(res.data?.escrows || []);
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, [activeTab]);

  useEffect(() => { setLoading(true); fetchEscrows(); }, [activeTab]);

  const filtered = escrows.filter(e =>
    (e.title || '').toLowerCase().includes(search.toLowerCase()) ||
    (e._id || '').includes(search)
  );

  const statusColors = { pending: '#f59e0b', funded: '#3b82f6', completed: '#10b981', disputed: '#ef4444', cancelled: '#6b7280', accepted: '#8b5cf6' };

  const renderItem = ({ item }) => {
    const color = statusColors[item.status] || '#6b7280';
    return (
      <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('EscrowDetail', { escrowId: item._id })}>
        <View style={styles.cardTop}>
          <Text style={styles.cardTitle} numberOfLines={1}>{item.title || 'Escrow'}</Text>
          <View style={[styles.badge, { backgroundColor: color + '20' }]}>
            <Text style={[styles.badgeText, { color }]}>{item.status}</Text>
          </View>
        </View>
        <View style={styles.cardMeta}>
          <Text style={styles.amount}>${parseFloat(item.amount || 0).toLocaleString()} {item.currency || 'USD'}</Text>
          <Text style={styles.meta}>
            {item.role === 'buyer' ? 'You are buyer' : 'You are seller'}
          </Text>
        </View>
        <View style={styles.cardBottom}>
          <Text style={styles.date}>{new Date(item.createdAt).toLocaleDateString()}</Text>
          <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Escrows</Text>
        <TouchableOpacity onPress={() => navigation.navigate('CreateEscrow')} style={styles.createBtn}>
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={18} color="#9ca3af" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search escrows..."
          placeholderTextColor="#9ca3af"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {TABS.map(tab => (
          <TouchableOpacity key={tab} onPress={() => setActiveTab(tab)}
            style={[styles.tab, activeTab === tab && styles.tabActive]}>
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.centered}><ActivityIndicator size="large" color="#1e3a5f" /></View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={i => i._id}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchEscrows(); }} colors={['#1e3a5f']} />}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="shield-outline" size={48} color="#d1d5db" />
              <Text style={styles.emptyText}>No escrows found</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1e3a5f', paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16 },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: '800' },
  createBtn: { width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', margin: 16, borderRadius: 12, paddingHorizontal: 14, borderWidth: 1, borderColor: '#e5e7eb', height: 44 },
  searchInput: { flex: 1, fontSize: 14, color: '#111827' },
  tabs: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 4, gap: 6 },
  tab: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb' },
  tabActive: { backgroundColor: '#1e3a5f', borderColor: '#1e3a5f' },
  tabText: { fontSize: 12, fontWeight: '600', color: '#6b7280' },
  tabTextActive: { color: '#fff' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 60 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 10, elevation: 1 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#111827', flex: 1, marginRight: 8 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  cardMeta: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  amount: { fontSize: 18, fontWeight: '800', color: '#1e3a5f' },
  meta: { fontSize: 12, color: '#9ca3af', alignSelf: 'flex-end' },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f3f4f6', paddingTop: 8 },
  date: { fontSize: 12, color: '#9ca3af' },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyText: { color: '#9ca3af', fontSize: 15, marginTop: 10 },
});

export default EscrowsScreen;
