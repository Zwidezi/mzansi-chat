import { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { 
  MessageSquare, Bell, Shield, ArrowLeft, Send, CheckCircle, 
  Octagon, ChevronRight, UserCircle, Ghost, Info, Zap, 
  Database, TrendingDown, Image as ImageIcon, Plus, 
  MapPin, UserPlus, CreditCard, X, Landmark, Users, 
  Play, Volume2, Globe, Fingerprint, LogOut, Camera, RefreshCw,
  Lock, Key, ShieldCheck, Film
} from 'lucide-react';
import { getLindiweResponse } from './lib/geminiService';
import confetti from 'canvas-confetti';
import { supabase } from './lib/supabaseClient';

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
    business_sub: "Verify your spaza or taxi business and reach 10,000+ local users."
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
    privacy_100: "Isikolo Sobumfihlo: 100%"
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
    privacy_100: "Privaatheid Telling: 100%"
  }
};

// --- Simulation Data ---
const BANKS = [
  { id: 'fnb', name: 'FNB eWallet', color: '#00a39b', short: 'FNB' },
  { id: 'cap', name: 'Capitec Pay', color: '#003154', short: 'CAP' },
  { id: 'tyme', name: 'TymeBank Send', color: '#ffcc00', short: 'TYME' },
  { id: 'std', name: 'Standard Bank', color: '#0033aa', short: 'STD' },
  { id: 'ned', name: 'Nedbank Send-iMali', color: '#006a33', short: 'NED' }
];

const COMMUNITIES = [
  { id: 'c1', name: 'Soweto Job Seekers', description: 'Daily job alerts for Soweto area.', members: '12,400', tag: 'verified' },
  { id: 'c2', name: 'Jozi Tech Hub', description: 'Network with developers in Gauteng.', members: '4,200', tag: 'active' },
  { id: 'c3', name: 'Shoprite Specials', description: 'Real-time grocery savings in your pocket.', members: '8,900', tag: 'promoted', promoted: true }
];

const MZANSI_DEFAULTS = [
  { id: 'protea', url: '/protea.png' },
  { id: 'flag', url: '/flag.png' },
  { id: 'jozi', url: '/jozi.png' }
];

const RECOVERY_WORDS = ["braai", "ubuntu", "sharp", "lekker", "jozi", "protea"];

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

// --- Landing Components ---

const LandingPage = ({ onGetStarted, t }) => (
  <div className="landing-page">
    <header className="landing-nav">
      <div className="landing-logo"><MessageSquare size={24} color="var(--primary)" /> MzansiChat</div>
      <button className="btn-primary-sm" onClick={onGetStarted}>Open App</button>
    </header>

    <section className="landing-hero">
      <div className="hero-badge">🇿🇦 Mission 2026: Identity Freedom</div>
      <h1>The Chat App Built for <span>Ubuntu.</span></h1>
      <p>Privacy First. No Phone Number. No E-mail. 100% South African. Join 10,000+ users building the local grid.</p>
      <div className="hero-ctas">
        <button className="btn-primary-hero" onClick={onGetStarted}>Get Your Handle <ChevronRight size={20} /></button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
          <Shield size={16} color="var(--success)" /> End-to-End Encryption
        </div>
      </div>
      <div className="hero-mockup-container">
        <div className="hero-mockup">
           <div className="mockup-header"><div className="mockup-dot" /> <div className="mockup-dot" /></div>
           <div className="mockup-content">
              <div className="mockup-bubble other">Sharp Lindiwe! How can I save data?</div>
              <div className="mockup-bubble self">Eish, use Ghost Mode! R20 saved today.</div>
           </div>
        </div>
      </div>
    </section>

    <section className="landing-features">
      <div className="feature-card">
        <div className="feature-icon"><Lock size={28} color="var(--primary)" /></div>
        <h3>Identity-First</h3>
        <p>No SIM or personal data required. Your 6-word key is your life.</p>
      </div>
      <div className="feature-card">
        <div className="feature-icon"><Zap size={28} color="#f59e0b" /></div>
        <h3>Mzansi Economy</h3>
        <p>Send money, track Stokvels, and verify your spaza business instantly.</p>
      </div>
      <div className="feature-card">
        <div className="feature-icon"><Globe size={28} color="#06b6d4" /></div>
        <h3>Ubuntu AI</h3>
        <p>Meet Lindiwe. Your localized assistant for SA jobs and safety.</p>
      </div>
    </section>

    <footer className="landing-footer">
      <p>© 2026 MzansiChat. Built with Ubuntu in South Africa.</p>
    </footer>
  </div>
);

// --- Onboarding Components ---

const Welcome = ({ onNext, onRestore, t }) => (
  <div className="welcome-container">
    <div className="welcome-logo"><MessageSquare size={60} strokeWidth={2.5} /></div>
    <h1 style={{ fontSize: '2rem', fontWeight: '900', marginBottom: '16px' }}>{t.welcome}</h1>
    <p style={{ color: 'var(--text-secondary)', marginBottom: '40px', lineHeight: '1.6' }}>{t.welcome_sub}</p>
    <div className="onboarding-footer" style={{ gap: '12px', display: 'flex', flexDirection: 'column' }}>
       <button className="btn-primary-full" onClick={onNext}>{t.get_started}</button>
       <button className="btn-ghost-full" style={{ border: '1px solid var(--border)' }} onClick={onRestore}>Already have an account? Sign In</button>
    </div>
  </div>
);

const Signup = ({ userMetadata, setUserMetadata, onNext, t }) => (
  <div className="screen-container" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
    <div style={{ marginTop: '20px', textAlign: 'center' }}>
      <h2 style={{ fontSize: '1.75rem', fontWeight: '800', marginBottom: '8px' }}>{t.create_profile}</h2>
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

const RecoveryKeyStep = ({ onNext, t }) => (
  <div className="screen-container" style={{ display: 'flex', flexDirection: 'column', height: '100%', textAlign: 'center' }}>
     <div style={{ marginTop: '40px' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: '800', marginBottom: '16px' }}>{t.recovery_title}</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{t.recovery_sub}</p>
     </div>
     <div className="recovery-container">
        {RECOVERY_WORDS.map((word, i) => (
          <div key={i} className="word-chip"><span className="word-index">{i+1}</span>{word}</div>
        ))}
     </div>
     <div className="onboarding-footer">
        <button className="btn-primary-full" onClick={onNext}>I've Written Them Down</button>
     </div>
  </div>
);

const BiometricStep = ({ onFinish, t }) => {
  const [scanning, setScanning] = useState(false);
  return (
    <div className="screen-container" style={{ display: 'flex', flexDirection: 'column', height: '100%', textAlign: 'center' }}>
      <div style={{ marginTop: '60px' }}><h2 style={{ fontSize: '1.75rem', fontWeight: '800', marginBottom: '16px' }}>{t.secure_account}</h2><p style={{ color: 'var(--text-secondary)' }}>{t.biometric_sub}</p></div>
      <div className="biometric-ring"><Fingerprint size={80} className="biometric-icon" />{scanning && <div style={{ position: 'absolute', color: 'var(--primary)', fontWeight: '800' }}>ENCRYPTING...</div>}</div>
      <div className="onboarding-footer"><button className="btn-primary-full" onClick={() => { setScanning(true); setTimeout(onFinish, 2500); }}>{t.setup_biometric}</button></div>
    </div>
  );
};

const SignInStep = ({ onNext, onCancel, t }) => {
  const [words, setWords] = useState(Array(6).fill(""));
  const handleWordChange = (idx, val) => {
    const newWords = [...words];
    newWords[idx] = val.toLowerCase().trim();
    setWords(newWords);
  };
  return (
    <div className="screen-container" style={{ display: 'flex', flexDirection: 'column', height: '100%', textAlign: 'center' }}>
      <div style={{ marginTop: '40px' }}><h2 style={{ fontSize: '1.75rem', fontWeight: '800', marginBottom: '8px' }}>Sign In</h2><p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Enter your 6 recovery words.</p></div>
      <div className="recovery-container" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginTop: '30px' }}>
        {words.map((word, i) => (
          <div key={i} className="word-chip-input" style={{ background: 'var(--bg-dark)', borderRadius: '12px', padding: '12px', border: '1px solid var(--border)' }}>
            <span style={{ fontSize: '0.6rem', color: 'var(--primary)', fontWeight: '800', marginRight: '6px' }}>{i+1}</span>
            <input 
              style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '0.9rem', width: '70%',outline: 'none' }}
              value={word}
              placeholder="word"
              onChange={(e) => handleWordChange(i, e.target.value)}
            />
          </div>
        ))}
      </div>
      <div className="onboarding-footer" style={{ gap: '12px', display: 'flex', flexDirection: 'column' }}>
        <button className="btn-primary-full" onClick={() => onNext(words)} disabled={words.some(w => !w)}>Verify Identity</button>
        <button className="btn-ghost-full" onClick={onCancel}>Cancel</button>
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

const Chats = ({ gatekeeperEnabled, t }) => {
  const navigate = useNavigate();
  return (
    <div className="screen-container">
      <div className="settings-group">
        <div className="settings-group-title">{t.active_convos}</div>
        <div className="list-item" style={{ borderLeft: '4px solid gold' }} onClick={() => navigate('/chat/lindiwe')}>
          <div className="avatar" style={{ background: 'var(--primary-gradient)' }}><Zap size={22} color="white" /></div>
          <div className="item-content">
            <div className="item-header"><div className="item-name">Lindiwe AI <Octagon size={14} fill="gold" stroke="none" /></div><span className="item-time" style={{ color: 'gold', fontWeight: '800' }}>AI Assistant</span></div>
            <div className="item-preview">Tap to talk to your localized assistant...</div>
          </div>
        </div>
        <div className="list-item" onClick={() => navigate('/chat/1')}><div className="avatar" style={{backgroundColor: 'var(--surface-light)'}}><span style={{color: 'var(--primary)'}}>JD</span></div><div className="item-content"><div className="item-header"><div className="item-name">John Doe <CheckCircle size={14} className="verified-badge" /></div><span className="item-time">Live</span></div><div className="item-preview">Tap to start chatting...</div></div></div>
        <div className="list-item" onClick={() => navigate('/chat/2')}><div className="avatar" style={{backgroundColor: 'rgba(255, 153, 153, 0.2)'}}><span style={{color: '#ff9999'}}>SG</span></div><div className="item-content"><div className="item-header"><div className="item-name">Stokvel Group #4 <CheckCircle size={14} className="verified-badge" /></div><span className="item-time">Live</span></div><div className="item-preview">Community real-time chat...</div></div></div>
      </div>
    </div>
  );
};

const ProfileManager = ({ userMetadata, setUserMetadata, language, setLanguage, t, onLogout }) => (
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
      <div className="settings-group-title">App Language / Izilimi</div>
      <div className="lang-grid">{['English', 'isiZulu', 'Afrikaans'].map(lang => (<button key={lang} className={`lang-btn ${language === lang ? 'active' : ''}`} onClick={() => setLanguage(lang)}>{lang}</button>))}</div>
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

const AppContent = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isOnboarded, setIsOnboarded] = useState(() => localStorage.getItem('mzansi_onboarded') === 'true');
  const [onboardingStep, setOnboardingStep] = useState(0); 

  const [userMetadata, setUserMetadata] = useState(() => {
    const saved = localStorage.getItem('mzansi_user');
    return saved ? JSON.parse(saved) : { name: "", handle: "", about: "I'm on MzansiChat!", profilePic: null };
  });

  const [messageHistory, setMessageHistory] = useState({});
  const [language, setLanguage] = useState('English');
  const t = TRANSLATIONS[language];
  const [stats, setStats] = useState({ dataSaved: 420.5, moneySaved: "14.20", storagePurged: 1.2 });
  const [isTyping, setIsTyping] = useState(false);
  const [apiKey, setApiKey] = useState(localStorage.getItem('gemini_api_key') || "");

  const saveApiKey = (key) => { setApiKey(key); localStorage.setItem('gemini_api_key', key); };

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

    // 2. Handle Lindiwe AI
    const currentChat = MZANSI_DEFAULTS.find(c => c.id === chatId);
    if (currentChat?.isAI && message.type === 'text') {
      setIsTyping(true);
      const history = (messageHistory[chatId] || []).map(m => ({ text: m.text, isSelf: m.isSelf }));
      const botResponse = await getLindiweResponse(apiKey, message.text, history);
      
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
    if (onboardingStep === 0) return <Welcome onNext={() => setOnboardingStep(1)} onRestore={() => setOnboardingStep('signin')} t={t} />;
    if (onboardingStep === 'signin') return <SignInStep onNext={(words) => setOnboardingStep('recover_handle')} onCancel={() => setOnboardingStep(0)} t={t} />;
    if (onboardingStep === 'recover_handle') return <RecoverHandle userMetadata={userMetadata} setUserMetadata={setUserMetadata} onFinish={() => { setIsOnboarded(true); navigate('/'); }} t={t} />;
    if (onboardingStep === 1) return <Signup userMetadata={userMetadata} setUserMetadata={setUserMetadata} onNext={() => setOnboardingStep(2)} t={t} />;
    if (onboardingStep === 2) return <RecoveryKeyStep onNext={() => setOnboardingStep(3)} t={t} />;
    if (onboardingStep === 3) return <BiometricStep onFinish={() => { setIsOnboarded(true); navigate('/'); }} t={t} />;
  }

  return (
    <div id="root">
       <Routes>
          <Route path="/chat/:id" element={null} />
          <Route path="*" element={<header className="app-header"><div className="app-title">MzansiChat</div><div style={{ display: 'flex', gap: '12px' }}><Globe size={18} color="var(--text-muted)" /><Shield size={20} color='var(--primary)' /></div></header>} />
        </Routes>
        <main className="main-content">
          <Routes>
            <Route path="/" element={isOnboarded ? <Chats gatekeeperEnabled={true} t={t} /> : <LandingPage onGetStarted={() => setOnboardingStep(0)} t={t} />} />
            <Route path="/updates" element={<Discovery t={t} />} />
            <Route path="/profile" element={<ProfileManager userMetadata={userMetadata} setUserMetadata={setUserMetadata} language={language} setLanguage={setLanguage} t={t} onLogout={() => { setIsOnboarded(false); setOnboardingStep(0); }} />} />
            <Route path="/business" element={<BusinessHub userMetadata={userMetadata} setUserMetadata={setUserMetadata} onBack={() => navigate('/profile')} t={t} />} />
            <Route path="/settings" element={<Settings gatekeeperEnabled={true} setGatekeeperEnabled={()=>{}} stats={stats} apiKey={apiKey} onSaveApiKey={saveApiKey} t={t} />} />
            <Route path="/chat/:id" element={<ChatDetailWrapper gatekeeperEnabled={true} privacyEnabled={true} userMetadata={userMetadata} messageHistory={messageHistory} onSendMessage={handleSendMessage} isTyping={isTyping} t={t} />} />
          </Routes>
        </main>
        <nav className="bottom-nav"><Link to="/" className={`nav-item ${location.pathname === '/' ? 'active' : ''}`}><MessageSquare size={26} /><span>{t.chats}</span></Link><Link to="/updates" className={`nav-item ${location.pathname === '/updates' ? 'active' : ''}`}><Bell size={26} /><span>{t.updates}</span></Link><Link to="/profile" className={`nav-item ${location.pathname === '/profile' ? 'active' : ''}`}><UserCircle size={26} /><span>{t.profile}</span></Link><Link to="/settings" className={`nav-item ${location.pathname === '/settings' ? 'active' : ''}`}><Database size={26} /><span>{t.savings}</span></Link></nav>
    </div>
  );
};

const Discovery = ({ t }) => (
  <div className="screen-container">
    <div className="discovery-header"><h2 style={{ fontSize: '1.25rem', fontWeight: '800' }}>{t.discovery}</h2><Users size={20} color="var(--primary)" /></div>
    
    {COMMUNITIES.sort((a, b) => (b.promoted ? 1 : 0) - (a.promoted ? 1 : 0)).map(comm => (
      <div key={comm.id} className="community-card">
        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
           <div className="community-tag" style={comm.promoted ? { background: '#10b981', color: 'white' } : {}}>{comm.promoted ? <ShieldCheck size={12} /> : null} {comm.tag}</div>
           {comm.promoted && <div className="promoted-tag">Verified Business</div>}
        </div>
        <h3 className="item-name">{comm.name}</h3>
        <p className="item-preview" style={{ marginTop: '4px' }}>{comm.description}</p>
        <div className="member-count"><Users size={12} /> {comm.members} Members</div>
        <button className="join-btn-ghost"><Ghost size={18} /> {t.join_ghost}</button>
      </div>
    ))}
  </div>
);
const Settings = ({ gatekeeperEnabled, setGatekeeperEnabled, stats, apiKey, onSaveApiKey, t }) => (
  <div className="screen-container">
    <div className="savings-card"><p className="savings-label">{t.data_saved}</p><div className="savings-main-stat">{stats.dataSaved} <span style={{fontSize: '1rem', opacity: 0.8}}>MB</span></div><div className="money-badge"><Zap size={14} fill="white" />{t.money_saved}: R {stats.moneySaved}</div></div>
    <div className="settings-group">
      <div className="settings-group-title">AI Engine (Lindiwe)</div>
      <div className="setting-item" style={{ flexDirection: 'column', alignItems: 'flex-start', padding: '16px' }}>
         <div className="setting-info" style={{ marginBottom: '12px' }}>
            <h4 style={{ color: 'var(--primary)' }}>Gemini API Key</h4>
            <p>Required for Lindiwe's real intelligence.</p>
         </div>
         <input 
            type="password" 
            value={apiKey} 
            onChange={(e) => onSaveApiKey(e.target.value)} 
            placeholder="Paste your key here..."
            style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-dark)', color: '#fff' }}
         />
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
const ChatDetailWrapper = (props) => { const { id } = useParams(); const messages = props.messageHistory[id] || []; return <ChatDetail {...props} messages={messages} />; };
const VoiceNote = ({ isSelf }) => ( <div className="voice-bubble" style={{ alignSelf: isSelf ? 'flex-end' : 'flex-start', marginLeft: isSelf ? 'auto' : '0', marginBottom: '12px' }}> <div className="play-btn"><Play size={16} fill="white" /></div> <div className="waveform"> {[...Array(15)].map((_, i) => ( <div key={i} className={`wave-bar ${i < 8 ? 'active' : ''}`} style={{ height: `${Math.random() * 100}%` }}></div> ))} </div> <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>0:12</span> </div> );
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

const BusinessHub = ({ userMetadata, setUserMetadata, onBack, t }) => {
  const [step, setStep] = useState(userMetadata.isVerified ? 'verified' : 'start');
  const [businessName, setBusinessName] = useState("");

  const handleVerify = () => {
    setUserMetadata(prev => ({ ...prev, name: businessName || prev.name, isVerified: true }));
    setStep('verified');
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#06b6d4', '#10b981', '#fbbf24']
    });
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

          <button className="btn-primary-full" onClick={handleVerify}>Pay & Verify Identity</button>
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
  const navigate = useNavigate(); const { id } = useParams(); const [inputText, setInputText] = useState(""); const [showActionSheet, setShowActionSheet] = useState(false); const [showBankModal, setShowBankModal] = useState(false); const scrollRef = useRef(null);
  const [showVault, setShowVault] = useState(false);
  const isGroup = id === '2'; 
  const isAI = id === 'lindiwe';
  const chatName = isAI ? 'Lindiwe AI' : (id === '1' ? 'John Doe' : 'Stokvel Group #4');
  
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages]);
  const handleSend = () => { if (!inputText.trim()) return; onSendMessage(id, { text: inputText, type: 'text' }); setInputText(""); };
  return ( <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}> {showBankModal && ( <div className="bank-modal" onClick={() => setShowBankModal(false)}> <div className="bank-grid" onClick={e => e.stopPropagation()}> <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}><h3 style={{ fontWeight: '800' }}>Choose Bank</h3><X onClick={() => setShowBankModal(false)} /></div> {BANKS.map(bank => ( <div key={bank.id} className="bank-choice" onClick={() => { onSendMessage(id, { type: 'payment', bank, amount: '250.00' }); setShowBankModal(false); setShowActionSheet(false); }}><div className="avatar" style={{ backgroundColor: bank.color, color: 'white' }}>{bank.short}</div><div className="item-name">{bank.name}</div><ChevronRight size={18} style={{ marginLeft: 'auto' }} color="var(--text-muted)" /></div> ))} </div> </div> )} <header className="app-header"> <div style={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}><button onClick={() => navigate(-1)} style={{ marginRight: '12px' }}><ArrowLeft size={22} /></button><div><div className="item-name">{chatName} {isAI ? <Octagon size={14} fill="gold" stroke="none" /> : <CheckCircle size={14} className="verified-badge" />}</div>{!privacyEnabled && !isAI && <span style={{fontSize: '0.7rem', color: 'var(--success)'}}>{t.online}</span>}</div></div> <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}> {isGroup && <button className="vault-toggle-btn" onClick={() => setShowVault(!showVault)}><Database size={14} /> Vault</button>} <div className="avatar" style={{ width: '40px', height: '40px', marginRight: 0, overflow: 'hidden', background: isAI ? 'var(--primary-gradient)' : 'var(--surface)' }}> {isAI ? <Zap size={22} color="white" /> : (userMetadata.profilePic ? <img src={userMetadata.profilePic} style={{width:'100%', height:'100%', objectFit:'cover'}} /> : "?")} </div> </div> </header> <main className="main-content" style={{ padding: '20px' }} ref={scrollRef}> {isGroup && showVault && <StokvelVault messages={messages} onContribute={(amt) => onSendMessage(id, { type: 'contribution', amount: amt, text: `Contributed R${amt} to the vault!` })} t={t} />} {isGroup && !showVault && <div className="privacy-banner">{t.ghost_active}. You appear as @{userMetadata.handle}.</div>} {messages.map((msg, i) => ( msg.type === 'payment' ? <PaymentBubble key={i} bank={msg.bank} amount={msg.amount} /> : msg.type === 'video' ? <VideoBubble key={i} isSelf={msg.isSelf} size={msg.metadata?.size} thumb={msg.metadata?.thumb} /> : msg.type === 'contribution' ? <div key={i} className="contribution-bubble"> <div style={{ fontSize: '0.6rem', opacity: 0.6, textTransform: 'uppercase', letterSpacing: '1px' }}>Vault Contribution</div> <div className="contribution-amount">R {msg.amount}</div> <div style={{ fontSize: '0.7rem' }}>{msg.isSelf ? 'You' : `@${msg.sender_handle || 'member'}`} contributed</div> </div> : <div key={i} className={`chat-bubble ${msg.isSelf ? 'self' : 'other'}`} style={(!msg.isSelf && isAI) ? { background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)', color: 'white' } : {}}>{msg.text}</div> ))} {isTyping && <div className="typing-indicator" style={{ marginLeft: '12px', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '12px' }}>Lindiwe is thinking...</div>} {!isGroup && !isTyping && messages.length === 0 && <div style={{ textAlign: 'center', opacity: 0.5, marginTop: '40px' }}><p>Say "Ubuntu" to Lindiwe!</p></div>} {!isGroup && <VoiceNote isSelf={false} />} </main> <div style={{ padding: '12px 16px 30px', background: 'var(--surface)', backdropFilter: 'blur(10px)', position: 'relative' }}> {showActionSheet && ( <div className="action-sheet"> <div className="action-item" onClick={() => setShowBankModal(true)}><div className="action-icon-circle" style={{ background: '#f59e0b' }}><Landmark size={22} /></div><span style={{ fontSize: '0.65rem' }}>Mzansi Pay</span></div> <div className="action-item" onClick={() => { onSendMessage(id, { type: 'video', metadata: { size: '3.1 MB', thumb: 'https://images.unsplash.com/photo-1542281286-9e0a16bb7366?auto=format&fit=crop&q=80&w=240' } }); setShowActionSheet(false); }}><div className="action-icon-circle" style={{ background: '#ec4899' }}><Film size={22} /></div><span style={{ fontSize: '0.65rem' }}>Video</span></div> <div className="action-item"><div className="action-icon-circle" style={{ background: '#3b82f6' }}><div style={{ color: 'white' }}><MapPin size={22} /></div></div><span style={{ fontSize: '0.65rem' }}>Location</span></div> <div className="action-item"><div className="action-icon-circle" style={{ background: '#10b981' }}><UserPlus size={22} /></div><span style={{ fontSize: '0.65rem' }}>Contact</span></div> </div> )} <div style={{ display: 'flex', gap: '10px', alignItems: 'center', overflow: 'visible' }}> <button onClick={() => setShowActionSheet(!showActionSheet)} style={{ color: showActionSheet ? 'var(--primary)' : 'var(--text-muted)' }}><Plus size={28} style={{ transform: showActionSheet ? 'rotate(45deg)' : 'none' }} /></button> <input type="text" value={inputText} onChange={(e) => setInputText(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSend()} placeholder={t.new_msg} style={{ flexGrow: 1, padding: '14px 20px', borderRadius: '24px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-dark)', color: '#fff' }} /> <button onClick={handleSend} style={{ background: 'var(--primary-gradient)', color: '#fff', borderRadius: '50%', width: '48px', height: '48px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}><Send size={20} /></button> </div> </div> </div> ); };
const App = () => ( <BrowserRouter> <AppContent /> </BrowserRouter> );
export default App;
