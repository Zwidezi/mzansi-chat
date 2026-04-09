import { useState, useEffect, useRef } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { Plus, Users, Ghost, RefreshCw, X } from 'lucide-react';
import { 
  getCommunities, joinCommunity, getActiveStatuses, uploadStatusFile, createCommunity 
} from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import GoogleAd from '../components/common/GoogleAd';

const StatusViewer = ({ statuses, userHandle, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const duration = 5000; // 5 seconds per status
    const interval = 50;
    const step = (interval / duration) * 100;
    
    const timer = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          if (currentIndex < statuses.length - 1) {
            setCurrentIndex(currentIndex + 1);
            return 0;
          } else {
            onClose();
            return 100;
          }
        }
        return p + step;
      });
    }, interval);
    
    return () => clearInterval(timer);
  }, [currentIndex, statuses, onClose]);

  const currentStatus = statuses[currentIndex];

  return (
    <div className="status-viewer-overlay" style={{ position: 'fixed', inset: 0, background: 'black', zIndex: 3000, display: 'flex', flexDirection: 'column' }}>
      <div className="status-progress-container" style={{ display: 'flex', gap: '4px', padding: '12px' }}>
        {statuses.map((s, i) => (
          <div key={s.id} className="status-progress-bar" style={{ flex: 1, height: '3px', background: 'rgba(255,255,255,0.2)', borderRadius: '2px' }}>
            <div className="status-progress-fill" style={{ width: i < currentIndex ? '100%' : i === currentIndex ? `${progress}%` : '0%', height: '100%', background: 'white', transition: 'width 0.1s linear' }} />
          </div>
        ))}
      </div>
      <header style={{ padding: '0 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
         <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="avatar" style={{ width: '32px', height: '32px', background: 'var(--primary)', color: 'white', borderRadius: '16px' }}>{userHandle[0].toUpperCase()}</div>
            <span style={{ fontWeight: '800' }}>@{userHandle}</span>
         </div>
         <button onClick={onClose}><X size={24} color="white" /></button>
      </header>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
         {currentStatus.media_type === 'video' ? (
           <video src={currentStatus.media_url} autoPlay muted playsInline style={{ maxWidth: '100%', maxHeight: '80%' }} />
         ) : (
           <img src={currentStatus.media_url} alt="Status" style={{ maxWidth: '100%', maxHeight: '80%' }} />
         )}
      </div>
    </div>
  );
};

const Updates = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { t } = useOutletContext();
  
  const [communities, setCommunities] = useState([]);
  const [groupedStatuses, setGroupedStatuses] = useState({});
  const [loading, setLoading] = useState(true);
  const [viewingUser, setViewingUser] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProfile, setNewProfile] = useState({ name: '', description: '', tag: 'active' });
  const [creating, setCreating] = useState(false);
  const fileInputRef = useRef();

  useEffect(() => {
    const loadData = async () => {
      const comms = await getCommunities();
      setCommunities(comms);
      
      const { data: statusData } = await getActiveStatuses();
      setGroupedStatuses(statusData || {});
      
      setLoading(false);
    };
    loadData();
  }, []);

  const handleStatusUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !currentUser) return;
    setLoading(true);
    await uploadStatusFile(currentUser.handle, file);
    const { data: statusData } = await getActiveStatuses();
    setGroupedStatuses(statusData || {});
    setLoading(false);
  };

  const handleJoin = async (commId) => {
    if (!currentUser) return;
    await joinCommunity(commId, currentUser.handle);
    navigate(`/chat/${commId}`);
  };

  const handleCreateCommunity = async () => {
    if (!currentUser || !newProfile.name) return;
    setCreating(true);
    const { data } = await createCommunity(newProfile.name, newProfile.description, newProfile.tag, currentUser.handle);
    setCreating(false);
    if (data) {
      setShowCreateModal(false);
      navigate(`/chat/${data.id}`);
    }
  };

  return (
    <div className="screen-container">
      <div className="discovery-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: '800' }}>{t.updates}</h2>
        <button className="btn-primary" style={{ padding: '6px 12px', borderRadius: '12px' }} onClick={() => setShowCreateModal(true)}>+ Create</button>
      </div>

      {/* Statuses Row */}
      <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '20px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', minWidth: '70px', cursor: 'pointer' }} onClick={() => fileInputRef.current?.click()}>
          <div style={{ width: '64px', height: '64px', borderRadius: '32px', background: 'var(--primary-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
             <Plus size={28} color="white" />
             <div style={{ position: 'absolute', bottom: 0, right: 0, background: 'var(--primary)', borderRadius: '50%', width: '22px', height: '22px', border: '3px solid var(--bg-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Plus size={12} color="white" />
             </div>
          </div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Add Status</span>
          <input type="file" ref={fileInputRef} onChange={handleStatusUpload} style={{ display: 'none' }} accept="image/*,video/*" />
        </div>

        {Object.entries(groupedStatuses).map(([handle, userStatuses]) => (
          handle !== currentUser?.handle && (
            <div key={handle} onClick={() => setViewingUser(handle)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', minWidth: '70px', cursor: 'pointer' }}>
               <div style={{ width: '64px', height: '64px', borderRadius: '32px', padding: '3px', border: '2px solid var(--primary)' }}>
                  <div style={{ width: '100%', height: '100%', borderRadius: '30px', background: 'var(--surface-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                     <span style={{ color: 'var(--primary)', fontWeight: '800' }}>{handle[0].toUpperCase()}</span>
                  </div>
               </div>
               <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>@{handle}</span>
            </div>
          )
        ))}
      </div>

      {viewingUser && <StatusViewer statuses={groupedStatuses[viewingUser]} userHandle={viewingUser} onClose={() => setViewingUser(null)} />}

      <h2 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '16px' }}>{t.discovery}</h2>
      
      <GoogleAd slot="updates-discovery-top" />

      <div className="discovery-list">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}><RefreshCw className="biometric-icon" /></div>
        ) : (
          communities.map(comm => (
            <div key={comm.id} className="community-card">
               <div className="community-tag">{comm.tag}</div>
               <h3 style={{ fontSize: '1.15rem', fontWeight: '800' }}>{comm.name}</h3>
               <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: '8px 0' }}>{comm.description}</p>
               <button className="join-btn-ghost" onClick={() => handleJoin(comm.id)}><Ghost size={18} /> {t.join_ghost}</button>
            </div>
          ))
        )}
      </div>

      {showCreateModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }} onClick={() => setShowCreateModal(false)}>
           <div style={{ background: 'var(--surface)', padding: '24px', borderRadius: '24px', width: '100%', maxWidth: '400px', border: '1px solid var(--border)' }} onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                 <h2 style={{ fontSize: '1.25rem', fontWeight: '800' }}>Create Community</h2>
                 <button style={{ background: 'transparent', border: 'none', cursor: 'pointer' }} onClick={() => setShowCreateModal(false)}>
                   <X size={24} color="var(--text-muted)" />
                 </button>
              </div>
              <div className="input-field" style={{ marginBottom: '16px' }}>
                 <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '8px', display: 'block' }}>Name</label>
                 <input type="text" value={newProfile.name} onChange={e => setNewProfile({...newProfile, name: e.target.value})} placeholder="e.g. Mzansi Web Devs" style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'var(--bg-dark)', border: '1px solid var(--border)', color: 'white', fontSize: '1rem', outline: 'none' }} />
              </div>
              <div className="input-field" style={{ marginBottom: '16px' }}>
                 <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '8px', display: 'block' }}>Description</label>
                 <textarea value={newProfile.description} onChange={e => setNewProfile({...newProfile, description: e.target.value})} placeholder="What's this community about?" style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'var(--bg-dark)', border: '1px solid var(--border)', color: 'white', minHeight: '80px', fontFamily: 'inherit', fontSize: '1rem', resize: 'vertical', outline: 'none' }} />
              </div>
              <div className="input-field" style={{ marginBottom: '24px' }}>
                 <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '8px', display: 'block' }}>Tag</label>
                 <select value={newProfile.tag} onChange={e => setNewProfile({...newProfile, tag: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'var(--bg-dark)', border: '1px solid var(--border)', color: 'white', fontSize: '1rem', outline: 'none' }}>
                    <option value="active">Active</option>
                    <option value="verified">Verified</option>
                    <option value="promoted">Promoted</option>
                 </select>
              </div>
              <button 
                className="btn-primary-full" 
                onClick={handleCreateCommunity} 
                disabled={creating || !newProfile.name.trim()}
                style={{ opacity: (creating || !newProfile.name.trim()) ? 0.5 : 1, width: '100%', display: 'flex', justifyContent: 'center' }}
              >
                {creating ? 'Creating...' : 'Create & Join Group'}
              </button>
           </div>
        </div>
      )}
    </div>
  );
};

export default Updates;
