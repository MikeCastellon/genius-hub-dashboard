import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

export async function hapticTap() {
  if (!Capacitor.isNativePlatform()) return;
  await Haptics.impact({ style: ImpactStyle.Light });
}

export async function hapticSuccess() {
  if (!Capacitor.isNativePlatform()) return;
  await Haptics.notification({ type: NotificationType.Success });
}

export async function hapticError() {
  if (!Capacitor.isNativePlatform()) return;
  await Haptics.notification({ type: NotificationType.Error });
}
