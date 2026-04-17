import { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  supabase, restoreSession, signUpUser, signInUser, signOutUser, getUser,
  saveOneSignalId
} from '../lib/supabaseClient';
import OneSignal from 'react-onesignal';

const AuthContext = createContext();

// Module-level flag to prevent double auth initialization in React StrictMode.
// StrictMode mounts → unmounts → remounts, causing restoreSession() to compete
// for the Supabase navigator lock. This flag ensures initAuth() only runs once.
let authInitStarted = false;

// Helper: save OneSignal push subscription ID to user profile
const syncOneSignalId = async (handle) => {
  try {
    const playerId = OneSignal.User?.pushSubscription?.id;
    if (playerId && handle) {
      await saveOneSignalId(handle, playerId);
      console.log('[OneSignal] Saved player ID for', handle);
    }
  } catch (e) {
    console.warn('[OneSignal] Could not sync player ID:', e);
  }
};

// Helper: getUser with timeout to prevent hanging on orphan sessions
const getUserSafe = async (handle, userId, timeoutMs = 12000) => {
  try {
    const result = await Promise.race([
      getUser(handle, userId),
      new Promise((_, reject) => setTimeout(() => reject(new Error('getUser timeout')), timeoutMs))
    ]);
    return result;
  } catch (e) {
    console.warn('[Auth] getUserSafe failed:', e.message);
    return null;
  }
};

// Helper: Ensure user metadata in Supabase Auth contains the handle for RLS
const healMetadata = async (session, userProfile) => {
  if (!session || !userProfile?.handle) return;
  const currentMetadata = session.user.user_metadata;
  if (!currentMetadata?.handle || currentMetadata.handle !== userProfile.handle) {
    console.log('[Auth] Healing metadata for', userProfile.handle);
    await supabase.auth.updateUser({
      data: { handle: userProfile.handle, name: userProfile.name }
    });
  }
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true); // Only for initial session restore
  const [pinLocked, setPinLocked] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [referralCode, setReferralCode] = useState(null);
  const signingUp = useRef(false);
  const signupCompletedAt = useRef(0);

  useEffect(() => {
    // Prevent double initialization in React StrictMode.
    // StrictMode mounts → unmounts → remounts, causing restoreSession() to
    // compete for the Supabase navigator lock, resulting in lock timeouts
    // and AbortError: "Lock broken by another request with the 'steal' option".
    if (authInitStarted) {
      setLoading(false);
      return;
    }
    authInitStarted = true;

    let cancelled = false;

    const initAuth = async () => {
      try {
        const session = await restoreSession();
        if (cancelled) return;
        if (session) {
          setSession(session);
          const user = await getUserSafe(null, session.user.id);
          if (cancelled) return;
          if (user) {
            setCurrentUser(user);
            await healMetadata(session, user);
            if (user.handle) syncOneSignalId(user.handle);
            const isEnrolled = localStorage.getItem('mzansi_pin_hash');
            setPinLocked(!!isEnrolled);
          }
        }
      } catch (err) {
        console.error("Auth init error:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    initAuth();

    // Listen for auth changes — skip during/shortly after signup to prevent race
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (cancelled) return;
      if (signingUp.current) {
        return;
      }
      // Skip listener for 3s after signup completes to avoid race with
      // onAuthStateChange firing from signInAnonymously() inside signUpUser
      if (Date.now() - signupCompletedAt.current < 3000) {
        return;
      }
      setSession(session);
      if (session) {
        const user = await getUserSafe(null, session.user.id);
        if (cancelled) return;
        if (user) {
          setCurrentUser(user);
          await healMetadata(session, user);
          if (user.handle) syncOneSignalId(user.handle);
        }
        // Don't clear currentUser if profile lookup fails — could be transient
      } else {
        setCurrentUser(null);
        setPinLocked(false);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const handleSignUp = async (data) => {
    // Don't set loading=true — that hides the entire UI with a spinner
    setAuthError(null);
    signingUp.current = true;
    try {
      const signupData = { ...data, referred_by: referralCode };
      const res = await signUpUser(signupData);
      if (res.error) throw new Error(res.error);

      setCurrentUser(res.user);
      setPinLocked(false);
      return { success: true };
    } catch (err) {
      const msg = err.message || '';
      // Suppress known non-fatal Supabase navigator lock errors on mobile
      const isLockErr = msg.includes('Lock') || msg.includes('lock') || msg.includes('stole') || msg.includes('released') || msg.includes('AbortError');
      if (isLockErr) {
        console.warn('[Auth] Suppressed lock error:', msg);
        // Don't show to user — these are transient
        return { success: false, error: 'Please try again.' };
      }
      setAuthError(msg);
      return { success: false, error: msg };
    } finally {
      signingUp.current = false;
      signupCompletedAt.current = Date.now();
    }
  };

  const handleSignIn = async (handle, words) => {
    setAuthError(null);
    try {
      const res = await signInUser(handle, words);
      if (res.error) {
        if (res.needsProfile) {
          setAuthError(res.error);
          return { success: false, error: res.error, needsProfile: true };
        }
        throw new Error(res.error);
      }

      setCurrentUser(res.user);
      setPinLocked(true);
      return { success: true };
    } catch (err) {
      setAuthError(err.message);
      return { success: false, error: err.message };
    }
  };

  const handleLogout = async () => {
    await signOutUser();
    setCurrentUser(null);
    setSession(null);
    setPinLocked(false);
    localStorage.removeItem('mzansi_session');
    localStorage.removeItem('mzansi_pin_hash');
    localStorage.removeItem('mzansi_webauthn_enrolled');
    window.location.href = '/';
  };

  const unlockPin = () => setPinLocked(false);

  return (
    <AuthContext.Provider value={{
      currentUser,
      session,
      loading,
      pinLocked,
      authError,
      referralCode,
      setReferralCode,
      handleSignUp,
      handleSignIn,
      handleLogout,
      unlockPin,
      setAuthError,
      setCurrentUser
    }}>
      {loading ? (
        <div className="auth-loading">
          <div className="loading-spinner" />
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
