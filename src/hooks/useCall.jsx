import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import Peer from 'peerjs';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';

const CallContext = createContext();

export const CallProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const userHandle = currentUser?.handle;
  const [peerId, setPeerId] = useState(null);
  const [callState, setCallState] = useState('idle'); // idle | ringing | calling | connected
  const [callType, setCallType] = useState('voice'); // voice | video
  const [remoteHandle, setRemoteHandle] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [callDuration, setCallDuration] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);
  const [facingMode, setFacingMode] = useState('user');

  const peerRef = useRef(null);
  const activeCallRef = useRef(null);
  const timerRef = useRef(null);
  const channelRef = useRef(null);

  // Initialize PeerJS when user logs in
  useEffect(() => {
    if (!userHandle) return;

    // STUN + TURN servers — TURN is essential for symmetric NAT (common on SA mobile networks)
    const iceServers = [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ];
    // Add TURN servers from env (required for calls on restrictive NATs)
    const turnUrl = import.meta.env.VITE_TURN_URL;
    const turnUser = import.meta.env.VITE_TURN_USERNAME;
    const turnPass = import.meta.env.VITE_TURN_PASSWORD;
    if (turnUrl && turnUser && turnPass) {
      iceServers.push({ urls: turnUrl, username: turnUser, credential: turnPass });
    }

    const peer = new Peer(`mzansi-${userHandle}`, {
      debug: 0,
      config: { iceServers }
    });

    peer.on('open', (id) => {
      console.log('[Call] PeerJS connected:', id);
      setPeerId(id);
    });

    // Handle incoming PeerJS media call
    peer.on('call', (incoming) => {
      console.log('[Call] Incoming PeerJS call from:', incoming.peer);
      // Extract caller handle from peer ID
      const callerHandle = incoming.peer.replace('mzansi-', '');
      // Determine call type from metadata
      const isVideo = incoming.metadata?.video ?? true;

      setRemoteHandle(callerHandle);
      setCallType(isVideo ? 'video' : 'voice');
      setCallState('ringing');
      activeCallRef.current = incoming;

      incoming.on('close', () => {
        console.log('[Call] Incoming call closed');
        cleanup();
      });
    });

    peer.on('error', (err) => {
      console.error('[Call] PeerJS Error:', err);
      if (err.type === 'peer-unavailable') {
        cleanup();
      }
    });

    peer.on('disconnected', () => {
      console.log('[Call] PeerJS disconnected, reconnecting...');
      if (!peer.destroyed) peer.reconnect();
    });

    peerRef.current = peer;

    // Listen for call signals via Supabase Realtime
    const channel = supabase
      .channel(`call-signal-${userHandle}`)
      .on('broadcast', { event: 'call-ring' }, (payload) => {
        console.log('[Call] Received call signal:', payload);
        // The actual call comes via PeerJS, this is just notification
      })
      .on('broadcast', { event: 'call-end' }, () => {
        console.log('[Call] Remote ended call');
        cleanup();
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      peer.destroy();
      channel.unsubscribe();
    };
  }, [userHandle]);

  // Call duration timer
  useEffect(() => {
    if (callState === 'connected') {
      setCallDuration(0);
      timerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [callState]);

  const cleanup = useCallback(() => {
    if (activeCallRef.current) {
      activeCallRef.current.close();
      activeCallRef.current = null;
    }
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    setLocalStream(null);
    setRemoteStream(null);
    setCallState('idle');
    setRemoteHandle(null);
    setCallDuration(0);
    setIsMinimized(false);
    setFacingMode('user');
  }, [localStream]);

  const getMedia = async (video = true) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: video ? { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } } : false,
        audio: true
      });
      setLocalStream(stream);
      return stream;
    } catch (err) {
      console.error('[Call] Media access failed:', err);
      alert('Camera/microphone access is required for calls. Please allow access and try again.');
      return null;
    }
  };

  const makeCall = useCallback(async (targetHandle, video = true) => {
    if (!peerRef.current || callState !== 'idle') return;

    setRemoteHandle(targetHandle);
    setCallType(video ? 'video' : 'voice');
    setCallState('calling');

    const stream = await getMedia(video);
    if (!stream) {
      setCallState('idle');
      setRemoteHandle(null);
      return;
    }

    // Signal the other user via Supabase so they know a call is coming
    await supabase.channel(`call-signal-${targetHandle}`).send({
      type: 'broadcast',
      event: 'call-ring',
      payload: { from: userHandle, video }
    });

    const targetId = `mzansi-${targetHandle}`;
    const outgoing = peerRef.current.call(targetId, stream, {
      metadata: { video, from: userHandle }
    });

    if (!outgoing) {
      console.error('[Call] Failed to create outgoing call');
      stream.getTracks().forEach(t => t.stop());
      setCallState('idle');
      setRemoteHandle(null);
      return;
    }

    outgoing.on('stream', (remote) => {
      console.log('[Call] Got remote stream');
      setRemoteStream(remote);
      setCallState('connected');
    });

    outgoing.on('close', () => {
      console.log('[Call] Outgoing call closed');
      cleanup();
    });

    outgoing.on('error', (err) => {
      console.error('[Call] Call error:', err);
      cleanup();
    });

    activeCallRef.current = outgoing;

    // Auto-timeout after 30s if no answer
    setTimeout(() => {
      if (callState === 'calling') {
        console.log('[Call] No answer, timing out');
        endCall();
      }
    }, 30000);
  }, [callState, userHandle, cleanup]);

  const answerCall = useCallback(async () => {
    if (!activeCallRef.current || callState !== 'ringing') return;

    const isVideo = callType === 'video';
    const stream = await getMedia(isVideo);
    if (!stream) return;

    activeCallRef.current.answer(stream);

    activeCallRef.current.on('stream', (remote) => {
      console.log('[Call] Got remote stream after answering');
      setRemoteStream(remote);
      setCallState('connected');
    });

    activeCallRef.current.on('error', (err) => {
      console.error('[Call] Answer error:', err);
      cleanup();
    });
  }, [callState, callType, cleanup]);

  const endCall = useCallback(() => {
    // Notify remote user
    if (remoteHandle) {
      supabase.channel(`call-signal-${remoteHandle}`).send({
        type: 'broadcast',
        event: 'call-end',
        payload: { from: userHandle }
      });
    }
    cleanup();
  }, [remoteHandle, userHandle, cleanup]);

  const rejectCall = useCallback(() => {
    if (remoteHandle) {
      supabase.channel(`call-signal-${remoteHandle}`).send({
        type: 'broadcast',
        event: 'call-end',
        payload: { from: userHandle }
      });
    }
    cleanup();
  }, [remoteHandle, userHandle, cleanup]);

  const toggleMute = useCallback(() => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        return audioTrack.enabled;
      }
    }
    return true;
  }, [localStream]);

  const toggleCamera = useCallback(() => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        return videoTrack.enabled;
      }
    }
    return true;
  }, [localStream]);

  const switchCamera = useCallback(async () => {
    if (callType !== 'video' || !localStream) return;

    const newFacingMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newFacingMode);

    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: newFacingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true
      });

      const newVideoTrack = newStream.getVideoTracks()[0];
      const oldVideoTrack = localStream.getVideoTracks()[0];

      if (activeCallRef.current && activeCallRef.current.peerConnection) {
        const senders = activeCallRef.current.peerConnection.getSenders();
        const videoSender = senders.find(s => s.track && s.track.kind === 'video');
        if (videoSender) {
          await videoSender.replaceTrack(newVideoTrack);
        }
      }

      // Preserve audio track (don't flip audio)
      const audioTrack = localStream.getAudioTracks()[0];
      const combinedStream = new MediaStream([newVideoTrack, audioTrack]);

      oldVideoTrack.stop();
      setLocalStream(combinedStream);

    } catch (err) {
      console.error('[Call] Camera switch failed:', err);
    }
  }, [callType, localStream, facingMode]);

  const toggleMinimize = useCallback(() => {
    setIsMinimized(prev => !prev);
  }, []);

  return (
    <CallContext.Provider value={{
      peerId,
      callState,
      callType,
      remoteHandle,
      localStream,
      remoteStream,
      callDuration,
      isMinimized,
      facingMode,
      makeCall,
      answerCall,
      endCall,
      rejectCall,
      toggleMute,
      toggleCamera,
      switchCamera,
      toggleMinimize
    }}>
      {children}
    </CallContext.Provider>
  );
};

export const useCall = () => {
  const context = useContext(CallContext);
  if (!context) throw new Error('useCall must be used within a CallProvider');
  return context;
};
