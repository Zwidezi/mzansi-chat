import { useState, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { setOnlineStatus, uploadMedia, updateUser } from '../lib/supabaseClient';
import InviteCenter from '../components/profile/InviteCenter';
import { Shield, Smartphone, Globe, Moon, Camera } from 'lucide-react';

const Profile = () => {
  const { currentUser, setCurrentUser } = useAuth();
  const { t, lang, setLang } = useOutletContext();
  const [uploading, setUploading] = useState(false);
  const [ghostMode, setGhostMode] = useState(() => {
    return localStorage.getItem('mzansi_ghost_mode') === 'true';
  });

  const handleProfilePicChange = async (e) => {
    if (e.target.files && e.target.files[0]) {
      setUploading(true);
      const { url } = await uploadMedia(e.target.files[0], 'profiles', currentUser.handle);
      if (url) {
        await updateUser(currentUser.handle, { profile_pic: url });
        setCurrentUser({ ...currentUser, profile_pic: url });
      }
      setUploading(false);
    }
  };

  const toggleGhostMode = useCallback(async (enabled) => {
    setGhostMode(enabled);
    localStorage.setItem('mzansi_ghost_mode', String(enabled));
    if (currentUser?.handle) {
      // When ghost mode is ON, mark user as offline and hide last_seen
      await setOnlineStatus(currentUser.handle, !enabled);
    }
  }, [currentUser]);

  if (!currentUser) return null;

  return (
    <div className="screen-container">
      <div className="profile-card">
         <label className="profile-avatar-large" style={{ position: 'relative', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            {currentUser.profile_pic ? (
              <img src={currentUser.profile_pic} alt="PP" style={{ width: '100%', height: '100%', borderRadius: '30px', objectFit: 'cover', opacity: uploading ? 0.5 : 1 }} />
            ) : (
              <span style={{ opacity: uploading ? 0.5 : 1 }}>{currentUser.handle[0].toUpperCase()}</span>
            )}
            <div style={{ position: 'absolute', bottom: '-5px', right: '-5px', background: 'var(--primary)', padding: '10px', borderRadius: '50%', color: 'var(--bg-dark)', display: 'flex', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
               <Camera size={20} />
            </div>
            <input type="file" style={{ display: 'none' }} accept="image/*" onChange={handleProfilePicChange} disabled={uploading} />
         </label>
         <h2 style={{ fontSize: '1.5rem', fontWeight: '900' }}>{currentUser.name}</h2>
         <p style={{ color: 'var(--primary)', fontWeight: '700' }}>@{currentUser.handle}</p>
         
         <div className="privacy-banner" style={{ marginTop: '20px', textAlign: 'left' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
               <Shield size={16} color="var(--primary)" />
               <h4 style={{ fontSize: '0.8rem', fontWeight: '800' }}>{t.privacy_100}</h4>
            </div>
            <p style={{ fontSize: '0.75rem', opacity: 0.8 }}>Your account is secured with biometrics, PIN lock, and server-side access controls.</p>
         </div>
      </div>

      <div className="settings-group">
        <h3 className="settings-group-title">Preferences</h3>
        
        <div className="setting-item">
           <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Globe size={20} color="var(--primary)" />
              <div>
                 <div style={{ fontWeight: '700', fontSize: '0.9rem' }}>Language</div>
                 <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{lang}</div>
              </div>
           </div>
           <select 
             value={lang} 
             onChange={(e) => { setLang(e.target.value); localStorage.setItem('mzansi_lang', e.target.value); }}
             style={{ background: 'var(--bg-dark)', border: '1px solid var(--border)', borderRadius: '8px', color: 'white', padding: '4px 8px' }}
           >
              <option value="English">English</option>
              <option value="isiZulu">isiZulu</option>
              <option value="Afrikaans">Afrikaans</option>
           </select>
        </div>

        <div className="setting-item">
           <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Moon size={20} color="var(--primary)" />
              <div>
                 <div style={{ fontWeight: '700', fontSize: '0.9rem' }}>Ghost Mode</div>
                 <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t.global_ghost}</div>
              </div>
           </div>
           <label className="switch">
              <input type="checkbox" checked={ghostMode} onChange={(e) => toggleGhostMode(e.target.checked)} />
              <span className="slider"></span>
           </label>
        </div>
      </div>

      <InviteCenter t={t} />

      <div style={{ padding: '40px 0', textAlign: 'center', opacity: 0.5, fontSize: '0.7rem' }}>
        MzansiChat v1.4.2 <br /> Crafted with Ubuntu in South Africa 🇿🇦
      </div>
    </div>
  );
};

export default Profile;
