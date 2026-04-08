import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Initialize OneSignal for Push Notifications (SINGLE init point — v3 API)
import OneSignal from 'react-onesignal';

const onesignalAppId = import.meta.env.VITE_ONESIGNAL_APP_ID;

if (!onesignalAppId) {
  console.warn('OneSignal App ID not set (VITE_ONESIGNAL_APP_ID). Push notifications disabled.');
}

onesignalAppId && OneSignal.init({
  appId: onesignalAppId,
  allowLocalhostAsSecureOrigin: true,
  autoResubscribe: true,
  serviceWorkerParam: { scope: '/' },
  serviceWorkerPath: '/OneSignalSDKWorker.js',
  notifyButton: {
    enable: false
  }
}).then(() => {
  console.log("OneSignal initialized (v3)");

  // Handle notification clicks — dispatch custom event for React Router navigation
  OneSignal.Notifications.addEventListener('click', (event) => {
    console.log('OneSignal notification clicked:', event);
    const url = event.notification?.data?.url || event.notification?.launchURL || '/';
    // Dispatch a custom event so the React app can navigate without full page reload
    window.dispatchEvent(new CustomEvent('mzansi-notification-click', { detail: { url } }));
  });
}).catch(err => console.warn("OneSignal init failed:", err));

// No custom sw.js registration needed — OneSignal manages its own service worker

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
