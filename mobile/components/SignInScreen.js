import { Pressable, StyleSheet, Text, View } from 'react-native';
import FormTextInput from './FormTextInput';
import PrimaryButton from './PrimaryButton';

const colors = {
  text: '#F3F7FF',
  muted: '#91A2BA',
  blue: '#83ABF4',
  border: '#1C2C42',
  surface: '#0D1A2B',
};

export default function SignInScreen({
  email,
  error,
  loading,
  notice,
  onChangeEmail,
  onCreateAccount,
  onRequestOtp,
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>WELCOME BACK</Text>
      <Text style={styles.title}>Sign in securely.</Text>
      <Text style={styles.description}>
        We’ll email a six-digit verification code to your registered address.
      </Text>

      <View style={styles.fields}>
        <FormTextInput
          autoComplete="email"
          error={error}
          hint="Enter the email address linked to your SecureID account."
          keyboardType="email-address"
          label="Email address"
          onChangeText={onChangeEmail}
          placeholder="you@example.com"
          returnKeyType="done"
          value={email}
        />
      </View>

      {notice ? (
        <Text accessibilityLiveRegion="polite" style={styles.notice}>
          {notice}
        </Text>
      ) : null}

      <PrimaryButton
        disabled={loading}
        label={loading ? 'Requesting code…' : 'Request OTP'}
        loading={loading}
        onPress={() => onRequestOtp(email)}
      />

      <View style={styles.accountRow}>
        <Text style={styles.accountPrompt}>New to SecureID?</Text>
        <Pressable
          accessibilityRole="link"
          disabled={loading}
          onPress={onCreateAccount}
          style={({ pressed }) => [styles.link, pressed ? styles.linkPressed : null]}
        >
          <Text style={styles.linkText}>Create account</Text>
        </Pressable>
      </View>
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
  eyebrow: {
    marginBottom: 10,
    color: '#83A5DC',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '600',
    letterSpacing: -0.8,
  },
  description: {
    marginTop: 9,
    marginBottom: 22,
    color: colors.muted,
    fontSize: 12,
    lineHeight: 19,
  },
  fields: {
    gap: 14,
  },
  notice: {
    marginTop: 10,
    color: '#8FCEAE',
    fontSize: 11,
    lineHeight: 16,
  },
  accountRow: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginTop: 13,
  },
  accountPrompt: {
    color: '#8E9DB3',
    fontSize: 11,
  },
  link: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  linkPressed: {
    opacity: 0.72,
  },
  linkText: {
    color: colors.blue,
    fontSize: 11,
    fontWeight: '700',
  },
});
