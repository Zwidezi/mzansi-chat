import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header';
import BottomNav from './BottomNav';
import { useAuth } from '../../context/AuthContext';
import { TRANSLATIONS } from '../../constants/translations';
import { useState } from 'react';

const MainShell = () => {
  const { currentUser, handleLogout } = useAuth();
  const location = useLocation();
  const [lang] = useState(localStorage.getItem('mzansi_lang') || 'English');
  const t = TRANSLATIONS[lang];

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
