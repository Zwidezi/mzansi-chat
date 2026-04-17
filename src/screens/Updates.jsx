import { useState, useEffect, useRef } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { Plus, Users, Ghost, RefreshCw, X, Music, Type, Image as ImageIcon, Send, Volume2 } from 'lucide-react';
import { 
  getCommunities, joinCommunity, getActiveStatuses, uploadStatusFile, createCommunity, sendMessage, getDmChatId 
} from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import GoogleAd from '../components/common/GoogleAd';

const StatusViewer = ({ statuses, userHandle, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [replyText, setReplyText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const audioRef = useRef(null);
  const { currentUser } = useAuth();

  const currentStatus = statuses[currentIndex];

  useEffect(() => {
    const duration = 5000; // 5 seconds per status
    const interval = 50;
    const step = (interval / duration) * 100;
    
    // Play audio if available
    if (currentStatus?.audio_url && audioRef.current) {
      audioRef.current.volume = 0.5;
      audioRef.current.play().catch(e => console.warn('[Status] Audio playback failed', e));
    }

    const timer = setInterval(() => {
      // Pause progress if user is typing a reply
      if (replyText.length > 0) return;

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
    
    return () => {
      clearInterval(timer);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    };
  }, [currentIndex, statuses, onClose, currentStatus]);

  const handleAction = async (content, type = 'reply') => {
    if (!currentUser || isSending) return;
    setIsSending(true);
    
    const chatId = getDmChatId(currentUser.handle, userHandle);
    const metadata = {
      status_action: true,
      status_id: currentStatus.id,
      action_type: type,
      status_thumb: currentStatus.media_url || null,
      status_caption: currentStatus.caption || null
    };

    await sendMessage(chatId, currentUser.handle, currentUser.name, content, 'status_action', metadata);
    
    if (type === 'reply') {
      setReplyText("");
      onClose(); // Close viewer after formal reply
    } else {
      setIsSending(false);
      // Maybe show a quick animation for reaction?
    }
  };

  const REACTIONS = [
    { emoji: '🇿🇦', label: 'Pride' },
    { emoji: '🔥', label: 'Lekker' },
    { emoji: '✊', label: 'Power' },
    { emoji: '❤️', label: 'Love' },
    { emoji: '✌️', label: 'Sharp' }
  ];

  return (
    <div className="status-viewer-overlay" style={{ position: 'fixed', inset: 0, background: 'black', zIndex: 5000, display: 'flex', flexDirection: 'column' }}>
      <div className="status-progress-container" style={{ display: 'flex', gap: '4px', padding: '12px', zIndex: 10 }}>
        {statuses.map((s, i) => (
          <div key={s.id} className="status-progress-bar" style={{ flex: 1, height: '3px', background: 'rgba(255,255,255,0.2)', borderRadius: '2px' }}>
            <div className="status-progress-fill" style={{ width: i < currentIndex ? '100%' : i === currentIndex ? `${progress}%` : '0%', height: '100%', background: 'white', transition: 'width 0.1s linear' }} />
          </div>
        ))}
      </div>
      
      <header style={{ padding: '0 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 }}>
         <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="avatar" style={{ width: '32px', height: '32px', background: 'var(--primary)', color: 'white', borderRadius: '16px' }}>{userHandle[0].toUpperCase()}</div>
            <span style={{ fontWeight: '800', color: 'white' }}>@{userHandle}</span>
         </div>
         <button onClick={onClose} style={{ background: 'transparent', border: 'none' }}><X size={24} color="white" /></button>
      </header>

      {/* Audio Element */}
      {currentStatus?.audio_url && <audio ref={audioRef} src={currentStatus.audio_url} />}

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
         {currentStatus.media_type === 'text' ? (
           <div className={`status-preview-area ${currentStatus.bg_color || 'bg-dark-slate'}`} style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div className="status-render-text">{currentStatus.caption}</div>
           </div>
         ) : currentStatus.media_type === 'video' ? (
           <video src={currentStatus.media_url} autoPlay muted playsInline style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
         ) : (
           <img src={currentStatus.media_url} alt="Status" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
         )}

         {/* Audio Indicator */}
         {currentStatus?.audio_url && (
           <div className="status-audio-indicator">
             <Volume2 size={14} />
             <div className="audio-bars">
               <div className="audio-bar" />
               <div className="audio-bar" />
               <div className="audio-bar" />
             </div>
           </div>
         )}

         {/* Caption Overlay */}
         {currentStatus.media_type !== 'text' && currentStatus.caption && (
           <div className="status-caption-overlay">
             {currentStatus.caption}
           </div>
         )}
      </div>

      <footer style={{ padding: '16px', zIndex: 10, background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)' }}>
         <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '12px' }}>
            {REACTIONS.map(r => (
               <button 
                 key={r.emoji} 
                 onClick={() => handleAction(r.emoji, 'reaction')} 
                 style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '40px', height: '40px', fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'transform 0.1s' }}
                 onMouseDown={e => e.target.style.transform = 'scale(0.9)'}
                 onMouseUp={e => e.target.style.transform = 'scale(1)'}
               >
                 {r.emoji}
               </button>
            ))}
         </div>
         <div style={{ display: 'flex', gap: '8px' }}>
            <input 
              type="text" 
              placeholder="Reply to status..." 
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAction(replyText)}
              style={{ flex: 1, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '20px', padding: '10px 16px', color: 'white', outline: 'none' }}
            />
            {replyText && (
               <button 
                  onClick={() => handleAction(replyText)}
                  style={{ background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '20px', padding: '0 16px', fontWeight: '800' }}
               >
                  <Send size={18} />
               </button>
            )}
         </div>
      </footer>
    </div>
  );
};

const MAX_STATUS_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const StatusCreator = ({ onUpload, onClose }) => {
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [audioFile, setAudioFile] = useState(null);
  const [caption, setCaption] = useState("");
  const [bgColor, setBgColor] = useState("bg-dark-slate");
  const [isTextOnly, setIsTextOnly] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadPhase, setUploadPhase] = useState(""); // 'compressing', 'uploading', 'saving', 'done'
  const [uploadError, setUploadError] = useState(null);
  const [progress, setProgress] = useState(0);

  const mediaRef = useRef();
  const audioRef = useRef();
  const progressTimer = useRef(null);

  const handleMediaPick = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadError(null);

    // File size check
    if (file.size > MAX_STATUS_FILE_SIZE) {
      const sizeMB = (file.size / 1024 / 1024).toFixed(1);
      setUploadError(`File too large (${sizeMB}MB). Max is 10MB.`);
      return;
    }

    setMediaFile(file);
    setIsTextOnly(false);
    
    const reader = new FileReader();
    reader.onloadend = () => setMediaPreview(reader.result);
    reader.readAsDataURL(file);
  };

  // Simulated progress that accelerates then slows near the end
  const startProgress = () => {
    setProgress(0);
    let current = 0;
    progressTimer.current = setInterval(() => {
      current += current < 60 ? 3 : current < 85 ? 1 : 0.2;
      if (current > 95) current = 95; // Never reach 100 until done
      setProgress(Math.min(current, 95));
    }, 200);
  };

  const stopProgress = (success) => {
    clearInterval(progressTimer.current);
    if (success) {
      setProgress(100);
    }
  };

  const handleUpload = async () => {
    setUploading(true);
    setUploadError(null);
    setUploadPhase(mediaFile ? 'compressing' : 'saving');
    startProgress();

    try {
      // Timeout: 30s for the whole operation
      const uploadPromise = onUpload(mediaFile, { 
        caption, 
        audioFile, 
        bgColor: isTextOnly ? bgColor : null 
      });

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Upload timed out. Check your connection and try again.')), 30000)
      );

      if (mediaFile) {
        setTimeout(() => setUploadPhase('uploading'), 1000);
      }
      setTimeout(() => setUploadPhase('saving'), mediaFile ? 5000 : 500);

      const result = await Promise.race([uploadPromise, timeoutPromise]);
      
      // Check if the parent returned an error
      if (result?.error) {
        throw new Error(result.error);
      }

      stopProgress(true);
      setUploadPhase('done');

      // Brief success flash before closing
      await new Promise(r => setTimeout(r, 600));
      onClose();
    } catch (err) {
      stopProgress(false);
      setUploadError(err.message || 'Upload failed. Please try again.');
      setUploading(false);
      setUploadPhase('');
      setProgress(0);
    }
  };

  const phaseLabel = {
    compressing: '📦 Compressing...',
    uploading: '☁️ Uploading...',
    saving: '💾 Saving...',
    done: '✅ Posted!'
  };

  return (
    <div className="status-creator-overlay">
      <header style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={uploading ? undefined : onClose} style={{ background: 'transparent', border: 'none', color: 'white', opacity: uploading ? 0.3 : 1 }}><X size={28} /></button>
        <h2 style={{ fontSize: '1.2rem', fontWeight: '900', color: 'white' }}>New Status</h2>
        <button 
          onClick={handleUpload} 
          disabled={uploading || (!mediaFile && !caption)}
          style={{ background: uploading ? 'rgba(14,192,223,0.4)' : 'var(--primary)', color: 'white', border: 'none', borderRadius: '12px', padding: '8px 20px', fontWeight: '800', opacity: (uploading || (!mediaFile && !caption)) ? 0.6 : 1, transition: 'all 0.2s' }}
        >
          {uploading ? <RefreshCw size={18} className="biometric-pulse" /> : <Send size={20} />}
        </button>
      </header>

      {/* Upload Progress Bar */}
      {uploading && (
        <div style={{ padding: '0 20px' }}>
          <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '8px', height: '6px', overflow: 'hidden', marginBottom: '8px' }}>
            <div style={{ 
              height: '100%', 
              background: uploadPhase === 'done' ? '#22c55e' : 'var(--primary-gradient)', 
              borderRadius: '8px', 
              width: `${progress}%`, 
              transition: 'width 0.3s ease-out' 
            }} />
          </div>
          <p style={{ textAlign: 'center', fontSize: '0.8rem', fontWeight: '700', color: uploadPhase === 'done' ? '#22c55e' : 'var(--primary)', marginBottom: '8px' }}>
            {phaseLabel[uploadPhase] || 'Processing...'}
          </p>
        </div>
      )}

      {/* Error Display */}
      {uploadError && (
        <div style={{ margin: '0 20px 12px', padding: '12px 16px', borderRadius: '12px', background: 'rgba(239,68,68,0.15)', color: '#f87171', fontSize: '0.85rem', fontWeight: '600', textAlign: 'center' }}>
          {uploadError}
        </div>
      )}

      <div className={`status-preview-area ${isTextOnly ? bgColor : ''}`}>
        {!isTextOnly && mediaPreview ? (
          mediaFile.type.startsWith('video/') ? (
            <video src={mediaPreview} autoPlay muted loop style={{ maxWidth: '100%', maxHeight: '100%' }} />
          ) : (
            <img src={mediaPreview} alt="Preview" style={{ maxWidth: '100%', maxHeight: '100%' }} />
          )
        ) : isTextOnly ? (
          <div className="status-render-text">{caption || "Type something..."}</div>
        ) : (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
             <ImageIcon size={48} style={{ marginBottom: '12px' }} />
             <p>Pick a photo/video or start typing</p>
          </div>
        )}

        <textarea 
          className="status-caption-input"
          placeholder={isTextOnly ? "" : "Add a caption..."}
          value={caption}
          onChange={(e) => {
            setCaption(e.target.value);
            if (!mediaFile) setIsTextOnly(true);
          }}
          maxLength={280}
          disabled={uploading}
        />
      </div>

      <div className="status-creator-controls">
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
          <button 
            onClick={() => mediaRef.current?.click()} 
            disabled={uploading}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', background: 'transparent', border: 'none', color: mediaFile ? 'var(--primary)' : 'white', opacity: uploading ? 0.4 : 1 }}
          >
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ImageIcon size={24} />
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: '700' }}>Media</span>
          </button>

          <button 
            onClick={() => audioRef.current?.click()} 
            disabled={uploading}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', background: 'transparent', border: 'none', color: audioFile ? 'var(--primary)' : 'white', opacity: uploading ? 0.4 : 1 }}
          >
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Music size={24} />
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: '700' }}>{audioFile ? 'Music ✅' : 'Add Sound'}</span>
          </button>

          <button 
            onClick={() => {
              setIsTextOnly(!isTextOnly);
              if (!isTextOnly) { setMediaFile(null); setMediaPreview(null); }
            }} 
            disabled={uploading}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', background: 'transparent', border: 'none', color: isTextOnly ? 'var(--primary)' : 'white', opacity: uploading ? 0.4 : 1 }}
          >
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Type size={24} />
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: '700' }}>Text</span>
          </button>
        </div>

        {isTextOnly && (
          <div className="gradient-presets">
             {['bg-sunset', 'bg-ocean', 'bg-forest', 'bg-royal', 'bg-dark-slate'].map(g => (
               <div 
                 key={g} 
                 className={`gradient-swatch ${g} ${bgColor === g ? 'active' : ''}`} 
                 onClick={() => !uploading && setBgColor(g)}
               />
             ))}
          </div>
        )}

        <input type="file" ref={mediaRef} style={{ display: 'none' }} accept="image/*,video/*" onChange={handleMediaPick} />
        <input type="file" ref={audioRef} style={{ display: 'none' }} accept="audio/*" onChange={(e) => setAudioFile(e.target.files[0])} />
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
  const [showStatusCreator, setShowStatusCreator] = useState(false);
  const [newProfile, setNewProfile] = useState({ name: '', description: '', tag: 'active' });
  const [creating, setCreating] = useState(false);

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

  const handleStatusUpload = async (file, options) => {
    if (!currentUser) return { error: 'Not logged in' };
    try {
      const result = await uploadStatusFile(currentUser.handle, file, options);
      if (result?.error) {
        console.error('[Status] Upload failed:', result.error);
        return { error: typeof result.error === 'string' ? result.error : 'Upload failed. Try again.' };
      }
      // Refresh statuses in background (don't block)
      getActiveStatuses().then(({ data: statusData }) => {
        setGroupedStatuses(statusData || {});
      });
      return { success: true };
    } catch (err) {
      console.error('[Status] Upload error:', err);
      return { error: err.message || 'Upload failed. Try again.' };
    }
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
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', minWidth: '70px', cursor: 'pointer' }} onClick={() => setShowStatusCreator(true)}>
          <div style={{ width: '64px', height: '64px', borderRadius: '32px', background: 'var(--primary-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
             <Plus size={28} color="white" />
             <div style={{ position: 'absolute', bottom: 0, right: 0, background: 'var(--primary)', borderRadius: '50%', width: '22px', height: '22px', border: '3px solid var(--bg-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Plus size={12} color="white" />
             </div>
          </div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Add Status</span>
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

      {showStatusCreator && <StatusCreator onUpload={handleStatusUpload} onClose={() => setShowStatusCreator(false)} />}
      
      {viewingUser && <StatusViewer statuses={groupedStatuses[viewingUser]} userHandle={viewingUser} onClose={() => setViewingUser(null)} />}

      <h2 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '16px' }}>{t.discovery}</h2>
      
      <GoogleAd slot="updates-discovery-top" />

      <div className="discovery-list">
        {loading && !showStatusCreator ? (
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
