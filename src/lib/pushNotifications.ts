import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { supabase } from './supabase';

let registered = false;

export async function registerPushNotifications(userId: string) {
  if (!Capacitor.isNativePlatform() || registered) return;
  registered = true;

  const permission = await PushNotifications.requestPermissions();
  if (permission.receive !== 'granted') {
    console.warn('Push notification permission denied');
    return;
  }

  await PushNotifications.register();

  PushNotifications.addListener('registration', async (token) => {
    const platform = Capacitor.getPlatform() as 'ios' | 'android';
    await supabase.from('device_tokens').upsert(
      { user_id: userId, token: token.value, platform, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,token' }
    );
  });

  PushNotifications.addListener('registrationError', (error) => {
    console.error('Push registration failed:', error);
  });

  PushNotifications.addListener('pushNotificationReceived', (notification) => {
    console.log('Push received in foreground:', notification);
  });

  PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
    const data = action.notification.data;
    if (data?.route) {
      window.location.href = data.route;
    }
  });
}

export async function unregisterPushNotifications(userId: string) {
  if (!Capacitor.isNativePlatform()) return;
  registered = false;
  await supabase.from('device_tokens').delete().eq('user_id', userId);
  await PushNotifications.removeAllListeners();
}
