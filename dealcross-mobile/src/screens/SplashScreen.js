// src/screens/SplashScreen.js
import React, { useEffect } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

const SplashScreen = ({ navigation }) => {
  useEffect(() => {
    const timer = setTimeout(() => navigation.replace('Login'), 2500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.logoWrap}>
        <Text style={styles.logo}>D</Text>
      </View>
      <Text style={styles.title}>Dealcross</Text>
      <Text style={styles.sub}>Secure Escrow Payments</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1e3a5f', alignItems: 'center', justifyContent: 'center' },
  logoWrap: { width: 90, height: 90, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  logo: { fontSize: 48, fontWeight: '900', color: '#ffffff' },
  title: { fontSize: 34, fontWeight: '800', color: '#ffffff', letterSpacing: 0.5 },
  sub: { fontSize: 15, color: 'rgba(255,255,255,0.7)', marginTop: 8 },
});

export default SplashScreen;
