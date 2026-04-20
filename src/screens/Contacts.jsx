import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { UserPlus, Search, MessageCircle, X, UserMinus, Share2, CheckCircle2, Users } from 'lucide-react';
import { getContacts, addContact, removeContact, getDmChatId, searchUsers } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

const Contacts = () => {
    const { currentUser } = useAuth();
    const { t } = useOutletContext();
    const navigate = useNavigate();
    const [contacts, setContacts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [addHandle, setAddHandle] = useState('');
    const [addStatus, setAddStatus] = useState(null); // { success } or { error }
    const [adding, setAdding] = useState(false);
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearchSearching] = useState(false);
    const [confirmRemove, setConfirmRemove] = useState(null); // handle to confirm removal
    const [copiedLink, setCopiedLink] = useState(false);

    const inviteLink = `${window.location.origin}/?ref=${currentUser?.handle}`;

    const loadContacts = useCallback(async () => {
        if (!currentUser?.handle) return;
        const data = await getContacts(currentUser.handle);
        setContacts(data);
        setLoading(false);
    }, [currentUser?.handle]);

    useEffect(() => {
        loadContacts();
    }, [loadContacts]);

    // Filter contacts by search
    const filteredContacts = searchQuery
        ? contacts.filter(c =>
            c.handle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.name?.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : contacts;

    // Search for users to add
    useEffect(() => {
        if (!showAddModal) {
            setAddHandle('');
            setAddStatus(null);
            setSearchResults([]);
            return;
        }

        if (addHandle.length < 2) {
            setSearchResults([]);
            setSearchSearching(false);
            return;
        }

        setSearchSearching(true);
        const timer = setTimeout(async () => {
            const results = await searchUsers(addHandle, currentUser?.handle);
            // Filter out users already in contacts
            const existingHandles = new Set(contacts.map(c => c.handle));
            setSearchResults(results.filter(r => !existingHandles.has(r.handle)));
            setSearchSearching(false);
        }, 300);

        return () => clearTimeout(timer);
    }, [addHandle, showAddModal, contacts, currentUser?.handle]);

    const handleAddByHandle = async () => {
        if (!addHandle.trim()) return;
        setAdding(true);
        setAddStatus(null);
        const result = await addContact(currentUser.handle, addHandle);
        setAdding(false);
        if (result.success) {
            setAddStatus({ success: 'Contact added! 🎉' });
            setAddHandle('');
            setSearchResults([]);
            loadContacts();
        } else {
            setAddStatus({ error: result.error });
        }
    };

    const handleAddFromSearch = async (handle) => {
        setAdding(true);
        setAddStatus(null);
        const result = await addContact(currentUser.handle, handle);
        setAdding(false);
        if (result.success) {
            setAddStatus({ success: `@${handle} added! 🎉` });
            setSearchResults([]);
            loadContacts();
        } else {
            setAddStatus({ error: result.error });
        }
    };

    const handleRemove = async (contactHandle) => {
        const result = await removeContact(currentUser.handle, contactHandle);
        if (!result.error) {
            setConfirmRemove(null);
            loadContacts();
        }
    };

    const startChat = (contactHandle) => {
        const chatId = getDmChatId(currentUser.handle, contactHandle);
        navigate(`/chat/${chatId}`);
    };

    const shareInvite = () => {
        if (navigator.share) {
            navigator.share({
                title: 'Join MzansiChat!',
                text: 'Hey! Join me on MzansiChat — chat without a SIM card! Use my link:',
                url: inviteLink,
            });
        } else {
            navigator.clipboard.writeText(inviteLink);
            setCopiedLink(true);
            setTimeout(() => setCopiedLink(false), 2000);
        }
    };

    return (
        <div className="screen-container">
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: '800' }}>Contacts</h2>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn-icon" onClick={shareInvite} style={{ position: 'relative' }}>
                        {copiedLink ? <CheckCircle2 size={24} color="var(--success)" /> : <Share2 size={24} color="var(--text-muted)" />}
                    </button>
                    <button className="btn-icon" onClick={() => setShowAddModal(true)}>
                        <UserPlus size={24} color="var(--primary)" />
                    </button>
                </div>
            </div>

            {/* Search */}
            <div className="search-bar" style={{ marginBottom: '20px', background: 'var(--surface-light)', borderRadius: '16px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px', border: '1px solid var(--border)' }}>
                <Search size={18} color="var(--text-muted)" />
                <input
                    type="text"
                    placeholder="Search contacts..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    style={{ background: 'transparent', border: 'none', color: 'white', flex: 1, outline: 'none' }}
                />
            </div>

            {/* Contacts List */}
            <div className="chat-list">
                {loading && <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '20px' }}>Loading contacts...</p>}

                {!loading && filteredContacts.length === 0 && !searchQuery && (
                    <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)' }}>
                        <Users size={48} color="var(--text-muted)" style={{ marginBottom: '12px' }} />
                        <p style={{ fontWeight: '700', marginBottom: '8px' }}>No contacts yet</p>
                        <p style={{ fontSize: '0.85rem', marginBottom: '16px' }}>Add friends by their @handle to see them here</p>
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="btn-primary-full"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                        >
                            <UserPlus size={18} />
                            Add a Friend
                        </button>
                    </div>
                )}

                {!loading && filteredContacts.length === 0 && searchQuery && (
                    <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '20px' }}>
                        No contacts match "{searchQuery}"
                    </p>
                )}

                {/* Official AI Assistant */}
                <div key="lindiwe" className="list-item" onClick={() => navigate('/chat/lindiwe')} style={{ background: 'rgba(var(--primary-rgb), 0.05)', border: '1px solid rgba(var(--primary-rgb), 0.1)' }}>
                    <div className="avatar" style={{ background: 'var(--primary-gradient)', color: 'white' }}>
                        L
                    </div>
                    <div className="item-content" style={{ flex: 1 }}>
                        <div className="item-header">
                            <span className="item-name" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                Lindiwe (AI)
                                <CheckCircle2 size={14} color="var(--primary)" fill="var(--primary-light)" />
                            </span>
                            <span className="item-time" style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: '700' }}>Official</span>
                        </div>
                        <div className="item-preview">Your Ubuntu assistant</div>
                    </div>
                    <button
                        className="btn-icon"
                        style={{ background: 'var(--primary)', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                        <MessageCircle size={16} color="white" />
                    </button>
                </div>

                {filteredContacts.map(contact => (
                    <div key={contact.handle} className="list-item" style={{ position: 'relative' }}>
                        <div className="avatar" style={{ position: 'relative' }}>
                            {contact.profile_pic ? (
                                <img src={contact.profile_pic} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                            ) : (
                                contact.handle?.[0]?.toUpperCase() || '?'
                            )}
                            {contact.is_online && (
                                <div style={{
                                    position: 'absolute', bottom: '1px', right: '1px',
                                    width: '10px', height: '10px', borderRadius: '50%',
                                    background: 'var(--success)', border: '2px solid var(--bg-dark)'
                                }} />
                            )}
                        </div>
                        <div className="item-content" style={{ flex: 1 }}>
                            <div className="item-header">
                                <span className="item-name">{contact.name || `@${contact.handle}`}</span>
                                <span className="item-time" style={{ fontSize: '0.7rem', color: contact.is_online ? 'var(--success)' : 'var(--text-muted)', fontWeight: '600' }}>
                                    {contact.is_online ? 'Online' : ''}
                                </span>
                            </div>
                            <div className="item-preview">@{contact.handle}</div>
                        </div>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <button
                                className="btn-icon"
                                onClick={() => startChat(contact.handle)}
                                style={{ background: 'var(--primary)', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                                <MessageCircle size={16} color="white" />
                            </button>
                            {confirmRemove === contact.handle ? (
                                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                    <button
                                        onClick={() => handleRemove(contact.handle)}
                                        style={{ background: 'var(--danger)', color: 'white', border: 'none', borderRadius: '8px', padding: '4px 10px', fontSize: '0.7rem', fontWeight: '700', cursor: 'pointer' }}
                                    >
                                        Remove
                                    </button>
                                    <button
                                        onClick={() => setConfirmRemove(null)}
                                        style={{ background: 'var(--surface-light)', color: 'var(--text-secondary)', border: 'none', borderRadius: '8px', padding: '4px 10px', fontSize: '0.7rem', cursor: 'pointer' }}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            ) : (
                                <button
                                    className="btn-icon"
                                    onClick={() => setConfirmRemove(contact.handle)}
                                    style={{ opacity: 0.5 }}
                                >
                                    <UserMinus size={16} color="var(--text-muted)" />
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Add Contact Modal */}
            {showAddModal && (
                <div className="new-chat-overlay" onClick={() => setShowAddModal(false)}>
                    <div className="new-chat-modal" onClick={e => e.stopPropagation()}>
                        <header className="new-chat-header">
                            <h3>Add a Friend</h3>
                            <button onClick={() => setShowAddModal(false)} className="btn-icon">
                                <X size={22} />
                            </button>
                        </header>

                        <div style={{ padding: '16px' }}>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                                Enter your friend's @handle to add them to your contacts
                            </p>

                            <div className="new-chat-search" style={{ marginBottom: '12px' }}>
                                <Search size={18} color="var(--text-muted)" />
                                <input
                                    type="text"
                                    value={addHandle}
                                    onChange={e => { setAddHandle(e.target.value); setAddStatus(null); }}
                                    placeholder="Type @handle..."
                                    autoComplete="off"
                                    autoCapitalize="none"
                                    style={{ background: 'transparent', border: 'none', color: 'white', flex: 1, outline: 'none' }}
                                />
                            </div>

                            {/* Add by handle button */}
                            <button
                                onClick={handleAddByHandle}
                                disabled={adding || !addHandle.trim()}
                                className="btn-primary-full"
                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '12px', opacity: (!addHandle.trim() || adding) ? 0.5 : 1 }}
                            >
                                <UserPlus size={18} />
                                {adding ? 'Adding...' : `Add @${addHandle || 'handle'}`}
                            </button>

                            {/* Status message */}
                            {addStatus?.success && (
                                <p style={{ color: 'var(--success)', fontSize: '0.85rem', textAlign: 'center', marginBottom: '12px', fontWeight: '600' }}>
                                    {addStatus.success}
                                </p>
                            )}
                            {addStatus?.error && (
                                <p style={{ color: 'var(--danger)', fontSize: '0.85rem', textAlign: 'center', marginBottom: '12px' }}>
                                    {addStatus.error}
                                </p>
                            )}

                            {/* Search results (users not yet in contacts) */}
                            {searchResults.length > 0 && (
                                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px', marginTop: '4px' }}>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: '600' }}>People on MzansiChat</p>
                                    {searchResults.map(user => (
                                        <div key={user.handle} className="list-item" style={{ background: 'var(--surface-light)', marginBottom: '6px', borderRadius: '12px' }}>
                                            <div className="avatar" style={{ width: '40px', height: '40px', fontSize: '0.9rem' }}>
                                                {user.profile_pic ? (
                                                    <img src={user.profile_pic} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                                                ) : (
                                                    user.handle[0].toUpperCase()
                                                )}
                                            </div>
                                            <div className="item-content">
                                                <div className="item-name" style={{ fontSize: '0.9rem' }}>{user.name || user.handle}</div>
                                                <div className="item-preview">@{user.handle}</div>
                                            </div>
                                            <button
                                                onClick={() => handleAddFromSearch(user.handle)}
                                                disabled={adding}
                                                style={{ background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                            >
                                                <UserPlus size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {addHandle.length >= 2 && !searching && searchResults.length === 0 && !addStatus?.success && (
                                <div style={{ textAlign: 'center', padding: '16px', background: 'var(--surface-light)', borderRadius: '16px', marginTop: '8px' }}>
                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                                        Can't find <strong>@{addHandle}</strong>? Invite them!
                                    </p>
                                    <button onClick={shareInvite} className="btn-primary-full" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                                        <Share2 size={16} />
                                        Send Invite Link
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Contacts;