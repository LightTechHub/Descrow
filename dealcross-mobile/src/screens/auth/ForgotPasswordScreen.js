// src/screens/auth/ForgotPasswordScreen.js
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import Toast from 'react-native-toast-message';
import authService from '../../services/authService';

const ForgotPasswordScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim()) { Toast.show({ type: 'error', text1: 'Enter your email' }); return; }
    setLoading(true);
    try {
      await authService.forgotPassword(email.trim().toLowerCase());
      setSent(true);
    } catch { setSent(true); }
    finally { setLoading(false); }
  };

  return (
    <View style={styles.container}>
      {sent ? (
        <View style={styles.sentBox}>
          <Text style={styles.sentIcon}>📧</Text>
          <Text style={styles.title}>Check Your Email</Text>
          <Text style={styles.subtitle}>If an account exists for {email}, a reset link has been sent.</Text>
          <TouchableOpacity style={styles.btn} onPress={() => navigation.navigate('Login')}>
            <Text style={styles.btnText}>Back to Login</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.form}>
          <Text style={styles.title}>Forgot Password?</Text>
          <Text style={styles.subtitle}>Enter your email and we'll send you a reset link.</Text>
          <TextInput
            style={styles.input}
            placeholder="Email address"
            placeholderTextColor="#9ca3af"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TouchableOpacity style={styles.btn} onPress={handleSubmit} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Send Reset Link</Text>}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>Back to login</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center', padding: 24 },
  sentBox: { alignItems: 'center', width: '100%' },
  sentIcon: { fontSize: 56, marginBottom: 16 },
  form: { width: '100%', backgroundColor: '#fff', borderRadius: 20, padding: 24, elevation: 3 },
  title: { fontSize: 26, fontWeight: '800', color: '#111827', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  input: { borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 12, height: 50, paddingHorizontal: 16, fontSize: 15, color: '#111827', backgroundColor: '#f9fafb', marginBottom: 16 },
  btn: { backgroundColor: '#1e3a5f', borderRadius: 12, height: 52, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  backText: { color: '#6b7280', fontSize: 14, textAlign: 'center' },
});

export default ForgotPasswordScreen;
