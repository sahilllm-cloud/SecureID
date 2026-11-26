import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateOfBirthField from './components/DateOfBirthField';
import DashboardScreen from './components/DashboardScreen';
import FormTextInput from './components/FormTextInput';
import OtpVerificationScreen from './components/OtpVerificationScreen';
import PrimaryButton from './components/PrimaryButton';
import SignInScreen from './components/SignInScreen';
import {
  AuthApiError,
  getCurrentUser,
  logout,
  registerAccount,
  requestLoginOtp,
  resendOtp,
  verifyLoginOtp,
  verifyRegistrationOtp,
} from './services/authApi';
import { validateRegistration } from './utils/registrationValidation';

const sessionStorageKey = 'secureid-session-token';
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const colors = {
  background: '#07111F',
  surface: '#0D1A2B',
  text: '#F3F7FF',
  blue: '#78A4FF',
  border: '#1C2C42',
};

function formatDateForApi(date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getChallengeDeadlines(result) {
  if (
    !Number.isFinite(result?.expiresInSeconds) ||
    result.expiresInSeconds <= 0 ||
    !Number.isFinite(result?.resendInSeconds) ||
    result.resendInSeconds < 0
  ) {
    throw new Error('The API returned invalid verification timing. Please try again.');
  }

  const now = Date.now();
  return {
    createdAt: now,
    expiresAt: now + result.expiresInSeconds * 1000,
    resendAt: now + result.resendInSeconds * 1000,
  };
}

export default function App() {
  const [surname, setSurname] = useState('');
  const [email, setEmail] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState(null);
  const [errors, setErrors] = useState({});
  const [screen, setScreen] = useState('restoring');
  const [flow, setFlow] = useState('signup');
  const [challenge, setChallenge] = useState(null);
  const [authenticatedUser, setAuthenticatedUser] = useState(null);
  const [apiError, setApiError] = useState('');
  const [notice, setNotice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    let active = true;

    async function restoreSession() {
      try {
        const sessionToken = await SecureStore.getItemAsync(sessionStorageKey);
        if (!active) return;
        if (!sessionToken) {
          setScreen('registration');
          return;
        }

        const result = await getCurrentUser(sessionToken);
        if (!result?.user?.email) {
          throw new Error('The server did not return a valid session. Please sign in again.');
        }
        if (active) {
          setAuthenticatedUser(result.user);
          setScreen('dashboard');
        }
      } catch (error) {
        if (!active) return;
        if (error instanceof AuthApiError && error.status === 401) {
          try {
            await SecureStore.deleteItemAsync(sessionStorageKey);
          } catch (storageError) {
            setApiError(`Could not clear the expired session from this device: ${storageError.message}`);
            setScreen('login');
            return;
          }
          setNotice('Your session expired or was signed in elsewhere. Please sign in again.');
          setScreen('login');
          return;
        }

        setApiError(error.message || 'We could not restore your session. Please try again.');
        setScreen('login');
      }
    }

    restoreSession();
    return () => {
      active = false;
    };
  }, []);

  function updateField(field, updateValue) {
    return (value) => {
      updateValue(value);
      setErrors((current) => ({ ...current, [field]: undefined }));
      setApiError('');
      setNotice('');
    };
  }

  async function handleCreateAccount() {
    Keyboard.dismiss();
    setApiError('');
    setNotice('');
    const nextErrors = validateRegistration({ surname, email, dateOfBirth });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setFlow('signup');
    setIsSubmitting(true);
    try {
      const result = await registerAccount({
        surname: surname.trim(),
        email: email.trim().toLowerCase(),
        dateOfBirth: formatDateForApi(dateOfBirth),
      });

      if (typeof result?.challengeId !== 'string' || typeof result.delivery !== 'string') {
        throw new Error('The API did not return a valid verification request. Please try again.');
      }

      setChallenge({
        challengeId: result.challengeId,
        delivery: result.delivery,
        ...getChallengeDeadlines(result),
      });
      setScreen('otp');
    } catch (error) {
      setApiError(error.message || 'We could not start registration. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRequestLoginOtp(value) {
    Keyboard.dismiss();
    setApiError('');
    setNotice('');
    const normalizedEmail = value.trim().toLowerCase();
    if (!emailPattern.test(normalizedEmail)) {
      setApiError('Enter a valid email address.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await requestLoginOtp(normalizedEmail);
      if (typeof result?.challengeId !== 'string' || typeof result.delivery !== 'string') {
        throw new Error('The API did not return a valid verification request. Please try again.');
      }

      setLoginEmail(normalizedEmail);
      setFlow('login');
      setNotice(result.message || 'If an account exists, a verification code has been sent to its email.');
      setChallenge({
        challengeId: result.challengeId,
        delivery: result.delivery,
        ...getChallengeDeadlines(result),
      });
      setScreen('otp');
    } catch (error) {
      setApiError(error.message || 'We could not request a sign-in code. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResendOtp() {
    if (!challenge) return false;
    setApiError('');
    setNotice('');
    setIsResending(true);

    try {
      const result = await resendOtp(challenge.challengeId);
      const deadlines = getChallengeDeadlines(result);
      setChallenge((current) => ({
        ...current,
        delivery: typeof result.delivery === 'string' ? result.delivery : current.delivery,
        ...deadlines,
      }));
      setNotice(`A new code was sent to ${result.delivery || challenge.delivery}.`);
      return true;
    } catch (error) {
      if (error instanceof AuthApiError && error.status === 410) {
        setChallenge((current) => ({ ...current, expiresAt: Date.now() }));
        setApiError(flow === 'login'
          ? 'This verification request expired. Go back and request a new sign-in code.'
          : 'This verification request expired. Start a new registration to receive another code.');
      } else {
        setApiError(error.message || 'We could not resend the code. Please try again.');
      }
      return false;
    } finally {
      setIsResending(false);
    }
  }

  async function handleVerifyOtp(code) {
    if (!challenge) return;
    setApiError('');
    setNotice('');
    setIsSubmitting(true);

    try {
      const result = flow === 'signup'
        ? await verifyRegistrationOtp(challenge.challengeId, code)
        : await verifyLoginOtp(challenge.challengeId, code);
      if (!result?.user?.email || typeof result.sessionToken !== 'string' || !result.sessionToken) {
        throw new Error('The API did not return a valid authenticated session. Please try again.');
      }

      try {
        await SecureStore.setItemAsync(sessionStorageKey, result.sessionToken);
      } catch (storageError) {
        try {
          await logout(result.sessionToken);
        } catch (logoutError) {
          throw new Error(
            `This device could not securely save the session, and the server could not invalidate it: ${logoutError.message}`,
          );
        }
        throw new Error('This device could not securely save the session. The server session was revoked; please sign in again.');
      }

      setAuthenticatedUser(result.user);
      setScreen('dashboard');
    } catch (error) {
      if (error instanceof AuthApiError && error.status === 400 && /expired/i.test(error.message)) {
        setChallenge((current) => ({ ...current, expiresAt: Date.now() }));
        setApiError(flow === 'login'
          ? 'This verification code expired. Go back and request a new sign-in code.'
          : 'This verification code expired. Start a new registration to receive another code.');
      } else {
        setApiError(error.message || 'We could not verify the code. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  function returnFromOtp() {
    setChallenge(null);
    setApiError('');
    setNotice('');
    setScreen(flow === 'login' ? 'login' : 'registration');
  }

  function showLogin() {
    setApiError('');
    setNotice('');
    setScreen('login');
  }

  function showRegistration() {
    setApiError('');
    setNotice('');
    setScreen('registration');
  }

  async function handleLogout() {
    setApiError('');
    setNotice('');
    setIsSubmitting(true);

    try {
      const sessionToken = await SecureStore.getItemAsync(sessionStorageKey);
      if (sessionToken) {
        try {
          await logout(sessionToken);
        } catch (error) {
          if (!(error instanceof AuthApiError && error.status === 401)) throw error;
        }
      }
      await SecureStore.deleteItemAsync(sessionStorageKey);
      setAuthenticatedUser(null);
      setChallenge(null);
      setScreen('login');
      setNotice('You have securely signed out.');
    } catch (error) {
      setApiError(error.message || 'We could not sign you out. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (isSubmitting || isResending) return true;
      if (screen === 'otp') {
        returnFromOtp();
        return true;
      }
      if (screen === 'login') {
        showRegistration();
        return true;
      }
      return false;
    });

    return () => subscription.remove();
  }, [flow, isResending, isSubmitting, screen]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar style="light" backgroundColor={colors.background} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View pointerEvents="none" style={styles.backgroundGlow} />
          <View style={styles.content}>
            <View style={styles.topBar}>
              <View style={styles.brand}>
                <View style={styles.brandMark}>
                  <Text style={styles.brandCheck}>✓</Text>
                </View>
                <Text style={styles.brandName}>SecureID</Text>
              </View>
              <View style={styles.privatePill}>
                <View style={styles.privateDot} />
                <Text style={styles.privateText}>PRIVATE BY DESIGN</Text>
              </View>
            </View>

            {screen === 'registration' ? (
              <>
                <View style={styles.hero}>
                  <Text style={styles.eyebrow}>PERSONAL IDENTITY, REIMAGINED</Text>
                  <Text style={styles.title}>
                    Your identity.{'\n'}
                    <Text style={styles.titleAccent}>Your security.</Text>
                  </Text>
                  <Text style={styles.subtitle}>Simple, secure access to your account.</Text>
                </View>

                <View style={styles.formCard}>
                  <View style={styles.formHeading}>
                    <Text style={styles.formTitle}>Create your account</Text>
                    <Text style={styles.formStep}>01 / 01</Text>
                  </View>
                  <Text style={styles.formHint}>A few details to get you started.</Text>

                  <View style={styles.fields}>
                    <FormTextInput
                      autoCapitalize="words"
                      autoComplete="family-name"
                      error={errors.surname}
                      hint="Enter your family name."
                      label="Surname"
                      maxLength={80}
                      onChangeText={updateField('surname', setSurname)}
                      placeholder="Your surname"
                      returnKeyType="next"
                      value={surname}
                    />
                    <FormTextInput
                      autoCapitalize="none"
                      autoComplete="email"
                      error={errors.email}
                      hint="Enter an email address you can access."
                      keyboardType="email-address"
                      label="Email address"
                      onChangeText={updateField('email', setEmail)}
                      placeholder="you@example.com"
                      returnKeyType="done"
                      value={email}
                    />
                    <DateOfBirthField
                      error={errors.dateOfBirth}
                      onChange={updateField('dateOfBirth', setDateOfBirth)}
                      value={dateOfBirth}
                    />
                  </View>

                  {apiError ? (
                    <Text accessibilityLiveRegion="polite" role="alert" style={styles.formError}>
                      {apiError}
                    </Text>
                  ) : null}

                  <PrimaryButton
                    disabled={isSubmitting}
                    label={isSubmitting ? 'Sending verification code…' : 'Create account'}
                    loading={isSubmitting}
                    onPress={handleCreateAccount}
                  />

                  <View style={styles.signInRow}>
                    <Text style={styles.signInPrompt}>Already have an account?</Text>
                    <Pressable
                      accessibilityRole="link"
                      onPress={showLogin}
                      style={({ pressed }) => [styles.signInLink, pressed ? styles.signInLinkPressed : null]}
                    >
                      <Text style={styles.signInLinkText}>Sign in</Text>
                    </Pressable>
                  </View>
                </View>
              </>
            ) : screen === 'login' ? (
              <SignInScreen
                email={loginEmail}
                error={apiError}
                loading={isSubmitting}
                notice={notice}
                onChangeEmail={(value) => {
                  setLoginEmail(value);
                  setApiError('');
                  setNotice('');
                }}
                onCreateAccount={showRegistration}
                onRequestOtp={handleRequestLoginOtp}
              />
            ) : screen === 'otp' && challenge ? (
              <OtpVerificationScreen
                challenge={challenge}
                error={apiError}
                loading={isSubmitting}
                notice={notice}
                onBack={returnFromOtp}
                onResend={handleResendOtp}
                onVerify={handleVerifyOtp}
                resending={isResending}
              />
            ) : screen === 'dashboard' && authenticatedUser ? (
              <DashboardScreen
                error={apiError}
                loading={isSubmitting}
                onLogout={handleLogout}
                user={authenticatedUser}
              />
            ) : (
              <View accessibilityLiveRegion="polite" style={styles.restoring}>
                <ActivityIndicator color={colors.blue} size="large" />
                <Text style={styles.restoringText}>Restoring your secure session…</Text>
              </View>
            )}

            <View style={styles.footer}>
              <View style={styles.footerRule} />
              <Text style={styles.footerCopy}>Your identity stays yours.</Text>
              <Text style={styles.footerMeta}>SECUREID  ·  PRIVATE ACCESS</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingTop: 16,
    paddingBottom: 26,
  },
  backgroundGlow: {
    position: 'absolute',
    top: -155,
    right: -90,
    width: 340,
    height: 340,
    borderRadius: 170,
    backgroundColor: '#10274A',
    opacity: 0.62,
  },
  content: {
    width: '100%',
    maxWidth: 440,
  },
  restoring: {
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  restoringText: {
    color: '#91A2BA',
    fontSize: 12,
  },
  topBar: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandMark: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    backgroundColor: '#2F67C5',
    shadowColor: '#3477E9',
    shadowOpacity: 0.26,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },
  brandCheck: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    marginTop: -1,
  },
  brandName: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  privatePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#20334D',
    borderRadius: 20,
    backgroundColor: '#0B1828',
  },
  privateDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#6CD2A4',
  },
  privateText: {
    color: '#9BACBF',
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  hero: {
    marginTop: 38,
    marginBottom: 26,
  },
  eyebrow: {
    marginBottom: 13,
    color: '#83A5DC',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.65,
  },
  title: {
    color: colors.text,
    fontSize: 36,
    fontWeight: '600',
    letterSpacing: -1.5,
    lineHeight: 42,
  },
  titleAccent: {
    color: colors.blue,
  },
  subtitle: {
    marginTop: 12,
    color: '#9AAAC0',
    fontSize: 13,
    lineHeight: 20,
  },
  formCard: {
    paddingHorizontal: 19,
    paddingTop: 20,
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
  formHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  formTitle: {
    color: '#E8EFFB',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.25,
  },
  formStep: {
    color: '#6E829F',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.9,
  },
  formHint: {
    marginTop: 5,
    marginBottom: 17,
    color: '#7F91A9',
    fontSize: 11,
  },
  fields: {
    gap: 14,
  },
  formError: {
    marginTop: 12,
    color: '#FF8A96',
    fontSize: 11,
    lineHeight: 16,
  },
  signInRow: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginTop: 13,
  },
  signInPrompt: {
    color: '#8E9DB3',
    fontSize: 11,
  },
  signInLink: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  signInLinkPressed: {
    opacity: 0.72,
  },
  signInLinkText: {
    color: '#8CB2FF',
    fontSize: 11,
    fontWeight: '700',
  },
  footer: {
    alignItems: 'center',
    paddingTop: 22,
  },
  footerRule: {
    width: 36,
    height: 2,
    marginBottom: 13,
    borderRadius: 1,
    backgroundColor: '#294A78',
  },
  footerCopy: {
    color: '#8293AA',
    fontSize: 10,
  },
  footerMeta: {
    marginTop: 9,
    color: '#52657F',
    fontSize: 8,
    fontWeight: '600',
    letterSpacing: 1.1,
  },
});
