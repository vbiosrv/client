import { IconUser, IconServer, IconCreditCard, IconReceipt } from '@tabler/icons-react';

export const NAV_ITEMS = [
  { path: '/', labelKey: 'nav.home', icon: IconUser },
  { path: '/services', labelKey: 'nav.services', icon: IconServer },
  { path: '/tickets', labelKey: 'nav.tickets', icon: IconMessageCircle },
  { path: '/payments', labelKey: 'nav.payments', icon: IconCreditCard },
  { path: '/withdrawals', labelKey: 'nav.withdrawals', icon: IconReceipt },
] as const;
