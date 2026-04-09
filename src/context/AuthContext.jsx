import { createContext, useContext, useState, useEffect } from 'react';
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

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pinLocked, setPinLocked] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [referralCode, setReferralCode] = useState(null);

  useEffect(() => {
    // Initial session restoration
    const initAuth = async () => {
      try {
        const session = await restoreSession();
        if (session) {
          setSession(session);
          const user = await getUser(null, session.user.id);
          setCurrentUser(user);
          if (user?.handle) syncOneSignalId(user.handle);
          // If we restored a session, check if PIN is enrolled
          const isEnrolled = localStorage.getItem('mzansi_pin_hash');
          setPinLocked(!!isEnrolled);
        }
      } catch (err) {
        console.error("Auth init error:", err);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      if (session) {
        const user = await getUser(null, session.user.id);
        setCurrentUser(user);
        if (user?.handle) syncOneSignalId(user.handle);
      } else {
        setCurrentUser(null);
        setPinLocked(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignUp = async (data) => {
    setLoading(true);
    setAuthError(null);
    try {
      const signupData = { ...data, referred_by: referralCode };
      const res = await signUpUser(signupData);
      if (res.error) throw new Error(res.error);
      
      setCurrentUser(res.user);
      // Don't lock PIN here — the onboarding flow hasn't set a PIN yet.
      // PinSetupStep will call unlockPin() after saving the PIN hash.
      setPinLocked(false); 
      return { success: true };
    } catch (err) {
      setAuthError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (handle, words) => {
    setLoading(true);
    setAuthError(null);
    try {
      const res = await signInUser(handle, words);
      if (res.error) {
        if (res.needsProfile) {
          // If auth exists but profile is missing, we could redirect to a profile completion step
          // For now, we'll just show the error but the AuthFlow can use this info
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
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOutUser();
    setCurrentUser(null);
    setSession(null);
    setPinLocked(false);
    // Thoroughly clear local state
    localStorage.removeItem('mzansi_session');
    localStorage.removeItem('mzansi_pin_hash');
    localStorage.removeItem('mzansi_webauthn_enrolled');
    window.location.href = '/'; // Hard redirect to clear any reactive state
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
      setAuthError
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
