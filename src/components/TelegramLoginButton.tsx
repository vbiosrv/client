import { useEffect, useRef } from 'react';

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

interface TelegramLoginButtonProps {
  botName: string;
  onAuth: (user: TelegramUser) => void;
  buttonSize?: 'large' | 'medium' | 'small';
  cornerRadius?: number;
  requestAccess?: 'write' | undefined;
  showUserPhoto?: boolean;
}

declare global {
  interface Window {
    TelegramLoginWidget?: {
      dataOnauth: (user: TelegramUser) => void;
    };
  }
}

export default function TelegramLoginButton({
  botName,
  onAuth,
  buttonSize = 'large',
  cornerRadius = 8,
  requestAccess = 'write',
  showUserPhoto = true,
}: TelegramLoginButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onAuthRef = useRef(onAuth);
  onAuthRef.current = onAuth;

  useEffect(() => {
    if (!botName || !containerRef.current) return;

    // Callback для виджета
    const callbackName = 'TelegramLoginWidget_' + Math.random().toString(36).substring(7);
    (window as unknown as Record<string, unknown>)[callbackName] = (user: TelegramUser) => {
      onAuthRef.current(user);
    };

    // Создаём скрипт виджета
    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.setAttribute('data-telegram-login', botName);
    script.setAttribute('data-size', buttonSize);
    script.setAttribute('data-radius', String(cornerRadius));
    script.setAttribute('data-onauth', `${callbackName}(user)`);
    script.setAttribute('data-userpic', String(showUserPhoto));
    if (requestAccess) {
      script.setAttribute('data-request-access', requestAccess);
    }
    script.async = true;

    // Очищаем контейнер и добавляем скрипт
    containerRef.current.innerHTML = '';
    containerRef.current.appendChild(script);

    return () => {
      delete (window as unknown as Record<string, unknown>)[callbackName];
    };
  }, [botName, buttonSize, cornerRadius, requestAccess, showUserPhoto]);

  if (!botName) return null;

  return <div ref={containerRef} style={{ display: 'flex', justifyContent: 'center' }} />;
}
