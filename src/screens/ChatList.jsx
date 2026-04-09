import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { MessageSquarePlus, Users, Search, MessageCircle, Share2, CheckCircle2 } from 'lucide-react';
import { getJoinedCommunities, getRecentDMs, subscribeToMessages, getDmChatId } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import NewChatModal from '../components/chat/NewChatModal';

const formatTime = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now - date;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (mins < 1) return 'Now';
  if (mins < 60) return `${mins}m`;
  if (hours < 24) return `${hours}h`;
  if (days < 7) return `${days}d`;
  return date.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' });
};

const getPreview = (msg) => {
  if (!msg) return '';
  switch (msg.type) {
    case 'image': return '📸 Photo';
    case 'voice': return '🎙️ Voice Note';
    case 'video': return '🎬 Video';
    case 'payment': return '💸 Payment';
    case 'contribution': return `💰 R${msg.metadata?.amount || ''}`;
    default: return msg.content?.substring(0, 50) || '';
  }
};

const ChatList = () => {
  const { currentUser } = useAuth();
  const { t } = useOutletContext();
  const navigate = useNavigate();
  const [joinedCommunities, setJoinedCommunities] = useState([]);
  const [dmConversations, setDmConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewChat, setShowNewChat] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  const inviteLink = `${window.location.origin}/?ref=${currentUser?.handle}`;

  const shareInvite = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Join MzansiChat!',
        text: `Hey! Join me on MzansiChat, the first identity-first chat app. No SIM needed! Use my link:`,
        url: inviteLink,
      });
    } else {
      navigator.clipboard.writeText(inviteLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const loadChats = useCallback(async () => {
    if (!currentUser?.handle) return;
    
    const [communities, dms] = await Promise.all([
      getJoinedCommunities(currentUser.handle),
      getRecentDMs(currentUser.handle),
    ]);
    
    setJoinedCommunities(communities);
    setDmConversations(dms);
    setLoading(false);
  }, [currentUser?.handle]);

  useEffect(() => {
    loadChats();
  }, [loadChats]);

  // Listen for new messages to update the list in real-time
  useEffect(() => {
    if (!currentUser?.handle) return;

    const subscription = subscribeToMessages((newMsg) => {
      const parts = newMsg.chat_id.split('_');
      const isDM = parts.length === 2 && parts.includes(currentUser.handle.toLowerCase());
      
      if (isDM) {
        setDmConversations(prev => {
          const existing = prev.findIndex(dm => dm.chatId === newMsg.chat_id);
          const otherHandle = parts.find(h => h !== currentUser.handle.toLowerCase());
          
          const updated = {
            chatId: newMsg.chat_id,
            otherHandle,
            lastMessage: newMsg,
            lastMessageTime: newMsg.created_at,
            otherName: existing >= 0 ? prev[existing].otherName : otherHandle,
            otherPic: existing >= 0 ? prev[existing].otherPic : null,
            isOnline: existing >= 0 ? prev[existing].isOnline : false,
          };

          const filtered = prev.filter(dm => dm.chatId !== newMsg.chat_id);
          return [updated, ...filtered];
        });
      }
    });

    return () => subscription.unsubscribe();
  }, [currentUser?.handle]);

  // AI Chat entry (always present)
  const aiChat = {
    id: 'lindiwe',
    name: 'Lindiwe (AI)',
    handle: 'lindiwe',
    preview: 'Ubuntu! How can I help you today?',
    time: '',
    isAI: true,
  };

  const cleanSearchQuery = searchQuery.toLowerCase().replace(/@/g, '');
  const filteredDMs = searchQuery
    ? dmConversations.filter(dm =>
        dm.otherHandle?.toLowerCase().includes(cleanSearchQuery) ||
        dm.otherName?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : dmConversations;

  const filteredCommunities = searchQuery
    ? joinedCommunities.filter(c =>
        c.name?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : joinedCommunities;

  return (
    <div className="screen-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '800' }}>{t.active_convos}</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn-icon" onClick={shareInvite} style={{ position: 'relative' }}>
            {copiedLink ? <CheckCircle2 size={24} color="var(--success)" /> : <Share2 size={24} color="var(--text-muted)" />}
            {copiedLink && <span style={{ position: 'absolute', top: '-25px', left: '50%', transform: 'translateX(-50%)', background: 'var(--success)', color: 'white', padding: '2px 8px', borderRadius: '8px', fontSize: '0.7rem', whiteSpace: 'nowrap' }}>Copied!</span>}
          </button>
          <button className="btn-icon" onClick={() => setShowNewChat(true)}>
            <MessageSquarePlus size={24} color="var(--primary)" />
          </button>
        </div>
      </div>

      <div className="search-bar" style={{ marginBottom: '20px', background: 'var(--surface-light)', borderRadius: '16px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px', border: '1px solid var(--border)' }}>
        <Search size={18} color="var(--text-muted)" />
        <input
          type="text"
          placeholder="Search chats..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{ background: 'transparent', border: 'none', color: 'white', flex: 1, outline: 'none' }}
        />
      </div>

      <div className="chat-list">
        {/* AI Assistant — always first */}
        {(!searchQuery || 'lindiwe'.includes(searchQuery.toLowerCase())) && (
          <div className="list-item" onClick={() => navigate('/chat/lindiwe')}>
            <div className="avatar" style={{ background: 'var(--primary-gradient)', color: 'white' }}>
              L
            </div>
            <div className="item-content">
              <div className="item-header">
                <span className="item-name">{aiChat.name}</span>
                <span className="item-time" style={{ color: 'var(--success)', fontWeight: '700', fontSize: '0.7rem' }}>AI</span>
              </div>
              <div className="item-preview">{aiChat.preview}</div>
            </div>
          </div>
        )}

        {/* Real DM Conversations */}
        {filteredDMs.map(dm => (
          <div key={dm.chatId} className="list-item" onClick={() => navigate(`/chat/${dm.chatId}`)}>
            <div className="avatar" style={{ position: 'relative' }}>
              {dm.otherPic ? (
                <img src={dm.otherPic} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                dm.otherHandle?.[0]?.toUpperCase() || '?'
              )}
              {dm.isOnline && (
                <div style={{
                  position: 'absolute', bottom: '1px', right: '1px',
                  width: '10px', height: '10px', borderRadius: '50%',
                  background: 'var(--success)', border: '2px solid var(--bg-dark)'
                }} />
              )}
            </div>
            <div className="item-content">
              <div className="item-header">
                <span className="item-name">{dm.otherName || `@${dm.otherHandle}`}</span>
                <span className="item-time">{formatTime(dm.lastMessageTime)}</span>
              </div>
              <div className="item-preview">
                {dm.lastMessage?.sender_handle === currentUser?.handle ? 'You: ' : ''}
                {getPreview(dm.lastMessage)}
              </div>
            </div>
          </div>
        ))}

        {/* Communities */}
        {filteredCommunities.map(comm => (
          <div key={comm.id} className="list-item" onClick={() => navigate(`/chat/${comm.id}`)}>
            <div className="avatar" style={{ background: 'var(--surface-light)', color: 'var(--primary)' }}>
              <Users size={24} />
            </div>
            <div className="item-content">
              <div className="item-header">
                <span className="item-name">{comm.name}</span>
                <span className="item-time">Active</span>
              </div>
              <div className="item-preview">{comm.description}</div>
            </div>
          </div>
        ))}

        {/* Empty state */}
        {!loading && filteredDMs.length === 0 && filteredCommunities.length === 0 && searchQuery && (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '40px' }}>No chats match "{searchQuery}"</p>
        )}

        {!loading && dmConversations.length === 0 && joinedCommunities.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)' }}>
            <MessageCircle size={48} color="var(--text-muted)" style={{ marginBottom: '12px' }} />
            <p style={{ fontWeight: '700', marginBottom: '8px' }}>No conversations yet</p>
            <p style={{ fontSize: '0.85rem' }}>Tap <strong>+</strong> to start a new chat!</p>
          </div>
        )}

        {loading && <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '20px' }}>Syncing chats...</p>}
      </div>

      <NewChatModal open={showNewChat} onClose={() => setShowNewChat(false)} />
    </div>
  );
};

export default ChatList;
