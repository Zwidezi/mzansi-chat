import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header';
import BottomNav from './BottomNav';
import { useAuth } from '../../context/AuthContext';
import { TRANSLATIONS } from '../../constants/translations';
import { useState, useEffect, useRef } from 'react';
import { setOnlineStatus } from '../../lib/supabaseClient';

const MainShell = () => {
  const { currentUser, handleLogout } = useAuth();
  const location = useLocation();
  const [lang] = useState(localStorage.getItem('mzansi_lang') || 'English');
  const t = TRANSLATIONS[lang];
  const heartbeatRef = useRef(null);

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
