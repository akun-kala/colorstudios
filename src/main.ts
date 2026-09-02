import { initUI } from './ui';

initUI();

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/src/sw.ts', { type: 'module' })
    .then(() => console.log('SW registered'))
    .catch(err => console.log('SW failed', err));
}
