// src/screens/auth/TwoFAScreen.js
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useAuth } from '../../context/AuthContext';

const TwoFAScreen = ({ route, navigation }) => {
  const { tempToken } = route.params;
  const { complete2FA } = useAuth();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    if (code.length !== 6) { Toast.show({ type: 'error', text1: 'Enter the 6-digit code' }); return; }
    setLoading(true);
    try {
      const res = await complete2FA(tempToken, code);
      if (!res.success) Toast.show({ type: 'error', text1: res.message || 'Invalid code' });
    } catch (err) {
      Toast.show({ type: 'error', text1: err?.response?.data?.message || 'Verification failed' });
    } finally { setLoading(false); }
  };

  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Ionicons name="phone-portrait-outline" size={48} color="#1e3a5f" />
      </View>
      <Text style={styles.title}>Two-Factor Auth</Text>
      <Text style={styles.subtitle}>Enter the 6-digit code from your authenticator app</Text>
      <TextInput
        style={styles.codeInput}
        value={code}
        onChangeText={t => setCode(t.replace(/\D/g, '').slice(0, 6))}
        keyboardType="number-pad"
        maxLength={6}
        placeholder="000000"
        placeholderTextColor="#9ca3af"
        textAlign="center"
        autoFocus
      />
      <TouchableOpacity style={styles.btn} onPress={handleVerify} disabled={loading || code.length !== 6}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Verify & Sign In</Text>}
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={styles.backText}>Back to login</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center', padding: 32 },
  iconWrap: { width: 80, height: 80, borderRadius: 20, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  title: { fontSize: 26, fontWeight: '800', color: '#111827', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginBottom: 32, lineHeight: 20 },
  codeInput: { width: '100%', height: 64, borderWidth: 2, borderColor: '#1e3a5f', borderRadius: 14, fontSize: 32, fontWeight: '700', color: '#111827', letterSpacing: 12, marginBottom: 24, backgroundColor: '#fff' },
  btn: { width: '100%', backgroundColor: '#1e3a5f', borderRadius: 12, height: 52, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  backText: { color: '#6b7280', fontSize: 14 },
});

export default TwoFAScreen;
