import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Search, MessageCircle, UserPlus, Loader2, Share2, CheckCircle2 } from 'lucide-react';
import { searchUsers, getDmChatId } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';

const NewChatModal = ({ open, onClose }) => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const inputRef = useRef();
  const debounceRef = useRef();

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

  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
    if (!open) {
      setQuery('');
      setResults([]);
    }
  }, [open]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    let searchTerm = query.toLowerCase();
    
    // If they paste a full invite link, magically extract the handle!
    if (searchTerm.includes('?ref=')) {
      searchTerm = searchTerm.split('?ref=')[1].split('&')[0];
    }
    
    // Clean up any trailing spaces or @ symbols from copy/pasting
    searchTerm = searchTerm.replace(/@/g, '').trim();

    if (searchTerm.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      const users = await searchUsers(searchTerm, currentUser?.handle);
      setResults(users);
      setSearching(false);
    }, 300);

    return () => clearTimeout(debounceRef.current);
  }, [query, currentUser?.handle]);

  const startDM = (targetHandle) => {
    if (!currentUser?.handle) return;
    const chatId = getDmChatId(currentUser.handle, targetHandle);
    onClose();
    navigate(`/chat/${chatId}`);
  };

  if (!open) return null;

  return (
    <div className="new-chat-overlay" onClick={onClose}>
      <div className="new-chat-modal" onClick={e => e.stopPropagation()}>
        <header className="new-chat-header">
          <h3>New Message</h3>
          <button onClick={onClose} className="btn-icon">
            <X size={22} />
          </button>
        </header>

        <div className="new-chat-search">
          <Search size={18} color="var(--text-muted)" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by @handle..."
            autoComplete="off"
            autoCapitalize="none"
          />
          {searching && <Loader2 size={18} className="spin-icon" />}
        </div>

        <div className="new-chat-results">
          {query.length < 2 && (
            <div className="new-chat-empty">
              <UserPlus size={48} color="var(--text-muted)" />
              <p>Type a handle to find someone</p>
              <span>You need at least 2 characters</span>
            </div>
          )}

          {query.length >= 2 && !searching && results.length === 0 && (
            <div className="new-chat-empty" style={{ textAlign: 'center', padding: '20px 0' }}>
              <Search size={48} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
              <p style={{ fontWeight: '700' }}>No users found for "{query}"</p>
              <span style={{ display: 'block', marginBottom: '30px' }}>Double check the handle spelling.</span>

              <div style={{ background: 'var(--surface-light)', padding: '24px 16px', borderRadius: '16px', border: '1px dashed var(--border)' }}>
                 <p style={{ fontWeight: '800', marginBottom: '8px', color: 'var(--text-primary)' }}>Want to chat with someone new?</p>
                 <span style={{ display: 'block', marginBottom: '16px', fontSize: '0.8rem' }}>Send them an invite to join MzansiChat!</span>
                 <button onClick={shareInvite} className="btn-primary-full" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    {copiedLink ? <CheckCircle2 size={18} /> : <Share2 size={18} />}
                    {copiedLink ? 'Link Copied!' : 'Send an Invite'}
                 </button>
              </div>
            </div>
          )}

          {results.map(user => (
            <div key={user.handle} className="new-chat-user-item" onClick={() => startDM(user.handle)}>
              <div className="avatar" style={{ width: '44px', height: '44px', position: 'relative' }}>
                {user.profile_pic ? (
                  <img src={user.profile_pic} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  user.handle[0].toUpperCase()
                )}
                {user.is_online && (
                  <div className="online-dot" style={{
                    position: 'absolute', bottom: '1px', right: '1px',
                    width: '10px', height: '10px', borderRadius: '50%',
                    background: 'var(--success)', border: '2px solid var(--bg-dark)'
                  }} />
                )}
              </div>
              <div className="new-chat-user-info">
                <span className="new-chat-user-name">{user.name || user.handle}</span>
                <span className="new-chat-user-handle">@{user.handle}</span>
              </div>
              <MessageCircle size={20} color="var(--primary)" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default NewChatModal;
