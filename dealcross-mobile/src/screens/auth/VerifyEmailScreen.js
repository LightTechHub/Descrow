// src/screens/auth/VerifyEmailScreen.js
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const VerifyEmailScreen = ({ route, navigation }) => {
  const { email } = route.params || {};

  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Ionicons name="mail-open-outline" size={52} color="#1e3a5f" />
      </View>
      <Text style={styles.title}>Verify Your Email</Text>
      <Text style={styles.subtitle}>
        We sent a verification link to{'\n'}
        <Text style={styles.email}>{email}</Text>
      </Text>
      <Text style={styles.hint}>Check your inbox and click the link to activate your account.</Text>
      <TouchableOpacity style={styles.btn} onPress={() => navigation.navigate('Login')}>
        <Text style={styles.btnText}>Back to Login</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center', padding: 32 },
  iconWrap: { width: 90, height: 90, borderRadius: 24, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  title: { fontSize: 26, fontWeight: '800', color: '#111827', marginBottom: 10 },
  subtitle: { fontSize: 15, color: '#6b7280', textAlign: 'center', marginBottom: 12, lineHeight: 22 },
  email: { color: '#1e3a5f', fontWeight: '700' },
  hint: { fontSize: 13, color: '#9ca3af', textAlign: 'center', marginBottom: 32, lineHeight: 20 },
  btn: { width: '100%', backgroundColor: '#1e3a5f', borderRadius: 12, height: 52, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

export default VerifyEmailScreen;
