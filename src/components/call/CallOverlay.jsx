import { useEffect, useRef, useState } from 'react';
import { useCall } from '../../hooks/useCall';
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, RotateCw, Minimize2, Maximize2 } from 'lucide-react';

const formatDuration = (seconds) => {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

// ═══════════════════════════════════════
// Incoming Call Ring Screen
// ═══════════════════════════════════════
const IncomingCallModal = ({ remoteHandle, callType, onAnswer, onReject }) => (
  <div style={{
    position: 'fixed', inset: 0, zIndex: 10000,
    background: 'linear-gradient(180deg, #0a0a1a 0%, #111133 40%, #0d0d2a 100%)',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'space-between', padding: '80px 32px 60px',
    animation: 'fadeIn 0.3s ease'
  }}>
    {/* Top: Caller Info */}
    <div style={{ textAlign: 'center' }}>
      <div style={{ position: 'relative', display: 'inline-block', marginBottom: '24px' }}>
        {/* Pulse rings */}
        <div style={{
          position: 'absolute', inset: '-20px', borderRadius: '50%',
          border: '2px solid rgba(14,192,223,0.4)',
          animation: 'callPulse 2s ease-out infinite'
        }} />
        <div style={{
          position: 'absolute', inset: '-40px', borderRadius: '50%',
          border: '1.5px solid rgba(14,192,223,0.2)',
          animation: 'callPulse 2s ease-out infinite 0.5s'
        }} />
        <div style={{
          position: 'absolute', inset: '-60px', borderRadius: '50%',
          border: '1px solid rgba(14,192,223,0.1)',
          animation: 'callPulse 2s ease-out infinite 1s'
        }} />
        {/* Avatar */}
        <div style={{
          width: '100px', height: '100px', borderRadius: '50%',
          background: 'linear-gradient(135deg, #0ec0df 0%, #8b5cf6 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '2.5rem', fontWeight: '900', color: 'white',
          boxShadow: '0 0 40px rgba(14,192,223,0.3)',
          position: 'relative', zIndex: 2
        }}>
          {remoteHandle?.[0]?.toUpperCase() || '?'}
        </div>
      </div>
      <h2 style={{ fontSize: '1.6rem', fontWeight: '900', color: 'white', marginBottom: '6px', letterSpacing: '-0.02em' }}>
        @{remoteHandle}
      </h2>
      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', fontWeight: '500' }}>
        MzansiChat {callType === 'video' ? 'Video' : 'Voice'} Call
      </p>
    </div>

    {/* Bottom: Answer/Reject */}
    <div style={{ display: 'flex', gap: '64px', alignItems: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <button onClick={onReject} style={{
          width: '68px', height: '68px', borderRadius: '50%',
          background: '#ef4444', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 8px 32px rgba(239,68,68,0.35)',
          transition: 'transform 0.15s, box-shadow 0.15s'
        }}>
          <PhoneOff size={28} color="white" />
        </button>
        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', marginTop: '10px', display: 'block', fontWeight: '600' }}>Decline</span>
      </div>
      <div style={{ textAlign: 'center' }}>
        <button onClick={onAnswer} style={{
          width: '68px', height: '68px', borderRadius: '50%',
          background: '#22c55e', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 8px 32px rgba(34,197,94,0.35)',
          animation: 'callBounce 1.2s ease-in-out infinite',
          transition: 'transform 0.15s'
        }}>
          <Phone size={28} color="white" />
        </button>
        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', marginTop: '10px', display: 'block', fontWeight: '600' }}>Accept</span>
      </div>
    </div>
  </div>
);

// ═══════════════════════════════════════
// Active Call Screen
// ═══════════════════════════════════════
const ActiveCallScreen = ({ 
  remoteHandle, callType, callState, callDuration, 
  localStream, remoteStream, onEnd, onToggleMute, 
  onToggleCamera, onSwitchCamera, onToggleMinimize, isMinimized 
}) => {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [isSwapped, setIsSwapped] = useState(false);
  const [showControls, setShowControls] = useState(true);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Auto-hide controls after 5s for video calls
  useEffect(() => {
    if (callType === 'video' && callState === 'connected') {
      const timer = setTimeout(() => setShowControls(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [showControls, callType, callState]);

  const isVideo = callType === 'video';
  const isConnected = callState === 'connected';

  const toggleControls = () => {
    if (isVideo && isConnected) setShowControls(!showControls);
  };

  // ─── Voice Call Layout ───
  if (!isVideo || !isConnected) {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 10000,
        background: 'linear-gradient(180deg, #0a0a1a 0%, #111133 40%, #0d0d2a 100%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'space-between', padding: '80px 32px 60px',
        animation: 'fadeIn 0.3s ease'
      }}>
        {/* Top: Contact Info */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ position: 'relative', display: 'inline-block', marginBottom: '24px' }}>
            {/* Subtle pulse when calling */}
            {!isConnected && (
              <div style={{
                position: 'absolute', inset: '-16px', borderRadius: '50%',
                border: '2px solid rgba(14,192,223,0.3)',
                animation: 'callPulse 2s ease-out infinite'
              }} />
            )}
            {/* Connected glow ring */}
            {isConnected && (
              <div style={{
                position: 'absolute', inset: '-4px', borderRadius: '50%',
                background: 'linear-gradient(135deg, #22c55e, #0ec0df)',
                opacity: 0.4, filter: 'blur(8px)'
              }} />
            )}
            <div style={{
              width: '100px', height: '100px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #0ec0df 0%, #8b5cf6 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '2.5rem', fontWeight: '900', color: 'white',
              position: 'relative', zIndex: 2
            }}>
              {remoteHandle?.[0]?.toUpperCase() || '?'}
            </div>
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '900', color: 'white', marginBottom: '6px' }}>
            @{remoteHandle}
          </h2>
          <p style={{
            color: isConnected ? '#22c55e' : 'rgba(255,255,255,0.5)',
            fontSize: '0.95rem', fontWeight: '600',
            transition: 'color 0.3s'
          }}>
            {isConnected ? formatDuration(callDuration) : 'Calling...'}
          </p>
        </div>

        {/* Bottom: Controls */}
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          {/* Mute */}
          <CallButton
            icon={muted ? <MicOff size={22} color="white" /> : <Mic size={22} color="white" />}
            active={muted}
            label={muted ? 'Unmute' : 'Mute'}
            onClick={() => { const result = onToggleMute(); setMuted(!result); }}
          />

          {/* End Call */}
          <div style={{ textAlign: 'center' }}>
            <button onClick={onEnd} style={{
              width: '72px', height: '72px', borderRadius: '50%',
              background: '#ef4444', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 32px rgba(239,68,68,0.4)',
              transition: 'transform 0.15s'
            }}>
              <PhoneOff size={30} color="white" />
            </button>
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', marginTop: '8px', display: 'block', fontWeight: '600' }}>End</span>
          </div>

          {/* Speaker placeholder for voice calls */}
          <CallButton
            icon={<Video size={22} color="white" />}
            active={false}
            label="Video"
            onClick={() => {}}
            disabled
          />
        </div>
      </div>
    );
  }

  // ─── Video Call Layout ───
  return (
    <div 
      onClick={toggleControls}
      style={{
        position: 'fixed', inset: 0, zIndex: 10000,
        background: '#000',
        animation: 'fadeIn 0.3s ease'
      }}
    >
      {/* Remote Video (Full Screen) */}
      <video
        ref={isSwapped ? localVideoRef : remoteVideoRef}
        autoPlay playsInline
        muted={isSwapped}
        style={{ 
          position: 'absolute', inset: 0,
          width: '100%', height: '100%', objectFit: 'cover',
          transform: isSwapped ? 'scaleX(-1)' : 'none'
        }}
      />

      {/* Local PIP Video */}
      {localStream && (
        <div 
          onClick={(e) => { e.stopPropagation(); setIsSwapped(!isSwapped); }}
          style={{
            position: 'absolute', 
            top: 'max(60px, env(safe-area-inset-top, 60px))', 
            right: '16px', zIndex: 10,
            width: '100px', height: '140px', 
            borderRadius: '16px', overflow: 'hidden', cursor: 'pointer',
            border: '2px solid rgba(255,255,255,0.3)', 
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        >
          <video
            ref={isSwapped ? remoteVideoRef : localVideoRef}
            autoPlay playsInline
            muted={!isSwapped}
            style={{ 
              width: '100%', height: '100%', objectFit: 'cover',
              transform: isSwapped ? 'none' : 'scaleX(-1)'
            }}
          />
        </div>
      )}

      {/* Top Status Bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20,
        padding: 'max(50px, env(safe-area-inset-top, 50px)) 20px 16px',
        background: showControls ? 'linear-gradient(180deg, rgba(0,0,0,0.7) 0%, transparent 100%)' : 'transparent',
        transition: 'background 0.3s',
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'
      }}>
        {showControls && (
          <>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: 'white', marginBottom: '2px' }}>@{remoteHandle}</h3>
              <p style={{ color: '#22c55e', fontSize: '0.8rem', fontWeight: '600' }}>{formatDuration(callDuration)}</p>
            </div>
            <button onClick={(e) => { e.stopPropagation(); onToggleMinimize(); }} style={{
              background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', 
              width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              backdropFilter: 'blur(10px)', cursor: 'pointer'
            }}>
              {isMinimized ? <Maximize2 size={18} color="white" /> : <Minimize2 size={18} color="white" />}
            </button>
          </>
        )}
      </div>

      {/* Bottom Controls */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 20,
        padding: '20px 24px max(40px, env(safe-area-inset-bottom, 40px))',
        background: showControls ? 'linear-gradient(0deg, rgba(0,0,0,0.7) 0%, transparent 100%)' : 'transparent',
        transition: 'all 0.3s',
        opacity: showControls ? 1 : 0,
        transform: showControls ? 'translateY(0)' : 'translateY(20px)',
        pointerEvents: showControls ? 'auto' : 'none'
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
          {/* Mute */}
          <CallButton
            icon={muted ? <MicOff size={22} color="white" /> : <Mic size={22} color="white" />}
            active={muted}
            onClick={(e) => { e.stopPropagation(); const result = onToggleMute(); setMuted(!result); }}
          />
          {/* Camera */}
          <CallButton
            icon={cameraOff ? <VideoOff size={22} color="white" /> : <Video size={22} color="white" />}
            active={cameraOff}
            onClick={(e) => { e.stopPropagation(); const result = onToggleCamera(); setCameraOff(!result); }}
          />
          {/* Flip Camera */}
          <CallButton
            icon={<RotateCw size={22} color="white" />}
            active={false}
            onClick={(e) => { e.stopPropagation(); onSwitchCamera(); }}
          />
          {/* End Call */}
          <button onClick={(e) => { e.stopPropagation(); onEnd(); }} style={{
            width: '60px', height: '60px', borderRadius: '50%',
            background: '#ef4444', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 6px 24px rgba(239,68,68,0.4)',
            transition: 'transform 0.15s'
          }}>
            <PhoneOff size={26} color="white" />
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Reusable Call Control Button ───
const CallButton = ({ icon, active, label, onClick, disabled }) => (
  <div style={{ textAlign: 'center' }}>
    <button 
      onClick={onClick} 
      disabled={disabled}
      style={{
        width: '52px', height: '52px', borderRadius: '50%',
        background: active ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.12)',
        border: 'none', cursor: disabled ? 'default' : 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(12px)',
        transition: 'all 0.2s',
        opacity: disabled ? 0.3 : 1
      }}
    >
      {icon}
    </button>
    {label && <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem', marginTop: '6px', display: 'block', fontWeight: '600' }}>{label}</span>}
  </div>
);

// ═══════════════════════════════════════
// Main Overlay
// ═══════════════════════════════════════
const CallOverlay = () => {
  const {
    callState, callType, remoteHandle,
    localStream, remoteStream, callDuration,
    answerCall, endCall, rejectCall,
    toggleMute, toggleCamera,
    isMinimized, switchCamera, toggleMinimize
  } = useCall();

  if (callState === 'idle') return null;

  if (callState === 'ringing') {
    return (
      <IncomingCallModal
        remoteHandle={remoteHandle}
        callType={callType}
        onAnswer={answerCall}
        onReject={rejectCall}
      />
    );
  }

  return (
    <ActiveCallScreen
      remoteHandle={remoteHandle}
      callType={callType}
      callState={callState}
      callDuration={callDuration}
      localStream={localStream}
      remoteStream={remoteStream}
      isMinimized={isMinimized}
      onEnd={endCall}
      onToggleMute={toggleMute}
      onToggleCamera={toggleCamera}
      onSwitchCamera={switchCamera}
      onToggleMinimize={toggleMinimize}
    />
  );
};

export default CallOverlay;
