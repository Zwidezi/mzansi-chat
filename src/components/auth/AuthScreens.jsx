import { useState, useEffect, useRef } from 'react';
import { Fingerprint, ArrowLeft, Key, ShieldCheck, UserCircle2, X } from 'lucide-react';
import { generateRecoveryKey, saveWebAuthnCredential, bufferToBase64, hashPinSecure } from '../../lib/supabaseClient';
import './AuthScreens.css';

export const IdentityStep = ({ onNext, initialData, t }) => {
  const [name, setName] = useState(initialData.name || "");
  const [handle, setHandle] = useState(initialData.handle || "");
  const [pic, setPic] = useState(initialData.pic || null);

  const handlePicSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      setPic(e.target.files[0]);
    }
  };

  return (
    <div className="screen-container identity-step">
      <div className="onboarding-header">
        <h2>{t.create_profile}</h2>
        <p>{t.welcome_sub}</p>
      </div>

      <div className="avatar-section">
        <label className="avatar-preview" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          {pic ? (
             <img src={typeof pic === 'string' ? pic : URL.createObjectURL(pic)} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
             <UserCircle2 size={64} color="var(--text-muted)" />
          )}
          <input type="file" style={{ display: 'none' }} accept="image/*" onChange={handlePicSelect} />
        </label>
        <label className="btn-ghost-sm" style={{ cursor: 'pointer' }}>
          {t.change_pic}
          <input type="file" style={{ display: 'none' }} accept="image/*" onChange={handlePicSelect} />
        </label>
      </div>

      <div className="signup-input-group">
        <div className="input-field">
          <label>{t.full_name}</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Vuyani D" />
        </div>
        <div className="input-field">
          <label>{t.my_alias}</label>
          <div className="alias-input-wrapper">
             <span className="alias-at">@</span>
             <input type="text" value={handle} onChange={(e) => setHandle(e.target.value.toLowerCase().trim())} placeholder="vuyani_d" />
          </div>
        </div>
      </div>

      <div className="onboarding-footer">
        <button 
          className="btn-primary-full" 
          onClick={() => onNext({ name, handle, pic })} 
          disabled={!name || !handle}
        >
          {t.get_started}
        </button>
      </div>
    </div>
  );
};

export const RecoveryStep = ({ onNext, t }) => {
  const [words, setWords] = useState([]);
  useEffect(() => { setWords(generateRecoveryKey()); }, []);

  return (
    <div className="screen-container recovery-step">
      <div className="onboarding-header">
        <Key className="header-icon" size={32} />
        <h2>{t.recovery_title}</h2>
        <p>{t.recovery_sub}</p>
      </div>

      <div className="recovery-grid">
        {words.map((w, i) => (
          <div key={i} className="word-chip">
            <span className="word-index">{i + 1}</span>
            <span className="word-text">{w}</span>
          </div>
        ))}
      </div>

      <div className="onboarding-footer">
        <button className="btn-primary-full" onClick={() => onNext(words)}>
          {t.finish}
        </button>
      </div>
    </div>
  );
};

export const BiometricStep = ({ onNext, handle, t }) => {
  const [scanning, setScanning] = useState(false);

  const handleEnroll = async () => {
    setScanning(true);
    try {
      if (window.PublicKeyCredential) {
        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);

        const publicKeyCredentialCreationOptions = {
          challenge: challenge, 
          rp: { name: "MzansiChat", id: window.location.hostname },
          user: {
            id: new Uint8Array(16),
            name: handle || "user@mzansichat",
            displayName: handle || "Mzansi User"
          },
          pubKeyCredParams: [{ alg: -7, type: "public-key" }, { alg: -257, type: "public-key" }],
          authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required" },
          timeout: 15000 // 15s timeout — don't hang forever
        };

        const credential = await navigator.credentials.create({ publicKey: publicKeyCredentialCreationOptions });
        if (credential) {
          const credentialForDb = {
            id: bufferToBase64(credential.rawId),
            publicKey: bufferToBase64(credential.response.getPublicKey?.() || new Uint8Array(0))
          };
          await saveWebAuthnCredential(handle, credentialForDb);
          localStorage.setItem('mzansi_webauthn_enrolled', 'true');
        }
      }
    } catch (e) { console.warn("WebAuthn failed or skipped", e); }
    
    setScanning(false);
    onNext();
  };

  return (
    <div className="screen-container biometric-step">
      <div className="onboarding-header">
        <h2>{t.secure_account}</h2>
        <p>{t.biometric_sub}</p>
      </div>

      <div className="biometric-visual">
         <Fingerprint size={80} className={`biometric-icon ${scanning ? 'biometric-pulse' : ''}`} />
         {scanning && <div className="scanning-text">SECURING...</div>}
      </div>

      <div className="onboarding-footer" style={{ gap: '12px', display: 'flex', flexDirection: 'column' }}>
        <button className="btn-primary-full" onClick={handleEnroll} disabled={scanning}>
          {scanning ? "Processing..." : t.finish}
        </button>
        <button 
          className="btn-ghost-full" 
          onClick={() => onNext()} 
          disabled={scanning}
          style={{ border: '1px solid var(--border)', padding: '14px', borderRadius: '16px', fontWeight: '700', opacity: scanning ? 0.4 : 1 }}
        >
          Skip for now
        </button>
      </div>
    </div>
  );
};

export const PinSetupStep = ({ onFinish, t }) => {
  const [pin, setPin] = useState("");
  const handleKey = (n) => { if (pin.length < 4) setPin(prev => prev + n); };
  const handleDelete = () => setPin(prev => prev.slice(0, -1));

  useEffect(() => {
    if (pin.length === 4) {
      setTimeout(() => onFinish(pin), 300);
    }
  }, [pin]);

  return (
    <div className="screen-container pin-step">
      <div className="onboarding-header">
        <ShieldCheck className="header-icon" size={32} />
        <h2>Set Access PIN</h2>
        <p>Choose 4 digits for quick local access.</p>
      </div>
      
      <div className="pin-display">
        {[0,1,2,3].map(i => <div key={i} className={`pin-dot ${pin.length > i ? 'filled' : ''}`} />)}
      </div>

      <div className="pin-keypad">
        {[1,2,3,4,5,6,7,8,9].map(n => <div key={n} className="pin-key" onClick={() => handleKey(n.toString())}>{n}</div>)}
        <div className="pin-key action" onClick={handleDelete}><X size={20} /></div>
        <div className="pin-key" onClick={() => handleKey("0")}>0</div>
        <div className="pin-key empty"></div>
      </div>
    </div>
  );
};
