import { useState, useEffect, useRef } from 'react';
import { Play, Pause, Landmark, Video, Download, Zap } from 'lucide-react';

export const VoiceNote = ({ isSelf, duration, audioUrl }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const bars = [8, 12, 15, 10, 8, 14, 18, 12, 10, 15, 12, 8];
  
  return (
    <div className="voice-bubble" style={{ alignSelf: isSelf ? 'flex-end' : 'flex-start', marginLeft: isSelf ? 'auto' : 0, marginBottom: '12px' }}>
      <button className="play-btn" onClick={() => setIsPlaying(!isPlaying)}>
        {isPlaying ? <Pause size={18} fill="white" /> : <Play size={18} fill="white" />}
      </button>
      <div className="waveform">
        {bars.map((h, i) => (
          <div 
            key={i} 
            className={`wave-bar ${isPlaying ? 'active' : ''}`} 
            style={{ 
              height: `${h}px`,
              animationDelay: `${i * 0.1}s`,
              background: isPlaying ? 'var(--primary)' : 'rgba(255,255,255,0.3)'
            }} 
          />
        ))}
      </div>
      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', minWidth: '30px' }}>{duration || '0:12'}</span>
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
  <div className="media-placeholder" style={{ 
    alignSelf: isSelf ? 'flex-end' : 'flex-start', 
    marginLeft: isSelf ? 'auto' : 0, 
    marginBottom: '12px', 
    width: '220px',
    borderRadius: '16px',
    overflow: 'hidden',
    position: 'relative',
    aspectRatio: '16/9'
  }}>
    <img src={thumb} alt="thumb" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 60%)' }} />
    <div className="data-light-tag" style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', padding: '4px 8px', borderRadius: '6px', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.6rem', fontWeight: '800' }}>
      <Zap size={10} strokeWidth={3} /> {size} VIDEO
    </div>
    <button className="download-preview-btn" style={{ position: 'absolute', bottom: '8px', left: '8px', right: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: 'white', color: 'black', border: 'none', padding: '10px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: '800' }}>
      <Download size={14} /> Download Preview
    </button>
  </div>
);
