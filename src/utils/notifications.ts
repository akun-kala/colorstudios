export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  const permission = await Notification.requestPermission();
  return permission === 'granted';
}

export function sendNotification(title: string, body: string, tag?: string): void {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  new Notification(title, {
    body,
    tag,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    requireInteraction: true,
  });
}

export function scheduleNotification(title: string, body: string, delayMs: number): void {
  setTimeout(() => sendNotification(title, body), delayMs);
}
