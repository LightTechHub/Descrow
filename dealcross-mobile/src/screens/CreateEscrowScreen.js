// src/screens/CreateEscrowScreen.js
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import escrowService from '../services/escrowService';

const CATEGORIES = ['Goods', 'Services', 'Digital Assets', 'Real Estate', 'Vehicles', 'Domain Names', 'Freelance', 'Other'];
const CURRENCIES = ['USD', 'EUR', 'GBP', 'NGN'];

const CreateEscrowScreen = ({ navigation }) => {
  const [form, setForm] = useState({ title: '', description: '', amount: '', currency: 'USD', sellerEmail: '', category: 'Goods', deadline: '' });
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleCreate = async () => {
    if (!form.title || !form.amount || !form.sellerEmail) {
      Toast.show({ type: 'error', text1: 'Fill in title, amount and seller email' });
      return;
    }
    if (isNaN(parseFloat(form.amount)) || parseFloat(form.amount) <= 0) {
      Toast.show({ type: 'error', text1: 'Enter a valid amount' });
      return;
    }
    setLoading(true);
    try {
      const res = await escrowService.createEscrow({
        title: form.title,
        description: form.description,
        amount: parseFloat(form.amount),
        currency: form.currency,
        sellerEmail: form.sellerEmail.toLowerCase().trim(),
        category: form.category,
        deadline: form.deadline || undefined,
      });
      if (res.success) {
        Toast.show({ type: 'success', text1: 'Escrow created!', text2: 'Waiting for seller to accept' });
        navigation.navigate('EscrowDetail', { escrowId: res.data?.escrow?._id || res.data?._id });
      } else {
        Toast.show({ type: 'error', text1: res.message || 'Failed to create escrow' });
      }
    } catch (err) {
      Toast.show({ type: 'error', text1: err?.response?.data?.message || 'Failed to create escrow' });
    } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Transaction Details</Text>

          <Text style={styles.label}>Title *</Text>
          <TextInput style={styles.input} placeholder="e.g. iPhone 15 Pro Purchase" placeholderTextColor="#9ca3af"
            value={form.title} onChangeText={v => set('title', v)} />

          <Text style={styles.label}>Description</Text>
          <TextInput style={[styles.input, styles.textarea]} placeholder="Describe what's being bought/sold..."
            placeholderTextColor="#9ca3af" value={form.description} onChangeText={v => set('description', v)}
            multiline numberOfLines={3} textAlignVertical="top" />

          <Text style={styles.label}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            {CATEGORIES.map(cat => (
              <TouchableOpacity key={cat} onPress={() => set('category', cat)}
                style={[styles.chip, form.category === cat && styles.chipActive]}>
                <Text style={[styles.chipText, form.category === cat && styles.chipTextActive]}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Amount & Currency</Text>

          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={styles.label}>Amount *</Text>
              <TextInput style={styles.input} placeholder="0.00" placeholderTextColor="#9ca3af"
                value={form.amount} onChangeText={v => set('amount', v)} keyboardType="decimal-pad" />
            </View>
            <View style={{ width: 100 }}>
              <Text style={styles.label}>Currency</Text>
              <ScrollView style={{ maxHeight: 52 }}>
                {CURRENCIES.map(c => (
                  <TouchableOpacity key={c} onPress={() => set('currency', c)}
                    style={[styles.input, form.currency === c && styles.inputActive, { marginBottom: 0, justifyContent: 'center' }]}>
                    <Text style={[{ color: '#6b7280', textAlign: 'center', fontWeight: '600' }, form.currency === c && { color: '#1e3a5f' }]}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>

          <View style={styles.currencyRow}>
            {CURRENCIES.map(c => (
              <TouchableOpacity key={c} onPress={() => set('currency', c)}
                style={[styles.currencyBtn, form.currency === c && styles.currencyBtnActive]}>
                <Text style={[styles.currencyText, form.currency === c && styles.currencyTextActive]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Seller Information</Text>

          <Text style={styles.label}>Seller Email *</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="mail-outline" size={18} color="#9ca3af" style={{ marginRight: 8 }} />
            <TextInput style={{ flex: 1, height: 50, fontSize: 15, color: '#111827' }}
              placeholder="seller@example.com" placeholderTextColor="#9ca3af"
              value={form.sellerEmail} onChangeText={v => set('sellerEmail', v)}
              keyboardType="email-address" autoCapitalize="none" />
          </View>

          <Text style={styles.label}>Deadline (optional)</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="calendar-outline" size={18} color="#9ca3af" style={{ marginRight: 8 }} />
            <TextInput style={{ flex: 1, height: 50, fontSize: 15, color: '#111827' }}
              placeholder="YYYY-MM-DD" placeholderTextColor="#9ca3af"
              value={form.deadline} onChangeText={v => set('deadline', v)} />
          </View>
        </View>

        {/* Summary */}
        {form.amount && form.title && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Summary</Text>
            <Text style={styles.summaryAmount}>{form.currency} {parseFloat(form.amount || 0).toLocaleString()}</Text>
            <Text style={styles.summaryDesc}>For: {form.title}</Text>
          </View>
        )}

        <TouchableOpacity style={styles.createBtn} onPress={handleCreate} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : (
            <>
              <Ionicons name="shield-checkmark" size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.createBtnText}>Create Escrow</Text>
            </>
          )}
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, elevation: 1 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: { borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 12, height: 50, paddingHorizontal: 14, fontSize: 15, color: '#111827', backgroundColor: '#f9fafb', marginBottom: 14 },
  inputActive: { borderColor: '#1e3a5f', backgroundColor: '#eff6ff' },
  inputWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 12, paddingHorizontal: 14, backgroundColor: '#f9fafb', marginBottom: 14 },
  textarea: { height: 80, paddingTop: 12 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: '#e5e7eb', marginRight: 8, backgroundColor: '#fff' },
  chipActive: { backgroundColor: '#1e3a5f', borderColor: '#1e3a5f' },
  chipText: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  chipTextActive: { color: '#fff' },
  row: { flexDirection: 'row' },
  currencyRow: { flexDirection: 'row', gap: 8 },
  currencyBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5, borderColor: '#e5e7eb', alignItems: 'center' },
  currencyBtnActive: { backgroundColor: '#1e3a5f', borderColor: '#1e3a5f' },
  currencyText: { fontSize: 13, fontWeight: '700', color: '#6b7280' },
  currencyTextActive: { color: '#fff' },
  summaryCard: { backgroundColor: '#eff6ff', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1.5, borderColor: '#bfdbfe' },
  summaryTitle: { fontSize: 12, fontWeight: '700', color: '#1e3a5f', textTransform: 'uppercase', marginBottom: 4 },
  summaryAmount: { fontSize: 28, fontWeight: '900', color: '#1e3a5f' },
  summaryDesc: { fontSize: 13, color: '#3b82f6', marginTop: 2 },
  createBtn: { backgroundColor: '#1e3a5f', borderRadius: 14, height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 16, elevation: 2 },
  createBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});

export default CreateEscrowScreen;
