import { useState, useEffect } from 'react';
import { Card, Text, Stack, Button, TextInput, PasswordInput, Divider, Title, Center } from '@mantine/core';
import { IconBrandTelegram, IconLogin, IconUserPlus } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { auth } from '../api/client';
import { useStore } from '../store/useStore';
import TelegramLoginButton, { TelegramUser } from '../components/TelegramLoginButton';
import { config } from '../config';

// Telegram Web App integration
declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData: string;
        initDataUnsafe: {
          user?: {
            id: number;
            first_name: string;
            last_name?: string;
            username?: string;
            photo_url?: string;
          };
        };
        ready: () => void;
        expand: () => void;
        close: () => void;
        setHeaderColor: (color: string) => void;
        setBackgroundColor: (color: string) => void;
        BackButton: {
          show: () => void;
          hide: () => void;
          onClick: (callback: () => void) => void;
          offClick: (callback: () => void) => void;
        };
      };
    };
  }
}

export default function Login() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ login: '', password: '', confirmPassword: '' });
  const { setUser, setTelegramPhoto } = useStore();

  const isInsideTelegramWebApp = !!window.Telegram?.WebApp?.initData;
  const hasTelegramWebApp = isInsideTelegramWebApp && config.TELEGRAM_WEBAPP_AUTH_ENABLE === 'true';
  const hasTelegramWidget = !isInsideTelegramWebApp && !!config.TELEGRAM_BOT_NAME && config.TELEGRAM_BOT_AUTH_ENABLE === 'true';

  useEffect(() => {
    if (hasTelegramWebApp) {
      window.Telegram?.WebApp?.ready();
      handleTelegramWebAppAuth();
    }
  }, [hasTelegramWebApp]);

  const handleLogin = async () => {
    if (!formData.login || !formData.password) {
      notifications.show({ title: 'Ошибка', message: 'Заполните все поля', color: 'red' });
      return;
    }

    setLoading(true);
    try {
      await auth.login(formData.login, formData.password);
      const userResponse = await auth.getCurrentUser();
      const responseData = userResponse.data.data;
      const userData = Array.isArray(responseData) ? responseData[0] : responseData;
      setUser(userData);
      notifications.show({ title: 'Успешно', message: 'Вы вошли в систему', color: 'green' });
    } catch {
      notifications.show({ title: 'Ошибка', message: 'Неверный логин или пароль', color: 'red' });
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!formData.login || !formData.password) {
      notifications.show({ title: 'Ошибка', message: 'Заполните все поля', color: 'red' });
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      notifications.show({ title: 'Ошибка', message: 'Пароли не совпадают', color: 'red' });
      return;
    }

    setLoading(true);
    try {
      await auth.register(formData.login, formData.password);
      notifications.show({ title: 'Успешно', message: 'Регистрация прошла успешно. Теперь войдите.', color: 'green' });
      // Переключаемся на авторизацию, сохраняя логин
      setMode('login');
      setFormData({ ...formData, confirmPassword: '' });
    } catch {
      notifications.show({ title: 'Ошибка', message: 'Не удалось зарегистрироваться', color: 'red' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'login') {
      handleLogin();
    } else {
      handleRegister();
    }
  };

  // Авторизация через Telegram WebApp (initData)
  const handleTelegramWebAppAuth = async () => {
    const tgWebApp = window.Telegram?.WebApp;

    if (tgWebApp && tgWebApp.initData) {
      setLoading(true);
      try {
        await auth.telegramAuth(tgWebApp.initData, config.TELEGRAM_PROFILE);
        const userResponse = await auth.getCurrentUser();
        const responseData = userResponse.data.data;
        const userData = Array.isArray(responseData) ? responseData[0] : responseData;
        setUser(userData);

        // Сохраняем фото из Telegram WebApp
        const photoUrl = tgWebApp.initDataUnsafe?.user?.photo_url;
        if (photoUrl) {
          setTelegramPhoto(photoUrl);
        }

        notifications.show({ title: 'Успешно', message: 'Авторизация через Telegram', color: 'green' });
      } catch {
        notifications.show({ title: 'Ошибка', message: 'Не удалось авторизоваться через Telegram', color: 'red' });
      } finally {
        setLoading(false);
      }
    }
  };

  // Авторизация через Telegram Login Widget
  const handleTelegramWidgetAuth = async (telegramUser: TelegramUser) => {
    setLoading(true);
    try {
      // Отправляем данные виджета на бэкенд
      await auth.telegramWidgetAuth(telegramUser);
      const userResponse = await auth.getCurrentUser();
      const responseData = userResponse.data.data;
      const userData = Array.isArray(responseData) ? responseData[0] : responseData;
      setUser(userData);

      // Сохраняем фото из данных Telegram виджета
      if (telegramUser.photo_url) {
        setTelegramPhoto(telegramUser.photo_url);
      }

      notifications.show({ title: 'Успешно', message: 'Авторизация через Telegram', color: 'green' });
    } catch {
      notifications.show({ title: 'Ошибка', message: 'Не удалось авторизоваться через Telegram', color: 'red' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Center h="80vh">
      <Card withBorder radius="md" p="xl" w={400}>
        <Stack gap="lg">
          <div>
            <Title order={2} ta="center">{config.APP_NAME}</Title>
            <Text size="sm" c="dimmed" ta="center">
              {mode === 'login' ? 'Войдите в личный кабинет' : 'Создайте аккаунт'}
            </Text>
          </div>

          {hasTelegramWebApp && (
            <>
              <Button
                leftSection={<IconBrandTelegram size={20} />}
                variant="filled"
                color="blue"
                size="md"
                onClick={handleTelegramWebAppAuth}
                loading={loading}
              >
                Войти через Telegram
              </Button>

              <Divider label="или" labelPosition="center" />
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

              <Divider label="или" labelPosition="center" />
            </>
          )}

          <form onSubmit={handleSubmit}>
            <Stack gap="sm">
              <TextInput
                label="Логин"
                placeholder="Введите логин"
                value={formData.login}
                onChange={(e) => setFormData({ ...formData, login: e.target.value })}
                autoComplete="username"
                name="username"
              />
              <PasswordInput
                label="Пароль"
                placeholder="Введите пароль"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                name="password"
              />
              {mode === 'register' && (
                <PasswordInput
                  label="Подтвердите пароль"
                  placeholder="Повторите пароль"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  autoComplete="new-password"
                  name="confirm-password"
                />
              )}
              <Button
                type="submit"
                leftSection={mode === 'login' ? <IconLogin size={18} /> : <IconUserPlus size={18} />}
                loading={loading}
              >
                {mode === 'login' ? 'Войти' : 'Зарегистрироваться'}
              </Button>
            </Stack>
          </form>

          <Text size="sm" ta="center">
            {mode === 'login' ? (
              <>
                Нет аккаунта?{' '}
                <Text component="span" c="blue" style={{ cursor: 'pointer' }} onClick={() => setMode('register')}>
                  Зарегистрироваться
                </Text>
              </>
            ) : (
              <>
                Уже есть аккаунт?{' '}
                <Text component="span" c="blue" style={{ cursor: 'pointer' }} onClick={() => setMode('login')}>
                  Войти
                </Text>
              </>
            )}
          </Text>
        </Stack>
      </Card>
    </Center>
  );
}