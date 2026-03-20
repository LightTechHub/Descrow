// src/screens/NotificationsScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import API from '../utils/api';

const NotificationsScreen = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetch = async () => {
    try {
      const res = await API.get('/notifications');
      setNotifications(res.data?.data?.notifications || res.data?.data || []);
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { fetch(); }, []);

  const markRead = async (id) => {
    try {
      await API.put(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
    } catch {}
  };

  const typeIcon = {
    escrow_created: 'shield-outline',
    escrow_funded: 'wallet-outline',
    escrow_completed: 'checkmark-circle-outline',
    escrow_disputed: 'alert-circle-outline',
    payment: 'card-outline',
    kyc: 'person-circle-outline',
    system: 'information-circle-outline',
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity style={[styles.item, !item.read && styles.itemUnread]} onPress={() => markRead(item._id)}>
      <View style={[styles.iconWrap, !item.read && styles.iconWrapUnread]}>
        <Ionicons name={typeIcon[item.type] || 'notifications-outline'} size={20} color={item.read ? '#9ca3af' : '#1e3a5f'} />
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={[styles.title, !item.read && styles.titleUnread]} numberOfLines={1}>{item.title || 'Notification'}</Text>
        <Text style={styles.message} numberOfLines={2}>{item.message}</Text>
        <Text style={styles.time}>{new Date(item.createdAt).toLocaleString()}</Text>
      </View>
      {!item.read && <View style={styles.dot} />}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
      </View>
      {loading ? (
        <View style={styles.centered}><ActivityIndicator size="large" color="#1e3a5f" /></View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={i => i._id}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetch(); }} colors={['#1e3a5f']} />}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="notifications-off-outline" size={48} color="#d1d5db" />
              <Text style={styles.emptyText}>No notifications yet</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { backgroundColor: '#1e3a5f', paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16 },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: '800' },
  item: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 8, elevation: 1 },
  itemUnread: { backgroundColor: '#eff6ff', borderLeftWidth: 3, borderLeftColor: '#1e3a5f' },
  iconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' },
  iconWrapUnread: { backgroundColor: '#dbeafe' },
  title: { fontSize: 14, fontWeight: '600', color: '#6b7280' },
  titleUnread: { color: '#111827', fontWeight: '700' },
  message: { fontSize: 13, color: '#6b7280', marginTop: 2, lineHeight: 18 },
  time: { fontSize: 11, color: '#9ca3af', marginTop: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#1e3a5f', marginTop: 6 },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyText: { color: '#9ca3af', fontSize: 15, marginTop: 10 },
});

export default NotificationsScreen;
