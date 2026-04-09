import { useState, useEffect } from 'react';
import { Share2, Copy, Users, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';

const InviteCenter = ({ t }) => {
  const { currentUser } = useAuth();
  const [copied, setCopied] = useState(false);
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);

  const inviteLink = `${window.location.origin}/?ref=${currentUser?.handle}`;

  useEffect(() => {
    const fetchReferrals = async () => {
      if (!currentUser?.handle) return;
      const { data, error } = await supabase
        .from('referrals')
        .select('*')
        .eq('referrer_handle', currentUser.handle);
      
      if (!error) setReferrals(data || []);
      setLoading(false);
    };

    fetchReferrals();
  }, [currentUser?.handle]);

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareInvite = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Join MzansiChat!',
        text: `Hey! Join me on MzansiChat, the first identity-first chat app. No SIM needed! Use my link:`,
        url: inviteLink,
      });
    } else {
      handleCopy();
    }
  };

  return (
    <div className="screen-container invite-center">
      <div className="savings-card" style={{ background: 'var(--primary-gradient)', marginBottom: '24px' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: '800' }}>{t.invite_friends}</h3>
        <p style={{ opacity: 0.9, fontSize: '0.85rem', marginTop: '4px' }}>{t.referral_msg}</p>
        
        <div className="invite-link-box" style={{ marginTop: '20px', background: 'rgba(255,255,255,0.1)', padding: '12px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: '600', opacity: 0.8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: '10px' }}>
             {inviteLink}
          </span>
          <button onClick={handleCopy} style={{ background: 'none', border: 'none', color: 'white' }}>
            {copied ? <CheckCircle2 size={18} /> : <Copy size={18} />}
          </button>
        </div>

        <button className="btn-primary-full" style={{ marginTop: '16px', background: 'white', color: 'var(--primary)' }} onClick={shareInvite}>
          <Share2 size={18} style={{ marginRight: '8px' }} />
          {t.share_link}
        </button>
      </div>

      <h4 style={{ fontWeight: '800', marginBottom: '12px', marginTop: '24px' }}>Friends You've Invited ({referrals.length})</h4>
      
      {loading ? (
        <p style={{ color: 'var(--text-muted)' }}>Loading...</p>
      ) : referrals.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', background: 'var(--surface-light)', borderRadius: '24px', border: '1px solid var(--border)' }}>
           <Users size={48} color="var(--text-muted)" style={{ marginBottom: '12px' }} />
           <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No referrals yet. Start sharing!</p>
        </div>
      ) : (
        <div className="referral-list">
          {referrals.map(ref => (
            <div key={ref.id} className="list-item" style={{ background: 'var(--surface-light)', marginBottom: '8px' }}>
              <div className="avatar" style={{ width: '40px', height: '40px', fontSize: '0.9rem' }}>
                 {ref.referee_handle ? ref.referee_handle[0].toUpperCase() : "?"}
              </div>
              <div className="item-content">
                <div className="item-name" style={{ fontSize: '1rem' }}>@{ref.referee_handle || 'Pending...'}</div>
                <div className="item-preview" style={{ fontSize: '0.75rem' }}>{new Date(ref.created_at).toLocaleDateString()}</div>
              </div>
              {ref.referee_handle && <CheckCircle2 size={18} color="var(--success)" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default InviteCenter;
