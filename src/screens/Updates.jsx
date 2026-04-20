import { useState, useEffect, useRef } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { Plus, Users, Ghost, RefreshCw, X, Music, Type, Image as ImageIcon, Send, Volume2, ChevronLeft, ChevronRight, MessageCircle } from 'lucide-react';
import { 
  getCommunities, joinCommunity, getActiveStatuses, uploadStatusFile, createCommunity, sendMessage, getDmChatId 
} from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import GoogleAd from '../components/common/GoogleAd';

// Helper: format time ago (WhatsApp-style)
const getTimeAgo = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) {
    const hours = date.getHours().toString().padStart(2, '0');
    const mins = date.getMinutes().toString().padStart(2, '0');
    return `Today, ${hours}:${mins}`;
  }
  return 'Yesterday';
};

const StatusViewer = ({ statuses, userHandle, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [replyText, setReplyText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [sentReaction, setSentReaction] = useState(null); // brief animation
  const audioRef = useRef(null);
  const holdTimer = useRef(null);
  const isHolding = useRef(false);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const { currentUser } = useAuth();

  const currentStatus = statuses[currentIndex];

  // Timer: pause when isPaused or typing
  useEffect(() => {
    const duration = 5000;
    const interval = 50;
    const step = (interval / duration) * 100;
    
    if (currentStatus?.audio_url && audioRef.current) {
      audioRef.current.volume = 0.5;
      if (!isPaused) {
        audioRef.current.play().catch(() => {});
      } else {
        audioRef.current.pause();
      }
    }

    const timer = setInterval(() => {
      if (isPaused || replyText.length > 0) return;

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
  }, [currentIndex, statuses, onClose, currentStatus, isPaused]);

  // ── Hold to Pause (touch + mouse) ──
  const handleHoldStart = (e) => {
    // Don't pause if tapping on footer/buttons
    if (e.target.closest('footer') || e.target.closest('button') || e.target.closest('input')) return;
    
    touchStartX.current = e.touches ? e.touches[0].clientX : e.clientX;
    touchStartY.current = e.touches ? e.touches[0].clientY : e.clientY;
    isHolding.current = false;
    
    holdTimer.current = setTimeout(() => {
      isHolding.current = true;
      setIsPaused(true);
    }, 200); // 200ms = hold threshold
  };

  const handleHoldEnd = (e) => {
    clearTimeout(holdTimer.current);
    
    if (isHolding.current) {
      // Was holding — just unpause
      setIsPaused(false);
      isHolding.current = false;
      return;
    }
    
    // Was a quick tap — navigate left/right
    if (e.target.closest('footer') || e.target.closest('button') || e.target.closest('input')) return;
    
    const clientX = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
    const screenW = window.innerWidth;
    
    if (clientX < screenW * 0.3) {
      // Tap left = previous
      if (currentIndex > 0) {
        setCurrentIndex(currentIndex - 1);
        setProgress(0);
      }
    } else if (clientX > screenW * 0.7) {
      // Tap right = next
      if (currentIndex < statuses.length - 1) {
        setCurrentIndex(currentIndex + 1);
        setProgress(0);
      } else {
        onClose();
      }
    }
  };

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
      onClose();
    } else {
      // Show reaction sent animation
      setSentReaction(content);
      setTimeout(() => setSentReaction(null), 1200);
      setIsSending(false);
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
    <div 
      className="status-viewer-overlay" 
      style={{ position: 'fixed', inset: 0, background: 'black', zIndex: 5000, display: 'flex', flexDirection: 'column', userSelect: 'none', WebkitUserSelect: 'none' }}
      onTouchStart={handleHoldStart}
      onTouchEnd={handleHoldEnd}
      onMouseDown={handleHoldStart}
      onMouseUp={handleHoldEnd}
    >
      {/* Progress bars */}
      <div className="status-progress-container" style={{ display: 'flex', gap: '4px', padding: '12px 12px 8px', zIndex: 10 }}>
        {statuses.map((s, i) => (
          <div key={s.id} className="status-progress-bar" style={{ flex: 1, height: '3px', background: 'rgba(255,255,255,0.2)', borderRadius: '2px' }}>
            <div className="status-progress-fill" style={{ 
              width: i < currentIndex ? '100%' : i === currentIndex ? `${progress}%` : '0%', 
              height: '100%', background: 'white', borderRadius: '2px',
              transition: isPaused ? 'none' : 'width 0.1s linear' 
            }} />
          </div>
        ))}
      </div>
      
      {/* Header */}
      <header style={{ padding: '0 16px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 }}>
         <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="avatar" style={{ width: '32px', height: '32px', background: 'var(--primary)', color: 'white', borderRadius: '16px' }}>{userHandle[0].toUpperCase()}</div>
            <span style={{ fontWeight: '800', color: 'white', fontSize: '0.9rem' }}>@{userHandle}</span>
         </div>
         <button onClick={onClose} style={{ background: 'transparent', border: 'none', padding: '8px' }}><X size={24} color="white" /></button>
      </header>

      {/* Audio Element */}
      {currentStatus?.audio_url && <audio ref={audioRef} src={currentStatus.audio_url} />}

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
         {currentStatus.media_type === 'text' ? (
           <div className={`status-preview-area ${currentStatus.bg_color || 'bg-dark-slate'}`} style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div className="status-render-text">{currentStatus.caption}</div>
           </div>
         ) : currentStatus.media_type === 'video' ? (
           <video src={currentStatus.media_url} autoPlay muted={!isPaused} playsInline style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
         ) : (
           <img src={currentStatus.media_url} alt="Status" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
         )}

         {/* Paused Indicator */}
         {isPaused && (
           <div style={{
             position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
             background: 'rgba(0,0,0,0.6)', borderRadius: '50%', width: '64px', height: '64px',
             display: 'flex', alignItems: 'center', justifyContent: 'center',
             backdropFilter: 'blur(8px)', animation: 'fadeIn 0.2s ease'
           }}>
             <div style={{ width: '8px', height: '24px', background: 'white', borderRadius: '2px', marginRight: '6px' }} />
             <div style={{ width: '8px', height: '24px', background: 'white', borderRadius: '2px' }} />
           </div>
         )}

         {/* Reaction Sent Animation */}
         {sentReaction && (
           <div style={{
             position: 'absolute', bottom: '120px', left: '50%', transform: 'translateX(-50%)',
             fontSize: '3rem', animation: 'reactionFloat 1.2s ease-out forwards',
             pointerEvents: 'none', zIndex: 20
           }}>
             {sentReaction}
           </div>
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

         {/* Tap zones indicator (subtle) */}
         {currentIndex > 0 && (
           <div style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', opacity: 0.15, pointerEvents: 'none' }}>
             <ChevronLeft size={28} color="white" />
           </div>
         )}
         {currentIndex < statuses.length - 1 && (
           <div style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', opacity: 0.15, pointerEvents: 'none' }}>
             <ChevronRight size={28} color="white" />
           </div>
         )}
      </div>

      {/* Footer: Reactions + Reply */}
      <footer style={{ padding: '12px 16px 16px', zIndex: 10, background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)' }}>
         <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '10px' }}>
            {REACTIONS.map(r => (
               <button 
                 key={r.emoji} 
                 onClick={() => handleAction(r.emoji, 'reaction')} 
                 style={{ 
                   background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', 
                   width: '44px', height: '44px', fontSize: '1.3rem', 
                   display: 'flex', alignItems: 'center', justifyContent: 'center', 
                   cursor: 'pointer', transition: 'transform 0.15s, background 0.15s',
                   backdropFilter: 'blur(8px)'
                 }}
                 onTouchStart={e => e.currentTarget.style.transform = 'scale(1.2)'}
                 onTouchEnd={e => e.currentTarget.style.transform = 'scale(1)'}
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
              onKeyDown={e => e.key === 'Enter' && replyText && handleAction(replyText)}
              onFocus={() => setIsPaused(true)}
              onBlur={() => { if (!replyText) setIsPaused(false); }}
              style={{ flex: 1, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '24px', padding: '12px 18px', color: 'white', outline: 'none', fontSize: '0.9rem' }}
            />
            {replyText && (
               <button 
                  onClick={() => handleAction(replyText)}
                  style={{ background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '50%', width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
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

  // Simulated progress — slow enough for mobile data
  const startProgress = () => {
    setProgress(0);
    let current = 0;
    progressTimer.current = setInterval(() => {
      current += current < 30 ? 1.5 : current < 60 ? 0.8 : current < 85 ? 0.3 : 0.1;
      if (current > 92) current = 92; // Never reach 100 until done
      setProgress(Math.min(current, 92));
    }, 300);
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
      // Phase transitions for visual feedback
      if (mediaFile) {
        setTimeout(() => setUploadPhase('uploading'), 2000);
      }
      setTimeout(() => setUploadPhase('saving'), mediaFile ? 15000 : 1000);

      // No timeout — let the upload complete on its own
      const result = await onUpload(mediaFile, { 
        caption, 
        audioFile, 
        bgColor: isTextOnly ? bgColor : null 
      });
      
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

      {/* WhatsApp-style Status Section */}
      <div style={{ marginBottom: '24px' }}>
        {/* My Status */}
        <div 
          onClick={() => setShowStatusCreator(true)} 
          style={{ 
            display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 0', 
            cursor: 'pointer', borderBottom: '1px solid var(--border)' 
          }}
        >
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div style={{ 
              width: '52px', height: '52px', borderRadius: '50%', 
              background: groupedStatuses[currentUser?.handle] ? 'var(--primary)' : 'var(--surface-light)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: groupedStatuses[currentUser?.handle] ? '2px solid var(--primary)' : '2px solid var(--border)',
              overflow: 'hidden'
            }}>
              {currentUser?.profile_pic ? (
                <img src={currentUser.profile_pic} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ color: 'var(--text-muted)', fontWeight: '800', fontSize: '1.2rem' }}>
                  {currentUser?.handle?.[0]?.toUpperCase() || '?'}
                </span>
              )}
            </div>
            <div style={{ 
              position: 'absolute', bottom: -2, right: -2, 
              background: 'var(--primary)', borderRadius: '50%', 
              width: '20px', height: '20px', 
              border: '2px solid var(--bg-dark)', 
              display: 'flex', alignItems: 'center', justifyContent: 'center' 
            }}>
              <Plus size={12} color="white" />
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: '700', fontSize: '0.95rem', marginBottom: '2px' }}>My Status</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              {groupedStatuses[currentUser?.handle] 
                ? `${groupedStatuses[currentUser.handle].length} update${groupedStatuses[currentUser.handle].length > 1 ? 's' : ''} • Tap to view`
                : 'Tap to add status update'
              }
            </p>
          </div>
        </div>

        {/* View own status if exists */}
        {groupedStatuses[currentUser?.handle] && (
          <div 
            onClick={() => setViewingUser(currentUser.handle)}
            style={{ padding: '8px 0 0 66px', cursor: 'pointer' }}
          >
            <p style={{ color: 'var(--primary)', fontSize: '0.8rem', fontWeight: '600' }}>
              👁 View your status
            </p>
          </div>
        )}

        {/* Recent Updates Header */}
        {Object.keys(groupedStatuses).filter(h => h !== currentUser?.handle).length > 0 && (
          <p style={{ 
            fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', 
            textTransform: 'uppercase', letterSpacing: '0.05em',
            marginTop: '20px', marginBottom: '8px' 
          }}>
            Recent updates
          </p>
        )}

        {/* Other Users' Statuses - WhatsApp-style vertical list */}
        {Object.entries(groupedStatuses)
          .filter(([handle]) => handle !== currentUser?.handle)
          .map(([handle, userStatuses]) => {
            const latestStatus = userStatuses[userStatuses.length - 1];
            const timeAgo = getTimeAgo(latestStatus?.created_at);
            const statusCount = userStatuses.length;

            return (
              <div 
                key={handle} 
                onClick={() => setViewingUser(handle)} 
                style={{ 
                  display: 'flex', alignItems: 'center', gap: '14px', 
                  padding: '10px 0', cursor: 'pointer',
                  borderBottom: '1px solid rgba(255,255,255,0.04)'
                }}
              >
                {/* Avatar with segmented ring */}
                <div style={{ flexShrink: 0, position: 'relative' }}>
                  <svg width="56" height="56" viewBox="0 0 56 56">
                    {/* Status ring segments */}
                    {Array.from({ length: statusCount }).map((_, i) => {
                      const gap = statusCount > 1 ? 4 : 0;
                      const totalDeg = 360 - (gap * statusCount);
                      const segDeg = totalDeg / statusCount;
                      const startDeg = i * (segDeg + gap) - 90;
                      const endDeg = startDeg + segDeg;
                      const r = 26;
                      const cx = 28, cy = 28;
                      const startRad = (startDeg * Math.PI) / 180;
                      const endRad = (endDeg * Math.PI) / 180;
                      const x1 = cx + r * Math.cos(startRad);
                      const y1 = cy + r * Math.sin(startRad);
                      const x2 = cx + r * Math.cos(endRad);
                      const y2 = cy + r * Math.sin(endRad);
                      const largeArc = segDeg > 180 ? 1 : 0;
                      return (
                        <path
                          key={i}
                          d={`M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`}
                          fill="none"
                          stroke="var(--primary)"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                        />
                      );
                    })}
                  </svg>
                  <div style={{
                    position: 'absolute', top: '4px', left: '4px',
                    width: '48px', height: '48px', borderRadius: '50%',
                    background: 'var(--surface-light)', overflow: 'hidden',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <span style={{ color: 'var(--primary)', fontWeight: '800', fontSize: '1.1rem' }}>
                      {handle[0].toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Name & Time */}
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: '700', fontSize: '0.95rem', marginBottom: '2px' }}>@{handle}</p>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{timeAgo}</p>
                </div>
              </div>
            );
          })
        }

        {/* Empty state */}
        {Object.keys(groupedStatuses).filter(h => h !== currentUser?.handle).length === 0 && !loading && (
          <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)' }}>
            <p style={{ fontSize: '0.9rem', marginBottom: '4px' }}>No recent updates</p>
            <p style={{ fontSize: '0.8rem' }}>Status updates from other users will appear here</p>
          </div>
        )}
      </div>

      {showStatusCreator && <StatusCreator onUpload={handleStatusUpload} onClose={() => setShowStatusCreator(false)} />}
      
      {viewingUser && <StatusViewer statuses={groupedStatuses[viewingUser]} userHandle={viewingUser} onClose={() => setViewingUser(null)} />}

      <h2 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '16px' }}>{t.discovery}</h2>
      
      {/* Featured AI Assistant */}
      <div className="community-card" style={{ background: 'var(--primary-gradient)', border: 'none', marginBottom: '24px' }}>
         <div className="community-tag" style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}>Official AI</div>
         <h3 style={{ fontSize: '1.25rem', fontWeight: '900', color: 'white' }}>Lindiwe AI</h3>
         <p style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.9)', margin: '10px 0' }}>Your Ubuntu-powered assistant. Ask me about weather, jokes, or how to use MzansiChat.</p>
         <button 
           className="btn-primary" 
           style={{ background: 'white', color: 'var(--primary)', fontWeight: '800' }} 
           onClick={() => navigate('/chat/lindiwe')}
         >
           <MessageCircle size={18} /> Chat with Lindiwe
         </button>
      </div>

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
