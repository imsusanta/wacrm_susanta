/**
 * Helpa Core Platform — Notifications Engine
 *
 * Tenant-aware notification dispatcher across WhatsApp, Web Push, and In-App channels.
 */

import { coreEvents } from '@/core/events';
import { dispatchPushToAccount } from '@/lib/notifications/web-push';

export interface NotificationPayload {
  recipientPhone?: string;
  recipientEmail?: string;
  recipientUserId?: string;
  title: string;
  body: string;
  url?: string;
  channel?: 'whatsapp' | 'in_app' | 'push' | 'email';
}

export async function sendNotification(
  accountId: string,
  payload: NotificationPayload
): Promise<boolean> {
  const channel = payload.channel || 'whatsapp';

  if (channel === 'whatsapp' && payload.recipientPhone) {
    try {
      await coreEvents.emit('notification.sent', accountId, {
        channel: 'whatsapp',
        recipientPhone: payload.recipientPhone,
        title: payload.title,
        body: payload.body,
      });

      return true;
    } catch (err) {
      console.error(
        '[Notifications] Failed to send WhatsApp notification:',
        err
      );
      return false;
    }
  }

  if (channel === 'push' || channel === 'in_app') {
    try {
      await dispatchPushToAccount(
        accountId,
        {
          title: payload.title,
          body: payload.body,
          url: payload.url,
        },
        payload.recipientUserId
      );

      await coreEvents.emit('notification.sent', accountId, {
        channel: 'push',
        title: payload.title,
        body: payload.body,
        url: payload.url,
      });

      return true;
    } catch (err) {
      console.error(
        '[Notifications] Failed to dispatch push notification:',
        err
      );
      return false;
    }
  }

  return true;
}
