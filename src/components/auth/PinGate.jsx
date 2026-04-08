import { useState, useEffect } from 'react';
import { Fingerprint, X } from 'lucide-react';
import { getWebAuthnCredentials } from '../../lib/supabaseClient';
import './AuthScreens.css';

export const PinGate = ({ handle, onLogin, onReset, authError, t }) => {
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
        const { data: credentials, error } = await getWebAuthnCredentials(handle);
        
        if (error || !credentials || credentials.length === 0) {
          setAttemptingBio(false);
          return;
        }

        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);

        const allowedCredentials = credentials.map(c => ({
          id: Uint8Array.from(atob(c.credential_id), c => c.charCodeAt(0)),
          type: 'public-key'
        }));

        const getOptions = {
          publicKey: {
            challenge,
            rpId: window.location.hostname,
            allowCredentials: allowedCredentials,
            userVerification: "required",
          }
        };

        const assertion = await navigator.credentials.get(getOptions);
        if (assertion) {
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

  const initial = handle ? handle[0].toUpperCase() : "?";

  return (
    <div className="screen-container pin-gate-screen">
      <div className="onboarding-header">
        <div className="profile-avatar-large">
          {initial}
          <div className="bio-shortcut-icon">
             <Fingerprint size={16} color="var(--primary)" onClick={triggerBiometric} />
          </div>
        </div>
        <h2>Welcome Back</h2>
        <p className="handle-display">@{handle}</p>
        
        {authError && <p className="error-text-sm">{authError}</p>}
        {attemptingBio && <p className="success-text-sm">Verifying Biometrics...</p>}
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

      <button className="btn-ghost-full forgot-pin" onClick={onReset}>
        Forgot PIN? Use Recovery Key
      </button>
    </div>
  );
};
