import type { Messages } from '@/i18n/types';
import { enUS } from '@/i18n/locales/en-US';

/** UK English shares US copy; region labels already distinguish US/UK. */
export const enGB: Messages = {
  ...enUS,
  settings: {
    ...enUS.settings,
    customerCenterClosed: 'Subscription centre closed.',
  },
};
