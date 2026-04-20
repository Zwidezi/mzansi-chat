import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getStokvelContributions } from '../lib/supabaseClient';
import { Wallet as WalletIcon, ArrowUpRight, TrendingUp, CreditCard, ShieldCheck } from 'lucide-react';

const Wallet = () => {
    const { currentUser } = useAuth();
    const { t } = useOutletContext();
    const [contributions, setContributions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchWalletData = async () => {
            if (currentUser?.handle) {
                // Fetch all contributions globally where this user is the contributor
                // Note: The getStokvelContributions helper usually filters by chatId.
                // We'll add a global fetch for the wallet.
                const { data, error } = await import('../lib/supabaseClient').then(m => 
                    m.supabase
                        .from('stokvel_contributions')
                        .select('*')
                        .eq('user_handle', currentUser.handle)
                        .order('created_at', { ascending: false })
                );
                
                if (!error) setContributions(data);
                setLoading(false);
            }
        };
        fetchWalletData();
    }, [currentUser]);

    const totalContributed = contributions.reduce((acc, c) => acc + (parseFloat(c.amount) || 0), 0);

    return (
        <div className="screen-container">
            <div className="savings-card" style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)', marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                   <h3 style={{ fontWeight: '800' }}>Mzansi Wallet</h3>
                   <WalletIcon size={20} />
                </div>
                <div className="savings-main-stat">R {totalContributed.toFixed(2)}</div>
                <p style={{ fontSize: '0.75rem', opacity: 0.8, marginBottom: '16px' }}>Total Stokvel Savings</p>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.1)', padding: '10px', borderRadius: '12px' }}>
                    <ShieldCheck size={16} color="#4ade80" />
                    <span style={{ fontSize: '0.7rem' }}>Escrow Protected by MzansiChat</span>
                </div>
            </div>

            <div className="stats-grid" style={{ marginBottom: '32px' }}>
                <div className="stat-box">
                    <TrendingUp size={14} color="var(--success)" />
                    <h5>Growth</h5>
                    <p>+ 4.2%</p>
                </div>
                <div className="stat-box">
                    <CreditCard size={14} color="var(--primary)" />
                    <h5>Cards</h5>
                    <p>1 Active</p>
                </div>
            </div>

            <h4 style={{ fontWeight: '800', fontSize: '0.9rem', marginBottom: '16px', color: 'var(--text-secondary)' }}>Recent Transactions</h4>
            
            {loading ? (
                <div className="shimmer" style={{ height: '60px', borderRadius: '16px', marginBottom: '12px' }}></div>
            ) : contributions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', opacity: 0.5 }}>
                    <p>No transactions yet.</p>
                </div>
            ) : (
                contributions.map((c, i) => (
                    <div key={c.id || i} className="list-item" style={{ background: 'var(--surface-light)', marginBottom: '12px' }}>
                        <div className="avatar" style={{ background: 'var(--bg-dark)', color: 'var(--primary)' }}>
                            <ArrowUpRight size={18} />
                        </div>
                        <div className="item-content">
                            <div style={{ fontWeight: '700', fontSize: '0.95rem' }}>Contribution</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(c.created_at).toLocaleDateString()}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: '800', color: 'var(--success)' }}>+ R {c.amount}</div>
                            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>ID: {c.payment_reference?.slice(-6) || 'N/A'}</div>
                        </div>
                    </div>
                ))
            )}

            <button className="btn-primary" style={{ marginTop: '20px', width: '100%', padding: '16px', borderRadius: '16px' }}>
                Top Up Wallet
            </button>
        </div>
    );
};

export default Wallet;
