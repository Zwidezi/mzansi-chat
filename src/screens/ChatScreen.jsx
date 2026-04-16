import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import {
  Plus, Send, Mic, XCircle, ImageIcon, Film, Landmark, MapPin,
  Phone, Video, Search, MoreVertical, X, CheckCheck,
  ChevronRight, Users, Users as UsersIcon, Database, Octagon, CheckCircle, Zap, Trash2
} from 'lucide-react';
import {
  getMessages, sendMessage, subscribeToMessages, getUser, uploadMedia, deleteMessage
} from '../lib/supabaseClient';
import { getLindiweResponse } from '../lib/geminiService';
import { useAuth } from '../context/AuthContext';
import { useCall } from '../hooks/useCall';
import { VoiceNote, PaymentBubble, VideoBubble } from '../components/chat/ChatComponents';
import StokvelVault from '../components/chat/StokvelVault';
import { BANKS } from '../constants/appData';
import { PaystackButton } from 'react-paystack';
import { validatePaymentAmount } from '../lib/moderation';

// Long-press hook for mobile message actions
const useLongPress = (callback, ms = 500) => {
  const timerRef = useRef(null);
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  const start = useCallback((e) => {
    e.preventDefault();
    timerRef.current = setTimeout(() => callbackRef.current(e), ms);
  }, [ms]);

  const stop = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  return {
    onTouchStart: start,
    onTouchEnd: stop,
    onTouchMove: stop,
    onContextMenu: (e) => { e.preventDefault(); callbackRef.current(e); },
  };
};

// Individual message bubble with long-press support
const MessageBubble = ({ msg, isSelf, onDelete }) => {
  const longPressHandlers = useLongPress(() => {
    if (isSelf) onDelete(msg.id);
  }, 500);

  const handlers = isSelf ? longPressHandlers : {};

  return (
    <div
      className={`chat-bubble ${isSelf ? 'self' : 'other'}`}
      {...handlers}
      style={{ userSelect: 'none' }}
    >
      {msg.content}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
        <CheckCheck size={14} color="var(--text-muted)" />
      </div>
    </div>
  );
};

const ChatScreen = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { makeCall } = useCall();
  const { t } = useOutletContext();

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [chatName, setChatName] = useState("Chat");
  const [isGroup, setIsGroup] = useState(false);
  const [isAI, setIsAI] = useState(false);
  const [showVault, setShowVault] = useState(false);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const [toast, setToast] = useState(null);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [selectedBank, setSelectedBank] = useState(null);
  const [transferAmount, setTransferAmount] = useState("50");
  const [paymentStep, setPaymentStep] = useState('list'); // 'list' | 'amount'

  const scrollRef = useRef();
  const fileInputRef = useRef();
  const MESSAGE_PAGE_SIZE = 50;
  const MAX_MESSAGE_LENGTH = 2000;

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

      // Load first page of messages (paginated)
      const msgs = await getMessages(id, MESSAGE_PAGE_SIZE, 0);
      setMessages(msgs);
      setHasMore(msgs.length >= MESSAGE_PAGE_SIZE);
      setLoading(false);
    };

    initChat();

    // Subscribe to new messages (per-chat channel)
    const subscription = subscribeToMessages(id, (newMsg) => {
      setMessages(prev => [...prev, newMsg]);
    });

    return () => subscription.unsubscribe();
  }, [id]);

  // Load older messages (infinite scroll)
  const loadMoreMessages = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const olderMsgs = await getMessages(id, MESSAGE_PAGE_SIZE, messages.length);
    if (olderMsgs.length < MESSAGE_PAGE_SIZE) setHasMore(false);
    setMessages(prev => [...olderMsgs, ...prev]);
    setLoadingMore(false);
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Sanitize URLs to prevent XSS via javascript: scheme
  const sanitizeUrl = (url) => {
    if (!url || typeof url !== 'string') return url;
    const trimmed = url.trim().toLowerCase();
    if (trimmed.startsWith('javascript:') || trimmed.startsWith('data:text/html')) return '';
    return url;
  };

  // Validate message input
  const handleSend = async () => {
    if (!inputText.trim() || !currentUser) return;
    if (inputText.length > MAX_MESSAGE_LENGTH) {
      showToast(`Message too long (max ${MAX_MESSAGE_LENGTH} characters)`);
      return;
    }

    const userMessage = inputText.trim();
    setInputText("");

    if (isAI) {
      // Persist user's message first so conversations reload correctly
      await sendMessage(id, currentUser.handle, currentUser.name, userMessage);
      const aiResponse = await getLindiweResponse(userMessage, messages);
      await sendMessage(id, 'lindiwe', 'Lindiwe (AI)', aiResponse);
      return;
    }

    const { message, error } = await sendMessage(
      id,
      currentUser.handle,
      currentUser.name,
      userMessage
    );
    if (error) setInputText(userMessage); // Restore on failure
  };

  const handleMediaUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const { url, error } = await uploadMedia(file, 'media', currentUser.handle);
    if (!error) {
      await sendMessage(id, currentUser.handle, currentUser.name, url, 'image');
    }
  };

  const handleDeleteMessage = async (msgId) => {
    const { error } = await deleteMessage(msgId);
    if (!error) {
      setMessages(prev => prev.filter(m => m.id !== msgId));
      showToast('Message deleted');
    }
    setSelectedMessage(null);
  };

  const canCall = !isGroup && !isAI && (
    (id.includes('_') && id.split('_').length === 2) || isNaN(id)
  );

  return (
    <div className="chat-screen-wrapper" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Search & Vault Toggles UI omitted for brevity of refactor, focus on core architecture */}
      <header className="chat-header" style={{
        padding: '12px 16px',
        paddingTop: 'max(12px, env(safe-area-inset-top))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid var(--border)',
        background: 'var(--surface)',
        backdropFilter: 'blur(20px)',
        webkitBackdropFilter: 'blur(20px)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        width: '100%'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0, overflow: 'hidden' }}>
          <button onClick={() => navigate(-1)} style={{ flexShrink: 0, background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--text-primary)', padding: '4px' }}>
            <X size={24} />
          </button>
          <div style={{ minWidth: 0, overflow: 'hidden', flex: 1 }}>
            <div className="item-name" style={{ fontSize: '1.2rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: '850' }}>{chatName}</div>
            <div style={{ fontSize: '0.75rem', color: isAI ? 'var(--primary)' : 'var(--success)', fontWeight: '700' }}>{isAI ? 'Thinking in Ubuntu' : 'online'}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px', flexShrink: 0, marginLeft: '12px' }}>
          {!isAI && !isGroup && (
            <>
              <Phone
                size={24}
                color={canCall ? 'var(--primary)' : 'var(--text-muted)'}
                style={{ cursor: canCall ? 'pointer' : 'not-allowed', opacity: canCall ? 1 : 0.3, transition: 'all 0.2s' }}
                onClick={canCall ? handleVoiceCall : undefined}
              />
              <Video
                size={24}
                color={canCall ? 'var(--primary)' : 'var(--text-muted)'}
                style={{ cursor: canCall ? 'pointer' : 'not-allowed', opacity: canCall ? 1 : 0.3, transition: 'all 0.2s' }}
                onClick={canCall ? handleVideoCall : undefined}
              />
            </>
          )}
          {isGroup && <Database size={24} onClick={() => setShowVault(!showVault)} color={showVault ? 'var(--primary)' : 'var(--success)'} style={{ cursor: 'pointer', opacity: 1 }} />}
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
                    <img src={sanitizeUrl(msg.content)} alt="Media" style={{ maxWidth: '250px', borderRadius: '16px' }} />
                  </div>
                ) : msg.type === 'contribution' ? (
                  <div className="contribution-bubble">
                    <div style={{ fontSize: '0.6rem', opacity: 0.6, textTransform: 'uppercase' }}>Vault Contribution</div>
                    <div className="contribution-amount" style={{ fontSize: '1.5rem', fontWeight: '900', color: 'var(--success)' }}>R {msg.metadata?.amount}</div>
                    <div style={{ fontSize: '0.7rem' }}>@{msg.sender_handle} contributed</div>
                  </div>
                ) : msg.type === 'status_action' ? (
                  <div className="status-reply-bubble" style={{
                    alignSelf: msg.sender_handle === currentUser?.handle ? 'flex-end' : 'flex-start',
                    marginLeft: msg.sender_handle === currentUser?.handle ? 'auto' : 0,
                    background: 'var(--surface-light)',
                    padding: '12px',
                    borderRadius: '16px',
                    maxWidth: '280px',
                    marginBottom: '12px',
                    border: '1px solid var(--border)'
                  }}>
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                      {msg.metadata?.status_thumb ? (
                        <img src={msg.metadata.status_thumb} style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '40px', height: '40px', background: 'var(--bg-dark)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', color: 'var(--text-muted)' }}>TEXT</div>
                      )}
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', minWidth: 0 }}>
                        <div style={{ fontWeight: '700', color: 'var(--primary)' }}>{msg.metadata?.action_type === 'reaction' ? 'REACTION' : 'STATUS REPLY'}</div>
                        <div style={{ fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{msg.metadata?.status_caption || 'Status story'}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: '1rem', fontWeight: msg.metadata?.action_type === 'reaction' ? '800' : '400' }}>{msg.content}</div>
                  </div>
                ) : (
                  <MessageBubble
                    msg={msg}
                    isSelf={msg.sender_handle === currentUser?.handle}
                    onDelete={(id) => setSelectedMessage(id)}
                  />
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
        <div className="bank-modal" onClick={() => { setShowBankModal(false); setPaymentStep('list'); setSelectedBank(null); }}>
          <div className="bank-grid" onClick={e => e.stopPropagation()} style={{
            maxWidth: '380px',
            padding: '28px',
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontWeight: '900', fontSize: '1.4rem', color: 'white' }}>Mzansi Pay</h3>
              <button onClick={() => { setShowBankModal(false); setPaymentStep('list'); }} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)' }}><X size={20} /></button>
            </div>

            {paymentStep === 'list' ? (
              <>
                <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', marginBottom: '20px' }}>Choose receiving bank for transfer</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px', maxHeight: '350px', overflowY: 'auto', paddingRight: '4px' }}>
                  {BANKS.map(bank => (
                    <div key={bank.id} className="bank-choice" onClick={() => { setSelectedBank(bank); setPaymentStep('amount'); }} style={{ background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '16px', transition: 'all 0.2s' }}>
                      <div className="avatar" style={{ backgroundColor: bank.color, color: 'white', fontWeight: '800' }}>{bank.short}</div>
                      <div className="item-name" style={{ color: 'white', fontWeight: '600' }}>{bank.name}</div>
                      <ChevronRight size={18} style={{ marginLeft: 'auto' }} color="rgba(255,255,255,0.3)" />
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ animation: 'fadeIn 0.3s ease' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '12px' }}>
                  <div className="avatar" style={{ backgroundColor: selectedBank?.color, color: 'white' }}>{selectedBank?.short}</div>
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: '700', color: 'white' }}>{selectedBank?.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>Instant Transfer</div>
                  </div>
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Amount to Send (ZAR)</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', fontSize: '1.5rem', fontWeight: '900', color: 'var(--primary)' }}>R</span>
                    <input
                      type="number"
                      value={transferAmount}
                      onChange={(e) => setTransferAmount(e.target.value)}
                      style={{
                        width: '100%', padding: '16px 16px 16px 40px', fontSize: '1.8rem', fontWeight: '900',
                        background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px',
                        color: 'white', outline: 'none'
                      }}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={() => setPaymentStep('list')}
                    style={{ flex: 1, padding: '14px', borderRadius: '12px', background: 'rgba(255,255,255,0.1)', color: 'white', fontWeight: '700', border: 'none' }}
                  >Back</button>

                  <PaystackButton
                    email={`${currentUser?.handle || 'user'}@mzansichat.com`}
                    amount={(() => {
                      const v = validatePaymentAmount(transferAmount);
                      return v.valid ? v.amount * 100 : 0;
                    })()}
                    publicKey={import.meta.env.VITE_PAYSTACK_PUBLIC_KEY}
                    currency="ZAR"
                    channels={['card', 'mobile_money']}
                    onSuccess={() => {
                      sendMessage(id, currentUser.handle, currentUser.name, `Paid R${transferAmount} via ${selectedBank.name}`, 'payment', { bank: selectedBank, amount: transferAmount });
                      setShowBankModal(false);
                      setPaymentStep('list');
                      showToast(`R${transferAmount} Payment Sent!`);
                    }}
                    onClose={() => console.log('Payment closed')}
                    className="btn-primary"
                    style={{
                      flex: 2, padding: '14px', borderRadius: '12px', background: 'var(--primary-gradient)', color: 'white',
                      fontWeight: '800', border: 'none', cursor: 'pointer', boxShadow: '0 8px 25px rgba(96, 165, 250, 0.4)'
                    }}
                    text={`Pay R${transferAmount}`}
                  />
                </div>
                <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '16px' }}>Securely processed by Paystack · Encryption Active</p>
              </div>
            )}
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

      {selectedMessage && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }} onClick={() => setSelectedMessage(null)}>
          <div style={{
            background: 'var(--surface)', borderRadius: '16px', padding: '20px',
            width: '80%', maxWidth: '300px', textAlign: 'center'
          }} onClick={e => e.stopPropagation()}>
            <p style={{ marginBottom: '16px', fontWeight: '600' }}>Delete this message?</p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button onClick={() => setSelectedMessage(null)} style={{
                padding: '10px 20px', borderRadius: '8px', border: '1px solid var(--border)',
                background: 'transparent', color: 'white'
              }}>Cancel</button>
              <button onClick={() => handleDeleteMessage(selectedMessage)} style={{
                padding: '10px 20px', borderRadius: '8px', border: 'none',
                background: '#ef4444', color: 'white', fontWeight: '700'
              }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatScreen;
