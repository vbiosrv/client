import { Modal, Stack, Center, Text, Button, Group, CopyButton, Tooltip, ActionIcon } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { IconCopy, IconCheck, IconDownload } from '@tabler/icons-react';
import { QRCodeSVG } from 'qrcode.react';

interface QrModalProps {
  opened: boolean;
  onClose: () => void;
  data: string;
  title?: string;
  filename?: string;
  onDownload?: () => void;
}

export default function QrModal({ opened, onClose, data, title, filename, onDownload }: QrModalProps) {
  const { t } = useTranslation();

  const handleDownloadQr = () => {
    const svg = document.getElementById('qr-code-svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = pngUrl;
      a.download = filename ? `${filename}.png` : 'qrcode.png';
      a.click();
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  if (!data) return null;

  return (
    <Modal opened={opened} onClose={onClose} title={title || t('services.qrCode')} size="md">
      <Stack gap="md" align="center">
        <Center p="md" bg="white" style={{ borderRadius: 8 }}>
          <QRCodeSVG
            id="qr-code-svg"
            value={data}
            size={256}
            level="M"
            includeMargin
          />
        </Center>

        <Text size="xs" c="dimmed" ta="center" style={{ wordBreak: 'break-all', maxWidth: 300 }}>
          {data.length > 100 ? data.substring(0, 100) + '...' : data}
        </Text>

        <Group>
          <CopyButton value={data}>
            {({ copied, copy }) => (
              <Tooltip label={copied ? t('common.copied') : t('common.copy')}>
                <Button
                  variant="light"
                  leftSection={copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                  color={copied ? 'teal' : 'blue'}
                  onClick={copy}
                >
                  {copied ? t('common.copied') : t('common.copy')}
                </Button>
              </Tooltip>
            )}
          </CopyButton>

          <Tooltip label={t('services.downloadQr')}>
            <ActionIcon variant="light" size="lg" onClick={handleDownloadQr}>
              <IconDownload size={18} />
            </ActionIcon>
          </Tooltip>

          {onDownload && (
            <Button
              variant="light"
              leftSection={<IconDownload size={16} />}
              onClick={onDownload}
            >
              {t('services.downloadConfig')}
            </Button>
          )}
        </Group>
      </Stack>
    </Modal>
  );
}
