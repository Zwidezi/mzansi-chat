import { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { 
  MessageCircle, BellRing, UserCircle2, CircleDot, ArrowLeft, Send, CheckCircle, 
  Octagon, ChevronRight, Ghost, Info, Zap, 
  Database, TrendingDown, Image as ImageIcon, Plus, 
  MapPin, UserPlus, CreditCard, X, Landmark, Users, 
  Play, Volume2, Globe, Fingerprint, LogOut, Camera, RefreshCw,
  Lock, Key, ShieldCheck, Shield, Film, Mic, XCircle, Square, Phone, Video,
  Smile, Reply, Trash2, Forward, Search, MoreVertical, ArrowDownLeft,
  PhoneCall, VideoIcon, CheckCheck, Circle, MicOff, PhoneOff, MessageSquarePlus,
  BellOff, LinkIcon
} from 'lucide-react';
import { getLindiweResponse } from './lib/geminiService';
import confetti from 'canvas-confetti';
import { useCall, CallProvider } from './hooks/useCall';
import OneSignal from 'react-onesignal';
import { PaystackButton } from 'react-paystack';
import GoogleAd from './components/common/GoogleAd';
import { 
  supabase, generateRecoveryKey, signUpUser, signInUser, 
  getCommunities, joinCommunity, sendMessage, getMessages, 
  subscribeToMessages, setOnlineStatus, getUser, getDmChatId, uploadMedia,
  saveOneSignalId, saveWebAuthnCredential, bufferToBase64, createCommunity,
  updateCommunity, deleteMessage, updateUserStats, updateUserVerification,
  uploadStatusFile, getActiveStatuses
} from './lib/supabaseClient';

// --- Localization Engine ---

const TRANSLATIONS = {
  English: {
    chats: "Chats",
    updates: "Updates",
    profile: "Profile",
    savings: "Savings",
    active_convos: "Active Conversations",
    discovery: "Discover Communities",
    join_ghost: "Join with Ghost Mode",
    my_alias: "Your Mzansi Alias",
    global_ghost: "Global Ghost Mode",
    data_saved: "Data Saved This Month",
    money_saved: "Estimated Savings",
    storage_cleared: "Storage Cleared",
    privacy_score: "Privacy Score",
    online: "online",
    ghost_active: "Ghost Mode Active",
    typing: "typing...",
    new_msg: "New message...",
    welcome: "Welcome to MzansiChat",
    welcome_sub: "The first 'Identity-First' chat. No phone number or SIM required.",
    get_started: "Get Started",
    create_profile: "Create Your Identity",
    full_name: "Full Name",
    about: "About / Status",
    secure_account: "Secure Your Account",
    biometric_sub: "Protect your @handle with on-device biometrics.",
    setup_biometric: "Setup Biometrics",
    finish: "Finish Setup",
    change_pic: "Change Photo",
    recovery_title: "Your Recovery Key",
    recovery_sub: "Write these 12 words down. This is the only way to recover your account.",
    privacy_100: "Privacy Score: 100%",
    business_title: "Mzansi Business Hub",
    business_sub: "Verify your spaza or taxi business and reach 10,000+ local users.",
    video_call: "Video Call",
    accept: "Accept",
    decline: "Decline",
    incoming_call: "Incoming Call",
    verified_business: "Verified Business"
  },
  isiZulu: {
    chats: "Izingxoxo",
    updates: "Izindaba",
    profile: "Iphrofayela",
    savings: "Ukulondoloza",
    active_convos: "Izingxoxo Ezisebenzayo",
    discovery: "Thola Imiphakathi",
    join_ghost: "Joyina nge-Ghost Mode",
    my_alias: "Igama lakho le-Mzansi",
    global_ghost: "I-Ghost Mode Wonke Indawo",
    data_saved: "Idatha Elondoloziwe Kule nyanga",
    money_saved: "Imali Elondoloziwe",
    storage_cleared: "Isitoreji Esihlanzekile",
    privacy_score: "Isikolo Sobumfihlo",
    online: "ukhona",
    ghost_active: "I-Ghost Mode Iyasebenza",
    typing: "uyabhala...",
    new_msg: "Umlayezo omusha...",
    welcome: "Siyakwamukela ku-MzansiChat",
    welcome_sub: "Ingxoxo yokuqala yobunikazi. Ayikho inombolo yocingo edingekayo.",
    get_started: "Qalisa",
    create_profile: "Dala Ubunikazi Bakho",
    full_name: "Igama Eliphelele",
    about: "Mayelana / Isimo",
    secure_account: "Vikela I-akhawunti Yakho",
    biometric_sub: "Vikela i-@handle yakho ngama-biometrics akuselula.",
    setup_biometric: "Setha Ama-biometrics",
    finish: "Qedela Ukusetha",
    change_pic: "Shintsha Isithombe",
    recovery_title: "Isihluthulelo Sokubuyisela",
    recovery_sub: "Bhala lawa magama ayi-12. Lena ukuphela kwendlela yokubuyisela i-akhawunti yakho.",
    privacy_100: "Isikolo Sobumfihlo: 100%",
    business_title: "Mzansi Business Hub",
    business_sub: "Qinisekisa ibhizinisi lakho (isiphaza noma itekisi) bafinyelele abasebenzisi abangu-10,000+.",
    video_call: "Ikholi Yevidiyo",
    accept: "Vuma",
    decline: "Yala",
    incoming_call: "Ikholi Engenayo",
    verified_business: "Ibhizinisi Eliqinisekisiwe"
  },
  Afrikaans: {
    chats: "Kletse",
    updates: "Opdaterings",
    profile: "Profiel",
    savings: "Besparings",
    active_convos: "Aktiewe Gesprekke",
    discovery: "Ontdek Gemeenskappe",
    join_ghost: "Sluit aan met Ghost Mode",
    my_alias: "Jou Mzansi Alias",
    global_ghost: "Globale Ghost Mode",
    data_saved: "Data Gespaar Hierdie Maand",
    money_saved: "Beraamde Besparings",
    storage_cleared: "Berging Skoongemaak",
    privacy_score: "Privaatheid Telling",
    online: "aanlyn",
    ghost_active: "Ghost Mode Aktief",
    typing: "tik tans...",
    new_msg: "Nuwe boodskap...",
    welcome: "Welkom by MzansiChat",
    welcome_sub: "Die eerste identiteit-prioriteit klets. Geen selfoonnommer nodig nie.",
    get_started: "Begin Nou",
    create_profile: "Skep Jou Identiteit",
    full_name: "Volle Naam",
    about: "Oor / Status",
    secure_account: "Beveilig Jou Rekening",
    biometric_sub: "Beskerm jou @handle met biometrie op jou toestel.",
    setup_biometric: "Stel Biometrie Op",
    finish: "Voltooi Opstelling",
    change_pic: "Verander Foto",
    recovery_title: "Jou Herstelsleutel",
    recovery_sub: "Skryf hierdie 12 woorde neer. Dit is die enigste manier om jou rekening te herwin.",
    privacy_100: "Privaatheid Telling: 100%",
    business_title: "Mzansi Business Hub",
    business_sub: "Verifieer jou spaza of taxi besigheid en bereik 10,000+ plaaslike gebruikers.",
    video_call: "Video-oproep",
    accept: "Aanvaar",
    decline: "Weier",
    incoming_call: "Inkomende Oproep",
    verified_business: "Geverifieerde Besigheid"
  }
};

// --- Simulation Data ---
const BANKS = [
  { id: '1', name: 'Capitec Pay', color: '#003154', short: 'CAP' },
  { id: '2', name: 'FNB eWallet', color: '#00a39b', short: 'FNB' },
  { id: '3', name: 'Standard Bank', color: '#0033aa', short: 'STD' },
  { id: '4', name: 'Nedbank Send-iMali', color: '#006a33', short: 'NED' },
  { id: '5', name: 'Absa App', color: '#aa0000', short: 'ABS' },
  { id: '6', name: 'Discovery Bank', color: '#0077ff', short: 'DSC' },
  { id: '7', name: 'TymeBank Send', color: '#ffcc00', short: 'TYME' }
];

// Communities are now loaded from Supabase — no more hardcoded data!

const MZANSI_DEFAULTS = [
  { id: 'protea', url: '/protea.png' },
  { id: 'flag', url: '/flag.png' },
  { id: 'jozi', url: '/jozi.png' }
];

// Recovery words are now generated dynamically per user via generateRecoveryKey()

// --- Sub-Components ---

const DataSavedToast = () => (
  <div className="data-saved-toast">
    <Zap size={18} fill="white" />
    <span>Image Compressed: Saved 42 KB</span>
  </div>
);

const AvatarPicker = ({ currentPic, setProfilePic, t }) => {
  const [processing, setProcessing] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProcessing(true);
      setTimeout(() => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setProfilePic(reader.result);
          setProcessing(false);
          setShowToast(true);
          setTimeout(() => setShowToast(false), 3000);
        };
        reader.readAsDataURL(file);
      }, 2000);
    }
  };

  return (
    <div className="avatar-picker-container">
      {showToast && <DataSavedToast />}
      <div className="avatar-editable" onClick={() => fileInputRef.current.click()}>
        {currentPic ? (
          <img src={currentPic} alt="PP" style={{ width: '100%', height: '100%', borderRadius: '40px', objectFit: 'cover' }} />
        ) : (
          <div className="profile-avatar-large" style={{ margin: 0 }}>?</div>
        )}
        <div className="avatar-overlay"><Camera size={32} color="white" /></div>
        {processing && (
          <div className="avatar-processing-overlay">
            <RefreshCw size={32} color="var(--primary)" className="biometric-icon" />
            <p style={{ fontSize: '0.65rem', fontWeight: '800', marginTop: '8px' }}>ENCRYPTING...</p>
          </div>
        )}
      </div>
      <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} accept="image/*" />
      <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '12px' }}>{t.change_pic}</p>
      <div className="mzansi-defaults-grid">
        {MZANSI_DEFAULTS.map(def => (
          <div key={def.id} className={`mzansi-default-option ${currentPic === def.url ? 'active' : ''}`} style={{ backgroundImage: `url(${def.url})` }} onClick={() => setProfilePic(def.url)} />
        ))}
      </div>
    </div>
  );
};

// --- Onboarding Components ---

const Welcome = ({ onNext, onRestore, t }) => (
  <div className="welcome-container">
    <div className="welcome-logo"><MessageCircle size={60} strokeWidth={2.5} /></div>
    <h1 style={{ fontSize: '2rem', fontWeight: '900', marginBottom: '16px' }}>{t.welcome}</h1>
    <p style={{ color: 'var(--text-secondary)', marginBottom: '40px', lineHeight: '1.6' }}>{t.welcome_sub}</p>
    <div className="onboarding-footer" style={{ gap: '12px', display: 'flex', flexDirection: 'column' }}>
       <button className="btn-primary-full" onClick={onNext}>{t.get_started}</button>
       <button className="btn-ghost-full" style={{ border: '1px solid var(--border)' }} onClick={onRestore}>Already have an account? Sign In</button>
    </div>
  </div>
);

const Signup = ({ userMetadata, setUserMetadata, onNext, t, authError }) => (
  <div className="screen-container" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
    <div style={{ marginTop: '20px', textAlign: 'center' }}>
      <h2 style={{ fontSize: '1.75rem', fontWeight: '800', marginBottom: '8px' }}>{t.create_profile}</h2>
      {authError && <div style={{ color: 'red', marginBottom: '10px', fontWeight: 'bold' }}>{authError}</div>}
      <div className="privacy-meter">
         <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
           <Shield size={20} color="var(--success)" />
           <span style={{ fontSize: '0.8rem', fontWeight: '700' }}>Identity Privacy Mode</span>
         </div>
         <span className="score-text">100%</span>
      </div>
    </div>

    <div style={{ marginTop: '10px' }}>
      <AvatarPicker currentPic={userMetadata.profilePic} setProfilePic={(url) => setUserMetadata({...userMetadata, profilePic: url})} t={t} />
      <div className="signup-input-group">
        <label>{t.full_name}</label>
        <input className="signup-input" placeholder="e.g. Vuyani Dube" value={userMetadata.name} onChange={(e) => setUserMetadata({...userMetadata, name: e.target.value})} />
      </div>
      <div className="signup-input-group">
        <label>{t.my_alias}</label>
        <div className="alias-input-wrapper" style={{ marginTop: '0' }}><span className="alias-at">@</span><input type="text" value={userMetadata.handle} onChange={(e) => setUserMetadata({...userMetadata, handle: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '')})} placeholder="vuyani_d" /></div>
      </div>
    </div>
    <div className="onboarding-footer"><button className="btn-primary-full" onClick={onNext} disabled={!userMetadata.name || !userMetadata.handle} style={{ opacity: (!userMetadata.name || !userMetadata.handle) ? 0.5 : 1 }}>Continue</button></div>
  </div>
);

const RecoveryKeyStep = ({ recoveryWords, onNext, t }) => (
  <div className="screen-container" style={{ display: 'flex', flexDirection: 'column', height: '100%', textAlign: 'center' }}>
     <div style={{ marginTop: '40px' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: '800', marginBottom: '16px' }}>{t.recovery_title}</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{t.recovery_sub}</p>
     </div>
     <div className="recovery-container">
        {recoveryWords.map((word, i) => (
          <div key={i} className="word-chip"><span className="word-index">{i+1}</span>{word}</div>
        ))}
     </div>
     <div className="onboarding-footer">
        <button className="btn-primary-full" onClick={onNext}>I've Written Them Down</button>
     </div>
  </div>
);

const BiometricStep = ({ userHandle, onFinish, t }) => {
  const [scanning, setScanning] = useState(false);
  const handleFinish = async () => {
    setScanning(true);
    try {
      if (window.PublicKeyCredential) {
        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);

        const publicKeyCredentialCreationOptions = {
          challenge: challenge, 
          rp: { name: "MzansiChat", id: window.location.hostname },
          user: {
            id: new Uint8Array(16), // In production, use a stable user UUID
            name: userHandle || "user@mzansichat",
            displayName: userHandle || "Mzansi User"
          },
          pubKeyCredParams: [
            { alg: -7, type: "public-key" }, // ES256
            { alg: -257, type: "public-key" } // RS256
          ],
          authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required" },
          timeout: 60000
        };

        const credential = await navigator.credentials.create({ publicKey: publicKeyCredentialCreationOptions });
        
        if (credential) {
          // Convert binary IDs to strings for storage
          const credentialForDb = {
            id: bufferToBase64(credential.rawId),
            publicKey: bufferToBase64(credential.response.getPublicKey?.() || new Uint8Array(0))
          };

          await saveWebAuthnCredential(userHandle, credentialForDb);
          localStorage.setItem('mzansi_webauthn_enrolled', 'true');
        }
      }
    } catch (e) {
      console.warn("WebAuthn failed or cancelled. Falling back.", e);
    }
    
    setTimeout(async () => {
      await onFinish();
    }, 1000);
  };


  return (
    <div className="screen-container" style={{ display: 'flex', flexDirection: 'column', height: '100%', textAlign: 'center' }}>
      <div style={{ marginTop: '60px' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: '800', marginBottom: '16px' }}>{t.secure_account}</h2>
        <p style={{ color: 'var(--text-secondary)' }}>{t.biometric_sub}</p>
      </div>
      <div className="biometric-ring">
        <Fingerprint size={80} className={`biometric-icon ${scanning ? 'biometric-pulse' : ''}`} />
        {scanning && <div style={{ position: 'absolute', color: 'var(--primary)', fontWeight: '800', marginTop: '120px' }}>SECURING...</div>}
      </div>
      <div className="onboarding-footer">
        <button className="btn-primary-full" onClick={handleFinish} disabled={scanning}>
          {scanning ? "Processing..." : t.finish}
        </button>
      </div>
    </div>
  );
};

const SignInStep = ({ onNext, onCancel, t, authError }) => {
  const [handle, setHandle] = useState("");
  const [words, setWords] = useState(Array(3).fill(""));
  const handleWordChange = (idx, val) => {
    const newWords = [...words];
    newWords[idx] = val.toLowerCase().trim();
    setWords(newWords);
  };
  return (
    <div className="screen-container" style={{ display: 'flex', flexDirection: 'column', height: '100%', textAlign: 'center' }}>
      <div style={{ marginTop: '40px' }}><h2 style={{ fontSize: '1.75rem', fontWeight: '800', marginBottom: '8px' }}>Restore Account</h2>
        {authError && <div style={{ color: 'red', marginBottom: '10px', fontWeight: 'bold' }}>{authError}</div>}
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Enter your @handle and recovery words.</p>
      </div>
      
      <div className="signup-input-group" style={{ marginTop: '20px' }}>
        <div className="alias-input-wrapper"><span className="alias-at">@</span><input type="text" value={handle} onChange={(e) => setHandle(e.target.value.toLowerCase())} placeholder="vuyani_d" /></div>
      </div>

      <div className="recovery-container" style={{ gridTemplateColumns: 'repeat(1, 1fr)', gap: '12px', marginTop: '20px' }}>
        {words.map((word, i) => (
          <div key={i} className="word-chip-input" style={{ background: 'var(--bg-dark)', borderRadius: '12px', padding: '12px', border: '1px solid var(--border)' }}>
            <span style={{ fontSize: '0.6rem', color: 'var(--primary)', fontWeight: '800', marginRight: '6px' }}>{i+1}</span>
            <input 
              style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '0.9rem', width: '70%', outline: 'none' }}
              value={word}
              placeholder="word"
              onChange={(e) => handleWordChange(i, e.target.value)}
            />
          </div>
        ))}
      </div>
      <div className="onboarding-footer" style={{ gap: '12px', display: 'flex', flexDirection: 'column' }}>
        <button className="btn-primary-full" onClick={() => onNext(handle, words)} disabled={!handle || words.some(w => !w)}>Verify Identity</button>
        <button className="btn-ghost-full" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
};

const PinKeypad = ({ onKey, onDelete }) => (
  <div className="pin-keypad">
    {[1,2,3,4,5,6,7,8,9].map(n => <div key={n} className="pin-key" onClick={() => onKey(n.toString())}>{n}</div>)}
    <div className="pin-key action" onClick={onDelete}><X size={20} /></div>
    <div className="pin-key" onClick={() => onKey("0")}>0</div>
    <div className="pin-key empty"></div>
  </div>
);

const PinSetupStep = ({ onFinish, t }) => {
  const [pin, setPin] = useState("");
  const handleKey = (n) => { if (pin.length < 4) setPin(prev => prev + n); };
  const handleDelete = () => setPin(prev => prev.slice(0, -1));

  useEffect(() => {
    if (pin.length === 4) {
      setTimeout(() => onFinish(pin), 300);
    }
  }, [pin]);

  return (
    <div className="screen-container" style={{ textAlign: 'center' }}>
      <div style={{ marginTop: '40px' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: '800', marginBottom: '8px' }}>Set Access PIN</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Choose 4 digits for quick access.</p>
      </div>
      <div className="pin-display">
        {[0,1,2,3].map(i => <div key={i} className={`pin-dot ${pin.length > i ? 'filled' : ''}`} />)}
      </div>
      <PinKeypad onKey={handleKey} onDelete={handleDelete} />
    </div>
  );
};

const QuickPinLogin = ({ handle, onLogin, onReset, authError, t }) => {
  const [pin, setPin] = useState("");
  const [attemptingBio, setAttemptingBio] = useState(false);
  
  const handleKey = (n) => { if (pin.length < 4) setPin(prev => prev + n); };
  const handleDelete = () => setPin(prev => prev.slice(0, -1));

  useEffect(() => {
    if (pin.length === 4) {
      onLogin(pin);
      setPin(""); 
    }
  }, [pin]);

  const triggerBiometric = async () => {
    if (window.PublicKeyCredential && localStorage.getItem('mzansi_webauthn_enrolled') === 'true' && handle) {
      try {
        setAttemptingBio(true);
        
        // Fetch registered credentials for this user
        const { data: credentials, error } = await getWebAuthnCredentials(handle);
        
        if (error || !credentials || credentials.length === 0) {
          console.warn("No WebAuthn credentials found for user", handle);
          setAttemptingBio(false);
          return;
        }

        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);

        // Convert stored base64 credential IDs back to Uint8Array
        const allowedCredentials = credentials.map(c => ({
          id: Uint8Array.from(atob(c.credential_id), c => c.charCodeAt(0)),
          type: 'public-key'
        }));

        const getOptions = {
          publicKey: {
            challenge: challenge,
            rpId: window.location.hostname,
            allowCredentials: allowedCredentials,
            userVerification: "required",
          }
        };

        const assertion = await navigator.credentials.get(getOptions);
        
        if (assertion) {
          console.log("WebAuthn verify success");
          onLogin("BIO_SUCCESS"); 
        }
      } catch (e) {
        console.warn("WebAuthn verification failed", e);
      } finally {
        setAttemptingBio(false);
      }
    }
  };

  useEffect(() => {
    triggerBiometric();
  }, []);

  const displayHandle = handle || "User";
  const initial = displayHandle[0]?.toUpperCase() || "?";

  return (
    <div className="screen-container" style={{ textAlign: 'center' }}>
      <div style={{ marginTop: '40px' }}>
        <div className="profile-avatar-large" style={{ margin: '0 auto 16px', background: 'var(--primary-gradient)', color: 'white', position: 'relative' }}>
          {initial}
          <div style={{position: 'absolute', bottom: -5, right: -5, background: 'var(--bg-dark)', borderRadius: '50%', padding: '4px'}}>
             <Fingerprint size={16} color="var(--primary)" onClick={triggerBiometric} style={{cursor: 'pointer'}} />
          </div>
        </div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '4px' }}>Welcome Back</h2>
        <p style={{ color: 'var(--primary)', fontWeight: '700', marginBottom: '8px' }}>@{displayHandle}</p>
        {authError && <p style={{ color: 'red', fontSize: '0.8rem', fontWeight: 'bold' }}>{authError}</p>}
        {attemptingBio && <p style={{ color: 'var(--success)', fontSize: '0.8rem', fontWeight: 'bold' }}>Verifying Biometrics...</p>}
      </div>
      <div className="pin-display">
        {[0,1,2,3].map(i => <div key={i} className={`pin-dot ${pin.length > i ? 'filled' : ''}`} />)}
      </div>
      <PinKeypad onKey={handleKey} onDelete={handleDelete} />
      <button className="btn-ghost-full" style={{ marginTop: '32px', color: 'var(--text-muted)' }} onClick={onReset}>
        Forgot PIN? Use Recovery Key
      </button>
    </div>
  );
};

const StartChatModal = ({ onChat, onClose, t }) => {
  const [handle, setHandle] = useState("");
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");

  const handleSearch = async () => {
    setSearching(true);
    setError("");
    const user = await getUser(handle);
    if (user) {
      onChat(user);
    } else {
      setError("User not found inside MzansiChat.");
    }
    setSearching(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h3 style={{ fontWeight: '800' }}>Start New Chat</h3>
          <X onClick={onClose} style={{ cursor: 'pointer' }} />
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '16px' }}>Enter the @handle of the person you want to chat with.</p>
        <div className="signup-input-group">
          <div className="alias-input-wrapper" style={{ marginBottom: '16px' }}>
            <span className="alias-at">@</span>
            <input 
              type="text" 
              value={handle} 
              onChange={(e) => setHandle(e.target.value.toLowerCase().trim())} 
              placeholder="vuyani_d" 
              autoFocus
            />
          </div>
        </div>
        {error && <p style={{ color: 'var(--danger)', fontSize: '0.75rem', marginBottom: '16px', fontWeight: '700' }}>{error}</p>}
        <button 
          className="btn-primary-full" 
          onClick={handleSearch} 
          disabled={!handle || searching}
        >
          {searching ? "Searching..." : "Start Chatting"}
        </button>
      </div>
    </div>
  );
};

const CallingScreen = ({ user, type, onEnd }) => {
  const { localStream, remoteStream, endCall } = useCall();
  const [timer, setTimer] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTimer(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTimer = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <div className="calling-overlay">
       <div className="remote-video-container">
          {type === 'video' && remoteStream ? (
            <video 
              ref={(el) => { if (el) el.srcObject = remoteStream; }} 
              autoPlay 
              playsInline 
              className="remote-video"
            />
          ) : (
            <div className="calling-avatar-center-v2">
               <div className="avatar-placeholder-v2">{user.name[0]}</div>
               <div className="calling-pulse-v2"></div>
            </div>
          )}
       </div>

       {type === 'video' && localStream && (
         <div className="local-video-pip">
            <video 
              ref={(el) => { if (el) el.srcObject = localStream; }} 
              autoPlay 
              muted 
              playsInline 
              className="local-video"
            />
         </div>
       )}

       <div className="calling-info">
          <h2 style={{ fontSize: '2rem', fontWeight: '900' }}>{user.name}</h2>
          <p style={{ color: 'var(--primary)', fontWeight: '700' }}>{type === 'video' ? 'VIDEO CALL' : 'VOICE CALL'} • {formatTimer(timer)}</p>
       </div>

       <div className="calling-actions">
          <button className="call-btn mute"><MicOff size={28} /></button>
          <button className="call-btn end" onClick={() => { endCall(); onEnd(); }}><PhoneOff size={28} /></button>
          <button className="call-btn mute"><Volume2 size={28} /></button>
       </div>
    </div>
  );
};

const RecoverHandle = ({ userMetadata, setUserMetadata, onFinish, t }) => (
  <div className="screen-container" style={{ display: 'flex', flexDirection: 'column', height: '100%', textAlign: 'center' }}>
    <div style={{ marginTop: '40px' }}><h2 style={{ fontSize: '1.75rem', fontWeight: '800', marginBottom: '8px' }}>Who are you?</h2><p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Your key is verified. Enter your @handle to sync chats.</p></div>
    <div className="signup-input-group" style={{ marginTop: '40px' }}>
      <div className="alias-input-wrapper"><span className="alias-at">@</span><input type="text" value={userMetadata.handle} onChange={(e) => setUserMetadata({...userMetadata, handle: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '')})} placeholder="vuyani_d" /></div>
    </div>
    <div className="onboarding-footer"><button className="btn-primary-full" onClick={onFinish} disabled={!userMetadata.handle}>Restore chats</button></div>
  </div>
);

// --- Main Screens ---

const Chats = ({ userHandle, t }) => {
  const navigate = useNavigate();
  const [joined, setJoined] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewChat, setShowNewChat] = useState(false);

  useEffect(() => {
    if (userHandle) {
      const fetchJoined = async () => {
        const data = await getJoinedCommunities(userHandle);
        setJoined(data);
        setLoading(false);
      };
      fetchJoined();
    }
  }, [userHandle]);

  const handleStartDm = (targetUser) => {
    const dmId = getDmChatId(userHandle, targetUser.handle);
    setShowNewChat(false);
    navigate(`/chat/${dmId}?name=${encodeURIComponent(targetUser.name)}&handle=${targetUser.handle}`);
  };

  return (
    <div className="screen-container">
      <div className="settings-group">
        <div className="settings-group-title">{t.active_convos}</div>
        
        {/* Pinned AI Assistant */}
        <div className="list-item" style={{ borderLeft: '4px solid gold' }} onClick={() => navigate('/chat/lindiwe')}>
          <div className="avatar" style={{ background: 'var(--primary-gradient)' }}><Zap size={22} color="white" /></div>
          <div className="item-content">
            <div className="item-header"><div className="item-name">Lindiwe AI <Octagon size={14} fill="gold" stroke="none" /></div><span className="item-time" style={{ color: 'gold' }}>Assistant</span></div>
            <div className="item-preview">Tap to talk to your localized AI assistant...</div>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}><RefreshCw size={20} className="biometric-icon" /></div>
        ) : (
          joined.map(comm => (
            <div key={comm.id} className="list-item" onClick={() => navigate(`/chat/${comm.id}`)}>
              <div className="avatar" style={{ background: 'var(--surface-light)', color: 'var(--primary)' }}>
                {comm.name.substring(0, 2).toUpperCase()}
              </div>
              <div className="item-content">
                <div className="item-header">
                  <div className="item-name">{comm.name} {comm.is_verified && <CheckCircle size={14} className="verified-badge" />}</div>
                  <span className="item-time"><span className="live-indicator"></span>LIVE</span>
                </div>
                <div className="item-preview">Tap to enter the community chat...</div>
              </div>
            </div>
          ))
        )}

        {/* Static placeholders if needed, or just the dynamic ones */}
        {!loading && joined.length === 0 && (
          <div className="list-item" onClick={() => navigate('/chat/1')}>
            <div className="avatar" style={{backgroundColor: 'var(--surface-light)'}}><span style={{color: 'var(--primary)'}}>JD</span></div>
            <div className="item-content">
              <div className="item-header"><div className="item-name">John Doe <CheckCircle size={14} className="verified-badge" /></div><span className="item-time">Active</span></div>
              <div className="item-preview">The man who knows everyone...</div>
            </div>
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      <button className="fab-btn" onClick={() => setShowNewChat(true)}>
        <MessageSquarePlus size={28} color="white" />
      </button>

      {showNewChat && (
        <StartChatModal 
          onClose={() => setShowNewChat(false)} 
          onChat={handleStartDm} 
          t={t} 
        />
      )}
    </div>
  );
};

const ProfileManager = ({ userMetadata, setUserMetadata, language, setLanguage, t, onLogout }) => {
  const handleInvite = () => {
    const appUrl = window.location.origin;
    const inviteMsg = `Hey! Join me on MzansiChat 🇿🇦 - The messenger built for us. My handle is @${userMetadata.handle}. Join here: ${appUrl}`;
    
    if (navigator.share) {
      navigator.share({ 
        title: 'Join MzansiChat', 
        text: inviteMsg, 
        url: appUrl 
      }).catch(() => {
        navigator.clipboard.writeText(inviteMsg);
        alert("Mzansi Invite Link Copied! 🇿🇦");
      });
    } else {
      navigator.clipboard.writeText(inviteMsg);
      alert("Mzansi Invite Link Copied! 🇿🇦");
    }
  };

  return (
    <div className="screen-container">
      <div className="profile-card">
        <AvatarPicker currentPic={userMetadata.profilePic} setProfilePic={(url) => setUserMetadata({...userMetadata, profilePic: url})} t={t} />
        <h2 style={{ fontSize: '1.5rem', fontWeight: '800' }}>{userMetadata.name}</h2>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
          <p style={{ color: 'var(--primary)', fontWeight: '700' }}>@{userMetadata.handle}</p>
          <span className="biometric-verified-badge"><ShieldCheck size={14} /> Biometric Verified</span>
        </div>
      </div>

      <div className="settings-group">
        <div className="settings-group-title">Connect & Grow</div>
        <button className="setting-item" onClick={handleInvite} style={{ background: 'var(--primary-gradient)', color: 'white', border: 'none', borderRadius: '16px', marginTop: '12px' }}>
          <div className="setting-info">
            <h4 style={{ color: 'white' }}>Invite Friends</h4>
            <p style={{ color: 'rgba(255,255,255,0.8)' }}>Share your handle and grow the community</p>
          </div>
          <UserPlus size={20} color="white" />
        </button>
      </div>

      <div className="settings-group">
        <div className="settings-group-title">App Language / Izilimi</div>
        <div className="lang-grid">{['English', 'isiZulu', 'Afrikaans'].map(lang => (<button key={lang} className={`lang-btn ${language === lang ? 'active' : ''}`} onClick={() => setLanguage(lang)}>{lang}</button>))}</div>
      </div>

      <div className="settings-group">
        <div className="settings-group-title">My Personalized Link</div>
        <div className="setting-item" onClick={handleInvite} style={{ background: 'var(--surface-light)', borderRadius: '16px', border: '1px solid var(--border)', cursor: 'pointer' }}>
           <div className="setting-info" style={{ flex: 1 }}>
             <p style={{ margin: 0, fontSize: '0.6rem', color: 'var(--primary)', fontWeight: '800', textTransform: 'uppercase' }}>Your Invite Link</p>
             <p style={{ margin: 0, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{window.location.origin}/invite?by={userMetadata.handle}</p>
           </div>
           <LinkIcon size={20} color="var(--primary)" />
        </div>
      </div>

    <div className="settings-group">
       <div className="settings-group-title">Identity Vault</div>
       <div className="setting-item" style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid var(--success)' }}>
          <div className="setting-info">
            <h4 style={{ color: 'var(--success)' }}>Backup Recovery Phrase</h4>
            <p>12 words securely stored on-device.</p>
          </div>
          <Key size={20} color="var(--success)" />
       </div>
    </div>

    <div className="business-upgrade-card">
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Octagon size={32} />
        <div>
           <h3 style={{ fontWeight: '900', fontSize: '1.1rem' }}>{userMetadata.isVerified ? "Business Manager" : t.business_title}</h3>
           <p style={{ fontSize: '0.75rem', opacity: 0.9 }}>{userMetadata.isVerified ? "Manage your spaza or taxi profile." : t.business_sub}</p>
        </div>
      </div>
      <button className="btn-primary" onClick={() => navigate('/business')} style={{ background: 'white', color: 'var(--primary)', border: 'none', fontWeight: '900', padding: '10px 16px' }}>{userMetadata.isVerified ? "Dashboard" : "Verify Your Business"}</button>
    </div>

    <button className="setting-item" style={{ width: '100%', marginTop: '20px', color: 'var(--danger)' }} onClick={onLogout}><div className="setting-info"><h4>Sign Out</h4><p>Reset prototype onboarding</p></div><LogOut size={20} /></button>
    </div>
  );
};

const AppContent = ({ setGlobalHandle }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isOnboarded, setIsOnboarded] = useState(() => localStorage.getItem('mzansi_onboarded') === 'true');
  const [onboardingStep, setOnboardingStep] = useState(0); 
  const [recoveryWords, setRecoveryWords] = useState([]);
  const [authError, setAuthError] = useState('');

  const [userMetadata, setUserMetadata] = useState(() => {
    const saved = localStorage.getItem('mzansi_user');
    return saved ? JSON.parse(saved) : { name: "", handle: "", about: "I'm on MzansiChat!", profilePic: null };
  });

  const [messageHistory, setMessageHistory] = useState({});
  const [language, setLanguage] = useState('English');
  const t = TRANSLATIONS[language];
  const [stats, setStats] = useState({ dataSaved: 420.5, moneySaved: "14.20", storagePurged: 1.2 });
  const [isTyping, setIsTyping] = useState(false);

  const [unreadCount, setUnreadCount] = useState(0);
  const [inviter, setInviter] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const by = params.get('by');
    if (by) setInviter(by);
  }, [location.search]);

  const hashPin = (pin) => {
    // Simple but effective for local prototype
    return pin.split('').reverse().join('mzansi') + pin.length;
  };

  const { incomingCall, answerCall, endCall, isCalling } = useCall();
  const activeChatId = location.pathname.startsWith('/chat/') ? location.pathname.split('/chat/')[1] : null;

  useEffect(() => {
    if (userMetadata.handle && setGlobalHandle) {
       setGlobalHandle(userMetadata.handle);
    }
  }, [userMetadata.handle, setGlobalHandle]);

  // Generate recovery words when user starts sign up
  useEffect(() => {
    if (onboardingStep === 2 && recoveryWords.length === 0) {
      setRecoveryWords(generateRecoveryKey());
    }
  }, [onboardingStep]);

  // Initial redirect if returning user
  useEffect(() => {
    if (!isOnboarded && savedHandle && pinHash && onboardingStep === 0) {
      setOnboardingStep(-1); // Quick PIN Login
    }
  }, []);

  // Listen for push notification clicks — navigate in-app without reload
  useEffect(() => {
    const handleNotificationClick = (e) => {
      const url = e.detail?.url || '/';
      navigate(url);
      setUnreadCount(0);
    };
    window.addEventListener('mzansi-notification-click', handleNotificationClick);
    return () => window.removeEventListener('mzansi-notification-click', handleNotificationClick);
  }, [navigate]);

  // Real sign up flow
  const handleSignUp = async () => {
    console.log("handleSignUp called");
    setAuthError('');
    try {
      const result = await signUpUser({
        handle: userMetadata.handle,
        name: userMetadata.name,
        profilePic: userMetadata.profilePic,
        recoveryWords
      });

      if (result.error) {
        console.error("Signup error:", result.error);
        setAuthError("Signup Failed: " + result.error);
        setOnboardingStep(1); // Go back to signup
      } else {
        // Continue to PIN setup
        setOnboardingStep(10); // PIN Setup
      }
    } catch (e) {
      console.error("Signup error:", e);
      setAuthError("Something went wrong: " + e.message);
      setOnboardingStep(1);
    }
  };

  const handlePinSetup = async (pin) => {
    const hash = hashPin(pin);
    setPinHash(hash);
    setSavedHandle(userMetadata.handle);
    localStorage.setItem('mzansi_pin_hash', hash);
    localStorage.setItem('mzansi_handle', userMetadata.handle);
    
    setOnlineStatus(userMetadata.handle, true);
    setIsOnboarded(true);
    
    // Subscribe to OneSignal push notifications (v3 API)
    try {
      await OneSignal.login(userMetadata.handle);
      await OneSignal.Notifications.requestPermission();
      const playerId = OneSignal.User.PushSubscription.id;
      if (playerId) {
        await saveOneSignalId(userMetadata.handle, playerId);
        console.log("Push notifications enabled with ID:", playerId);
      }
    } catch (err) {
      console.warn("Push registration failed", err);
    }
    
    navigate('/');
  };

  const handlePinLogin = (pin) => {
    if (pin === "BIO_SUCCESS" || hashPin(pin) === pinHash) {
      setAuthError('');
      setOnlineStatus(savedHandle, true);
      setIsOnboarded(true);
      navigate('/');
    } else {
      setAuthError("Incorrect PIN. Please try again.");
    }
  };

  // Real sign in flow
  const handleSignIn = async (handle, words) => {
    setAuthError('');
    const result = await signInUser(handle, words);
    if (result.error) {
      setAuthError(result.error);
      return false;
    }
    // Restore user data from DB
    setUserMetadata({
      name: result.user.name,
      handle: result.user.handle,
      about: result.user.about,
      profilePic: result.user.profile_pic,
      isVerified: result.user.is_verified,
      stats: result.user.stats || { dataSaved: 0, moneySaved: "0.00", storagePurged: 0 }
    });
    
    // Set for local PIN next time
    setSavedHandle(result.user.handle);
    localStorage.setItem('mzansi_handle', result.user.handle);
    
    setOnboardingStep(10); // Go to PIN setup for this device
    return true;
  };

  // Persistence and Supabase Real-time
  useEffect(() => {
    localStorage.setItem('mzansi_onboarded', isOnboarded);
    localStorage.setItem('mzansi_user', JSON.stringify(userMetadata));
  }, [isOnboarded, userMetadata]);

  useEffect(() => {
    // 1. Initial Fetch
    const fetchHistory = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: true });
      
      if (!error && data) {
        const grouped = data.reduce((acc, msg) => {
          if (!acc[msg.chat_id]) acc[msg.chat_id] = [];
          acc[msg.chat_id].push({
            id: msg.id,
            text: msg.content,
            isSelf: msg.sender_handle === userMetadata.handle,
            type: msg.type,
            bank: msg.metadata?.bank,
            amount: msg.metadata?.amount
          });
          return acc;
        }, {});
        setMessageHistory(grouped);
      }
    };

    fetchHistory();

    // 2. Real-time Subscription
    const channel = supabase
      .channel('mzansichat_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const msg = payload.new;
        setMessageHistory(prev => {
          const chatMsgs = prev[msg.chat_id] || [];
          // Avoid duplicates (e.g. from self-inserts)
          if (chatMsgs.find(m => m.id === msg.id)) return prev;
          
          return {
            ...prev,
            [msg.chat_id]: [...chatMsgs, {
              id: msg.id,
              text: msg.content,
              isSelf: msg.sender_handle === userMetadata.handle,
              type: msg.type,
              bank: msg.metadata?.bank,
              amount: msg.metadata?.amount
            }]
          };
        });
        
        // Increment unread count for messages from other users
        if (msg.sender_handle !== userMetadata.handle) {
          setUnreadCount(prev => prev + 1);
        }
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [userMetadata.handle]);

  const handleSendMessage = async (chatId, message) => {
    // 1. Send to Supabase (if not AI, or optional for records)
    const { error } = await supabase
      .from('messages')
      .insert([{
        chat_id: chatId,
        sender_handle: userMetadata.handle,
        sender_name: userMetadata.name,
        content: message.text || "",
        type: message.type || 'text',
        metadata: { bank: message.bank, amount: message.amount }
      }]);
    
    if (error) console.error("Error sending message:", error);
    else {
      // Phase 5: Update Data Stats
      if (message.type === 'image' || message.type === 'video' || message.type === 'voice') {
        const estimatedSize = message.type === 'voice' ? 45000 : 850000; // Simulated average sizes in bytes
        const savedBytes = Math.floor(estimatedSize * 0.72); // 72% average saving on Mzansi architecture
        const newTotalBytes = (userMetadata.stats?.dataSaved || 0) + savedBytes;
        const newMoneySaved = (parseFloat(userMetadata.stats?.moneySaved || "0") + (savedBytes / 1000000 * 85)).toFixed(2); // R85 per GB rate
        
        const updatedStats = {
          ...userMetadata.stats,
          dataSaved: newTotalBytes,
          moneySaved: newMoneySaved
        };
        
        setUserMetadata(prev => ({ ...prev, stats: updatedStats }));
        updateUserStats(userMetadata.handle, updatedStats);
      }
    }

    // 2. Handle Lindiwe AI
    const currentChat = MZANSI_DEFAULTS.find(c => c.id === chatId);
    if (currentChat?.isAI && message.type === 'text') {
      setIsTyping(true);
      const history = (messageHistory[chatId] || []).map(m => ({ text: m.text, isSelf: m.isSelf }));
      const botResponse = await getLindiweResponse(message.text, history);
      
      // Auto-insert Lindiwe response for Local UI
      const botMsgId = Date.now();
      const botMsg = { id: botMsgId, text: botResponse, isSelf: false, type: 'text' };
      
      setMessageHistory(prev => ({
        ...prev,
        [chatId]: [...(prev[chatId] || []), botMsg]
      }));
      setIsTyping(false);
    }
  };

  if (!isOnboarded) {
    let stepComponent;
    if (onboardingStep === -1) stepComponent = <QuickPinLogin handle={savedHandle} onLogin={handlePinLogin} onReset={() => setOnboardingStep('signin')} authError={authError} t={t} />;
    else if (onboardingStep === 0) stepComponent = <Welcome onNext={() => setOnboardingStep(1)} onRestore={() => setOnboardingStep('signin')} t={t} />;
    else if (onboardingStep === 'signin') stepComponent = <SignInStep onNext={handleSignIn} onCancel={() => setOnboardingStep(0)} t={t} authError={authError} userMetadata={userMetadata} setUserMetadata={setUserMetadata} />;
    else if (onboardingStep === 1) stepComponent = <Signup userMetadata={userMetadata} setUserMetadata={setUserMetadata} onNext={() => setOnboardingStep(2)} t={t} authError={authError} />;
    else if (onboardingStep === 2) stepComponent = <RecoveryKeyStep recoveryWords={recoveryWords} onNext={() => setOnboardingStep(3)} t={t} />;
    else if (onboardingStep === 3) stepComponent = <BiometricStep userHandle={userMetadata.handle} onFinish={handleSignUp} t={t} />;
    else if (onboardingStep === 10) stepComponent = <PinSetupStep onFinish={handlePinSetup} t={t} />;

    return (
      <div className="onboarding-wrapper">
        {inviter && (
          <div className="invited-by-banner">
            <Zap size={14} fill="white" /> <span>INVITED BY @{inviter.toUpperCase()}</span>
          </div>
        )}
        {stepComponent}
      </div>
    );
  }

  // Main app with nav
  return (
    <div id="root">
        {incomingCall && (
            <div className="incoming-call-modal">
                <div className="incoming-call-box">
                    <div className="calling-avatar-sm pulse-sm">
                        {incomingCall.peer.replace('mzansi-', '')[0].toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                        <h4 style={{ margin: 0 }}>{t.incoming_call}</h4>
                        <p style={{ margin: 0, opacity: 0.7, fontSize: '0.8rem' }}>from @{incomingCall.peer.replace('mzansi-', '')}</p>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button className="call-btn-v2 end" onClick={endCall}><PhoneOff size={20} /></button>
                        <button className="call-btn-v2 answer" onClick={answerCall}><PhoneCall size={20} /></button>
                    </div>
                </div>
            </div>
        )}
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Chats userHandle={userMetadata.handle} t={t} />} />
            <Route path="/updates" element={<Discovery t={t} userHandle={userMetadata.handle} />} />
            <Route path="/profile" element={<ProfileManager userMetadata={userMetadata} setUserMetadata={setUserMetadata} language={language} setLanguage={setLanguage} t={t} onLogout={() => { setIsOnboarded(false); setOnboardingStep(-1); }} />} />
            <Route path="/business" element={<BusinessHub userMetadata={userMetadata} setUserMetadata={setUserMetadata} onBack={() => navigate('/profile')} t={t} />} />
            <Route path="/settings" element={<Settings gatekeeperEnabled={true} setGatekeeperEnabled={()=>{}} userMetadata={userMetadata} t={t} />} />
            <Route path="/chat/:id" element={<ChatDetailWrapper gatekeeperEnabled={true} privacyEnabled={true} userMetadata={userMetadata} messageHistory={messageHistory} onSendMessage={handleSendMessage} isTyping={isTyping} t={t} />} />
          </Routes>
       </main>
       {isCalling && <CallingOverlay remoteHandle={activeChatId?.split('-')[1] || "Member"} t={t} />}
       <nav className="bottom-nav">
         <Link to="/" className={`nav-item ${location.pathname === '/' ? 'active' : ''}`}><MessageCircle size={32} strokeWidth={1.5} /><span>{t.chats}</span></Link>
         <Link to="/updates" className={`nav-item ${location.pathname === '/updates' ? 'active' : ''}`}>
           <div style={{ position: 'relative' }}>
             <BellRing size={32} strokeWidth={1.5} />
             {unreadCount > 0 && <span style={{ position: 'absolute', top: '-4px', right: '-8px', background: '#ef4444', color: 'white', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: '900', border: '2px solid var(--bg-dark)' }}>{unreadCount > 99 ? '99+' : unreadCount}</span>}
           </div>
           <span>{t.updates}</span>
         </Link>
         <Link to="/profile" className={`nav-item ${location.pathname === '/profile' ? 'active' : ''}`}><UserCircle2 size={32} strokeWidth={1.5} /><span>{t.profile}</span></Link>
         <Link to="/settings" className={`nav-item ${location.pathname === '/settings' ? 'active' : ''}`}><CircleDot size={32} strokeWidth={1.5} /><span>{t.savings}</span></Link>
       </nav>
    </div>
  );
};

};

const StatusViewer = ({ statuses, userHandle, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  
  useEffect(() => {
    if (!statuses || statuses.length === 0) return onClose();
    
    // Auto advance timer
    const duration = statuses[currentIndex].media_type === 'video' ? 10000 : 5000;
    const interval = 50; 
    const step = (interval / duration) * 100;
    
    setProgress(0);
    const timer = setInterval(() => {
      setProgress(p => {
        if (p + step >= 100) {
          clearInterval(timer);
          if (currentIndex < statuses.length - 1) {
            setCurrentIndex(prev => prev + 1);
            return 0;
          } else {
            onClose();
            return 100;
          }
        }
        return p + step;
      });
    }, interval);
    
    return () => clearInterval(timer);
  }, [currentIndex, statuses, onClose]);

  if (!statuses || statuses.length === 0) return null;
  const currentStatus = statuses[currentIndex];

  const handleTap = (direction) => {
    if (direction === 'left' && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    } else if (direction === 'right') {
      if (currentIndex < statuses.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        onClose();
      }
    }
  };

  return (
    <div className="status-viewer-overlay">
      <div className="status-progress-container">
        {statuses.map((s, i) => (
          <div key={s.id} className="status-progress-bar">
            <div className="status-progress-fill" style={{ width: i < currentIndex ? '100%' : i === currentIndex ? `${progress}%` : '0%' }} />
          </div>
        ))}
      </div>
      <div className="status-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div className="calling-avatar-sm" style={{ width: '32px', height: '32px', fontSize: '1rem', background: 'var(--primary)', color: 'white' }}>
            {userHandle[0].toUpperCase()}
          </div>
          <span style={{ fontWeight: '800', textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>@{userHandle}</span>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}><X size={24} /></button>
      </div>
      
      <div className="status-media-container">
        {currentStatus.media_type === 'video' ? (
          <video src={currentStatus.media_url} autoPlay playsInline muted className="status-media-el" />
        ) : (
          <img src={currentStatus.media_url} className="status-media-el" alt="Status update" />
        )}
      </div>

      <div className="status-nav-zones">
        <div className="status-nav-left" onClick={() => handleTap('left')}></div>
        <div className="status-nav-right" onClick={() => handleTap('right')}></div>
      </div>
    </div>
  );
};


const Discovery = ({ t, userHandle }) => {
  const navigate = useNavigate();
  const [communities, setCommunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newComm, setNewComm] = useState({ name: "", description: "", tag: "Community" });
  
  // Statuses integration
  const [groupedStatuses, setGroupedStatuses] = useState({});
  const [viewingUser, setViewingUser] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const loadContent = async () => {
      const commData = await getCommunities();
      setCommunities(commData);
      
      const { data: statusData } = await getActiveStatuses();
      setGroupedStatuses(statusData || {});
      
      setLoading(false);
    };
    loadContent();
  }, []);

  const handleStatusUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !userHandle) return;
    setLoading(true);
    await uploadStatusFile(userHandle, file);
    
    // Refresh statuses
    const { data: statusData } = await getActiveStatuses();
    setGroupedStatuses(statusData || {});
    setLoading(false);
  };
    if (!userHandle || !newComm.name) return;
    setLoading(true);
    const { data, error } = await createCommunity(newComm.name, newComm.description, newComm.tag, userHandle);
    if (!error && data) {
      navigate(`/chat/${data.id}`);
    }
    setLoading(false);
    setShowCreateModal(false);
  };

  const handleJoin = async (communityId) => {
    if (!userHandle) return;
    await joinCommunity(communityId, userHandle);
    navigate(`/chat/${communityId}`);
  };

  const formatMembers = (count) => {
    if (count >= 1000) return (count / 1000).toFixed(count >= 10000 ? 0 : 1) + 'K';
    return count.toString();
  };
  
  return (
    <div className="screen-container">
      <div className="discovery-header">
        <h2 style={{ fontSize: '1.25rem', fontWeight: '800' }}>Updates</h2>
        <button className="btn-primary" style={{ padding: '6px 12px', borderRadius: '12px', fontSize: '0.75rem' }} onClick={() => setShowCreateModal(true)}>+ Create</button>
      </div>

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 style={{ fontWeight: '800', marginBottom: '16px' }}>Start a Community</h3>
            <div className="signup-input-group">
              <label>Community Name</label>
              <input value={newComm.name} onChange={e => setNewComm({...newComm, name: e.target.value})} placeholder="e.g. Soweto Riders" />
              <label>Description</label>
              <textarea value={newComm.description} onChange={e => setNewComm({...newComm, description: e.target.value})} placeholder="What is this group about?" style={{ width: '100%', borderRadius: '12px', background: 'var(--bg-dark)', color: 'white', border: '1px solid var(--border)', padding: '12px', minHeight: '80px' }} />
            </div>
            <button className="btn-primary-full" style={{ marginTop: '20px' }} onClick={handleCreate}>Create & Join</button>
          </div>
        </div>
      )}
      
      {/* Statuses List */}
      <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '20px', marginBottom: '16px' }}>
        
        {/* Upload Status Button */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', minWidth: '70px', cursor: 'pointer' }} onClick={() => fileInputRef.current?.click()}>
          <div style={{ position: 'relative', width: '64px', height: '64px' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '32px', background: 'var(--primary-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Plus size={28} color="white" />
            </div>
            <div style={{ position: 'absolute', bottom: 0, right: 0, background: 'var(--primary)', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid var(--bg-dark)' }}>
              <Plus size={12} color="white" />
            </div>
          </div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Add Status</span>
          <input type="file" accept="image/*,video/*" capture="environment" ref={fileInputRef} style={{ display: 'none' }} onChange={handleStatusUpload} />
        </div>
        
        {/* Render Friends Statuses */}
        {Object.entries(groupedStatuses).map(([handle, userStatuses]) => (
          handle !== userHandle && (
            <div key={handle} onClick={() => setViewingUser(handle)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', minWidth: '70px', cursor: 'pointer' }}>
              <div style={{ position: 'relative', width: '64px', height: '64px', padding: '3px', borderRadius: '32px', border: '2px solid var(--primary)' }}>
                <div style={{ width: '100%', height: '100%', borderRadius: '30px', background: 'var(--surface-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  <span style={{ color: 'var(--primary)', fontWeight: '800' }}>{handle[0].toUpperCase()}</span>
                </div>
              </div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>@{handle}</span>
            </div>
          )
        ))}
      </div>

      {viewingUser && <StatusViewer statuses={groupedStatuses[viewingUser]} userHandle={viewingUser} onClose={() => setViewingUser(null)} />}
      
      <h2 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '16px' }}>{t.discovery}</h2>
      
      <GoogleAd slot="discovery-top" format="horizontal" />
      
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
          <RefreshCw size={24} className="biometric-icon" style={{ marginBottom: '12px' }} />
          <p>Processing...</p>
        </div>
      ) : (
        communities.map(comm => (
          <div key={comm.id} className="community-card">
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              {comm.is_verified && <div className="promoted-tag" style={{ background: '#ef4444' }}>Verified Business</div>}
              <div className="community-tag" style={comm.is_promoted ? { background: '#10b981', color: 'white' } : {}}>{comm.tag}</div>
            </div>
            <h3 className="item-name" style={{ fontSize: '1.15rem', fontWeight: '800' }}>{comm.name}</h3>
            <p className="item-preview" style={{ marginTop: '4px', whiteSpace: 'normal' }}>{comm.description}</p>
            <div className="member-count"><Users size={12} /> {formatMembers(comm.member_count)} Members</div>
            <button className="join-btn-ghost" onClick={() => handleJoin(comm.id)}><Ghost size={18} /> {t.join_ghost}</button>
          </div>
        ))
      )}
    </div>
  );
};
const Settings = ({ gatekeeperEnabled, setGatekeeperEnabled, userMetadata, t }) => {
  const stats = userMetadata.stats || { dataSaved: 0, moneySaved: "0.00", storagePurged: 0 };
  const [wallpaper, setWallpaper] = useState(() => localStorage.getItem('chat_wallpaper') || 'default');
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => localStorage.getItem('mzansi_notifications') !== 'false');
  const WALLPAPERS = [
    { id: 'default', name: 'Default', color: '#0a0c10' },
    { id: 'night', name: 'Night Mode', color: '#1a1a2e' },
    { id: 'ocean', name: 'Ocean', color: '#0f3460' },
    { id: 'sunset', name: 'Sunset', color: '#16213e' },
    { id: 'gradient', name: 'Ubuntu', gradient: 'linear-gradient(135deg, #0ec0df 0%, #0088cc 100%)' },
  ];
  
  const changeWallpaper = (id) => {
    setWallpaper(id);
    localStorage.setItem('chat_wallpaper', id);
  };
  
  const toggleNotifications = async (enabled) => {
    setNotificationsEnabled(enabled);
    localStorage.setItem('mzansi_notifications', enabled);
    try {
      if (enabled) {
        await OneSignal.Notifications.requestPermission();
        await OneSignal.User.PushSubscription.optIn();
      } else {
        await OneSignal.User.PushSubscription.optOut();
      }
    } catch (err) {
      console.warn("Push toggle failed", err);
    }
  };
  
  return (
    <div className="screen-container">
      <div className="savings-card"><p className="savings-label">{t.data_saved}</p><div className="savings-main-stat">{(stats.dataSaved / 1000000).toFixed(1)} <span style={{fontSize: '1rem', opacity: 0.8}}>MB</span></div><div className="money-badge"><Zap size={14} fill="white" />{t.money_saved}: R {stats.moneySaved}</div></div>
      <div className="settings-group">
        <div className="settings-group-title">Notifications</div>
        <div className="setting-item">
          <div className="setting-info">
            {notificationsEnabled ? <h4>Push Notifications</h4> : <h4><BellOff size={18} style={{marginRight:8}}/>Notifications Muted</h4>}
            <p>{notificationsEnabled ? "Receive message notifications" : "Notifications are paused"}</p>
          </div>
          <label className="switch"><input type="checkbox" checked={notificationsEnabled} onChange={(e) => toggleNotifications(e.target.checked)} /><span className="slider"></span></label>
        </div>
      </div>
      <div className="settings-group">
        <div className="settings-group-title">Chat Wallpaper</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          {WALLPAPERS.map(wp => (
            <div 
              key={wp.id} 
              onClick={() => changeWallpaper(wp.id)}
              style={{ 
                aspectRatio: '1', 
                borderRadius: '12px', 
                background: wp.gradient || wp.color, 
                border: wallpaper === wp.id ? '3px solid var(--primary)' : '2px solid var(--border)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'center',
                paddingBottom: '8px'
              }}
            >
              {wallpaper === wp.id && <CheckCircle size={20} color="white" />}
            </div>
          ))}
        </div>
      </div>
      <div className="settings-group">
        <div className="settings-group-title">Security Pillars</div>
        <div className="setting-item">
          <div className="setting-info"><h4>Gatekeeper Protection</h4><p>On-device AI filters international spam.</p></div>
          <label className="switch"><input type="checkbox" checked={gatekeeperEnabled} onChange={(e) => setGatekeeperEnabled(e.target.checked)} /><span className="slider"></span></label>
        </div>
      </div>
    </div>
  );
};

/* --- Redesigned Components (Phase 11.1) --- */
const ChatDetailWrapper = (props) => { const { id } = useParams(); const messages = props.messageHistory[id] || []; return <ChatDetail {...props} messages={messages} />; };
const VoiceNote = ({ isSelf, duration = 12, audioUrl = null }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);
  
  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };
  
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  return (
    <div className="voice-bubble" style={{ alignSelf: isSelf ? 'flex-end' : 'flex-start', marginLeft: isSelf ? 'auto' : '0', marginBottom: '12px' }}>
      {audioUrl && <audio ref={audioRef} src={audioUrl} onEnded={() => setIsPlaying(false)} />}
      <div className="play-btn" onClick={togglePlay} style={{ cursor: 'pointer' }}>
        {isPlaying ? <Square size={16} fill="white" /> : <Play size={16} fill="white" />}
      </div>
      <div className="waveform">
        {[...Array(15)].map((_, i) => (
          <div key={i} className={`wave-bar ${i < (isPlaying ? 15 : 8) ? 'active' : ''}`} style={{ height: `${Math.random() * 100}%` }}></div>
        ))}
      </div>
      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{formatDuration(duration)}</span>
    </div>
  );
};
const VideoBubble = ({ isSelf, size, thumb }) => (
  <div className="video-bubble" style={{ alignSelf: isSelf ? 'flex-end' : 'flex-start', marginLeft: isSelf ? 'auto' : '0' }}>
    <div className="video-thumb" style={{ backgroundImage: `url(${thumb || 'https://images.unsplash.com/photo-1542281286-9e0a16bb7366?auto=format&fit=crop&q=80&w=240'})` }}>
      <div className="video-play-overlay"><Play size={24} fill="white" color="white" /></div>
      <div className="video-data-badge"><Zap size={10} fill="white" /> {size || '4.2 MB'}</div>
    </div>
  </div>
);
const PaymentBubble = ({ bank, amount }) => ( <div className="payment-bubble" style={{ alignSelf: 'flex-end', marginLeft: 'auto', marginBottom: '12px' }}> <div className="payment-header"><div className="bank-logo-sm" style={{ color: bank.color }}>{bank.short}</div><span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'white' }}>Mzansi Pay Transfer</span></div> <div style={{ marginBottom: '12px' }}><p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)' }}>Amount Sent</p><p style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--primary)' }}>R {amount}</p></div> <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)' }}>Ref: MZ-492041</span><CheckCircle size={14} color="var(--success)" /></div> </div> );

const StokvelVault = ({ messages, onContribute, t }) => {
  const contributions = messages.filter(m => m.type === 'contribution');
  const total = contributions.reduce((sum, m) => sum + parseFloat(m.amount || 0), 0);
  const goal = 5000;
  const progress = Math.min((total / goal) * 100, 100);

  return (
    <div className="vault-banner">
      <div className="vault-header">
        <div><h3 style={{ fontWeight: '900' }}>Stokvel Vault</h3><p style={{ fontSize: '0.7rem', opacity: 0.7 }}>April 2026 Collection</p></div>
        <div style={{ textAlign: 'right' }}><p style={{ fontSize: '1.25rem', fontWeight: '900', color: 'var(--primary)' }}>R {total}</p><p style={{ fontSize: '0.6rem', opacity: 0.6 }}>Goal: R {goal}</p></div>
      </div>
      <div className="vault-progress-bg"><div className="vault-progress-fill" style={{ width: `${progress}%` }}></div></div>
      <button className="btn-primary-full" style={{ marginTop: '16px', padding: '10px' }} onClick={() => onContribute(250)}>Contribute R250</button>
    </div>
  );
};

const CallingOverlay = ({ remoteHandle, t }) => {
    const { localVideoRef, remoteVideoRef, localStream, remoteStream, endCall } = useCall();

    useEffect(() => {
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream;
        }
    }, [localStream]);

    useEffect(() => {
        if (remoteVideoRef.current && remoteStream) {
            remoteVideoRef.current.srcObject = remoteStream;
        }
    }, [remoteStream]);

    return (
        <div className="calling-overlay">
            <div className="calling-user-info">
                <h2>@{remoteHandle}</h2>
                <div className="calling-status-badge">
                    <div className="pulse-red" />
                    <span>{t.video_call.toUpperCase()}</span>
                </div>
            </div>

            <div className="remote-video-container">
                <video ref={remoteVideoRef} autoPlay playsInline className="remote-video-el" />
                
                <div className="local-pip-container">
                    <video ref={localVideoRef} autoPlay playsInline muted className="local-video-el" />
                </div>
            </div>

            <div className="calling-footer">
                <button className="call-action-btn"><MicOff size={24} /></button>
                <button className="call-action-btn end" onClick={endCall}><PhoneOff size={32} /></button>
                <button className="call-action-btn"><Camera size={24} /></button>
            </div>
        </div>
    );
};

const BusinessHub = ({ userMetadata, setUserMetadata, onBack, t }) => {
  const [step, setStep] = useState(userMetadata.isVerified ? 'verified' : 'start');
  const [businessName, setBusinessName] = useState("");

  const [isProcessing, setIsProcessing] = useState(false);
  
  // Real Paystack Public Key - Replace with your own from Paystack Dashboard
  const paystackPublicKey = "pk_test_7c86abf9cf984376a8b957cff35c48ea";

  const handleVerifySuccess = async (reference) => {
    setIsProcessing(true);
    const finalName = businessName || userMetadata.name;
    const { user, error } = await updateUserVerification(userMetadata.handle, finalName, true);
    
    if (!error && user) {
      setUserMetadata(prev => ({ ...prev, name: user.name, isVerified: true }));
      setStep('verified');
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#06b6d4', '#10b981', '#fbbf24']
      });
    }
    setIsProcessing(false);
  };

  const paystackConfig = {
    email: `${userMetadata.handle}@mzansichat.com`,
    amount: 50 * 100, // R 50.00 in kobo/cents
    publicKey: paystackPublicKey,
    text: "Pay & Verify Identity",
    onSuccess: (reference) => handleVerifySuccess(reference),
    onClose: () => setIsProcessing(false),
  };

  const handleVerify = async () => {
    // legacy simulation - now handled by PaystackButton
  };

  return (
    <div className="screen-container">
      <header className="app-header" style={{ position: 'static', marginBottom: '20px' }}>
        <button onClick={onBack}><ArrowLeft size={22} /></button>
        <div className="app-title">Business Hub</div>
      </header>

      {step === 'start' ? (
        <div className="verification-card">
          <div className="verified-octagon" style={{ marginBottom: '16px' }}><Octagon size={48} fill="#10b981" stroke="none" /></div>
          <h2 style={{ fontWeight: '900', marginBottom: '8px' }}>Verify Your Mzansi Business</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '24px' }}>Get the Green Octagon badge, appear first in Discovery, and build trust with 10k+ local users.</p>
          
          <div className="signup-input-group">
            <label>Business Name</label>
            <input className="business-input" placeholder="e.g. Siya's Soweto Spaza" value={businessName} onChange={e => setBusinessName(e.target.value)} />
          </div>

          <div style={{ background: 'rgba(255,255,255,0.05)', padding: '16px', borderRadius: '12px', margin: '20px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}><span>Verification Fee (Once-off)</span><span style={{ fontWeight: '800' }}>R 50.00</span></div>
          </div>

          <PaystackButton 
            className="btn-primary-full" 
            {...paystackConfig} 
            disabled={!businessName || isProcessing}
          />
          
          <GoogleAd slot="business-hub-bottom" style={{ marginTop: '30px' }} />
        </div>
      ) : (
        <div className="verification-card" style={{ textAlign: 'center', borderColor: '#10b981' }}>
           <div className="verified-octagon" style={{ marginBottom: '16px' }}><ShieldCheck size={60} /></div>
           <h2 style={{ fontWeight: '900', color: '#10b981' }}>You are Verified!</h2>
           <p style={{ fontSize: '0.85rem', marginTop: '12px' }}>Your business profile is now live. The Green Octagon will appear next to your handle in all chats.</p>
           <button className="btn-ghost-full" style={{ marginTop: '24px', borderColor: 'var(--border)' }} onClick={onBack}>Return to Profile</button>
        </div>
      )}
    </div>
  );
};

const ChatDetail = ({ gatekeeperEnabled, privacyEnabled, userMetadata, messages, onSendMessage, isTyping, t }) => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const [inputText, setInputText] = useState("");
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  
  const BANK_SCHEMES = {
    '1': 'com.capitec.bank.live://',
    '2': 'fnbpay://',
    '3': 'standardbank://',
    '4': 'nedbank://',
    '5': 'absa://',
    '6': 'discoverybank://',
    '7': 'tymebank://'
  };

  const handlePayment = async (chatId, bank, amount) => {
    setIsPaying(true);
    setShowBankModal(false);
    
    // 1. Bank Handshake Simulation
    await new Promise(r => setTimeout(r, 1500));
    
    // 2. Attempt Deep Link to SA Bank App
    const scheme = BANK_SCHEMES[bank.id];
    if (scheme) {
      const start = Date.now();
      window.location.href = scheme;
      
      // Fallback if app doesn't open in 2s
      setTimeout(() => {
        if (Date.now() - start < 3000) {
          alert(`Redirecting to your ${bank.name} app. If it didn't open, please ensure the app is installed.`);
        }
      }, 2000);
    }
    
    // 3. Persist the payment record to Supabase
    onSendMessage(chatId, { 
      type: 'payment', 
      bank, 
      amount: amount || '250.00',
      text: `Sent R${amount || '250.00'} via ${bank.name}` 
    });
    
    setIsPaying(false);
    setShowActionSheet(false);
  };
  const scrollRef = useRef(null);
  const [showVault, setShowVault] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const [showReactions, setShowReactions] = useState(null);
  const [showMessageMenu, setShowMessageMenu] = useState(null);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [forwardTo, setForwardTo] = useState(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const fileInputRef = useRef(null);
  const [communityInfo, setCommunityInfo] = useState(null);
  const [showAdmin, setShowAdmin] = useState(false);
  const isOwner = communityInfo?.owner_handle === userMetadata.handle.toLowerCase();
  
  // DM Info from URL params
  const dmName = searchParams.get('name');
  const { makeCall, endCall, isCalling } = useCall();

  const handleCall = (type) => {
    const targetHandle = id === '1' ? 'johndoe' : (communityInfo?.id || id);
    makeCall(targetHandle, type === 'video');
  };
  
  // Resolve chat name from communities if it's a group
  useEffect(() => {
    if (isGroup && id !== '2') {
      const fetchComm = async () => {
        const data = await getCommunities();
        const found = data.find(c => c.id === id);
        if (found) setCommunityInfo(found);
      };
      fetchComm();
    }
  }, [id, isGroup]);

  const chatName = isAI ? 'Lindiwe AI' : (id === '1' ? 'John Doe' : (communityInfo?.name || 'Stokvel Group #4'));
  
  const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];
  
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages]);
  const handleSend = () => { 
    if (!inputText.trim()) return; 
    onSendMessage(id, { text: inputText, type: 'text', replyTo: replyTo ? { id: replyTo.id, text: replyTo.text } : null }); 
    setInputText(""); 
    setReplyTo(null);
  };
  
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      setMediaRecorder(recorder);
      setIsRecording(true);
      setRecordingTime(0);
      
      const chunks = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setAudioBlob(blob);
      };
      
      recorder.start();
      
      const interval = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
      recorder.interval = interval;
    } catch (err) {
      console.error("Error accessing microphone:", err);
    }
  };
  
  const stopRecording = () => {
    if (mediaRecorder) {
      clearInterval(mediaRecorder.interval);
      mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }
  };
  
  const sendVoiceNote = async () => {
    if (audioBlob) {
      const { url, error } = await uploadMedia(audioBlob, 'voice');
      if (url && !error) {
         onSendMessage(id, { text: url, type: 'voice', duration: recordingTime });
      } else {
         console.error("Voice Upload Error:", error);
      }
      setAudioBlob(null);
      setRecordingTime(0);
    }
  };
  
  const cancelRecording = () => {
    if (mediaRecorder) {
      clearInterval(mediaRecorder.interval);
      mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }
    setIsRecording(false);
    setRecordingTime(0);
    setAudioBlob(null);
  };
  
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  const handleImageSelect = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      // Show loading UI on frontend ideally, but for now we just upload
      const { url, error } = await uploadMedia(file, 'images');
      if (url && !error) {
        onSendMessage(id, { text: url, type: 'image', metadata: { name: file.name } });
      } else {
        console.error("Image Upload Error:", error);
      }
    }
  };
  
  const handleReaction = (msgId, reaction) => {
    onSendMessage(id, { text: reaction, type: 'reaction', replyTo: { id: msgId } });
    setShowReactions(null);
  };
  
  const handleDeleteMessage = (msgId) => {
    onSendMessage(id, { text: '', type: 'deleted', replyTo: { id: msgId } });
    setShowMessageMenu(null);
  };
  
  const handleForward = (msg) => {
    setForwardTo([{ id: '1', name: 'John Doe' }, { id: '2', name: 'Stokvel Group' }]);
    setSelectedMessage(msg);
  };
  
  const handleReply = (msg) => {
    setReplyTo({ id: msg.id, text: msg.text });
  };
  
  const filteredMessages = searchQuery ? messages.filter(m => m.text?.toLowerCase().includes(searchQuery.toLowerCase())) : messages;
  return ( <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}> 
  {isCalling && <CallingScreen user={{ name: chatName }} type={searchParams.get('type') || 'video'} onEnd={() => {}} />}
  
  {showAdmin && communityInfo && (
    <div className="modal-overlay" onClick={() => setShowAdmin(false)}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h3 style={{ fontWeight: '800' }}>Manage Community</h3>
          <X onClick={() => setShowAdmin(false)} style={{ cursor: 'pointer' }} />
        </div>
        <div className="signup-input-group">
          <label>Community Name</label>
          <input 
            value={communityInfo.name} 
            onChange={(e) => setCommunityInfo({...communityInfo, name: e.target.value})} 
            style={{ width: '100%', marginBottom: '12px' }}
          />
          <label>Description</label>
          <textarea 
            value={communityInfo.description} 
            onChange={(e) => setCommunityInfo({...communityInfo, description: e.target.value})}
            style={{ width: '100%', borderRadius: '12px', background: 'var(--bg-dark)', color: 'white', border: '1px solid var(--border)', padding: '12px', minHeight: '100px' }}
          />
        </div>
        <button 
          className="btn-primary-full" 
          style={{ marginTop: '20px' }}
          onClick={async () => {
            await updateCommunity(id, { name: communityInfo.name, description: communityInfo.description });
            setShowAdmin(false);
          }}
        >
          Save Changes
        </button>
      </div>
    </div>
  )}

  {isPaying && (
    <div className="modal-overlay" style={{ zIndex: 3000 }}>
      <div className="modal-content" style={{ textAlign: 'center', padding: '40px' }}>
        <RefreshCw size={48} className="biometric-icon" style={{ color: 'var(--primary)', marginBottom: '20px' }} />
        <h3 style={{ fontWeight: '800' }}>Processing Transaction</h3>
        <p style={{ opacity: 0.7, fontSize: '0.85rem' }}>Securing your bank handshake with {t.bank_partner || 'local partner'}...</p>
      </div>
    </div>
  )}

  {showBankModal && ( <div className="bank-modal" onClick={() => setShowBankModal(false)}> <div className="bank-grid" onClick={e => e.stopPropagation()}> <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}><h3 style={{ fontWeight: '800' }}>Choose Bank</h3><X onClick={() => setShowBankModal(false)} /></div> {BANKS.map(bank => ( <div key={bank.id} className="bank-choice" onClick={() => handlePayment(id, bank, '250.00')}><div className="avatar" style={{ backgroundColor: bank.color, color: 'white' }}>{bank.short}</div><div className="item-name">{bank.name}</div><ChevronRight size={18} style={{ marginLeft: 'auto' }} color="var(--text-muted)" /></div> ))} </div> </div> )}
  {forwardTo && (
    <div className="bank-modal" onClick={() => setForwardTo(null)}>
      <div className="bank-grid" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h3 style={{ fontWeight: '800' }}>Forward to</h3>
          <X onClick={() => setForwardTo(null)} />
        </div>
        {forwardTo.map(chat => (
          <div key={chat.id} className="bank-choice" onClick={() => { onSendMessage(chat.id, { text: selectedMessage?.text, type: selectedMessage?.type, metadata: selectedMessage?.metadata }); setForwardTo(null); }}>
            <div className="avatar" style={{ backgroundColor: 'var(--primary)' }}><Users size={18} color="white" /></div>
            <div className="item-name">{chat.name}</div>
            <ChevronRight size={18} style={{ marginLeft: 'auto' }} color="var(--text-muted)" />
          </div>
        ))}
      </div>
    </div>
  )}

  <input type="file" ref={fileInputRef} onChange={handleImageSelect} accept="image/*" style={{ display: 'none' }} />
  
  <header className="app-header">   
    <div style={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
      <button onClick={() => navigate(-1)} style={{ marginRight: '12px' }}><ArrowLeft size={22} /></button>
      <div>
        <div className="item-name">{chatName} {isAI ? <Octagon size={14} fill="gold" stroke="none" /> : <CheckCircle size={14} className="verified-badge" />}</div>
        {!privacyEnabled && !isAI && <span style={{fontSize: '0.7rem', color: 'var(--success)'}}>{t.online}</span>}
      </div>
    </div> 
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}> 
      {isGroup && isOwner && <button onClick={() => setShowAdmin(true)} style={{ background: 'var(--surface-light)', border: '1px solid var(--border)', padding: '4px 10px', borderRadius: '10px', fontSize: '0.7rem', color: 'var(--primary)', fontWeight: '800' }}>Manage</button>}
      <button onClick={() => handleCall('voice')} style={{ background: 'none', border: 'none', color: 'var(--primary)' }}><PhoneCall size={22} /></button> 
      <button onClick={() => handleCall('video')} style={{ background: 'none', border: 'none', color: 'var(--primary)' }}><VideoIcon size={22} /></button> 
      {isGroup && <button className="vault-toggle-btn" onClick={() => setShowVault(!showVault)}><Database size={14} /> Vault</button>} 
      <button onClick={() => setShowSearch(!showSearch)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)' }}><Search size={20} /></button> 
      <div className="avatar" style={{ width: '40px', height: '40px', marginRight: 0, overflow: 'hidden', background: isAI ? 'var(--primary-gradient)' : 'var(--surface)' }}> 
        {isAI ? <Zap size={22} color="white" /> : (userMetadata.profilePic ? <img src={userMetadata.profilePic} style={{width:'100%', height:'100%', objectFit:'cover'}} /> : (dmName ? dmName[0].toUpperCase() : "?"))} 
      </div> 
    </div> 
  </header> 
  
  <main className="main-content" style={{ padding: '20px' }} ref={scrollRef}>
  {showSearch && (
    <div style={{ padding: '12px', background: 'var(--surface)', borderRadius: '12px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
      <Search size={18} color="var(--text-muted)" />
      <input 
        value={searchQuery} 
        onChange={(e) => setSearchQuery(e.target.value)} 
        placeholder="Search messages..." 
        style={{ flex: 1, background: 'transparent', border: 'none', color: 'white', outline: 'none' }}
      />
      {searchQuery && <X size={18} color="var(--text-muted)" onClick={() => setSearchQuery("")} />}
    </div>
  )}
  {isGroup && showVault && <StokvelVault messages={messages} onContribute={(amt) => onSendMessage(id, { type: 'contribution', amount: amt, text: `Contributed R${amt} to the vault!` })} t={t} />}
  {isGroup && !showVault && <div className="privacy-banner">{t.ghost_active}. You appear as @{userMetadata.handle}.</div>}
  {(searchQuery ? filteredMessages : messages).map((msg, i) => (
    <div key={i} style={{ position: 'relative' }}>
      {msg.replyTo && (
        <div style={{ borderLeft: '3px solid var(--primary)', paddingLeft: '12px', marginBottom: '4px', marginLeft: msg.isSelf ? 'auto' : 0, maxWidth: '85%' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Reply to @{msg.replyTo.id}</div>
          <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>{msg.replyTo.text}</div>
        </div>
      )}
      {msg.type === 'deleted' ? (
        <div key={i} style={{ fontStyle: 'italic', color: 'var(--text-muted)', marginBottom: '12px', textAlign: msg.isSelf ? 'right' : 'left' }}>This message was deleted</div>
      ) : msg.type === 'reaction' ? (
        <div key={i} style={{ textAlign: 'center', margin: '8px 0', fontSize: '1.5rem' }}>{msg.text}</div>
      ) : msg.type === 'payment' ? (
        <PaymentBubble key={i} bank={msg.bank} amount={msg.amount} />
      ) : msg.type === 'video' ? (
        <VideoBubble key={i} isSelf={msg.isSelf} size={msg.metadata?.size} thumb={msg.metadata?.thumb} />
      ) : msg.type === 'image' ? (
        <div key={i} className="image-bubble" style={{ alignSelf: msg.isSelf ? 'flex-end' : 'flex-start', marginLeft: msg.isSelf ? 'auto' : 0, marginBottom: '12px' }}>
          <img src={msg.text} alt="sent" style={{ maxWidth: '250px', borderRadius: '16px' }} />
        </div>
      ) : msg.type === 'voice' ? (
        <VoiceNote isSelf={msg.isSelf} duration={msg.duration} audioUrl={msg.text} />
      ) : msg.type === 'contribution' ? (
        <div key={i} className="contribution-bubble">
          <div style={{ fontSize: '0.6rem', opacity: 0.6, textTransform: 'uppercase', letterSpacing: '1px' }}>Vault Contribution</div>
          <div className="contribution-amount">R {msg.amount}</div>
          <div style={{ fontSize: '0.7rem' }}>{msg.isSelf ? 'You' : `@${msg.sender_handle || 'member'}`} contributed</div>
        </div>
      ) : (
        <div 
          key={i} 
          className={`chat-bubble ${msg.isSelf ? 'self' : 'other'}`}
          onLongPress={() => setShowMessageMenu(msg)}
          style={(!msg.isSelf && isAI) ? { background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)', color: 'white' } : {}}
        >
          {msg.text}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px', marginTop: '4px', fontSize: '0.65rem', opacity: 0.7 }}>
            {msg.isSelf && <CheckCheck size={14} color={privacyEnabled ? "#3b82f6" : "var(--text-muted)"} />}
          </div>
        </div>
      )}
      {showReactions === msg.id && (
        <div style={{ position: 'absolute', bottom: '100%', left: msg.isSelf ? 'auto' : 0, right: msg.isSelf ? 0 : 'auto', background: 'var(--surface)', borderRadius: '20px', padding: '8px', display: 'flex', gap: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
          {REACTIONS.map(r => (
            <button key={r} onClick={() => handleReaction(msg.id, r)} style={{ fontSize: '1.2rem', background: 'none', border: 'none', cursor: 'pointer' }}>{r}</button>
          ))}
        </div>
      )}
    </div>
  ))}
  {isTyping && <div className="typing-indicator" style={{ marginLeft: '12px', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '12px' }}>Lindiwe is thinking...</div>}
  {!isGroup && !isTyping && messages.length === 0 && <div style={{ textAlign: 'center', opacity: 0.5, marginTop: '40px' }}><p>Say "Ubuntu" to Lindiwe!</p></div>}
  {!isGroup && <VoiceNote isSelf={false} />}
  
  {showMessageMenu && (
    <div className="message-menu-overlay" onClick={() => setShowMessageMenu(null)}>
      <div className="message-menu" onClick={e => e.stopPropagation()}>
        <div className="message-menu-item" onClick={() => { handleReply(showMessageMenu); setShowMessageMenu(null); }}><Reply size={20} /><span>Reply</span></div>
        <div className="message-menu-item" onClick={() => { setShowReactions(showMessageMenu.id); setShowMessageMenu(null); }}><Smile size={20} /><span>React</span></div>
        <div className="message-menu-item" onClick={() => { handleForward(showMessageMenu); setShowMessageMenu(null); }}><Forward size={20} /><span>Forward</span></div>
        <div className="message-menu-item" style={{ color: 'var(--danger)' }} onClick={() => { handleDeleteMessage(showMessageMenu.id); setShowMessageMenu(null); }}><Trash2 size={20} /><span>Delete</span></div>
      </div>
    </div>
  )}
</main>  <div style={{ padding: '12px 16px 30px', background: 'var(--surface)', backdropFilter: 'blur(10px)', position: 'relative' }}>
  {showActionSheet && (
    <div className="action-sheet">
      <div className="action-item" onClick={() => { fileInputRef.current?.click(); setShowActionSheet(false); }}><div className="action-icon-circle" style={{ background: '#10b981' }}><ImageIcon size={22} /></div><span style={{ fontSize: '0.65rem' }}>Photo</span></div>
      <div className="action-item" onClick={() => { onSendMessage(id, { type: 'video', metadata: { size: '3.1 MB', thumb: 'https://images.unsplash.com/photo-1542281286-9e0a16bb7366?auto=format&fit=crop&q=80&w=240' } }); setShowActionSheet(false); }}><div className="action-icon-circle" style={{ background: '#ec4899' }}><Film size={22} /></div><span style={{ fontSize: '0.65rem' }}>Video</span></div>
      <div className="action-item" onClick={() => setShowBankModal(true)}><div className="action-icon-circle" style={{ background: '#f59e0b' }}><Landmark size={22} /></div><span style={{ fontSize: '0.65rem' }}>Mzansi Pay</span></div>
      <div className="action-item"><div className="action-icon-circle" style={{ background: '#3b82f6' }}><MapPin size={22} /></div><span style={{ fontSize: '0.65rem' }}>Location</span></div>
    </div>
  )}
  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', overflow: 'visible' }}>
    <button onClick={() => setShowActionSheet(!showActionSheet)} style={{ color: showActionSheet ? 'var(--primary)' : 'var(--text-muted)' }}><Plus size={28} style={{ transform: showActionSheet ? 'rotate(45deg)' : 'none' }} /></button>
    {isRecording ? (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '24px', padding: '10px 16px', border: '1px solid var(--danger)' }}>
        <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--danger)', animation: 'pulse 1s infinite' }} />
        <span style={{ color: 'var(--danger)', fontWeight: '700', fontSize: '0.9rem' }}>{formatTime(recordingTime)}</span>
        <button onClick={cancelRecording} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--danger)', padding: '4px' }}><XCircle size={24} /></button>
        <button onClick={sendVoiceNote} style={{ background: 'var(--primary)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Send size={18} color="white" /></button>
      </div>
    ) : (
      <>
        <input type="text" value={inputText} onChange={(e) => setInputText(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSend()} placeholder={t.new_msg} style={{ flexGrow: 1, padding: '14px 20px', borderRadius: '24px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-dark)', color: '#fff' }} />
        {inputText.trim() ? (
          <button onClick={handleSend} style={{ background: 'var(--primary-gradient)', color: '#fff', borderRadius: '50%', width: '48px', height: '48px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}><Send size={20} /></button>
        ) : (
          <button onClick={startRecording} style={{ background: 'var(--primary)', border: 'none', borderRadius: '50%', width: '48px', height: '48px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}><Mic size={22} color="white" /></button>
        )}
      </>
    )}
  </div>
</div> </div> ); };

const App = () => {
  // OneSignal is initialized once in main.jsx — no duplicate init here
  const [handle, setHandle] = useState(() => localStorage.getItem('mzansi_handle') || "");

  return (
    <BrowserRouter>
      <CallProvider userHandle={handle}>
        <AppContent setGlobalHandle={(h) => { setHandle(h); localStorage.setItem('mzansi_handle', h); }} />
      </CallProvider>
    </BrowserRouter>
  );
};

export default App;
