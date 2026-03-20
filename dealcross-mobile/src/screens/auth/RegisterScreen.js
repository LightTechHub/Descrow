// src/screens/auth/RegisterScreen.js
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import authService from '../../services/authService';

const RegisterScreen = ({ navigation }) => {
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', accountType: 'individual' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleRegister = async () => {
    if (!form.name || !form.email || !form.password || !form.phone) {
      Toast.show({ type: 'error', text1: 'Please fill all fields' });
      return;
    }
    if (form.password.length < 8) {
      Toast.show({ type: 'error', text1: 'Password must be at least 8 characters' });
      return;
    }
    setLoading(true);
    try {
      const res = await authService.register({
        name: form.name,
        email: form.email.toLowerCase(),
        password: form.password,
        phone: form.phone,
        accountType: form.accountType,
        agreedToTerms: true,
      });
      if (res.success) {
        Toast.show({ type: 'success', text1: 'Account created!', text2: 'Check your email to verify' });
        navigation.navigate('VerifyEmail', { email: form.email });
      } else {
        Toast.show({ type: 'error', text1: res.message || 'Registration failed' });
      }
    } catch (err) {
      Toast.show({ type: 'error', text1: err?.response?.data?.message || 'Registration failed' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        <View style={styles.header}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join Dealcross for secure escrow</Text>
        </View>

        <View style={styles.form}>
          {/* Account Type Toggle */}
          <Text style={styles.label}>Account Type</Text>
          <View style={styles.toggleRow}>
            {['individual', 'business'].map(t => (
              <TouchableOpacity key={t} onPress={() => set('accountType', t)}
                style={[styles.toggleBtn, form.accountType === t && styles.toggleActive]}>
                <Text style={[styles.toggleText, form.accountType === t && styles.toggleTextActive]}>
                  {t === 'individual' ? 'Individual' : 'Business'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {[
            { key: 'name', placeholder: 'Full name', icon: 'person-outline', type: 'default' },
            { key: 'email', placeholder: 'Email address', icon: 'mail-outline', type: 'email-address' },
            { key: 'phone', placeholder: 'Phone (+234...)', icon: 'call-outline', type: 'phone-pad' },
          ].map(f => (
            <View key={f.key} style={styles.inputWrap}>
              <Ionicons name={f.icon} size={20} color="#9ca3af" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder={f.placeholder}
                placeholderTextColor="#9ca3af"
                value={form[f.key]}
                onChangeText={v => set(f.key, v)}
                keyboardType={f.type}
                autoCapitalize={f.key === 'name' ? 'words' : 'none'}
                autoCorrect={false}
              />
            </View>
          ))}

          <View style={styles.inputWrap}>
            <Ionicons name="lock-closed-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
            <TextInput style={[styles.input, { flex: 1 }]} placeholder="Password (min 8 chars)"
              placeholderTextColor="#9ca3af" value={form.password}
              onChangeText={v => set('password', v)} secureTextEntry={!showPass} />
            <TouchableOpacity onPress={() => setShowPass(v => !v)} style={styles.eyeBtn}>
              <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={20} color="#9ca3af" />
            </TouchableOpacity>
          </View>

          <Text style={styles.termsText}>
            By creating an account you agree to our{' '}
            <Text style={styles.link}>Terms of Service</Text> and{' '}
            <Text style={styles.link}>Privacy Policy</Text>.
          </Text>

          <TouchableOpacity style={styles.btn} onPress={handleRegister} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Create Account</Text>}
          </TouchableOpacity>

          <View style={styles.loginRow}>
            <Text style={styles.loginLabel}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLink}>Sign in</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  header: { alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 28, fontWeight: '800', color: '#111827', marginBottom: 6 },
  subtitle: { fontSize: 15, color: '#6b7280' },
  form: { backgroundColor: '#fff', borderRadius: 20, padding: 24, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, elevation: 3 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 },
  toggleRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  toggleBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: '#e5e7eb', alignItems: 'center' },
  toggleActive: { borderColor: '#1e3a5f', backgroundColor: '#eff6ff' },
  toggleText: { fontSize: 14, fontWeight: '600', color: '#6b7280' },
  toggleTextActive: { color: '#1e3a5f' },
  inputWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 12, marginBottom: 14, paddingHorizontal: 14, backgroundColor: '#f9fafb' },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, height: 50, color: '#111827', fontSize: 15 },
  eyeBtn: { padding: 4 },
  termsText: { fontSize: 12, color: '#6b7280', marginBottom: 16, lineHeight: 18 },
  link: { color: '#1e3a5f', fontWeight: '600' },
  btn: { backgroundColor: '#1e3a5f', borderRadius: 12, height: 52, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  loginRow: { flexDirection: 'row', justifyContent: 'center' },
  loginLabel: { color: '#6b7280', fontSize: 14 },
  loginLink: { color: '#1e3a5f', fontSize: 14, fontWeight: '700' },
});

export default RegisterScreen;
