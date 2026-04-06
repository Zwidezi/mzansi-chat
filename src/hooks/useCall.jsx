import { useState, useEffect, useRef, createContext, useContext } from 'react';
import Peer from 'peerjs';

const CallContext = createContext();

export const CallProvider = ({ children, userHandle }) => {
  const [peerId, setPeerId] = useState(null);
  const [call, setCall] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isCalling, setIsCalling] = useState(false);
  const [incomingCall, setIncomingCall] = useState(null);
  
  const peerRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  useEffect(() => {
    if (!userHandle) return;

    // Initialize Peer with user handle as the ID
    const peer = new Peer(`mzansi-${userHandle}`, {
      debug: 2
    });

    peer.on('open', (id) => {
      console.log('PeerJS connected with ID:', id);
      setPeerId(id);
    });

    // Handle incoming calls
    peer.on('call', (incoming) => {
      console.log('Incoming call from:', incoming.peer);
      setIncomingCall(incoming);
    });

    peer.on('error', (err) => {
      console.error('PeerJS Error:', err);
    });

    peerRef.current = peer;

    return () => {
      peer.destroy();
    };
  }, [userHandle]);

  const startLocalStream = async (video = true) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: video,
        audio: true
      });
      setLocalStream(stream);
      return stream;
    } catch (err) {
      console.error('Failed to get local stream', err);
      return null;
    }
  };

  const makeCall = async (targetHandle, video = true) => {
    const stream = await startLocalStream(video);
    if (!stream) return;

    const targetId = `mzansi-${targetHandle}`;
    const outgoingCall = peerRef.current.call(targetId, stream);
    
    outgoingCall.on('stream', (remote) => {
      setRemoteStream(remote);
    });

    outgoingCall.on('close', () => {
      endCall();
    });

    setCall(outgoingCall);
    setIsCalling(true);
  };

  const answerCall = async () => {
    if (!incomingCall) return;
    
    const stream = await startLocalStream(true); // Default to video for now
    incomingCall.answer(stream);
    
    incomingCall.on('stream', (remote) => {
      setRemoteStream(remote);
    });

    setCall(incomingCall);
    setIncomingCall(null);
    setIsCalling(true);
  };

  const endCall = () => {
    if (call) call.close();
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    setCall(null);
    setLocalStream(null);
    setRemoteStream(null);
    setIsCalling(false);
    setIncomingCall(null);
  };

  return (
    <CallContext.Provider value={{
      peerId,
      isCalling,
      incomingCall,
      localStream,
      remoteStream,
      makeCall,
      answerCall,
      endCall,
      localVideoRef,
      remoteVideoRef
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
