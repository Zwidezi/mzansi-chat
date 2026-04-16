import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { TRANSLATIONS } from '../constants/translations';
import {
  IdentityStep, RecoveryStep, BiometricStep, PinSetupStep
} from '../components/auth/AuthScreens';
import { PinGate } from '../components/auth/PinGate';
import { MessageCircle, Key } from 'lucide-react';
import { hashPinSecure } from '../lib/supabaseClient';

const Welcome = ({ onNext, onRestore, t }) => (
  <div className="welcome-container" style={{ textAlign: 'center', padding: '40px 20px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
    <div className="welcome-logo" style={{ marginBottom: '32px', color: 'var(--primary)' }}><MessageCircle size={80} strokeWidth={2.5} /></div>
    <h1 style={{ fontSize: '2.5rem', fontWeight: '900', marginBottom: '16px' }}>{t.welcome}</h1>
    <p style={{ color: 'var(--text-secondary)', marginBottom: '48px', lineHeight: '1.6', fontSize: '1.1rem' }}>{t.welcome_sub}</p>
    <div className="onboarding-footer" style={{ gap: '16px', display: 'flex', flexDirection: 'column' }}>
      <button className="btn-primary-full" onClick={onNext}>{t.get_started}</button>
      <button className="btn-ghost-full" style={{ border: '1px solid var(--border)', padding: '16px', borderRadius: '16px', fontWeight: '700' }} onClick={onRestore}>
        Already have an account? Sign In
      </button>
    </div>
  </div>
);

const SignInStep = ({ onBack, onSignIn, authError, t }) => {
  const [handle, setHandle] = useState("");
  const [words, setWords] = useState(["", "", ""]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const updateWord = (index, value) => {
    const cleaned = value.toLowerCase().trim();
    setWords(prev => prev.map((w, i) => i === index ? cleaned : w));
  };

  const handleSubmit = async () => {
    if (!handle.trim()) { setError("Enter your @handle"); return; }
    if (words.some(w => !w)) { setError("Enter all 3 recovery words"); return; }

    setSubmitting(true);
    setError(null);
    const result = await onSignIn(handle.trim().toLowerCase(), words);
    if (!result.success) {
      setError(result.error || "Invalid handle or recovery key.");
    }
    setSubmitting(false);
  };

  return (
    <div className="screen-container" style={{ padding: '24px 20px', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="onboarding-header">
        <Key className="header-icon" size={32} color="var(--primary)" style={{ marginBottom: '8px' }} />
        <h2 style={{ fontSize: '1.5rem', fontWeight: '900' }}>Restore Account</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Enter your @handle and the 3 recovery words you saved during signup.
        </p>
      </div>

      <div className="signup-input-group" style={{ marginTop: '24px' }}>
        <div className="input-field">
          <label>Your Handle</label>
          <div className="alias-input-wrapper">
            <span className="alias-at">@</span>
            <input
              type="text"
              value={handle}
              onChange={(e) => setHandle(e.target.value.toLowerCase().trim())}
              placeholder="vuyani_d"
              autoComplete="username"
            />
          </div>
        </div>
      </div>

      <div style={{ marginTop: '20px' }}>
        <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '12px', display: 'block' }}>Recovery Words</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          {words.map((word, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--surface-light)', borderRadius: '12px', padding: '10px 14px', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--primary)', minWidth: '16px' }}>{i + 1}</span>
              <input
                type="text"
                value={word}
                onChange={(e) => updateWord(i, e.target.value)}
                placeholder={`word ${i + 1}`}
                autoComplete="off"
                autoCapitalize="none"
                style={{ flex: 1, background: 'transparent', border: 'none', color: 'white', fontSize: '0.9rem', fontWeight: '600', outline: 'none', padding: 0 }}
              />
            </div>
          ))}
        </div>
      </div>

      {(error || authError) && (
        <div style={{ marginTop: '16px', padding: '12px 16px', borderRadius: '12px', background: 'rgba(239,68,68,0.15)', color: '#f87171', fontSize: '0.85rem', fontWeight: '600', textAlign: 'center' }}>
          {error || authError}
        </div>
      )}

      <div className="onboarding-footer" style={{ marginTop: 'auto', paddingTop: '24px', gap: '12px', display: 'flex', flexDirection: 'column' }}>
        <button
          className="btn-primary-full"
          onClick={handleSubmit}
          disabled={submitting}
          style={{ opacity: submitting ? 0.6 : 1 }}
        >
          {submitting ? "Restoring..." : "Restore My Account"}
        </button>
        <button
          className="btn-ghost-full"
          onClick={onBack}
          style={{ border: '1px solid var(--border)', padding: '14px', borderRadius: '16px', fontWeight: '700' }}
        >
          Back
        </button>
      </div>
    </div>
  );
};

const AuthFlow = ({ defaultStep = 'welcome' }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {
    currentUser, pinLocked, handleSignUp, handleSignIn, handleLogout, unlockPin, authError, setAuthError, setReferralCode
  } = useAuth();

  const [step, setStep] = useState(defaultStep);
  const [signupData, setSignupData] = useState({ name: "", handle: "", pic: null });
  const [onboarding, setOnboarding] = useState(false);
  const [lang] = useState(localStorage.getItem('mzansi_lang') || 'English');
  const t = TRANSLATIONS[lang] || TRANSLATIONS.English;

  console.log("[AuthFlow] Step:", step, "User:", currentUser?.handle);

  useEffect(() => {
    // Capture referral from URL
    const ref = searchParams.get('ref');
    if (ref) setReferralCode(ref);
  }, [searchParams, setReferralCode]);

  useEffect(() => {
    // Don't auto-navigate while the user is still going through onboarding steps
    if (onboarding) return;
    if (currentUser && !pinLocked) {
      navigate('/chats');
    }
  }, [currentUser, pinLocked, navigate, onboarding]);

  const onIdentityNext = (data) => {
    setSignupData(data);
    setStep('recovery');
  };

  const signupSubmittingRef = useRef(false);
  const [signupSubmitting, setSignupSubmitting] = useState(false);
  const lastSignupAttempt = useRef(0);

  const onRecoveryNext = async (words) => {
    // Use ref for synchronous guard (state is stale in closures during rapid re-renders)
    if (signupSubmittingRef.current) return;
    // Debounce: prevent rapid re-submissions within 2 seconds
    if (Date.now() - lastSignupAttempt.current < 2000) return;

    signupSubmittingRef.current = true;
    lastSignupAttempt.current = Date.now();
    setSignupSubmitting(true);
    try {
      const success = await handleSignUp({ ...signupData, profilePic: signupData.pic, recoveryWords: words });
      if (success.success) {
        setOnboarding(true); // Prevent auto-nav to /chats
        setStep('biometric');
      }
    } finally {
      signupSubmittingRef.current = false;
      setSignupSubmitting(false);
    }
  };

  const onBiometricNext = () => setStep('pin_setup');

  const onPinSetupFinish = async (pin) => {
    const hashed = await hashPinSecure(pin);
    localStorage.setItem('mzansi_pin_hash', hashed);
    setOnboarding(false); // Onboarding complete
    unlockPin();
    navigate('/chats');
  };

  const onPinLogin = async (pin) => {
    const storedHash = localStorage.getItem('mzansi_pin_hash');
    if (pin === "BIO_SUCCESS") {
      unlockPin();
      return;
    }
    const hashed = await hashPinSecure(pin);
    if (hashed === storedHash) {
      unlockPin();
    } else {
      setAuthError("Incorrect PIN. Please try again.");
    }
  };

  const handleSignInWithCheck = async (handle, words) => {
    const res = await handleSignIn(handle, words);
    if (res.needsProfile) {
      // If profile is missing but auth succeeded, we should ideally move to name/pic setup
      // For now just stay on signin and show the error from back-end
      setAuthError(res.error);
    }
    return res;
  };

  // If already logged in but PIN locked
  if (currentUser && pinLocked) {
    return <PinGate handle={currentUser.handle} onLogin={onPinLogin} onReset={() => {
      // Clear the old PIN so user can set a new one after recovery
      localStorage.removeItem('mzansi_pin_hash');
      handleLogout(); // Full logout — recovery sign-in will create a fresh session
    }} t={t} authError={authError} />;
  }

  // Auth Steps
  return (
    <div className="auth-flow-container" style={{ height: '100dvh' }}>
      {step === 'welcome' && (
        <div style={{ position: 'relative' }}>
          <Welcome onNext={() => setStep('signup')} onRestore={() => setStep('signin')} t={t} />
          <div style={{
            position: 'absolute',
            bottom: '10px',
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: '10px',
            color: 'var(--text-dim)',
            opacity: 0.5
          }}>v3.0.0-3WORDS-ACTIVE</div>
        </div>
      )}
      {step === 'signup' && <IdentityStep onNext={onIdentityNext} initialData={signupData} t={t} />}
      {step === 'recovery' && <RecoveryStep onNext={onRecoveryNext} onBack={() => setStep('signup')} submitting={signupSubmitting} error={authError} t={t} />}
      {step === 'biometric' && <BiometricStep onNext={onBiometricNext} handle={signupData.handle} t={t} />}
      {step === 'pin_setup' && <PinSetupStep onFinish={onPinSetupFinish} t={t} />}

      {step === 'signin' && (
        <SignInStep
          onBack={() => setStep('welcome')}
          onSignIn={handleSignIn}
          authError={authError}
          t={t}
        />
      )}
    </div>
  );
};

export default AuthFlow;
