// Login.tsx
import { useEffect, useRef, useState } from 'react';
import { 
  Card, Text, Stack, Button, TextInput, PasswordInput, 
  Divider, Title, Center, Modal, Group, Loader, Paper,
  Alert, ThemeIcon, Progress, Tooltip, Badge, Transition,
  Box, Container, Image, Anchor
} from '@mantine/core';
import { 
  IconLogin, IconUserPlus, IconFingerprint, IconShieldLock,
  IconBrandTelegram, IconMailForward, IconLock, IconAlertCircle,
  IconCheck, IconArrowRight, IconKey, IconBrandGoogle,
  IconShieldCheck, IconDeviceMobile, IconMoodSmile
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useTranslation } from 'react-i18next';
import { auth, passkeyApi, userApi } from '../api/client';
import { setCookie, getResetTokenCookie, removeResetTokenCookie, parseAndSaveResetToken } from '../api/cookie';
import { useStore } from '../store/useStore';
import TelegramLoginButton, { TelegramUser } from '../components/TelegramLoginButton';
import { config } from '../config';
import { useTelegramWebApp } from '../hooks/useTelegramWebApp';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { hasTelegramWebAppAutoAuth, hasTelegramWidget, hasTelegramWebAppAuth } from '../constants/webapp';
import classes from './Login.module.css';

function base64UrlToArrayBuffer(base64url: string): ArrayBuffer {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(base64 + padding);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function arrayBufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export default function Login() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [formData, setFormData] = useState({ login: '', password: '', confirmPassword: '', login_or_email: '' });
  const [showOtp, setShowOtp] = useState(false);
  const [otpToken, setOtpToken] = useState('');
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [showNewPasswordForm, setShowNewPasswordForm] = useState(false);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [newPasswordData, setNewPasswordData] = useState({ password: '', confirmPassword: '' });
  const [verifyingToken, setVerifyingToken] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const { setUser, setTelegramPhoto } = useStore();
  const { t } = useTranslation();
  const isWebAuthnSupported = !!window.PublicKeyCredential;
  const { telegramWebApp } = useTelegramWebApp();
  const autoAuthTriggeredRef = useRef(false);
  const autoAuthAttemptKey = 'tg_webapp_auto_auth_attempted';
  const autoAuthCooldownMs = 60 * 1000;
  const loginInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  // Проверка сложности пароля
  useEffect(() => {
    if (mode === 'register' && formData.password) {
      let strength = 0;
      if (formData.password.length >= 8) strength += 25;
      if (formData.password.match(/[a-z]/)) strength += 25;
      if (formData.password.match(/[A-Z]/)) strength += 25;
      if (formData.password.match(/[0-9]/)) strength += 15;
      if (formData.password.match(/[^a-zA-Z0-9]/)) strength += 10;
      setPasswordStrength(Math.min(100, strength));
    } else {
      setPasswordStrength(0);
    }
  }, [formData.password, mode]);

  // Автофокус на поле логина
  useEffect(() => {
    if (!showLoginForm && !hasTelegramWebAppAuth) {
      setTimeout(() => loginInputRef.current?.focus(), 100);
    }
  }, [showLoginForm]);

  useEffect(() => {
    if (!hasTelegramWebAppAutoAuth || autoAuthTriggeredRef.current || !telegramWebApp?.initData) {
      return;
    }

    const lastAttempt = Number(sessionStorage.getItem(autoAuthAttemptKey) || 0);
    if (lastAttempt && Date.now() - lastAttempt < autoAuthCooldownMs) {
      return;
    }

    autoAuthTriggeredRef.current = true;
    sessionStorage.setItem(autoAuthAttemptKey, String(Date.now()));
    setShowLoginForm(false);
    void handleTelegramWebAppAuth();
  }, [hasTelegramWebAppAutoAuth, telegramWebApp?.initData]);

  useEffect(() => {
    const checkResetToken = async () => {
      const urlToken = parseAndSaveResetToken();
      const token = urlToken || getResetTokenCookie();

      if (!token) return;

      setVerifyingToken(true);
      setResetToken(token);

      try {
        const response = await userApi.verifyResetToken(token);
        const msg = response.data?.data?.[0]?.msg || response.data?.data?.msg;

        if (msg === 'Successful') {
          setShowNewPasswordForm(true);
        } else {
          notifications.show({ 
            title: t('common.error'), 
            message: t('auth.invalidResetToken'), 
            color: 'red',
            icon: <IconAlertCircle size={16} />,
          });
          removeResetTokenCookie();
          setResetToken(null);
        }
      } catch {
        notifications.show({ 
          title: t('common.error'), 
          message: t('auth.invalidResetToken'), 
          color: 'red',
          icon: <IconAlertCircle size={16} />,
        });
        removeResetTokenCookie();
        setResetToken(null);
      } finally {
        setVerifyingToken(false);
      }
    };

    checkResetToken();
  }, []);

  const handleNewPasswordSubmit = async () => {
    if (!newPasswordData.password || !newPasswordData.confirmPassword) {
      notifications.show({ 
        title: t('common.error'), 
        message: t('auth.fillAllFields'), 
        color: 'red',
        icon: <IconAlertCircle size={16} />,
      });
      return;
    }

    if (newPasswordData.password !== newPasswordData.confirmPassword) {
      notifications.show({ 
        title: t('common.error'), 
        message: t('auth.passwordsMismatch'), 
        color: 'red',
        icon: <IconAlertCircle size={16} />,
      });
      return;
    }

    if (newPasswordData.password.length < 6) {
      notifications.show({ 
        title: t('common.error'), 
        message: t('auth.passwordTooShort'), 
        color: 'red',
        icon: <IconAlertCircle size={16} />,
      });
      return;
    }

    if (!resetToken) {
      notifications.show({ 
        title: t('common.error'), 
        message: t('auth.invalidResetToken'), 
        color: 'red',
        icon: <IconAlertCircle size={16} />,
      });
      return;
    }

    setResetLoading(true);
    try {
      const response = await userApi.resetPasswordWithToken(resetToken, newPasswordData.password);
      const msg = response.data?.data?.[0]?.msg || response.data?.data?.msg;

      if (msg === 'Password reset successful') {
        notifications.show({ 
          title: t('common.success'), 
          message: t('auth.passwordResetSuccess'), 
          color: 'green',
          icon: <IconCheck size={16} />,
        });
        setShowNewPasswordForm(false);
      } else {
        notifications.show({ 
          title: t('common.error'), 
          message: t('auth.invalidResetToken'), 
          color: 'red',
          icon: <IconAlertCircle size={16} />,
        });
      }
    } catch {
      notifications.show({ 
        title: t('common.error'), 
        message: t('auth.invalidResetToken'), 
        color: 'red',
        icon: <IconAlertCircle size={16} />,
      });
    } finally {
      removeResetTokenCookie();
      setResetToken(null);
      setNewPasswordData({ password: '', confirmPassword: '' });
      setResetLoading(false);
    }
  };

  const handleLogin = async (otpTokenParam?: string) => {
    if (!formData.login || !formData.password) {
      notifications.show({ 
        title: t('common.error'), 
        message: t('auth.fillAllFields'), 
        color: 'red',
        icon: <IconAlertCircle size={16} />,
      });
      return;
    }

    setLoading(true);
    try {
      const result = await auth.login(formData.login, formData.password, otpTokenParam);

      if (result.otpRequired) {
        setShowOtp(true);
        setLoading(false);
        return;
      }

      const userResponse = await auth.getCurrentUser();
      const responseData = userResponse.data.data;
      const userData = Array.isArray(responseData) ? responseData[0] : responseData;
      setUser(userData);
      setShowOtp(false);
      setOtpToken('');
      
      notifications.show({ 
        title: t('common.welcome'), 
        message: t('auth.loginSuccess', { name: userData.login || userData.full_name || '' }), 
        color: 'green',
        icon: <IconMoodSmile size={16} />,
        autoClose: 5000,
      });
    } catch (error: unknown) {
      const axiosError = error as { response?: { status?: number; data?: { error?: string } } };
      if (axiosError.response?.status === 403 && axiosError.response?.data?.error?.includes('Password authentication is disabled')) {
        notifications.show({ 
          title: t('common.error'), 
          message: t('auth.passwordAuthDisabled'), 
          color: 'red',
          icon: <IconAlertCircle size={16} />,
        });
      } else {
        notifications.show({ 
          title: t('common.error'), 
          message: t('auth.loginError'), 
          color: 'red',
          icon: <IconAlertCircle size={16} />,
        });
      }
      setOtpToken('');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async () => {
    if (!otpToken || otpToken.length < 6) {
      notifications.show({ 
        title: t('common.error'), 
        message: t('otp.enterValidCode'), 
        color: 'red',
        icon: <IconAlertCircle size={16} />,
      });
      return;
    }
    await handleLogin(otpToken);
  };

  const handleRegister = async () => {
    if (!formData.login || !formData.password) {
      notifications.show({ 
        title: t('common.error'), 
        message: t('auth.fillAllFields'), 
        color: 'red',
        icon: <IconAlertCircle size={16} />,
      });
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      notifications.show({ 
        title: t('common.error'), 
        message: t('auth.passwordsMismatch'), 
        color: 'red',
        icon: <IconAlertCircle size={16} />,
      });
      return;
    }
    if (formData.password.length < 6) {
      notifications.show({ 
        title: t('common.error'), 
        message: t('auth.passwordTooShort'), 
        color: 'red',
        icon: <IconAlertCircle size={16} />,
      });
      return;
    }

    setLoading(true);
    try {
      await auth.register(formData.login, formData.password);
      notifications.show({ 
        title: t('common.success'), 
        message: t('auth.registerSuccess'), 
        color: 'green',
        icon: <IconCheck size={16} />,
      });
      setMode('login');
      setFormData({ ...formData, password: '', confirmPassword: '' });
      
      // Автофокус на поле логина после регистрации
      setTimeout(() => loginInputRef.current?.focus(), 100);
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || error.response?.data?.msg || t('auth.registerError');
      notifications.show({ 
        title: t('common.error'), 
        message: errorMsg, 
        color: 'red',
        icon: <IconAlertCircle size={16} />,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'login') {
      await handleLogin();
    } else {
      await handleRegister();
    }
  };

  const handleTelegramWidgetAuth = async (telegramUser: TelegramUser) => {
    setLoading(true);
    try {
      await auth.telegramWidgetAuth(telegramUser);
      const userResponse = await auth.getCurrentUser();
      const responseData = userResponse.data.data;
      const userData = Array.isArray(responseData) ? responseData[0] : responseData;
      setUser(userData);

      if (telegramUser.photo_url) {
        setTelegramPhoto(telegramUser.photo_url);
      }

      notifications.show({ 
        title: t('common.success'), 
        message: t('auth.telegramAuth'), 
        color: 'green',
        icon: <IconBrandTelegram size={16} />,
      });
    } catch {
      notifications.show({ 
        title: t('common.error'), 
        message: t('auth.telegramAuthError'), 
        color: 'red',
        icon: <IconAlertCircle size={16} />,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTelegramWebAppAuth = async () => {
    if (!telegramWebApp?.initData) {
      notifications.show({ 
        title: t('common.error'), 
        message: t('auth.telegramAuthError'), 
        color: 'red',
        icon: <IconAlertCircle size={16} />,
      });
      setShowLoginForm(true);
      return;
    }

    setLoading(true);
    try {
      const profile = config.TELEGRAM_WEBAPP_PROFILE || '';
      const authResponse = await auth.telegramWebAppAuth(telegramWebApp.initData, profile);
      const sessionId = authResponse.data?.session_id || authResponse.data?.id;
      if (!sessionId) {
        notifications.show({ 
          title: t('common.error'), 
          message: t('auth.telegramAuthError'), 
          color: 'red',
          icon: <IconAlertCircle size={16} />,
        });
        setShowLoginForm(true);
        return;
      }

      const userResponse = await auth.getCurrentUser();
      const responseData = userResponse.data.data;
      const userData = Array.isArray(responseData) ? responseData[0] : responseData;
      setUser(userData);

      if (telegramWebApp.initDataUnsafe?.user?.photo_url) {
        setTelegramPhoto(telegramWebApp.initDataUnsafe.user.photo_url);
      }

      notifications.show({ 
        title: t('common.success'), 
        message: t('auth.telegramAuth'), 
        color: 'green',
        icon: <IconBrandTelegram size={16} />,
      });
    } catch {
      notifications.show({ 
        title: t('common.error'), 
        message: t('auth.telegramAuthError'), 
        color: 'red',
        icon: <IconAlertCircle size={16} />,
      });
      setShowLoginForm(true);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!formData.login_or_email) {
      notifications.show({ 
        title: t('common.error'), 
        message: t('auth.resetEnterLogin'), 
        color: 'red',
        icon: <IconAlertCircle size={16} />,
      });
      return;
    }

    setResetLoading(true);
    try {
      const loginResponse = await userApi.resetPassword({ login: formData.login_or_email });
      const loginMsg = loginResponse.data?.data?.[0]?.msg || loginResponse.data?.data?.msg;
      if (loginMsg === 'Successful') {
        notifications.show({ 
          title: t('common.success'), 
          message: t('auth.resetSuccess'), 
          color: 'green',
          icon: <IconMailForward size={16} />,
        });
        setShowResetPassword(false);
        setResetLoading(false);
        return;
      }

      const emailResponse = await userApi.resetPassword({ email: formData.login_or_email });
      const emailMsg = emailResponse.data?.data?.[0]?.msg || emailResponse.data?.data?.msg;
      if (emailMsg === 'Successful') {
        notifications.show({ 
          title: t('common.success'), 
          message: t('auth.resetSuccess'), 
          color: 'green',
          icon: <IconMailForward size={16} />,
        });
        setShowResetPassword(false);
        setResetLoading(false);
        return;
      }

      notifications.show({ 
        title: t('common.error'), 
        message: t('auth.resetNotFound'), 
        color: 'red',
        icon: <IconAlertCircle size={16} />,
      });
    } catch {
      notifications.show({ 
        title: t('common.error'), 
        message: t('auth.resetNotFound'), 
        color: 'red',
        icon: <IconAlertCircle size={16} />,
      });
    }
    setResetLoading(false);
  };

  const handlePasskeyAuth = async () => {
    if (!isWebAuthnSupported) {
      notifications.show({ 
        title: t('common.error'), 
        message: t('passkey.notSupported'), 
        color: 'red',
        icon: <IconAlertCircle size={16} />,
      });
      return;
    }

    setPasskeyLoading(true);
    try {
      const optionsResponse = await passkeyApi.authOptionsPublic();
      const optionsData = optionsResponse.data.data;
      const options = Array.isArray(optionsData) ? optionsData[0] : optionsData;
      const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
        challenge: base64UrlToArrayBuffer(options.challenge),
        timeout: options.timeout,
        rpId: options.rpId,
        userVerification: options.userVerification as UserVerificationRequirement,
      };
      const credential = await navigator.credentials.get({
        publicKey: publicKeyCredentialRequestOptions,
      }) as PublicKeyCredential;

      if (!credential) {
        throw new Error('Failed to get credential');
      }

      const response = credential.response as AuthenticatorAssertionResponse;
      const authResponse = await passkeyApi.authPublic({
        credential_id: arrayBufferToBase64Url(credential.rawId),
        rawId: arrayBufferToBase64Url(credential.rawId),
        response: {
          clientDataJSON: arrayBufferToBase64Url(response.clientDataJSON),
          authenticatorData: arrayBufferToBase64Url(response.authenticatorData),
          signature: arrayBufferToBase64Url(response.signature),
          userHandle: response.userHandle ? arrayBufferToBase64Url(response.userHandle) : undefined,
        },
      });
      const authData = authResponse.data.data;
      const sessionData = Array.isArray(authData) ? authData[0] : authData;
      if (sessionData?.id) {
        setCookie(sessionData.id);
      }

      const userResponse = await auth.getCurrentUser();
      const responseData = userResponse.data.data;
      const userData = Array.isArray(responseData) ? responseData[0] : responseData;
      setUser(userData);

      notifications.show({ 
        title: t('common.success'), 
        message: t('auth.loginSuccess'), 
        color: 'green',
        icon: <IconFingerprint size={16} />,
      });
    } catch (error: any) {
      if (error.name === 'NotAllowedError') {
        notifications.show({ 
          title: t('common.info'), 
          message: t('passkey.cancelled'), 
          color: 'blue',
        });
      } else {
        notifications.show({ 
          title: t('common.error'), 
          message: t('passkey.authError'), 
          color: 'red',
          icon: <IconAlertCircle size={16} />,
        });
      }
    } finally {
      setPasskeyLoading(false);
    }
  };

  const getPasswordStrengthColor = () => {
    if (passwordStrength < 40) return 'red';
    if (passwordStrength < 70) return 'yellow';
    return 'green';
  };

  const getPasswordStrengthText = () => {
    if (passwordStrength < 40) return t('auth.passwordWeak');
    if (passwordStrength < 70) return t('auth.passwordMedium');
    return t('auth.passwordStrong');
  };

  return (
    <Box className={classes.wrapper}>
      <Container size={420} py={40}>
        <Transition mounted={true} transition="fade" duration={400}>
          {(styles) => (
            <Card 
              withBorder 
              radius="lg" 
              p="xl" 
              className={classes.card}
              style={styles}
              shadow="md"
            >
              <Stack gap="lg">
                <Group justify="space-between" align="center" wrap="nowrap">
                  <ThemeIcon size={40} radius="md" variant="gradient" gradient={{ from: 'blue', to: 'cyan' }}>
                    <IconShieldLock size={24} />
                  </ThemeIcon>
                  <Title order={2} ta="center" className={classes.title}>
                    {config.APP_NAME}
                  </Title>
                  <LanguageSwitcher />
                </Group>

                <Box ta="center">
                  <Text size="lg" fw={500}>
                    {mode === 'login' ? t('auth.welcomeBack') : t('auth.createAccount')}
                  </Text>
                  <Text size="sm" c="dimmed" mt={4}>
                    {mode === 'login' ? t('auth.loginSubtitle') : t('auth.registerSubtitle')}
                  </Text>
                </Box>

                {hasTelegramWebAppAuth && !showLoginForm && (
                  <>
                    <Button
                      size="lg"
                      variant="gradient"
                      gradient={{ from: '#24A1DE', to: '#1E7FB3' }}
                      leftSection={<IconBrandTelegram size={20} />}
                      onClick={handleTelegramWebAppAuth}
                      fullWidth
                      loading={loading}
                      radius="md"
                      className={classes.telegramButton}
                    >
                      {t('auth.loginWithTelegram')}
                    </Button>

                    <Divider 
                      label={t('common.or')} 
                      labelPosition="center" 
                      className={classes.divider}
                    />

                    <Button
                      variant="subtle"
                      onClick={() => setShowLoginForm(true)}
                      fullWidth
                      size="md"
                      rightSection={<IconArrowRight size={16} />}
                    >
                      {t('auth.useLoginPassword')}
                    </Button>
                  </>
                )}

                {hasTelegramWidget && (
                  <>
                    <Center>
                      <TelegramLoginButton
                        botName={config.TELEGRAM_BOT_NAME}
                        onAuth={handleTelegramWidgetAuth}
                        buttonSize="large"
                        requestAccess="write"
                      />
                    </Center>

                    <Divider 
                      label={t('common.or')} 
                      labelPosition="center" 
                      className={classes.divider}
                    />
                  </>
                )}

                {(!hasTelegramWebAppAuth || showLoginForm) && (
                  <>
                    <form onSubmit={handleSubmit}>
                      <Stack gap="md">
                        <TextInput
                          ref={loginInputRef}
                          label={t('auth.loginLabel')}
                          placeholder={t('auth.loginPlaceholder')}
                          value={formData.login}
                          onChange={(e) => setFormData({ ...formData, login: e.target.value })}
                          autoComplete="username"
                          name="username"
                          size="md"
                          leftSection={<IconKey size={16} />}
                          required
                          classNames={{ input: classes.input }}
                        />
                        
                        <PasswordInput
                          ref={passwordInputRef}
                          label={t('auth.passwordLabel')}
                          placeholder={t('auth.passwordPlaceholder')}
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                          name="password"
                          size="md"
                          leftSection={<IconLock size={16} />}
                          required
                          classNames={{ input: classes.input }}
                        />

                        {mode === 'register' && (
                          <>
                            <PasswordInput
                              label={t('auth.confirmPasswordLabel')}
                              placeholder={t('auth.confirmPasswordPlaceholder')}
                              value={formData.confirmPassword}
                              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                              autoComplete="new-password"
                              name="confirm-password"
                              size="md"
                              leftSection={<IconLock size={16} />}
                              required
                              classNames={{ input: classes.input }}
                            />

                            {formData.password && (
                              <Box>
                                <Group justify="space-between" mb={4}>
                                  <Text size="xs" fw={500}>
                                    {t('auth.passwordStrength')}: {getPasswordStrengthText()}
                                  </Text>
                                  <Text size="xs" c="dimmed">{passwordStrength}%</Text>
                                </Group>
                                <Progress 
                                  value={passwordStrength} 
                                  color={getPasswordStrengthColor()} 
                                  size="sm"
                                  radius="xl"
                                  animated
                                />
                              </Box>
                            )}

                            {formData.password && formData.password.length < 6 && (
                              <Alert 
                                variant="light" 
                                color="yellow" 
                                title={t('auth.passwordTooShort')}
                                icon={<IconAlertCircle size={16} />}
                                py={8}
                              >
                                <Text size="xs">{t('auth.passwordRequirements')}</Text>
                              </Alert>
                            )}
                          </>
                        )}

                        <Button
                          type="submit"
                          size="lg"
                          variant="gradient"
                          gradient={mode === 'login' 
                            ? { from: 'blue', to: 'cyan' } 
                            : { from: 'green', to: 'teal' }
                          }
                          leftSection={mode === 'login' ? <IconLogin size={18} /> : <IconUserPlus size={18} />}
                          loading={loading}
                          fullWidth
                          radius="md"
                          className={classes.submitButton}
                        >
                          {mode === 'login' ? t('auth.login') : t('auth.register')}
                        </Button>

                        {mode === 'login' && isWebAuthnSupported && (
                          <Button
                            variant="light"
                            leftSection={<IconFingerprint size={18} />}
                            loading={passkeyLoading}
                            onClick={handlePasskeyAuth}
                            fullWidth
                            size="md"
                            radius="md"
                          >
                            {t('passkey.loginWithPasskey')}
                          </Button>
                        )}
                      </Stack>
                    </form>

                    <Box ta="center" className={classes.switchMode}>
                      {mode === 'login' ? (
                        <Text size="sm">
                          {t('auth.noAccount')}{' '}
                          <Anchor 
                            component="button" 
                            type="button" 
                            c="blue" 
                            fw={500}
                            onClick={() => setMode('register')}
                          >
                            {t('auth.register')}
                          </Anchor>
                        </Text>
                      ) : (
                        <Text size="sm">
                          {t('auth.hasAccount')}{' '}
                          <Anchor 
                            component="button" 
                            type="button" 
                            c="blue" 
                            fw={500}
                            onClick={() => setMode('login')}
                          >
                            {t('auth.login')}
                          </Anchor>
                        </Text>
                      )}
                    </Box>

                    {mode === 'login' && (
                      <Box ta="center">
                        <Anchor 
                          component="button" 
                          type="button" 
                          c="dimmed" 
                          size="sm"
                          onClick={() => setShowResetPassword(true)}
                        >
                          {t('auth.forgotPassword')}
                        </Anchor>
                      </Box>
                    )}

                    {hasTelegramWebAppAuth && showLoginForm && (
                      <>
                        <Divider 
                          label={t('common.or')} 
                          labelPosition="center" 
                          className={classes.divider}
                        />
                        <Button
                          variant="outline"
                          color="blue"
                          leftSection={<IconBrandTelegram size={18} />}
                          onClick={handleTelegramWebAppAuth}
                          fullWidth
                          loading={loading}
                          size="md"
                          radius="md"
                        >
                          {t('auth.loginWithTelegram')}
                        </Button>
                      </>
                    )}
                  </>
                )}
              </Stack>
            </Card>
          )}
        </Transition>
      </Container>

      <Modal
        opened={showOtp}
        onClose={() => {
          setShowOtp(false);
          setOtpToken('');
        }}
        title={
          <Group gap="xs">
            <ThemeIcon color="blue" variant="light" size="lg" radius="xl">
              <IconShieldLock size={20} />
            </ThemeIcon>
            <Text fw={500} size="lg">{t('otp.verifyTitle')}</Text>
          </Group>
        }
        centered
        radius="lg"
        padding="lg"
      >
        <Stack gap="md">
          <Alert variant="light" color="blue" icon={<IconDeviceMobile size={16} />}>
            <Text size="sm">{t('otp.verifyDescription')}</Text>
          </Alert>
          
          <TextInput
            label={t('otp.enterCode')}
            placeholder="000000"
            value={otpToken}
            onChange={(e) => setOtpToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
            maxLength={6}
            autoFocus
            size="lg"
            styles={{ input: { textAlign: 'center', fontSize: '24px', letterSpacing: '8px' } }}
          />
          
          <Group justify="flex-end" gap="sm" mt="md">
            <Button variant="light" onClick={() => {
              setShowOtp(false);
              setOtpToken('');
            }}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleOtpSubmit}
              loading={loading}
              disabled={!otpToken || otpToken.length < 6}
              color="blue"
            >
              {t('otp.verify')}
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={showResetPassword}
        onClose={() => {
          setShowResetPassword(false);
          setResetLoading(false);
        }}
        title={
          <Group gap="xs">
            <ThemeIcon color="orange" variant="light" size="lg" radius="xl">
              <IconMailForward size={20} />
            </ThemeIcon>
            <Text fw={500} size="lg">{t('auth.resetPasswordTitle')}</Text>
          </Group>
        }
        centered
        radius="lg"
        padding="lg"
      >
        <Stack gap="md">
          <Alert variant="light" color="orange">
            <Text size="sm">{t('auth.resetPasswordDescription')}</Text>
          </Alert>
          
          <TextInput
            label={t('auth.loginOrEmail')}
            placeholder={t('auth.loginOrEmailPlaceholder')}
            value={formData.login_or_email}
            onChange={(e) => setFormData({ ...formData, login_or_email: e.target.value })}
            autoFocus
            size="md"
            leftSection={<IconKey size={16} />}
          />
          
          <Group justify="flex-end" gap="sm" mt="md">
            <Button variant="light" onClick={() => {
              setShowResetPassword(false);
              setResetLoading(false);
            }}>
              {t('common.cancel')}
            </Button>
            <Button
              leftSection={<IconMailForward size={16} />}
              onClick={handleResetPassword}
              loading={resetLoading}
              disabled={!formData.login_or_email}
              color="orange"
            >
              {t('auth.resetPasswordSend')}
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={showNewPasswordForm}
        onClose={() => {
          setShowNewPasswordForm(false);
          removeResetTokenCookie();
          setResetToken(null);
          setNewPasswordData({ password: '', confirmPassword: '' });
        }}
        title={
          <Group gap="xs">
            <ThemeIcon color="green" variant="light" size="lg" radius="xl">
              <IconLock size={20} />
            </ThemeIcon>
            <Text fw={500} size="lg">{t('auth.newPasswordTitle')}</Text>
          </Group>
        }
        centered
        radius="lg"
        padding="lg"
      >
        <Stack gap="md">
          <Alert variant="light" color="green">
            <Text size="sm">{t('auth.newPasswordDescription')}</Text>
          </Alert>
          
          <PasswordInput
            label={t('auth.newPasswordLabel')}
            placeholder={t('auth.passwordPlaceholder')}
            value={newPasswordData.password}
            onChange={(e) => setNewPasswordData({ ...newPasswordData, password: e.target.value })}
            autoFocus
            size="md"
            leftSection={<IconLock size={16} />}
          />
          
          <PasswordInput
            label={t('auth.confirmNewPasswordLabel')}
            placeholder={t('auth.confirmPasswordPlaceholder')}
            value={newPasswordData.confirmPassword}
            onChange={(e) => setNewPasswordData({ ...newPasswordData, confirmPassword: e.target.value })}
            size="md"
            leftSection={<IconLock size={16} />}
          />

          {newPasswordData.password && (
            <Box>
              <Group justify="space-between" mb={4}>
                <Text size="xs" fw={500}>{t('auth.passwordStrength')}:</Text>
                <Text size="xs" c="dimmed">
                  {newPasswordData.password.length < 6 
                    ? t('auth.passwordTooShort') 
                    : newPasswordData.password === newPasswordData.confirmPassword 
                      ? t('auth.passwordsMatch') 
                      : t('auth.passwordsMismatch')}
                </Text>
              </Group>
              <Progress 
                value={newPasswordData.password.length < 6 ? 30 : 100} 
                color={newPasswordData.password.length < 6 ? 'red' : 'green'} 
                size="sm"
                radius="xl"
              />
            </Box>
          )}
          
          <Group justify="flex-end" gap="sm" mt="md">
            <Button variant="light" onClick={() => {
              setShowNewPasswordForm(false);
              removeResetTokenCookie();
              setResetToken(null);
              setNewPasswordData({ password: '', confirmPassword: '' });
            }}>
              {t('common.cancel')}
            </Button>
            <Button
              leftSection={<IconLock size={16} />}
              onClick={handleNewPasswordSubmit}
              loading={resetLoading}
              disabled={!newPasswordData.password || !newPasswordData.confirmPassword || newPasswordData.password !== newPasswordData.confirmPassword || newPasswordData.password.length < 6}
              color="green"
            >
              {t('auth.resetPasswordButton')}
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={verifyingToken}
        onClose={() => {}}
        withCloseButton={false}
        centered
        radius="lg"
        padding="xl"
      >
        <Stack align="center" gap="lg">
          <Loader size="lg" color="blue" />
          <Text size="lg" fw={500}>{t('auth.verifyingToken')}</Text>
          <Text size="sm" c="dimmed" ta="center">
            {t('auth.verifyingTokenDescription')}
          </Text>
        </Stack>
      </Modal>
    </Box>
  );
}
