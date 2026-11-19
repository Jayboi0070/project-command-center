import { get, post } from './api.js';
const fromB64 = (s) => { const r = atob((s + '='.repeat((4 - (s.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(r, (c) => c.charCodeAt(0)); };
export const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
export const supported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

// 'need-install' | 'blocked' | 'off' | 'on'
export async function status() {
  if (!supported()) return 'need-install';
  if (Notification.permission === 'denied') return 'blocked';
  try {
    const reg = await navigator.serviceWorker.getRegistration('sw.js');
    return Notification.permission === 'granted' && reg && (await reg.pushManager.getSubscription()) ? 'on' : 'off';
  } catch { return 'off'; }
}
export async function enable() {
  if (!supported()) throw new Error('Add the app to your Home Screen first, then open it from there.');
  const perm = await Notification.requestPermission();            // must be triggered by a tap
  if (perm !== 'granted') throw new Error('Permission was not granted. You can allow notifications in your phone settings.');
  const { publicKey } = await get('/api/push?action=key');
  const reg = await navigator.serviceWorker.register('sw.js');
  await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription()) || (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: fromB64(publicKey) }));
  await post('/api/push', { action: 'subscribe', subscription: sub.toJSON() });
}
export async function disable() {
  const reg = await navigator.serviceWorker.getRegistration('sw.js'); const sub = await reg?.pushManager.getSubscription();
  if (sub) { await post('/api/push', { action: 'unsubscribe', endpoint: sub.endpoint }).catch(() => {}); await sub.unsubscribe(); }
}
export const test = () => post('/api/push', { action: 'test' });
