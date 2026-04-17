import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header';
import BottomNav from './BottomNav';
import { useAuth } from '../../context/AuthContext';
import { TRANSLATIONS } from '../../constants/translations';
import { useState, useEffect, useRef } from 'react';
import { setOnlineStatus, subscribeToMessages } from '../../lib/supabaseClient';

const BEEP_URL = "https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3";

const MainShell = () => {
  const { currentUser, handleLogout } = useAuth();
  const location = useLocation();
  const [lang] = useState(localStorage.getItem('mzansi_lang') || 'English');
  const t = TRANSLATIONS[lang];
  const heartbeatRef = useRef(null);
  const audioRef = useRef(new Audio(BEEP_URL));

  // Notification Permission
  useEffect(() => {
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Global Message Listener (for beeping/notifications)
  useEffect(() => {
    if (!currentUser?.handle) return;

    // Listen to ALL messages
    const subscription = subscribeToMessages(null, (newMsg) => {
      // 1. Ignore if message is from us
      if (newMsg.sender_handle === currentUser.handle) return;

      // 2. Check if we are currently looking at this specific chat
      const currentChatIdFromUrl = location.pathname.startsWith('/chat/') ? location.pathname.split('/')[2] : null;
      if (newMsg.chat_id === currentChatIdFromUrl) return;

      // 3. Play sound (Beep)
      // Browsers usually block auto-play until user interaction, 
      // but since the user clicks to navigate/send messages, it should work.
      audioRef.current.play().catch(e => console.warn('[Notifications] Audio play blocked:', e));

      // 4. Show Browser Notification
      if (Notification.permission === 'granted') {
        const notification = new Notification(`Message from @${newMsg.sender_handle}`, {
          body: newMsg.type === 'text' ? newMsg.content : `Sent a ${newMsg.type}`,
          icon: '/favicon.svg', // Fallback to app icon
          tag: newMsg.chat_id // Prevent multiple notifications for same chat
        });

        notification.onclick = () => {
          window.focus();
          // Navigate to the chat if possible (this needs navigate hook, but we are inside MainShell)
          // For now just focus window
        };
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [currentUser?.handle, location.pathname]);

  // Presence tracking: online/offline + last_seen heartbeat
  useEffect(() => {
    if (!currentUser?.handle) return;

    const handle = currentUser.handle;

    // Set online immediately
    setOnlineStatus(handle, true);

    // Heartbeat: update last_seen every 2 minutes
    heartbeatRef.current = setInterval(() => {
      setOnlineStatus(handle, true);
    }, 120000); // 2 min

    // Visibility change: online when visible, offline when hidden
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        setOnlineStatus(handle, true);
      } else {
        setOnlineStatus(handle, false);
      }
    };

    // Before unload: set offline
    const handleUnload = () => {
      // Use sendBeacon for reliability during page close
      const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/users?handle=eq.${handle.toLowerCase()}`;
      const body = JSON.stringify({ is_online: false, last_seen: new Date().toISOString() });
      navigator.sendBeacon?.(url, new Blob([body], { type: 'application/json' }));
      // Fallback
      setOnlineStatus(handle, false);
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('beforeunload', handleUnload);

    return () => {
      clearInterval(heartbeatRef.current);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('beforeunload', handleUnload);
      setOnlineStatus(handle, false);
    };
  }, [currentUser?.handle]);

  // Protect route — show loading while auth is being determined
  if (!currentUser) {
    return (
      <div style={{
        minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg-dark, #0f0f0f)'
      }}>
        <div className="loading-spinner" />
      </div>
    );
  }

  return (
    <div className="main-wrapper" style={{ display: 'flex', flexDirection: 'column', height: '100dvh' }}>
      <Header
        user={currentUser}
        onLogout={handleLogout}
        showBack={location.pathname !== '/chats' && location.pathname !== '/updates' && location.pathname !== '/profile' && location.pathname !== '/savings' && location.pathname !== '/contacts'}
      />

      <main className="main-content" style={{ flexGrow: 1, overflowY: 'auto' }}>
        <Outlet context={{ t, lang }} />
      </main>

      <BottomNav t={t} />
    </div>
  );
};

export default MainShell;

