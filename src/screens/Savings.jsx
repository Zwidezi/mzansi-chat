import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Zap, TrendingDown, PieChart, CheckCircle } from 'lucide-react';

const Savings = () => {
  const { t } = useOutletContext();
  const [requested, setRequested] = useState(false);

  const dataSavedBytes = parseInt(localStorage.getItem('mzansi_data_saved') || '0');
  const dataSavedMB = (dataSavedBytes / (1024 * 1024)).toFixed(1);
  const moneySaved = (parseFloat(dataSavedMB) * 0.06).toFixed(2); // R60/GB = R0.06/MB

  return (
    <div className="screen-container">
      <div className="savings-card">
         <div className="savings-label">{t.data_saved}</div>
         <div className="savings-main-stat">
            {dataSavedMB} MB <Zap size={24} fill="white" />
         </div>
         <div className="money-badge">R {moneySaved} {t.money_saved}</div>
      </div>

      <div className="stats-grid">
         <div className="stat-box">
            <TrendingDown size={14} color="var(--success)" />
            <h5>{t.storage_cleared}</h5>
            <p>{dataSavedMB} MB</p>
         </div>
         <div className="stat-box">
            <PieChart size={14} color="var(--primary)" />
            <h5>{t.privacy_score}</h5>
            <p>100%</p>
         </div>
      </div>

      <div className="profile-card" style={{ textAlign: 'left', padding: '24px' }}>
         <h4 style={{ fontWeight: '800', marginBottom: '12px' }}>{t.business_title}</h4>
         <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>{t.business_sub}</p>
         {!requested ? (
           <button 
             className="btn-primary-full" 
             style={{ background: 'var(--surface-light)', color: 'var(--primary)', border: '1px solid var(--primary)' }}
             onClick={() => setRequested(true)}
           >
              Get Verified
           </button>
         ) : (
           <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--success)', fontWeight: '700', fontSize: '0.9rem', background: 'rgba(34,197,94,0.1)', padding: '12px', borderRadius: '12px' }}>
             <CheckCircle size={18} /> Application Received! We'll notify you soon.
           </div>
         )}
      </div>

      <div className="savings-info" style={{ marginTop: '24px', padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid var(--border)' }}>
         <h5 style={{ fontWeight: '700', fontSize: '0.8rem', marginBottom: '8px' }}>How it works?</h5>
         <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            MzansiChat uses 'Data-Light' compression, reducing media size by up to 90% without losing visibility. Stats will update as you use the app. Savings are calculated based on average South African data prices (R60/GB).
         </p>
      </div>
    </div>
  );
};

export default Savings;
