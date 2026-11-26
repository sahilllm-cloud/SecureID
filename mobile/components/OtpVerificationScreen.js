import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import PrimaryButton from './PrimaryButton';

const colors = {
  text: '#F3F7FF',
  muted: '#91A2BA',
  blue: '#83ABF4',
  field: '#0A1625',
  border: '#203149',
  error: '#FF8A96',
};

function formatCountdown(seconds) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
  const remainingSeconds = (seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remainingSeconds}`;
}

export default function OtpVerificationScreen({
  challenge,
  error,
  loading,
  notice,
  onBack,
  onResend,
  onVerify,
  resending,
}) {
  const [code, setCode] = useState('');
  const [now, setNow] = useState(challenge.createdAt);
  const secondsToExpiry = Math.max(0, Math.ceil((challenge.expiresAt - now) / 1000));
  const secondsToResend = Math.max(0, Math.ceil((challenge.resendAt - now) / 1000));
  const expired = secondsToExpiry === 0;

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  async function handleResend() {
    const resent = await onResend();
    if (resent) setCode('');
  }

  function handleVerify() {
    if (code.length !== 6 || expired || loading) return;
    Keyboard.dismiss();
    onVerify(code);
  }

  return (
    <View style={styles.card}>
      <Pressable
        accessibilityRole="button"
        disabled={loading || resending}
        onPress={onBack}
        style={({ pressed }) => [
          styles.backButton,
          pressed ? styles.backPressed : null,
          loading || resending ? styles.backDisabled : null,
        ]}
      >
        <Text style={styles.backArrow}>‹</Text>
        <Text style={styles.backText}>Back to details</Text>
      </Pressable>

      <View style={styles.iconMark}>
        <Text style={styles.iconLock}>✦</Text>
      </View>
      <Text style={styles.eyebrow}>EMAIL VERIFICATION</Text>
      <Text style={styles.title}>Check your inbox.</Text>
      <Text style={styles.description}>
        Enter the six-digit code sent to{' '}
        <Text style={styles.email}>{challenge.delivery}</Text>.
      </Text>

      <Text style={styles.label}>Verification code</Text>
      <TextInput
        accessibilityHint="Enter the six-digit code from your email."
        accessibilityLabel="Six-digit verification code"
        autoComplete="one-time-code"
        editable={!expired && !loading}
        keyboardType="number-pad"
        maxLength={6}
        onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, 6))}
        onSubmitEditing={handleVerify}
        placeholder="• • • • • •"
        placeholderTextColor="#5E718B"
        returnKeyType="done"
        selectionColor={colors.blue}
        style={styles.codeInput}
        textContentType="oneTimeCode"
        value={code}
      />
      <View style={styles.timerRow}>
        <Text style={expired ? styles.expiredText : styles.timerText}>
          {expired
            ? 'This code has expired.'
            : `Code expires in ${formatCountdown(secondsToExpiry)}`}
        </Text>
        {!expired ? (
          <Text style={styles.timerText}>
            {secondsToResend > 0
              ? `Resend in ${formatCountdown(secondsToResend)}`
              : 'Resend available'}
          </Text>
        ) : null}
      </View>

      {expired ? (
        <Text accessibilityLiveRegion="polite" style={styles.expiryHelp}>
          Go back and request a fresh verification code.
        </Text>
      ) : null}
      {error ? (
        <Text accessibilityLiveRegion="polite" style={styles.error} role="alert">
          {error}
        </Text>
      ) : null}
      {notice ? (
        <Text accessibilityLiveRegion="polite" style={styles.notice}>
          {notice}
        </Text>
      ) : null}

      <PrimaryButton
        disabled={loading || resending || code.length !== 6 || expired}
        label={loading ? 'Verifying code…' : 'Verify email'}
        loading={loading}
        onPress={handleVerify}
      />

      <View style={styles.resendRow}>
        <Text style={styles.resendPrompt}>Didn’t receive the email?</Text>
        <Pressable
          accessibilityRole="button"
          disabled={loading || resending || secondsToResend > 0 || expired}
          onPress={handleResend}
          style={({ pressed }) => [
            styles.resendButton,
            pressed ? styles.resendPressed : null,
            (secondsToResend > 0 || expired) ? styles.resendDisabled : null,
          ]}
        >
          {resending ? (
            <ActivityIndicator color={colors.blue} size="small" />
          ) : (
            <Text style={[
              styles.resendText,
              (secondsToResend > 0 || expired) ? styles.resendDisabled : null,
            ]}>
              {expired ? 'Code expired' : 'Resend code'}
            </Text>
          )}
        </Pressable>
      </View>
      <Text style={styles.securityNote}>
        This code is private. Never share it with anyone.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingHorizontal: 19,
    paddingTop: 18,
    paddingBottom: 20,
    borderWidth: 1,
    borderColor: '#1C2C42',
    borderRadius: 19,
    backgroundColor: '#0D1A2B',
    shadowColor: '#000000',
    shadowOpacity: 0.2,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 7,
  },
  backButton: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 14,
  },
  backArrow: {
    color: colors.muted,
    fontSize: 24,
    lineHeight: 26,
  },
  backText: {
    color: colors.muted,
    fontSize: 11,
  },
  backPressed: {
    opacity: 0.7,
  },
  backDisabled: {
    opacity: 0.55,
  },
  iconMark: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#2A4265',
    borderRadius: 13,
    backgroundColor: '#12243B',
  },
  iconLock: {
    color: colors.blue,
    fontSize: 19,
  },
  eyebrow: {
    marginBottom: 9,
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
    marginBottom: 23,
    color: colors.muted,
    fontSize: 12,
    lineHeight: 19,
  },
  email: {
    color: '#D5E2F8',
    fontWeight: '600',
  },
  label: {
    marginBottom: 8,
    color: '#AFBDD0',
    fontSize: 10,
    fontWeight: '600',
  },
  codeInput: {
    minHeight: 58,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.field,
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 7,
    textAlign: 'center',
  },
  timerRow: {
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  timerText: {
    color: '#7D91AE',
    fontSize: 9,
  },
  expiredText: {
    color: colors.error,
    fontSize: 10,
    fontWeight: '600',
  },
  expiryHelp: {
    marginTop: 4,
    color: colors.muted,
    fontSize: 10,
  },
  error: {
    marginTop: 8,
    color: colors.error,
    fontSize: 11,
    lineHeight: 16,
  },
  notice: {
    marginTop: 8,
    color: '#8FCEAE',
    fontSize: 11,
    lineHeight: 16,
  },
  resendRow: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginTop: 11,
  },
  resendPrompt: {
    color: '#8595AB',
    fontSize: 10,
  },
  resendButton: {
    minHeight: 42,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  resendPressed: {
    opacity: 0.7,
  },
  resendText: {
    color: colors.blue,
    fontSize: 10,
    fontWeight: '700',
  },
  resendDisabled: {
    color: '#62738B',
  },
  securityNote: {
    marginTop: 9,
    color: '#71829A',
    fontSize: 9,
    textAlign: 'center',
  },
});
