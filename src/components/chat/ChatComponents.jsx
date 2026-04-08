import { useState, useEffect, useRef } from 'react';
import { Play, Pause, Landmark, Video, Download } from 'lucide-react';

export const VoiceNote = ({ isSelf, duration, audioUrl }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  
  return (
    <div className="voice-bubble" style={{ alignSelf: isSelf ? 'flex-end' : 'flex-start', marginLeft: isSelf ? 'auto' : 0, marginBottom: '12px' }}>
      <button className="play-btn" onClick={() => setIsPlaying(!isPlaying)}>
        {isPlaying ? <Pause size={18} fill="white" /> : <Play size={18} fill="white" />}
      </button>
      <div className="waveform">
        {[1,2,3,4,5,6,7,8,9,10,11,12].map(i => (
          <div key={i} className={`wave-bar ${isPlaying ? 'active' : ''}`} style={{ height: `${Math.random() * 15 + 5}px` }} />
        ))}
      </div>
      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{duration || '0:12'}</span>
    </div>
  );
};

export const PaymentBubble = ({ bank, amount }) => (
  <div className="payment-bubble" style={{ marginBottom: '12px' }}>
    <div className="payment-header">
       <div className="bank-logo-sm" style={{ background: bank.color }}>{bank.short}</div>
       <span style={{ fontSize: '0.8rem', fontWeight: '800', color: 'white' }}>{bank.name}</span>
    </div>
    <div style={{ fontSize: '1.5rem', fontWeight: '900', color: 'var(--primary)', marginBottom: '8px' }}>R {amount}</div>
    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Payment secured and confirmed.</div>
  </div>
);

export const VideoBubble = ({ isSelf, size, thumb }) => (
  <div className="media-placeholder" style={{ alignSelf: isSelf ? 'flex-end' : 'flex-start', marginLeft: isSelf ? 'auto' : 0, marginBottom: '12px', width: '220px' }}>
    <img src={thumb} alt="thumb" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.5 }} />
    <div className="data-light-tag"><Video size={10} /> VIDEO {size}</div>
    <button className="download-preview-btn"><Download size={14} /> Preview</button>
  </div>
);
