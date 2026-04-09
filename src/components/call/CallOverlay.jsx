import { useEffect, useRef, useState } from 'react';
import { useCall } from '../../hooks/useCall';
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, X, RotateCw, Minimize2, Maximize2 } from 'lucide-react';

const formatDuration = (seconds) => {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

// Incoming call ring screen
const IncomingCallModal = ({ remoteHandle, callType, onAnswer, onReject }) => (
  <div className="call-overlay" style={{
    position: 'fixed', inset: 0, zIndex: 10000,
    background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a3e 50%, #0d0d1f 100%)',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    animation: 'fadeIn 0.3s ease'
  }}>
    {/* Pulsing ring animation */}
    <div style={{ position: 'relative', marginBottom: '40px' }}>
      <div style={{
        width: '120px', height: '120px', borderRadius: '50%',
        background: 'linear-gradient(135deg, var(--primary), #8b5cf6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '2.5rem', fontWeight: '900', color: 'white', position: 'relative', zIndex: 2
      }}>
        {remoteHandle?.[0]?.toUpperCase() || '?'}
      </div>
      <div className="call-ring-pulse" style={{
        position: 'absolute', inset: '-15px', borderRadius: '50%',
        border: '3px solid var(--primary)', opacity: 0.6,
        animation: 'callPulse 1.5s ease-out infinite'
      }} />
      <div className="call-ring-pulse-2" style={{
        position: 'absolute', inset: '-30px', borderRadius: '50%',
        border: '2px solid var(--primary)', opacity: 0.3,
        animation: 'callPulse 1.5s ease-out infinite 0.3s'
      }} />
    </div>

    <h2 style={{ fontSize: '1.5rem', fontWeight: '900', color: 'white', marginBottom: '8px' }}>
      @{remoteHandle}
    </h2>
    <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', marginBottom: '60px' }}>
      Incoming {callType === 'video' ? 'Video' : 'Voice'} Call...
    </p>

    <div style={{ display: 'flex', gap: '48px' }}>
      <button onClick={onReject} style={{
        width: '64px', height: '64px', borderRadius: '50%',
        background: '#ef4444', border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 4px 20px rgba(239,68,68,0.4)',
        transition: 'transform 0.15s'
      }} onMouseDown={e => e.currentTarget.style.transform = 'scale(0.9)'}
         onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}>
        <PhoneOff size={28} color="white" />
      </button>
      <button onClick={onAnswer} style={{
        width: '64px', height: '64px', borderRadius: '50%',
        background: '#22c55e', border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 4px 20px rgba(34,197,94,0.4)',
        animation: 'callBounce 0.8s ease-in-out infinite',
        transition: 'transform 0.15s'
      }}>
        <Phone size={28} color="white" />
      </button>
    </div>
  </div>
);

// Active call / outgoing ring screen
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

  const isVideo = callType === 'video';
  const isConnected = callState === 'connected';

  return (
    <div className="call-overlay" style={{
      position: 'fixed', inset: 0, zIndex: 10000,
      background: isVideo && isConnected ? '#000' : 'linear-gradient(135deg, #0f0f23 0%, #1a1a3e 50%, #0d0d1f 100%)',
      display: 'flex', flexDirection: 'column',
      animation: 'fadeIn 0.3s ease'
    }}>
      {/* Remote / Main Video */}
      {isVideo && isConnected && (
        <div 
          onClick={() => isConnected && setIsSwapped(!isSwapped)}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', cursor: 'pointer' }}
        >
          <video
            ref={isSwapped ? localVideoRef : remoteVideoRef}
            autoPlay
            playsInline
            muted={isSwapped}
            style={{ 
              width: '100%', 
              height: '100%', 
              objectFit: 'cover', 
              transform: isSwapped ? 'scaleX(-1)' : 'none' 
            }}
          />
        </div>
      )}

      {/* Local / PIP Video */}
      {isVideo && localStream && isConnected && (
        <div 
          onClick={() => setIsSwapped(!isSwapped)}
          style={{
            position: 'absolute', top: isMinimized ? '20px' : '80px', right: '16px', zIndex: 10,
            width: isMinimized ? '80px' : '110px', height: isMinimized ? '110px' : '150px', 
            borderRadius: '16px', overflow: 'hidden', cursor: 'pointer',
            border: '2px solid rgba(255,255,255,0.4)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        >
          <video
            ref={isSwapped ? remoteVideoRef : localVideoRef}
            autoPlay
            playsInline
            muted={!isSwapped}
            style={{ 
              width: '100%', 
              height: '100%', 
              objectFit: 'cover',
              transform: isSwapped ? 'none' : 'scaleX(-1)'
            }}
          />
        </div>
      )}

      {/* Outgoing Ringing Animation (if not connected) */}
      {!isConnected && (
         <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
            <div className="calling-pulse" style={{ width: '200px', height: '200px', border: '2px solid var(--primary)', borderRadius: '50%', animation: 'callPulse 2s infinite' }} />
         </div>
      )}

      {/* Top bar */}
      <div style={{
        position: 'relative', zIndex: 2, padding: '60px 24px 0',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        flex: isVideo && isConnected ? 0 : 1, justifyContent: isVideo && isConnected ? 'flex-start' : 'center'
      }}>
        {/* Avatar for voice calls or connecting state */}
        {(!isVideo || !isConnected) && (
          <>
            <div style={{
              width: '100px', height: '100px', borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--primary), #8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '2.2rem', fontWeight: '900', color: 'white', marginBottom: '20px'
            }}>
              {remoteHandle?.[0]?.toUpperCase() || '?'}
            </div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: '900', color: 'white', marginBottom: '8px' }}>
              @{remoteHandle}
            </h2>
            <p style={{
              color: isConnected ? '#22c55e' : 'rgba(255,255,255,0.5)',
              fontSize: '0.9rem', fontWeight: '600'
            }}>
              {isConnected ? formatDuration(callDuration) : 'Calling...'}
            </p>
          </>
        )}

        {/* Duration overlay for video calls */}
        {isVideo && isConnected && (
          <div style={{
            background: 'rgba(0,0,0,0.5)', borderRadius: '20px', padding: '6px 16px',
            backdropFilter: 'blur(8px)', marginTop: '8px'
          }}>
            <span style={{ color: 'white', fontSize: '0.85rem', fontWeight: '700' }}>
              @{remoteHandle} · {formatDuration(callDuration)}
            </span>
          </div>
        )}
      </div>

      {/* UI Controls Overlay (Hide mostly when minimized) */}
      <div style={{ 
        position: 'relative', zIndex: 20, flex: 1, display: 'flex', flexDirection: 'column',
        background: isMinimized ? 'transparent' : 'linear-gradient(rgba(0,0,0,0.4) 0%, transparent 20%, transparent 80%, rgba(0,0,0,0.6) 100%)',
        transition: 'all 0.3s'
      }}>
        {/* Top bar */}
        <div style={{ padding: '60px 24px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: '900', color: 'white' }}>@{remoteHandle}</h2>
            <p style={{ color: isConnected ? '#22c55e' : 'rgba(255,255,255,0.6)', fontSize: '0.9rem', fontWeight: '700' }}>
               {isConnected ? formatDuration(callDuration) : 'Calling...'}
            </p>
          </div>
          <button onClick={onToggleMinimize} style={{ background: 'rgba(0,0,0,0.3)', border: 'none', borderRadius: '50%', padding: '12px', color: 'white', backdropFilter: 'blur(8px)' }}>
            {isMinimized ? <Maximize2 size={24} /> : <Minimize2 size={24} />}
          </button>
        </div>

        {/* Center UI (Only when not connected or voice) */}
        {!isConnected && (
           <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: 'var(--primary-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', fontWeight: '900', color: 'white' }}>
                 {remoteHandle?.[0]?.toUpperCase()}
              </div>
           </div>
        )}

        {/* Bottom controls */}
        {!isMinimized && (
          <div style={{ padding: '0 24px 60px', display: 'flex', justifyContent: 'center', gap: '20px', marginTop: 'auto' }}>
            <button onClick={() => { setMuted(onToggleMute()); }} style={{ width: '56px', height: '56px', borderRadius: '50%', background: muted ? '#f43f5e' : 'rgba(255,255,255,0.15)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)' }}>
              {muted ? <MicOff size={24} color="white" /> : <Mic size={24} color="white" />}
            </button>
            
            {isVideo && (
               <>
                 <button onClick={() => { setCameraOff(onToggleCamera()); }} style={{ width: '56px', height: '56px', borderRadius: '50%', background: cameraOff ? '#f43f5e' : 'rgba(255,255,255,0.15)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)' }}>
                   {cameraOff ? <VideoOff size={24} color="white" /> : <Video size={24} color="white" />}
                 </button>
                 <button onClick={onSwitchCamera} style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)' }}>
                   <RotateCw size={24} color="white" />
                 </button>
               </>
            )}

            <button onClick={onEnd} style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#ef4444', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 32px rgba(239,68,68,0.4)' }}>
              <PhoneOff size={28} color="white" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Main overlay that renders based on call state
const CallOverlay = () => {
  const {
    callState, callType, remoteHandle,
    localStream, remoteStream, callDuration,
    answerCall, endCall, rejectCall,
    toggleMute, toggleCamera
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

  // calling or connected
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
