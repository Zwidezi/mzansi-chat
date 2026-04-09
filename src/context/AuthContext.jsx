import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { 
  supabase, restoreSession, signUpUser, signInUser, signOutUser, getUser,
  setOnlineStatus, saveOneSignalId
} from '../lib/supabaseClient';
import OneSignal from 'react-onesignal';

const AuthContext = createContext();

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
const getUserSafe = async (handle, userId, timeoutMs = 5000) => {
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

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true); // Only for initial session restore
  const [pinLocked, setPinLocked] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [referralCode, setReferralCode] = useState(null);
  const signingUp = useRef(false);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const session = await restoreSession();
        if (session) {
          setSession(session);
          const user = await getUserSafe(null, session.user.id);
          if (user) {
            setCurrentUser(user);
            if (user.handle) syncOneSignalId(user.handle);
            const isEnrolled = localStorage.getItem('mzansi_pin_hash');
            setPinLocked(!!isEnrolled);
          }
          // If user is null, session orphaned — ignore gracefully
        }
      } catch (err) {
        console.error("Auth init error:", err);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // Listen for auth changes — skip during active signup to prevent race
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (signingUp.current) {
        console.log('[Auth] Skipping listener during signup');
        return;
      }
      setSession(session);
      if (session) {
        const user = await getUserSafe(null, session.user.id);
        if (user) {
          setCurrentUser(user);
          if (user.handle) syncOneSignalId(user.handle);
        }
      } else {
        setCurrentUser(null);
        setPinLocked(false);
      }
    });

    return () => subscription.unsubscribe();
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
      setAuthError(err.message);
      return { success: false, error: err.message };
    } finally {
      signingUp.current = false;
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
