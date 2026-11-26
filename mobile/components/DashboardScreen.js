import { StyleSheet, Text, View } from 'react-native';
import PrimaryButton from './PrimaryButton';

const colors = {
  text: '#F3F7FF',
  muted: '#91A2BA',
  border: '#1C2C42',
  surface: '#0D1A2B',
  error: '#FF8A96',
};

export default function DashboardScreen({ error, loading, onLogout, user }) {
  return (
    <View style={styles.card}>
      <View style={styles.successMark}>
        <Text style={styles.successCheck}>✓</Text>
      </View>
      <Text style={styles.eyebrow}>YOUR SECURE SPACE</Text>
      <Text style={styles.title}>Welcome, {user.surname}.</Text>
      <Text style={styles.description}>
        You’re signed in on this device. Your account is protected with a private session.
      </Text>

      <View style={styles.accountCard}>
        <Text style={styles.accountLabel}>VERIFIED EMAIL</Text>
        <Text style={styles.accountEmail}>{user.email}</Text>
      </View>

      {error ? (
        <Text accessibilityLiveRegion="polite" role="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}

      <PrimaryButton
        disabled={loading}
        label={loading ? 'Signing out…' : 'Sign out'}
        loading={loading}
        onPress={onLogout}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingHorizontal: 19,
    paddingTop: 22,
    paddingBottom: 18,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 19,
    backgroundColor: colors.surface,
    shadowColor: '#000000',
    shadowOpacity: 0.2,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 7,
  },
  successMark: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 19,
    borderWidth: 1,
    borderColor: '#285847',
    borderRadius: 16,
    backgroundColor: '#102A25',
  },
  successCheck: {
    color: '#77D1A4',
    fontSize: 24,
    fontWeight: '700',
  },
  eyebrow: {
    marginBottom: 10,
    color: '#83A5DC',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  title: {
    color: colors.text,
    fontSize: 27,
    fontWeight: '600',
    letterSpacing: -0.8,
  },
  description: {
    marginTop: 9,
    color: colors.muted,
    fontSize: 12,
    lineHeight: 19,
  },
  accountCard: {
    marginTop: 22,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: '#0A1625',
  },
  accountLabel: {
    color: '#7185A0',
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 1.1,
  },
  accountEmail: {
    marginTop: 6,
    color: '#DDE8FA',
    fontSize: 12,
    fontWeight: '600',
  },
  error: {
    marginTop: 12,
    color: colors.error,
    fontSize: 11,
    lineHeight: 16,
  },
});
