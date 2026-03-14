import { useState, useEffect, useRef } from 'react';
import { Card, Text, Stack, Group, Badge, Button, Modal, ActionIcon, Loader, Center, Paper, Title, Tabs, Code, Tooltip, Accordion, Box, Select, NumberInput, Pagination, Menu } from '@mantine/core';
import { 
  IconQrcode, 
  IconCopy, 
  IconCheck, 
  IconDownload, 
  IconRefresh, 
  IconTrash, 
  IconPlus, 
  IconPlayerStop, 
  IconExchange, 
  IconCreditCard, 
  IconWallet,
  IconDeviceMobile,
  IconBrandAndroid,
  IconBrandApple,
  IconBrandWindows,
  IconWorld,
  IconDeviceLaptop
} from '@tabler/icons-react';
import { useDisclosure, useClipboard } from '@mantine/hooks';
import { useTranslation } from 'react-i18next';
import { api, servicesApi, userApi } from '../api/client';
import { notifications } from '@mantine/notifications';
import QrModal from '../components/QrModal';
import OrderServiceModal from '../components/OrderServiceModal';
import ConfirmModal from '../components/ConfirmModal';
import { config } from '../config';

interface ForecastItem {
  name: string;
  cost: number;
  real_cost?: number;
  total: number;
  status: string;
  user_service_id: string;
}

interface PaySystem {
  name: string;
  shm_url: string;
  internal?: number;
  recurring?: number;
  weight?: number;
}

interface ServiceInfo {
  category: string;
  cost: number;
  name: string;
}

interface UserService {
  user_service_id: number;
  service_id: number;
  name?: string;
  service: ServiceInfo;
  status: string;
  expire: string | null;
  next: number | null;
  created: string;
  parent: number | null;
  settings?: Record<string, unknown>;
  children?: UserService[];
}

interface AppLink {
  name: string;
  icon: React.ReactNode;
  url: string;
  platform: 'android' | 'ios' | 'windows' | 'macos' | 'linux' | 'web' | 'other';
  description?: string;
  action?: 'open' | 'copy';
}

const statusColors: Record<string, string> = {
  'ACTIVE': 'green',
  'NOT PAID': 'blue',
  'BLOCK': 'red',
  'PROGRESS': 'yellow',
  'ERROR': 'orange',
  'INIT': 'gray',
};

function normalizeCategory(category: string): string {
  if (config.PROXY_CATEGORY === category) {
    return 'proxy';
  }
  if (config.VPN_CATEGORY === category) {
    return 'vpn';
  }
  if (category.match(/remna|remnawave|marzban|marz|mz/i)) {
    return 'proxy';
  }
  if (category.match(/^(vpn|wg|awg)/i)) {
    return 'vpn';
  }
  if (['web_tariff', 'web', 'mysql', 'mail', 'hosting'].includes(category)) {
    return category;
  }
  return 'other';
}

const getPlatformIcon = (platform: string) => {
  switch (platform) {
    case 'android':
      return <IconBrandAndroid size={18} />;
    case 'ios':
      return <IconBrandApple size={18} />;
    case 'windows':
      return <IconBrandWindows size={18} />;
    case 'linux':
      return <IconDeviceLaptop size={18} />;
    case 'macos':
      return <IconBrandApple size={18} />;
    case 'web':
      return <IconWorld size={18} />;
    default:
      return <IconDeviceMobile size={18} />;
  }
};

const getAppLinks = (type: 'vpn' | 'proxy', subscriptionUrl?: string): AppLink[] => {
  if (type === 'vpn') {
    return [
      {
        name: 'v2rayTun',
        icon: getPlatformIcon('android'),
        url: 'https://play.google.com/store/apps/details?id=ru.itivgroup.v2raytun',
        platform: 'android',
        description: 'VPN клиент для Android',
        action: 'open'
      },
      {
        name: 'Happ',
        icon: getPlatformIcon('android'),
        url: 'https://play.google.com/store/apps/details?id=global.happ.happ',
        platform: 'android',
        description: 'Универсальный VPN клиент',
        action: 'open'
      },
      {
        name: 'Streisand',
        icon: getPlatformIcon('android'),
        url: 'https://github.com/StreisandEffect/streisand/releases',
        platform: 'android',
        description: 'Open Source клиент',
        action: 'open'
      },
      {
        name: 'V2Box',
        icon: getPlatformIcon('ios'),
        url: 'https://apps.apple.com/app/v2box-v2ray-client/id6446012536',
        platform: 'ios',
        description: 'VPN клиент для iOS',
        action: 'open'
      },
      {
        name: 'Nekoray',
        icon: getPlatformIcon('windows'),
        url: 'https://github.com/MatsuriDayo/nekoray/releases',
        platform: 'windows',
        description: 'Клиент для Windows',
        action: 'open'
      },
      {
        name: 'Nekobox',
        icon: getPlatformIcon('android'),
        url: 'https://github.com/MatsuriDayo/NekoBoxForAndroid/releases',
        platform: 'android',
        description: 'Nekobox для Android',
        action: 'open'
      },
      {
        name: 'Sing-box',
        icon: getPlatformIcon('linux'),
        url: 'https://github.com/SagerNet/sing-box/releases',
        platform: 'linux',
        description: 'Клиент для Linux',
        action: 'open'
      }
    ];
  }
  
  if (type === 'proxy' && subscriptionUrl) {
    const encodedUrl = encodeURIComponent(subscriptionUrl);
    return [
      {
        name: 'Happ',
        icon: getPlatformIcon('android'),
        url: `happ://install-config?url=${encodedUrl}`,
        platform: 'android',
        description: 'Открыть подписку в Happ',
        action: 'open'
      },
      {
        name: 'v2rayTun',
        icon: getPlatformIcon('android'),
        url: `v2raytun://install-config?url=${encodedUrl}`,
        platform: 'android',
        description: 'Открыть подписку в v2rayTun',
        action: 'open'
      },
      {
        name: 'Streisand',
        icon: getPlatformIcon('android'),
        url: `streisand://install-config?url=${encodedUrl}`,
        platform: 'android',
        description: 'Открыть подписку в Streisand',
        action: 'open'
      },
      {
        name: 'Nekobox',
        icon: getPlatformIcon('android'),
        url: `nekobox://install-config?url=${encodedUrl}`,
        platform: 'android',
        description: 'Открыть подписку в Nekobox',
        action: 'open'
      },
      {
        name: 'V2Box',
        icon: getPlatformIcon('ios'),
        url: `v2box://install-config?url=${encodedUrl}`,
        platform: 'ios',
        description: 'Открыть подписку в V2Box',
        action: 'open'
      },
      {
        name: 'Shadowrocket',
        icon: getPlatformIcon('ios'),
        url: `shadowrocket://install-config?url=${encodedUrl}`,
        platform: 'ios',
        description: 'Открыть подписку в Shadowrocket',
        action: 'open'
      },
      {
        name: 'Sing-box',
        icon: getPlatformIcon('linux'),
        url: subscriptionUrl,
        platform: 'linux',
        description: 'Скопировать ссылку для Sing-box',
        action: 'copy'
      },
      {
        name: 'Nekoray',
        icon: getPlatformIcon('windows'),
        url: subscriptionUrl,
        platform: 'windows',
        description: 'Скопировать ссылку для Nekoray',
        action: 'copy'
      },
      {
        name: 'Копировать ссылку',
        icon: <IconCopy size={18} />,
        url: subscriptionUrl,
        platform: 'other',
        description: 'Скопировать subscription URL',
        action: 'copy'
      }
    ];
  }
  
  return [];
};

interface ServiceDetailProps {
  service: UserService;
  onDelete?: () => void;
  onChangeTariff?: (service: UserService) => void;
}

function ServiceDetail({ service, onDelete, onChangeTariff }: ServiceDetailProps) {
  const [storageData, setStorageData] = useState<string | null>(null);
  const [subscriptionUrl, setSubscriptionUrl] = useState<string | null>(null);
  const [nextServiceInfo, setNextServiceInfo] = useState<{ name: string; cost: number } | null>(null);
  const [nextServiceLoading, setNextServiceLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string | null>('info');
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmStop, setConfirmStop] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const { t, i18n } = useTranslation();
  const clipboard = useClipboard({ timeout: 1000 });

  const [forecastTotal, setForecastTotal] = useState<number | null>(null);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [paySystems, setPaySystems] = useState<PaySystem[]>([]);
  const [selectedPaySystem, setSelectedPaySystem] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState<number | string>(0);
  const [paySystemsLoading, setPaySystemsLoading] = useState(false);
  const [paying, setPaying] = useState(false);

  const downloadConfig = async () => {
    if (!storageData) return;
    setDownloading(true);
    try {
      const blob = new Blob([storageData], { type: 'application/octet-stream' });
      const prefix = config.VPN_STORAGE_PREFIX ? config.VPN_STORAGE_PREFIX : 'vpn';
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${prefix}${service.user_service_id}.conf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      notifications.show({
        title: t('common.success'),
        message: t('services.configDownloaded'),
        color: 'green',
      });
    } catch (error) {
      notifications.show({
        title: t('common.error'),
        message: t('services.configDownloadError'),
        color: 'red',
      });
    } finally {
      setDownloading(false);
    }
  };

  const handleAppAction = (appLink: AppLink) => {
    if (appLink.action === 'copy') {
      clipboard.copy(appLink.url);
      notifications.show({
        title: t('common.success'),
        message: t('services.linkCopied', { app: appLink.name }),
        color: 'green',
      });
    } else {
      try {
        window.open(appLink.url, '_blank');
      } catch (error) {
        notifications.show({
          title: t('common.error'),
          message: t('services.appOpenError'),
          color: 'red',
        });
      }
    }
  };

  const canDelete = ['BLOCK', 'NOT PAID', 'ERROR'].includes(service.status);
  const canStop = service.status === 'ACTIVE';
  const canChange = ['BLOCK', 'ACTIVE'].includes(service.status);
  const isNotPaid = service.status === 'NOT PAID';

  useEffect(() => {
    if (!isNotPaid) return;
    
    const fetchForecast = async () => {
      setForecastLoading(true);
      try {
        const response = await userApi.getForecast();
        const forecastData = response.data.data;
        if (Array.isArray(forecastData) && forecastData.length > 0) {
          const forecast = forecastData[0];
          const balance = forecast.balance || 0;
          const item = forecast.items?.find(
            (it: ForecastItem) => String(it.user_service_id) === String(service.user_service_id)
          );
          if (item) {
            const needToPay = Math.max(0, Math.ceil((item.total - balance) * 100) / 100);
            setForecastTotal(needToPay);
            setPayAmount(needToPay);
          } else if (forecast.total > 0) {
            setForecastTotal(forecast.total);
            setPayAmount(Math.max(0, Math.ceil(forecast.total * 100) / 100));
          }
        }
      } catch (error) {
        console.error('Failed to fetch forecast:', error);
      } finally {
        setForecastLoading(false);
      }
    };
    
    fetchForecast();
  }, [service.user_service_id, isNotPaid]);

  const loadPaySystems = async () => {
    if (paySystems.length > 0) return;
    setPaySystemsLoading(true);
    try {
      const response = await userApi.getPaySystems();
      const data: PaySystem[] = response.data.data || [];
      const sorted = data.sort((a, b) => (b.weight || 0) - (a.weight || 0));
      setPaySystems(sorted);
      if (sorted.length > 0) {
        setSelectedPaySystem(sorted[0].shm_url);
      }
    } catch (error) {
      console.error('Failed to load pay systems:', error);
    } finally {
      setPaySystemsLoading(false);
    }
  };

  useEffect(() => {
    if (isNotPaid && forecastTotal !== null && forecastTotal > 0) {
      loadPaySystems();
    }
  }, [isNotPaid, forecastTotal]);

  const handlePay = async () => {
    const paySystem = paySystems.find(ps => ps.shm_url === selectedPaySystem);
    if (!paySystem) return;
    
    setPaying(true);
    try {
      if (paySystem.internal || paySystem.recurring) {
        const response = await fetch(paySystem.shm_url + payAmount, {
          method: 'GET',
          credentials: 'include',
        });
        
        if (response.status === 200 || response.status === 204) {
          notifications.show({ 
            title: t('common.success'), 
            message: t('payments.paymentSuccess'), 
            color: 'green' 
          });
          onDelete?.();
        } else {
          const data = await response.json().catch(() => ({}));
          notifications.show({ 
            title: t('common.error'), 
            message: data.msg_ru || data.msg || t('payments.paymentError'), 
            color: 'red' 
          });
        }
      } else {
        window.open(paySystem.shm_url + payAmount, '_blank');
      }
    } catch (error) {
      notifications.show({ 
        title: t('common.error'), 
        message: t('payments.paymentError'), 
        color: 'red' 
      });
    } finally {
      setPaying(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/user/service?user_service_id=${service.user_service_id}`);
      notifications.show({
        title: t('common.success'),
        message: t('services.serviceDeleted'),
        color: 'green',
      });
      setConfirmDelete(false);
      onDelete?.();
    } catch (error) {
      notifications.show({
        title: t('common.error'),
        message: t('services.serviceDeleteError'),
        color: 'red',
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleStop = async () => {
    setStopping(true);
    try {
      await userApi.stopService(service.user_service_id);
      notifications.show({
        title: t('common.success'),
        message: t('services.serviceStopped'),
        color: 'green',
      });
      setConfirmStop(false);
      onDelete?.();
    } catch (error) {
      notifications.show({
        title: t('common.error'),
        message: t('services.serviceStopError'),
        color: 'red',
      });
    } finally {
      setStopping(false);
    }
  };

  const category = normalizeCategory(service.service.category);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      if (category === 'proxy') {
        const prefix = config.PROXY_STORAGE_PREFIX ? config.PROXY_STORAGE_PREFIX : 'vpn_mrzb_';
        
        try {
          const mzResponse = await api.get(`/storage/manage/${prefix}${service.user_service_id}?format=json`);
          const url = mzResponse.data.subscription_url || mzResponse.data.response?.subscriptionUrl;
          if (url) {
            setSubscriptionUrl(url);
            setActiveTab('config');
          }
        } catch (error) {
          if (!config.PROXY_STORAGE_PREFIX) {
            try {
              const remnaResponse = await api.get(`/storage/manage/vpn_remna_${service.user_service_id}?format=json`);
              const url = remnaResponse.data.subscription_url || remnaResponse.data.response?.subscriptionUrl;
              if (url) {
                setSubscriptionUrl(url);
                setActiveTab('config');
              }
            } catch (err) {
              console.error('Failed to fetch proxy data:', err);
            }
          }
        }
      } else if (category === 'vpn') {
        const prefix = config.VPN_STORAGE_PREFIX ? config.VPN_STORAGE_PREFIX : 'vpn';
        try {
          const vpnResponse = await api.get(`/storage/manage/${prefix}${service.user_service_id}`);
          const configData = vpnResponse.data;
          if (configData) {
            setStorageData(configData);
            setActiveTab('config');
          }
        } catch (error) {
          console.error('Failed to fetch VPN data:', error);
        }
      }
      
      setLoading(false);
    };
    
    fetchData();
  }, [service.user_service_id, category]);

  useEffect(() => {
    const fetchNextService = async () => {
      if (!service.next) {
        setNextServiceInfo(null);
        return;
      }
      
      setNextServiceLoading(true);
      try {
        const response = await servicesApi.order_list({ service_id: String(service.next) });
        const data = response.data.data || [];
        const nextService = Array.isArray(data) ? data[0] : data;
        if (nextService?.name && typeof nextService.cost === 'number') {
          setNextServiceInfo({ name: nextService.name, cost: nextService.cost });
        } else {
          setNextServiceInfo(null);
        }
      } catch (error) {
        console.error('Failed to fetch next service:', error);
        setNextServiceInfo(null);
      } finally {
        setNextServiceLoading(false);
      }
    };

    fetchNextService();
  }, [service.next]);

  const isVpn = category === 'vpn';
  const isProxy = category === 'proxy';
  const isVpnOrProxy = isVpn || isProxy;
  const statusColor = statusColors[service.status] || 'gray';
  const statusLabel = t(`status.${service.status}`, service.status);
  
  const appLinks = isProxy && subscriptionUrl ? getAppLinks('proxy', subscriptionUrl) : 
                   isVpn ? getAppLinks('vpn') : [];

  const groupedApps = appLinks.reduce((acc, app) => {
    if (!acc[app.platform]) {
      acc[app.platform] = [];
    }
    acc[app.platform].push(app);
    return acc;
  }, {} as Record<string, AppLink[]>);

  if (loading) {
    return (
      <Center h={200}>
        <Loader size="sm" />
      </Center>
    );
  }

  return (
    <Stack gap="md">
      <Group justify="space-between" wrap="nowrap">
        <div style={{ flex: 1, minWidth: 0 }}>
          <Text fw={700} size="lg" truncate="end">
            #{service.user_service_id} - {service.service.name}
          </Text>
          <Group gap="xs" mt={4}>
            <Badge color={statusColor} variant="light">
              {statusLabel}
            </Badge>
            {service.service.cost > 0 && (
              <Badge variant="outline">
                {service.service.cost} {t('common.currency')}/мес
              </Badge>
            )}
          </Group>
        </div>
      </Group>

      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List>
          <Tabs.Tab value="info">{t('services.info')}</Tabs.Tab>
          {isVpnOrProxy && service.status === 'ACTIVE' && (
            <Tabs.Tab value="config">{t('services.connection')}</Tabs.Tab>
          )}
        </Tabs.List>

        <Tabs.Panel value="info" pt="md">
          <Stack gap="xs">
            <Group justify="space-between">
              <Text size="sm" c="dimmed">{t('services.status')}:</Text>
              <Badge color={statusColor} variant="light">{statusLabel}</Badge>
            </Group>
            
            <Group justify="space-between">
              <Text size="sm" c="dimmed">{t('services.cost')}:</Text>
              <Text size="sm">{service.service.cost} {t('common.currency')} / {t('common.month')}</Text>
            </Group>
            
            {service.expire && (
              <Group justify="space-between">
                <Text size="sm" c="dimmed">{t('services.validUntil')}:</Text>
                <Text size="sm">
                  {new Date(service.expire).toLocaleDateString(
                    i18n.language === 'ru' ? 'ru-RU' : 'en-US',
                    { day: 'numeric', month: 'long', year: 'numeric' }
                  )}
                </Text>
              </Group>
            )}
            
            {service.next && (
              <Group justify="space-between">
                <Text size="sm" c="dimmed">{t('services.nextService')}:</Text>
                {nextServiceLoading ? (
                  <Loader size="xs" />
                ) : nextServiceInfo ? (
                  <Text size="sm">{nextServiceInfo.name} - {nextServiceInfo.cost} {t('common.currency')}</Text>
                ) : (
                  <Text size="sm">ID: {service.next}</Text>
                )}
              </Group>
            )}
            
            {service.created && (
              <Group justify="space-between">
                <Text size="sm" c="dimmed">{t('services.created')}:</Text>
                <Text size="sm">
                  {new Date(service.created).toLocaleDateString(
                    i18n.language === 'ru' ? 'ru-RU' : 'en-US'
                  )}
                </Text>
              </Group>
            )}
            
            {service.children && service.children.length > 0 && (
              <>
                <Text size="sm" c="dimmed" mt="md">{t('services.includedServices')}:</Text>
                {service.children.map((child) => {
                  const childStatusColor = statusColors[child.status] || 'gray';
                  const childStatusLabel = t(`status.${child.status}`, child.status);
                  return (
                    <Group key={child.user_service_id} justify="space-between" ml="md">
                      <Text size="sm">{child.service.name}</Text>
                      <Badge size="sm" color={childStatusColor} variant="light">
                        {childStatusLabel}
                      </Badge>
                    </Group>
                  );
                })}
              </>
            )}
          </Stack>
        </Tabs.Panel>

        {service.status === 'ACTIVE' && (
          <Tabs.Panel value="config" pt="md">
            <Stack gap="md">
              {isProxy && subscriptionUrl && (
                <Paper withBorder p="md" radius="md">
                  <Text size="sm" fw={500} mb="xs">{t('services.subscriptionLink')}</Text>
                  <Group gap="xs" wrap="nowrap">
                    <Code style={{ flex: 1, wordBreak: 'break-all' }}>{subscriptionUrl}</Code>
                    <Tooltip label={clipboard.copied ? t('common.copied') : t('common.copy')}>
                      <ActionIcon 
                        color={clipboard.copied ? 'teal' : 'gray'} 
                        variant="subtle" 
                        onClick={() => clipboard.copy(subscriptionUrl)}
                      >
                        {clipboard.copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                      </ActionIcon>
                    </Tooltip>
                  </Group>
                </Paper>
              )}

              <Group>
                {(isVpn && storageData) || (isProxy && subscriptionUrl) ? (
                  <>
                    <Button
                      leftSection={<IconQrcode size={16} />}
                      variant="light"
                      onClick={() => setQrModalOpen(true)}
                    >
                      {t('services.qrCode')}
                    </Button>

                    {appLinks.length > 0 && (
                      <Menu 
                        position="bottom-end" 
                        withinPortal
                        width={260}
                      >
                        <Menu.Target>
                          <Button
                            leftSection={<IconDeviceMobile size={16} />}
                            variant="light"
                          >
                            {t('services.addToApp')}
                          </Button>
                        </Menu.Target>
                        
                        <Menu.Dropdown>
                          <Menu.Label>{t('services.chooseApp')}</Menu.Label>
                          
                          {Object.entries(groupedApps).map(([platform, apps]) => (
                            <div key={platform}>
                              <Menu.Label>
                                <Group gap="xs">
                                  {getPlatformIcon(platform)}
                                  <Text size="xs" tt="capitalize">{platform}</Text>
                                </Group>
                              </Menu.Label>
                              {apps.map((app, index) => (
                                <Menu.Item
                                  key={`${platform}-${index}`}
                                  leftSection={app.icon}
                                  onClick={() => handleAppAction(app)}
                                >
                                  <Stack gap={0}>
                                    <Text size="sm">{app.name}</Text>
                                    {app.description && (
                                      <Text size="xs" c="dimmed">{app.description}</Text>
                                    )}
                                  </Stack>
                                </Menu.Item>
                              ))}
                              <Menu.Divider />
                            </div>
                          ))}
                        </Menu.Dropdown>
                      </Menu>
                    )}
                  </>
                ) : null}

                {isVpn && storageData && (
                  <Button
                    leftSection={<IconDownload size={16} />}
                    variant="light"
                    onClick={downloadConfig}
                    loading={downloading}
                  >
                    {t('services.downloadConfig')}
                  </Button>
                )}
              </Group>

              <QrModal
                opened={qrModalOpen}
                onClose={() => setQrModalOpen(false)}
                data={isVpn ? (storageData || '') : (subscriptionUrl || '')}
                title={isVpn ? t('services.vpnQrTitle') : t('services.subscriptionQrTitle')}
                onDownload={isVpn ? downloadConfig : undefined}
              />
            </Stack>
          </Tabs.Panel>
        )}
      </Tabs>

      {isNotPaid && (
        <Paper withBorder p="md" radius="md" mt="md" bg="red.0">
          <Stack gap="sm">
            <Group justify="space-between">
              <Group gap="xs">
                <IconWallet size={20} color="var(--mantine-color-red-6)" />
                <Text fw={500} c="red.7">{t('services.requiresPayment')}</Text>
              </Group>
            </Group>
            
            {forecastLoading ? (
              <Group justify="center" py="xs">
                <Loader size="sm" />
                <Text size="sm">{t('common.loading')}</Text>
              </Group>
            ) : forecastTotal !== null && forecastTotal > 0 ? (
              <>
                <Group justify="space-between">
                  <Text size="sm">{t('services.amountToPay')}:</Text>
                  <Text fw={700} size="xl" c="red">{forecastTotal.toFixed(2)} {t('common.currency')}</Text>
                </Group>
                
                {paySystemsLoading ? (
                  <Group justify="center" py="xs">
                    <Loader size="sm" />
                  </Group>
                ) : paySystems.length > 0 ? (
                  <Stack gap="sm">
                    <Select
                      label={t('payments.paymentSystem')}
                      data={paySystems.map(ps => ({ 
                        value: ps.shm_url, 
                        label: ps.name 
                      }))}
                      value={selectedPaySystem}
                      onChange={setSelectedPaySystem}
                      size="sm"
                    />
                    
                    <NumberInput
                      label={t('payments.amount')}
                      value={payAmount}
                      onChange={setPayAmount}
                      min={1}
                      step={10}
                      decimalScale={2}
                      suffix={` ${t('common.currency')}`}
                      size="sm"
                    />
                    
                    <Button
                      fullWidth
                      leftSection={<IconCreditCard size={18} />}
                      onClick={handlePay}
                      loading={paying}
                      disabled={!selectedPaySystem || paying}
                      size="md"
                    >
                      {t('services.payService', { amount: payAmount })}
                    </Button>
                  </Stack>
                ) : (
                  <Text size="sm" c="dimmed" ta="center">
                    {t('payments.noPaymentSystems')}
                  </Text>
                )}
              </>
            ) : (
              <Text size="sm" c="dimmed" ta="center">
                {t('services.noPaymentRequired')}
              </Text>
            )}
          </Stack>
        </Paper>
      )}

      <Stack gap="xs" mt="md">
        {canChange && (
          <Button
            color="blue"
            variant="light"
            leftSection={<IconExchange size={16} />}
            onClick={() => onChangeTariff?.(service)}
            fullWidth
          >
            {t('services.changeService')}
          </Button>
        )}

        {canStop && (
          <Button
            color="orange"
            variant="light"
            leftSection={<IconPlayerStop size={16} />}
            onClick={() => setConfirmStop(true)}
            fullWidth
          >
            {t('services.stopService')}
          </Button>
        )}

        {canDelete && (
          <Button
            color="red"
            variant="light"
            leftSection={<IconTrash size={16} />}
            onClick={() => setConfirmDelete(true)}
            fullWidth
          >
            {t('services.deleteService')}
          </Button>
        )}
      </Stack>

      <ConfirmModal
        opened={confirmStop}
        onClose={() => setConfirmStop(false)}
        onConfirm={handleStop}
        title={t('services.stopServiceTitle')}
        message={t('services.stopServiceMessage')}
        confirmLabel={t('services.stop')}
        confirmColor="orange"
        loading={stopping}
      />

      <ConfirmModal
        opened={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
        title={t('services.deleteServiceTitle')}
        message={t('services.deleteServiceMessage')}
        confirmLabel={t('common.delete')}
        confirmColor="red"
        loading={deleting}
      />
    </Stack>
  );
}

function ServiceCard({ service, onClick, isChild = false, isLastChild = false }: { 
  service: UserService; 
  onClick: () => void; 
  isChild?: boolean; 
  isLastChild?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const statusColor = statusColors[service.status] || 'gray';
  const statusLabel = t(`status.${service.status}`, service.status);
  const category = normalizeCategory(service.service.category);

  if (isChild) {
    return (
      <Group gap={0} wrap="nowrap" align="stretch">
        <Box
          style={{
            width: 24,
            position: 'relative',
            flexShrink: 0,
          }}
        >
          <Box
            style={{
              position: 'absolute',
              left: 10,
              top: 0,
              bottom: isLastChild ? '50%' : 0,
              width: 2,
              backgroundColor: 'var(--mantine-color-gray-4)',
            }}
          />
          <Box
            style={{
              position: 'absolute',
              left: 10,
              top: '50%',
              width: 14,
              height: 2,
              backgroundColor: 'var(--mantine-color-gray-4)',
            }}
          />
        </Box>
        <Card
          withBorder
          radius="md"
          p="sm"
          style={{ 
            cursor: 'pointer', 
            flex: 1,
            transition: 'transform 0.2s, box-shadow 0.2s',
          }}
          onClick={onClick}
        >
          <Group justify="space-between" wrap="nowrap">
            <div style={{ flex: 1, minWidth: 0 }}>
              <Text fw={500} size="sm" truncate="end">
                #{service.user_service_id} - {service.service.name}
              </Text>
              {service.expire && (
                <Text size="xs" c="dimmed" truncate>
                  {new Date(service.expire).toLocaleDateString(
                    i18n.language === 'ru' ? 'ru-RU' : 'en-US'
                  )}
                </Text>
              )}
            </div>
            <Group gap="xs" wrap="nowrap">
              {service.service.cost > 0 && (
                <Badge variant="outline" size="sm">
                  {service.service.cost} ₽
                </Badge>
              )}
              <Badge color={statusColor} variant="light" size="sm">
                {statusLabel}
              </Badge>
            </Group>
          </Group>
        </Card>
      </Group>
    );
  }

  return (
    <Card
      withBorder
      radius="md"
      p="md"
      style={{ 
        cursor: 'pointer',
        transition: 'transform 0.2s, box-shadow 0.2s',
      }}
      onClick={onClick}
    >
      <Group justify="space-between" wrap="nowrap">
        <div style={{ flex: 1, minWidth: 0 }}>
          <Group gap="xs" wrap="nowrap" mb={4}>
            <Badge size="sm" variant="dot" color={statusColor} />
            <Text fw={500} truncate="end">
              #{service.user_service_id} - {service.service.name}
            </Text>
          </Group>
          <Group gap="xs">
            {category !== 'other' && (
              <Badge size="xs" variant="light" color="blue">
                {t(`categories.${category}`, category)}
              </Badge>
            )}
            {service.expire && (
              <Text size="xs" c="dimmed">
                {new Date(service.expire).toLocaleDateString(
                  i18n.language === 'ru' ? 'ru-RU' : 'en-US'
                )}
              </Text>
            )}
          </Group>
        </div>
        <Group gap="xs" wrap="nowrap">
          {service.service.cost > 0 && (
            <Text size="sm" fw={500} c="dimmed">
              {service.service.cost} ₽
            </Text>
          )}
          <Badge color={statusColor} variant="light" size="sm">
            {statusLabel}
          </Badge>
        </Group>
      </Group>
    </Card>
  );
}

export default function Services() {
  const [services, setServices] = useState<UserService[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState<UserService | null>(null);
  const [opened, { open, close }] = useDisclosure(false);
  const [orderModalOpened, { open: openOrderModal, close: closeOrderModal }] = useDisclosure(false);
  const [changeModalOpened, { open: openChangeModal, close: closeChangeModal }] = useDisclosure(false);
  const [changeService, setChangeService] = useState<UserService | null>(null);
  const refreshAttemptsRef = useRef(0);
  const [categoryPages, setCategoryPages] = useState<Record<string, number>>({});
  const perPage = 5;
  const { t } = useTranslation();

  const fetchServices = async (background = false) => {
    if (!background) setLoading(true);
    try {
      const response = await api.get('/user/service', { params: { limit: 1000 } });
      const data: UserService[] = response.data.data || [];

      const serviceMap = new Map<number, UserService>();
      data.forEach(s => serviceMap.set(s.user_service_id, { ...s, children: [] }));

      const rootServices: UserService[] = [];
      serviceMap.forEach(service => {
        if (service.parent && serviceMap.has(service.parent)) {
          const parent = serviceMap.get(service.parent)!;
          parent.children = parent.children || [];
          parent.children.push(service);
        } else if (!service.parent) {
          rootServices.push(service);
        }
      });

      rootServices.sort((a, b) => 
        new Date(b.created).getTime() - new Date(a.created).getTime()
      );

      setServices(rootServices);
      return rootServices;
    } catch (error) {
      console.error('Failed to fetch services:', error);
      notifications.show({
        title: t('common.error'),
        message: t('services.fetchError'),
        color: 'red',
      });
      return [];
    } finally {
      if (!background) setLoading(false);
    }
  };

  const hasProgressServices = (serviceList: UserService[]): boolean => {
    for (const service of serviceList) {
      if (service.status === 'PROGRESS') return true;
      if (service.children && hasProgressServices(service.children)) return true;
    }
    return false;
  };

  const hasNotPaidServices = (serviceList: UserService[]): boolean => {
    for (const service of serviceList) {
      if (service.status === 'NOT PAID') return true;
      if (service.children && hasNotPaidServices(service.children)) return true;
    }
    return false;
  };

  useEffect(() => {
    fetchServices();
  }, []);

  useEffect(() => {
    if (!services.length || loading) return;

    const hasProgress = hasProgressServices(services);

    if (hasProgress && refreshAttemptsRef.current < 2) {
      const delay = refreshAttemptsRef.current === 0 ? 1000 : 3000;
      const timer = setTimeout(async () => {
        refreshAttemptsRef.current += 1;
        await fetchServices(true);
      }, delay);
      return () => clearTimeout(timer);
    }

    if (!hasProgress) {
      refreshAttemptsRef.current = 0;
    }
  }, [services, loading]);

  useEffect(() => {
    if (!services.length || loading) return;

    const hasNotPaid = hasNotPaidServices(services);
    if (!hasNotPaid) return;

    const interval = setInterval(() => {
      fetchServices(true);
    }, 5000);

    return () => clearInterval(interval);
  }, [services, loading]);

  const handleServiceClick = (service: UserService) => {
    setSelectedService(service);
    open();
  };

  const handleChangeTariff = (service: UserService) => {
    setChangeService(service);
    close();
    openChangeModal();
  };

  const groupedServices = services.reduce((acc, service) => {
    const category = normalizeCategory(service.service.category);

    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(service);
    return acc;
  }, {} as Record<string, UserService[]>);

  const sortedCategories = Object.keys(groupedServices).sort((a, b) => {
    if (a === 'vpn') return -1;
    if (b === 'vpn') return 1;
    if (a === 'proxy') return -1;
    if (b === 'proxy') return 1;
    return a.localeCompare(b);
  });

  if (loading) {
    return (
      <Center h={400}>
        <Stack align="center" gap="md">
          <Loader size="lg" />
          <Text c="dimmed">{t('common.loading')}</Text>
        </Stack>
      </Center>
    );
  }

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={2}>{t('services.title')}</Title>
        <Group>
          <Button 
            leftSection={<IconPlus size={16} />} 
            onClick={openOrderModal}
            variant="gradient"
            gradient={{ from: 'blue', to: 'cyan' }}
          >
            {t('services.orderService')}
          </Button>
          <Button 
            leftSection={<IconRefresh size={16} />} 
            variant="light" 
            onClick={() => fetchServices()}
          >
            {t('common.refresh')}
          </Button>
        </Group>
      </Group>

      {sortedCategories.length === 0 ? (
        <Paper withBorder p="xl" radius="md">
          <Center>
            <Stack align="center" gap="md">
              <Text size="lg" c="dimmed">{t('services.noServices')}</Text>
              <Text size="sm" c="dimmed" ta="center" maw={400}>
                {t('services.noServicesDescription')}
              </Text>
              <Button 
                leftSection={<IconPlus size={16} />} 
                onClick={openOrderModal}
                size="md"
                variant="gradient"
                gradient={{ from: 'blue', to: 'cyan' }}
              >
                {t('services.orderService')}
              </Button>
            </Stack>
          </Center>
        </Paper>
      ) : (
        <Accordion 
          variant="separated" 
          radius="md" 
          multiple 
          defaultValue={sortedCategories}
        >
          {sortedCategories.map((category) => {
            const categoryServices = groupedServices[category];
            const page = categoryPages[category] || 1;
            const totalPages = Math.ceil(categoryServices.length / perPage);
            const paginatedServices = categoryServices.slice((page - 1) * perPage, page * perPage);
            
            const activeCount = categoryServices.filter(s => 
              s.status === 'ACTIVE' || s.children?.some(c => c.status === 'ACTIVE')
            ).length;

            return (
              <Accordion.Item key={category} value={category}>
                <Accordion.Control>
                  <Group>
                    <Text fw={500}>{t(`categories.${category}`, category)}</Text>
                    <Group gap="xs">
                      <Badge variant="light" size="sm">{categoryServices.length}</Badge>
                      {activeCount > 0 && (
                        <Badge color="green" variant="light" size="sm">
                          {activeCount} {t('services.active')}
                        </Badge>
                      )}
                    </Group>
                  </Group>
                </Accordion.Control>
                <Accordion.Panel>
                  <Stack gap="sm">
                    {paginatedServices.map((service) => (
                      <Box key={service.user_service_id}>
                        <ServiceCard
                          service={service}
                          onClick={() => handleServiceClick(service)}
                        />
                        {service.children && service.children.length > 0 && (
                          <Stack gap="xs" mt="xs" ml="md">
                            {service.children.map((child, index) => (
                              <ServiceCard
                                key={child.user_service_id}
                                service={child}
                                onClick={() => handleServiceClick(child)}
                                isChild
                                isLastChild={index === service.children!.length - 1}
                              />
                            ))}
                          </Stack>
                        )}
                      </Box>
                    ))}
                    
                    {totalPages > 1 && (
                      <Center mt="md">
                        <Pagination
                          total={totalPages}
                          value={page}
                          onChange={(p) => setCategoryPages(prev => ({ 
                            ...prev, 
                            [category]: p 
                          }))}
                          size="sm"
                          withEdges
                        />
                      </Center>
                    )}
                  </Stack>
                </Accordion.Panel>
              </Accordion.Item>
            );
          })}
        </Accordion>
      )}

      <Modal 
        opened={opened} 
        onClose={close} 
        title={t('services.serviceDetails')} 
        size="lg"
        padding="lg"
      >
        {selectedService && (
          <ServiceDetail
            service={selectedService}
            onDelete={() => {
              close();
              refreshAttemptsRef.current = 0;
              fetchServices();
            }}
            onChangeTariff={handleChangeTariff}
          />
        )}
      </Modal>

      <OrderServiceModal
        opened={orderModalOpened}
        onClose={closeOrderModal}
        onOrderSuccess={() => {
          refreshAttemptsRef.current = 0;
          fetchServices();
        }}
      />

      <OrderServiceModal
        opened={changeModalOpened}
        onClose={() => {
          setChangeService(null);
          closeChangeModal();
        }}
        mode="change"
        currentService={
          changeService
            ? {
                user_service_id: changeService.user_service_id,
                service_id: changeService.service_id,
                status: changeService.status,
                category: changeService.service.category,
                name: changeService.service.name,
              }
            : undefined
        }
        onChangeSuccess={() => {
          refreshAttemptsRef.current = 0;
          fetchServices();
        }}
      />
    </Stack>
  );
}
