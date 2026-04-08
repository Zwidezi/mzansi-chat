import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import { 
  Plus, Send, Mic, XCircle, ImageIcon, Film, Landmark, MapPin, 
  PhoneCall, VideoIcon, Search, MoreVertical, X, CheckCheck,
  ChevronRight, Users, Users as UsersIcon, Database, Octagon, CheckCircle, Zap
} from 'lucide-react';
import { 
  getMessages, sendMessage, subscribeToMessages, getUser, uploadMedia, deleteMessage 
} from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useCall } from '../hooks/useCall';
import { VoiceNote, PaymentBubble, VideoBubble } from '../components/chat/ChatComponents';
import StokvelVault from '../components/chat/StokvelVault';
import { BANKS } from '../constants/appData';

const ChatScreen = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { makeCall } = useCall();
  const { t } = useOutletContext();
  
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(true);
  const [chatName, setChatName] = useState("Chat");
  const [isGroup, setIsGroup] = useState(false);
  const [isAI, setIsAI] = useState(false);
  const [showVault, setShowVault] = useState(false);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const [toast, setToast] = useState(null);
  
  const scrollRef = useRef();
  const fileInputRef = useRef();

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  // Determine the other user's handle for DM calls
  const getCallTarget = () => {
    // New format: handle1_handle2
    if (id.includes('_') && id.split('_').length === 2) {
      const parts = id.split('_');
      return parts.find(h => h !== currentUser?.handle?.toLowerCase()) || null;
    }
    // Legacy format: just a handle
    if (!isGroup && !isAI && isNaN(id)) {
      return id;
    }
    return null;
  };

  const handleVoiceCall = () => {
    const target = getCallTarget();
    if (!target) {
      showToast(isGroup ? t.beta_group_call : t.beta_ai_call);
      return;
    }
    makeCall(target, false);
  };

  const handleVideoCall = () => {
    const target = getCallTarget();
    if (!target) {
      showToast(isGroup ? t.beta_group_call : t.beta_ai_call);
      return;
    }
    makeCall(target, true);
  };

  useEffect(() => {
    const initChat = async () => {
      // Determine if it's a DM or Group
      if (id === 'lindiwe') {
        setChatName("Lindiwe (AI)");
        setIsAI(true);
      } else if (id.includes('_') && id.split('_').length === 2) {
        // DM with chat_id format: "handle1_handle2"
        const parts = id.split('_');
        const otherHandle = parts.find(h => h !== currentUser?.handle?.toLowerCase());
        if (otherHandle) {
          const user = await getUser(otherHandle);
          setChatName(user?.name || `@${otherHandle}`);
        }
      } else if (isNaN(id)) {
        // Legacy: simple handle for DM
        const user = await getUser(id);
        if (user) setChatName(user.name);
      } else {
        // Numeric ID for group/community
        setIsGroup(true);
      }

      const msgs = await getMessages(id);
      setMessages(msgs);
      setLoading(false);
    };

    initChat();

    // Subscribe to new messages
    const subscription = subscribeToMessages((newMsg) => {
      if (newMsg.chat_id === id) {
        setMessages(prev => [...prev, newMsg]);
      }
    });

    return () => subscription.unsubscribe();
  }, [id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!inputText.trim() || !currentUser) return;
    const { message, error } = await sendMessage(
      id, 
      currentUser.handle, 
      currentUser.name, 
      inputText.trim()
    );
    if (!error) setInputText("");
  };

  const handleMediaUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const { url, error } = await uploadMedia(file);
    if (!error) {
       await sendMessage(id, currentUser.handle, currentUser.name, url, 'image');
    }
  };

  const canCall = !isGroup && !isAI && (
    (id.includes('_') && id.split('_').length === 2) || isNaN(id)
  );

  return (
    <div className="chat-screen-wrapper" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Search & Vault Toggles UI omitted for brevity of refactor, focus on core architecture */}
      <header className="chat-header" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
         <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button onClick={() => navigate(-1)}><X size={20} /></button>
            <div>
               <div className="item-name" style={{ fontSize: '1rem' }}>{chatName}</div>
               <div style={{ fontSize: '0.7rem', color: 'var(--success)' }}>{isAI ? 'Thinking in Ubuntu' : 'online'}</div>
            </div>
         </div>
         <div style={{ display: 'flex', gap: '16px' }}>
            <PhoneCall 
              size={20} 
              color={canCall ? 'var(--primary)' : 'var(--text-muted)'} 
              style={{ cursor: 'pointer', opacity: canCall ? 1 : 0.4 }} 
              onClick={handleVoiceCall} 
            />
            <VideoIcon 
              size={20} 
              color={canCall ? 'var(--primary)' : 'var(--text-muted)'} 
              style={{ cursor: 'pointer', opacity: canCall ? 1 : 0.4 }} 
              onClick={handleVideoCall} 
            />
            {isGroup && <Database size={20} onClick={() => setShowVault(!showVault)} color={showVault ? 'var(--primary)' : 'var(--text-muted)'} />}
         </div>
      </header>

      <main className="main-content" style={{ flexGrow: 1, padding: '20px' }} ref={scrollRef}>
        {showVault ? (
          <StokvelVault messages={messages} t={t} onContribute={(amt) => sendMessage(id, currentUser.handle, currentUser.name, `Contributed R${amt} to the vault!`, 'contribution', { amount: amt })} />
        ) : (
          <div className="messages-list">
            {messages.map((msg, i) => (
              <div key={msg.id || i} className={`chat-bubble-container ${msg.sender_handle === currentUser?.handle ? 'self' : 'other'}`}>
                {msg.type === 'image' ? (
                  <div className="image-bubble" style={{ alignSelf: msg.sender_handle === currentUser?.handle ? 'flex-end' : 'flex-start', marginLeft: msg.sender_handle === currentUser?.handle ? 'auto' : 0, marginBottom: '12px' }}>
                    <img src={msg.content} alt="Media" style={{ maxWidth: '250px', borderRadius: '16px' }} />
                  </div>
                ) : msg.type === 'contribution' ? (
                  <div className="contribution-bubble">
                    <div style={{ fontSize: '0.6rem', opacity: 0.6, textTransform: 'uppercase' }}>Vault Contribution</div>
                    <div className="contribution-amount" style={{ fontSize: '1.5rem', fontWeight: '900', color: 'var(--success)' }}>R {msg.metadata?.amount}</div>
                    <div style={{ fontSize: '0.7rem' }}>@{msg.sender_handle} contributed</div>
                  </div>
                ) : (
                  <div className={`chat-bubble ${msg.sender_handle === currentUser?.handle ? 'self' : 'other'}`}>
                    {msg.content}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                        <CheckCheck size={14} color="var(--text-muted)" />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      <footer className="chat-input-area" style={{ padding: '12px 16px', background: 'var(--surface)', borderTop: '1px solid var(--border)' }}>
        {showActionSheet && (
          <div className="action-sheet" style={{ bottom: '80px', left: '16px', right: '16px', position: 'absolute' }}>
             <div className="action-item" onClick={() => fileInputRef.current.click()}><div className="action-icon-circle" style={{ background: '#10b981' }}><ImageIcon size={22} /></div></div>
             <div className="action-item"><div className="action-icon-circle" style={{ background: '#ec4899' }}><Film size={22} /></div></div>
             <div className="action-item" onClick={() => setShowBankModal(true)}><div className="action-icon-circle" style={{ background: '#f59e0b' }}><Landmark size={22} /></div></div>
             <div className="action-item"><div className="action-icon-circle" style={{ background: '#3b82f6' }}><MapPin size={22} /></div></div>
          </div>
        )}
        
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button onClick={() => setShowActionSheet(!showActionSheet)} style={{ color: showActionSheet ? 'var(--primary)' : 'var(--text-muted)' }}>
             <Plus size={28} style={{ transform: showActionSheet ? 'rotate(45deg)' : 'none', transition: 'transform 0.2s' }} />
          </button>
          <input 
            type="text" 
            value={inputText} 
            onChange={(e) => setInputText(e.target.value)} 
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={t.new_msg} 
            style={{ flex: 1, padding: '14px 20px', borderRadius: '24px', border: '1px solid var(--border)', background: 'var(--bg-dark)', color: 'white' }}
          />
          <button onClick={handleSend} style={{ background: 'var(--primary-gradient)', color: 'white', borderRadius: '50%', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
             <Send size={20} />
          </button>
        </div>
        <input type="file" ref={fileInputRef} onChange={handleMediaUpload} style={{ display: 'none' }} accept="image/*" />
      </footer>

      {showBankModal && (
        <div className="bank-modal" onClick={() => setShowBankModal(false)}>
           <div className="bank-grid" onClick={e => e.stopPropagation()}>
              <h3 style={{ fontWeight: '800', marginBottom: '8px' }}>Mzansi Pay</h3>
               <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '16px' }}>⚠️ Demo mode — no real transactions</p>
              {BANKS.map(bank => (
                <div key={bank.id} className="bank-choice" onClick={() => { setShowBankModal(false); sendMessage(id, currentUser.handle, currentUser.name, `Sent R250.00 via ${bank.name}`, 'payment', { bank, amount: '250.00' }); }}>
                   <div className="avatar" style={{ backgroundColor: bank.color, color: 'white' }}>{bank.short}</div>
                   <div className="item-name">{bank.name}</div>
                   <ChevronRight size={18} style={{ marginLeft: 'auto' }} color="var(--text-muted)" />
                </div>
              ))}
           </div>
        </div>
      )}

      {toast && (
        <div style={{
          position: 'fixed', bottom: '100px', left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.85)', color: 'white', padding: '12px 24px',
          borderRadius: '12px', fontSize: '0.9rem', fontWeight: '700',
          zIndex: 9999, backdropFilter: 'blur(8px)', border: '1px solid var(--border)',
          animation: 'fadeIn 0.2s ease'
        }}>
          {toast}
        </div>
      )}
    </div>
  );
};

export default ChatScreen;
