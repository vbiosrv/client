import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import { useEffect, useState } from 'react';
import { MantineProvider, createTheme, AppShell, Burger, Group, Text, NavLink, ActionIcon, useMantineColorScheme, useComputedColorScheme, Center, Loader, Box } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { useDisclosure } from '@mantine/hooks';
import { BrowserRouter, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { IconServer, IconCreditCard, IconSun, IconMoon, IconUser, IconLogout, IconReceipt } from '@tabler/icons-react';
import { useStore } from './store/useStore';
import { auth } from './api/client';
import { config } from './config';

// Pages
import Services from './pages/Services';
import Payments from './pages/Payments';
import Withdrawals from './pages/Withdrawals';
import Profile from './pages/Profile';
import Login from './pages/Login';

const theme = createTheme({
  primaryColor: 'blue',
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif',
  defaultRadius: 'md',
  colors: {
    dark: [
      '#C1C2C5',
      '#A6A7AB',
      '#909296',
      '#5c5f66',
      '#373A40',
      '#2C2E33',
      '#25262b',
      '#1A1B1E',
      '#141517',
      '#101113',
    ],
  },
});

// Проверяем находимся ли внутри Telegram WebApp
const isInsideTelegramWebApp = (): boolean => {
  return !!window.Telegram?.WebApp?.initData;
};

function ThemeToggle() {
  const { setColorScheme } = useMantineColorScheme();
  const computedColorScheme = useComputedColorScheme('light');

  return (
    <ActionIcon
      onClick={() => setColorScheme(computedColorScheme === 'light' ? 'dark' : 'light')}
      variant="default"
      size="lg"
      aria-label="Toggle color scheme"
    >
      {computedColorScheme === 'light' ? <IconMoon size={18} /> : <IconSun size={18} />}
    </ActionIcon>
  );
}

// Нижняя навигация для WebApp
function BottomNavigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const { menuItems } = useStore();
  const computedColorScheme = useComputedColorScheme('light');

  const iconMap: Record<string, React.ReactNode> = {
    '/': <IconUser size={22} />,
    '/services': <IconServer size={22} />,
    '/payments': <IconCreditCard size={22} />,
    '/withdrawals': <IconReceipt size={22} />,
  };

  const enabledItems = menuItems.filter(item => item.enabled);

  return (
    <Box
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        background: computedColorScheme === 'dark'
          ? 'rgba(26, 27, 30, 0.85)'
          : 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: computedColorScheme === 'dark'
          ? '1px solid rgba(255, 255, 255, 0.1)'
          : '1px solid rgba(0, 0, 0, 0.1)',
        zIndex: 1000,
      }}
    >
      <Group justify="center" gap={0} style={{ padding: '8px 16px' }}>
        {enabledItems.map((item) => {
          const isActive = location.pathname === item.path ||
            (item.path === '/' && location.pathname === '/');
          return (
            <ActionIcon
              key={item.id}
              variant="subtle"
              size={56}
              onClick={() => navigate(item.path)}
              style={{
                flexDirection: 'column',
                height: 56,
                borderRadius: 12,
                color: isActive ? 'var(--mantine-color-blue-6)' : undefined,
              }}
            >
              {iconMap[item.path]}
              <Text size="xs" mt={4}>{item.label}</Text>
            </ActionIcon>
          );
        })}
      </Group>
    </Box>
  );
}

function AppContent() {
  const [opened, { toggle, close }] = useDisclosure();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, menuItems, themeConfig, isAuthenticated, isLoading, setUser, setTelegramPhoto, setIsLoading, logout } = useStore();
  const [isTelegramWebApp] = useState(isInsideTelegramWebApp);

  // Инициализация Telegram WebApp
  useEffect(() => {
    const tgWebApp = window.Telegram?.WebApp;
    if (tgWebApp && isTelegramWebApp) {
      tgWebApp.ready();
      tgWebApp.expand();

      // Устанавливаем цвета
      if (tgWebApp.setHeaderColor) {
        tgWebApp.setHeaderColor('secondary_bg_color');
      }
      if (tgWebApp.setBackgroundColor) {
        tgWebApp.setBackgroundColor('secondary_bg_color');
      }
    }
  }, [isTelegramWebApp]);

  // BackButton для Telegram WebApp
  useEffect(() => {
    const tgWebApp = window.Telegram?.WebApp;
    if (!tgWebApp || !isTelegramWebApp) return;

    const backButton = tgWebApp.BackButton;
    if (!backButton) return;

    // Показываем BackButton если не на главной странице (профиль)
    const isMainPage = location.pathname === '/' || location.pathname === '';

    if (isMainPage) {
      backButton.hide();
    } else {
      backButton.show();
      backButton.onClick(() => {
        navigate('/');
      });
    }

    return () => {
      backButton.hide();
      backButton.offClick(() => {});
    };
  }, [location.pathname, navigate, isTelegramWebApp]);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('shm_token');

      // Если есть Telegram WebApp и включена автоавторизация - авторизуемся через него
      const tgWebApp = window.Telegram?.WebApp;
      const hasTelegramWebApp = !!tgWebApp?.initData && config.TELEGRAM_WEBAPP_AUTH_ENABLE === 'true';

      if (hasTelegramWebApp && tgWebApp) {
        tgWebApp.ready();
        tgWebApp.expand();
        try {
          await auth.telegramAuth(tgWebApp.initData, config.TELEGRAM_PROFILE);
          const response = await auth.getCurrentUser();
          const responseData = response.data.data;
          const userData = Array.isArray(responseData) ? responseData[0] : responseData;
          setUser(userData);

          // Сохраняем фото из Telegram WebApp
          const photoUrl = tgWebApp.initDataUnsafe?.user?.photo_url;
          if (photoUrl) {
            setTelegramPhoto(photoUrl);
          }
        } catch {
          localStorage.removeItem('shm_token');
        } finally {
          setIsLoading(false);
        }
        return;
      }

      // Обычная проверка токена
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await auth.getCurrentUser();
        const responseData = response.data.data;
        const userData = Array.isArray(responseData) ? responseData[0] : responseData;
        setUser(userData);
      } catch {
        localStorage.removeItem('shm_token');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [setUser, setTelegramPhoto, setIsLoading]);

  const iconMap: Record<string, React.ReactNode> = {
    '/': <IconUser size={16} />,
    '/services': <IconServer size={16} />,
    '/payments': <IconCreditCard size={16} />,
    '/withdrawals': <IconReceipt size={16} />,
  };

  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <Center h="100vh">
        <Loader size="lg" />
      </Center>
    );
  }

  // Show login page if not authenticated
  if (!isAuthenticated) {
    return <Login />;
  }

  // WebApp layout - без боковой панели, с нижней навигацией
  if (isTelegramWebApp) {
    return (
      <Box style={{ minHeight: '100vh', paddingBottom: 80 }}>
        <Box p="md">
          <Routes>
            <Route path="/services" element={<Services />} />
            <Route path="/payments" element={<Payments />} />
            <Route path="/withdrawals" element={<Withdrawals />} />
            <Route path="*" element={<Profile />} />
          </Routes>
        </Box>
        <BottomNavigation />
      </Box>
    );
  }

  // Обычный desktop layout
  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 280, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Text size="lg" fw={700} c="blue" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>{config.APP_NAME}</Text>
          </Group>
          <Group>
            <Text size="sm" style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>{user?.login}</Text>
            {themeConfig.allowUserThemeChange && <ThemeToggle />}
            <ActionIcon
              onClick={logout}
              variant="default"
              size="lg"
              aria-label="Выйти"
              title="Выйти"
            >
              <IconLogout size={18} />
            </ActionIcon>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <AppShell.Section grow>
          {menuItems.filter(item => item.enabled).map((item) => (
            <NavLink
              key={item.id}
              component={Link}
              to={item.path}
              label={item.label}
              leftSection={iconMap[item.path]}
              active={location.pathname === item.path}
              variant="light"
              style={{ borderRadius: 8, marginBottom: 4 }}
              onClick={close}
            />
          ))}
        </AppShell.Section>
      </AppShell.Navbar>

      <AppShell.Main>
        <Routes>
          <Route path="/services" element={<Services />} />
          <Route path="/payments" element={<Payments />} />
          <Route path="/withdrawals" element={<Withdrawals />} />
          <Route path="*" element={<Profile />} />
        </Routes>
      </AppShell.Main>
    </AppShell>
  );
}

function App() {
  return (
    <MantineProvider theme={theme} defaultColorScheme="auto">
      <Notifications position="top-right" />
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </MantineProvider>
  );
}

export default App;
