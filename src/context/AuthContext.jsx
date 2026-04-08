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
          // If we restored a session, we might still be PIN locked 
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
      // Include referral info if present
      const signupData = { ...data, referred_by: referralCode };
      const { user, error } = await signUpUser(signupData);
      if (error) throw error;
      setCurrentUser(user);
      setPinLocked(true); // Newly signed up users should set a PIN next
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
      const { user, error } = await signInUser(handle, words);
      if (error) throw error;
      setCurrentUser(user);
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
    localStorage.removeItem('mzansi_session');
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
