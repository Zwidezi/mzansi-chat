import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Initialize OneSignal for Push Notifications (SINGLE init point — v3 API)
import OneSignal from 'react-onesignal';

OneSignal.init({
  appId: "e15416de-5735-4b28-8b25-7c2f5a3c39cf",
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
