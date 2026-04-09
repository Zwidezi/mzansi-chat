import { useState } from 'react';
import { Database, TrendingUp, Users, ArrowUpRight, CreditCard } from 'lucide-react';
import { PaystackButton } from 'react-paystack';

const StokvelVault = ({ messages, t, onContribute }) => {
  const contributions = messages.filter(m => m.type === 'contribution');
  const total = contributions.reduce((acc, m) => acc + (parseFloat(m.metadata?.amount) || 0), 0);
  const uniqueMembers = new Set(contributions.map(m => m.sender_handle)).size;

  const [payAmount, setPayAmount] = useState("100");
  const [showPayment, setShowPayment] = useState(false);

  const publicKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;

  const handlePaymentSuccess = (reference) => {
    onContribute(payAmount);
    setShowPayment(false);
    setPayAmount("100");
  };

  const componentProps = publicKey ? {
    email: 'user@mzansichat.com',
    amount: parseFloat(payAmount) * 100,
    publicKey,
    currency: 'ZAR',
    channels: ['card', 'mobile_money'],
    onSuccess: handlePaymentSuccess,
    onClose: () => setShowPayment(false),
    metadata: {
      custom_fields: [
        { display_name: "Stokvel Contribution", variable_name: "stokvel", value: "community_vault" }
      ]
    }
  } : {};

  return (
    <div className="stokvel-vault-container" style={{ marginBottom: '24px' }}>
      <div className="savings-card" style={{ background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
           <h3 style={{ fontWeight: '800' }}>Community Vault</h3>
           <Database size={20} />
        </div>
        <div className="savings-main-stat">R {total.toFixed(2)}</div>
        <p style={{ fontSize: '0.75rem', opacity: 0.8, marginBottom: '16px' }}>Growing together since Jan 2026.</p>
        
        <div className="stats-grid">
           <div className="stat-box" style={{ background: 'rgba(0,0,0,0.1)', border: 'none' }}>
              <Users size={16} style={{ marginBottom: '4px' }} />
              <p style={{ fontSize: '1rem', color: 'white' }}>{uniqueMembers} Members</p>
           </div>
           <div className="stat-box" style={{ background: 'rgba(0,0,0,0.1)', border: 'none' }}>
              <TrendingUp size={16} style={{ marginBottom: '4px' }} />
              <p style={{ fontSize: '1rem', color: 'white' }}>+ 12% Growth</p>
           </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <input 
            type="number" 
            value={payAmount} 
            onChange={(e) => setPayAmount(e.target.value)} 
            style={{ width: '80px', padding: '8px', borderRadius: '8px', border: 'none', background: 'white', color: '#333' }} 
          />
          <button 
           className="btn-primary" 
           style={{ flex: 1, background: 'white', color: '#059669', fontWeight: '800', borderRadius: '12px' }}
           onClick={() => setShowPayment(true)}
          >
            {publicKey ? 'Pay with Paystack' : 'Demo Contribute'}
          </button>
        </div>
        {!publicKey && (
          <p style={{ fontSize: '0.65rem', opacity: 0.7, marginTop: '8px', textAlign: 'center' }}>
            Add VITE_PAYSTACK_PUBLIC_KEY in .env for real payments
          </p>
        )}
      </div>

      {showPayment && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }} onClick={() => setShowPayment(false)}>
          <div style={{
            background: 'var(--surface)', borderRadius: '16px', padding: '24px',
            width: '90%', maxWidth: '350px'
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <CreditCard size={24} color="var(--primary)" />
              <h3 style={{ fontWeight: '800' }}>Pay R{payAmount}</h3>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
              Secure payment via Paystack (Card or Mobile Money)
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setShowPayment(false)} style={{
                flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid var(--border)',
                background: 'transparent', color: 'white'
              }}>Cancel</button>
              {publicKey ? (
                <PaystackButton 
                  {...componentProps}
                  className="paystack-button"
                  style={{
                    flex: 1, padding: '12px', borderRadius: '8px', border: 'none',
                    background: 'var(--primary)', color: 'white', fontWeight: '700',
                    cursor: 'pointer'
                  }}
                />
              ) : (
                <button 
                  onClick={() => { onContribute(payAmount); setShowPayment(false); }}
                  style={{
                    flex: 1, padding: '12px', borderRadius: '8px', border: 'none',
                    background: 'var(--primary)', color: 'white', fontWeight: '700'
                  }}
                >
                  Demo Mode
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <h4 style={{ fontWeight: '800', fontSize: '0.9rem', marginBottom: '12px', color: 'var(--text-secondary)' }}>Recent Activity</h4>
      {contributions.length === 0 ? (
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No contributions yet. Be the first!</p>
      ) : (
        contributions.slice(-5).reverse().map((c, i) => (
          <div key={i} className="list-item" style={{ marginBottom: '8px', background: 'var(--surface-light)' }}>
             <div className="avatar" style={{ width: '32px', height: '32px', fontSize: '0.8rem', marginRight: '12px' }}>
                {c.sender_handle?.[0]?.toUpperCase() || '?'}
             </div>
             <div className="item-content">
                <span className="item-name" style={{ fontSize: '0.9rem' }}>@{c.sender_handle}</span>
                <span className="item-preview" style={{ color: 'var(--success)', fontWeight: '700' }}>+ R {c.metadata?.amount}</span>
             </div>
             <ArrowUpRight size={14} color="var(--success)" />
          </div>
        ))
      )}
    </div>
  );
};

export default StokvelVault;
