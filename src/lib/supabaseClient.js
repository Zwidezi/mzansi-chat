import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.'
  );
}

// Singleton pattern for Supabase client to prevent "Multiple GoTrueClient instances" during HMR
const createSupabaseClient = () => {
  if (typeof window !== 'undefined' && window._supabase) {
    return window._supabase;
  }

  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      // Increase lock timeout to reduce contention in React StrictMode.
      lockTimeout: 10000,
    }
  });

  if (typeof window !== 'undefined') {
    window._supabase = client;
  }
  return client;
};

export const supabase = createSupabaseClient();

export const bufferToBase64 = (buffer) => {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
};

// ═══════════════════════════════════════
// Recovery Key System (Expanded)
// 256-word SA-themed dictionary, 3 words = 256^3 ≈ 16.7 million combos
// ═══════════════════════════════════════

const WORD_LIST = [
  'braai', 'ubuntu', 'sharp', 'lekker', 'jozi', 'protea', 'madiba', 'rooibos',
  'shisa', 'nyama', 'biltong', 'soweto', 'durban', 'cape', 'mzansi', 'vuvuzela',
  'amandla', 'sawubona', 'stoep', 'kraal', 'dassie', 'fynbos', 'jacaranda', 'tugela',
  'karoo', 'rand', 'tsotsi', 'indaba', 'sangoma', 'marabi', 'gumboot', 'mbira',
  'rainbow', 'nation', 'pride', 'freedom', 'heritage', 'mandela', 'robben', 'island',
  'kruger', 'table', 'mountain', 'drakensberg', 'garden', 'route', 'ocean', 'sunrise',
  'sunset', 'harvest', 'maize', 'mealie', 'sorghum', 'baobab', 'acacia', 'impala',
  'leopard', 'buffalo', 'rhino', 'elephant', 'lion', 'cheetah', 'zebra', 'giraffe',
  'springbok', 'kudu', 'eland', 'wildebeest', 'meerkat', 'baboon', 'hornbill', 'eagle',
  'kingfisher', 'weaver', 'sunbird', 'flamingo', 'penguin', 'ostrich', 'tortoise', 'gecko',
  'puffadder', 'mamba', 'cobra', 'mantis', 'firefly', 'cricket', 'cicada', 'anthill',
  'savanna', 'bushveld', 'highveld', 'lowveld', 'midlands', 'coastal', 'plateau', 'valley',
  'river', 'stream', 'waterfall', 'lagoon', 'estuary', 'reef', 'dune', 'canyon',
  'beacon', 'signal', 'bridge', 'tower', 'gateway', 'harbour', 'jetty', 'lighthouse',
  'village', 'township', 'suburb', 'metro', 'plaza', 'arcade', 'market', 'bazaar',
  'shebeen', 'tavern', 'cafe', 'bistro', 'eatery', 'bakery', 'butchery', 'pharmacy',
  'clinic', 'school', 'library', 'museum', 'theatre', 'stadium', 'arena', 'court',
  'temple', 'mosque', 'church', 'chapel', 'shrine', 'mission', 'seminary', 'convent',
  'copper', 'gold', 'diamond', 'platinum', 'chrome', 'iron', 'coal', 'tin',
  'quartz', 'marble', 'granite', 'slate', 'sandstone', 'limestone', 'clay', 'ochre',
  'scarlet', 'crimson', 'amber', 'saffron', 'emerald', 'jade', 'cobalt', 'azure',
  'ivory', 'onyx', 'bronze', 'silver', 'coral', 'pearl', 'opal', 'topaz',
  'rhythm', 'melody', 'harmony', 'tempo', 'chorus', 'verse', 'anthem', 'lullaby',
  'drumbeat', 'whistle', 'chant', 'hymn', 'ballad', 'folklore', 'legend', 'saga',
  'journey', 'voyage', 'quest', 'trail', 'passage', 'crossing', 'summit', 'ascent',
  'anchor', 'compass', 'lantern', 'banner', 'shield', 'crest', 'crown', 'sceptre',
  'unity', 'justice', 'honour', 'courage', 'wisdom', 'patience', 'kindness', 'respect',
  'spirit', 'vision', 'dream', 'spark', 'flame', 'blaze', 'glow', 'radiance',
  'thunder', 'lightning', 'monsoon', 'cyclone', 'breeze', 'tempest', 'rainbow', 'horizon',
  'twilight', 'midnight', 'aurora', 'zenith', 'eclipse', 'solstice', 'crescent', 'nebula',
  'granite', 'basalt', 'feldspar', 'mica', 'obsidian', 'pumice', 'agate', 'jasper',
  'thatch', 'timber', 'bamboo', 'reed', 'sisal', 'hemp', 'cotton', 'linen'
];

// Generate 3 random recovery words
export const generateRecoveryKey = () => {
  const words = [];
  const used = new Set();
  const randomValues = new Uint32Array(3);
  crypto.getRandomValues(randomValues);
  let i = 0;
  while (words.length < 3) {
    const idx = randomValues[i] % WORD_LIST.length;
    if (!used.has(idx)) {
      used.add(idx);
      words.push(WORD_LIST[idx]);
    } else {
      // Regenerate if collision
      const extra = new Uint32Array(1);
      crypto.getRandomValues(extra);
      randomValues[i] = extra[0];
      continue;
    }
    i++;
  }
  return words;
};

// SHA-256 hash for recovery words (used as Supabase Auth password)
const hashWords = async (words) => {
  const text = words.join('-').toLowerCase();
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

// Helper: wait for Supabase auth lock to settle
const settleAuth = (ms = 500) => new Promise(resolve => setTimeout(resolve, ms));

// Helper: check if an error is a known non-fatal navigator lock error
const isLockError = (err) => {
  const msg = typeof err === 'string' ? err : (err?.message || '');
  return msg.includes('Lock') || msg.includes('lock') || msg.includes('AbortError') || msg.includes('stole') || msg.includes('released');
};

// Helper: retry an async operation
const retryOp = async (fn, retries = 3, delay = 500) => {
  for (let i = 0; i < retries; i++) {
    const result = await fn();
    if (!result.error) return result;
    // Only retry on lock/abort errors
    const errMsg = typeof result.error === 'string' ? result.error : (result.error.message || '');
    if (isLockError(errMsg)) {
      console.warn(`[Retry] Attempt ${i + 1} failed with lock error, retrying in ${delay}ms...`);
      await settleAuth(delay);
      continue;
    }
    return result; // Non-lock error, don't retry
  }
  return { error: 'Signup failed after retries. Please try again.' };
};

// Helper: sign in anonymously with retry for lock contention
const signInAnonymouslyWithRetry = async (maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const { data, error } = await supabase.auth.signInAnonymously();
      if (error && isLockError(error.message)) {
        console.warn(`[Auth] Lock error on attempt ${i + 1}, retrying...`);
        await settleAuth(800 * (i + 1));
        continue;
      }
      return { data, error };
    } catch (err) {
      if (isLockError(err.message || err)) {
        console.warn(`[Auth] Lock exception on attempt ${i + 1}, retrying...`);
        await settleAuth(800 * (i + 1));
        continue;
      }
      throw err;
    }
  }
  return { data: null, error: { message: 'Authentication timed out. Please try again.' } };
};

// Sign Up — anonymous auth + public profile
export const signUpUser = async ({ handle, name, profilePic, recoveryWords, referred_by }) => {
  const recoveryHash = await hashWords(recoveryWords);
  const cleanHandle = handle.toLowerCase().trim();

  console.log('[Signup] Attempting with:', { handle: cleanHandle });

  // 1. Check if handle is already taken (use users_public view to bypass RLS)
  const { data: existing } = await supabase
    .from('users_public')
    .select('handle')
    .eq('handle', cleanHandle)
    .maybeSingle();

  if (existing) {
    return { error: 'This handle is already taken. Try another one!' };
  }

  // 2. Get or create anonymous auth session
  // If an orphaned session exists (anonymous auth without a profile), sign out first
  // to avoid conflicts with the new signup attempt.
  const { data: { session: existingSession } } = await supabase.auth.getSession();
  let userId, authSession;

  if (existingSession?.user) {
    // Check if this anonymous session already has a profile
    const { data: existingProfile } = await supabase
      .from('users')
      .select('handle')
      .eq('user_id', existingSession.user.id)
      .maybeSingle();

    if (existingProfile) {
      return { error: 'You already have an account. Try signing in instead.' };
    }

    // Orphaned session (anonymous auth exists but profile insert failed previously).
    // Sign out and create a fresh session so the new signup attempt doesn't conflict.
    console.log('[Signup] Detected orphaned session, signing out to start fresh:', existingSession.user.id);
    try { await supabase.auth.signOut(); } catch (_) { /* best effort */ }

    // Wait for auth lock to fully release before creating a new session
    await settleAuth(1000);

    // Create a new anonymous session (with retry for lock contention)
    const { data: authData, error: authError } = await signInAnonymouslyWithRetry();
    if (authError) {
      console.error('[Signup] Auth error after orphan cleanup:', authError);
      return { error: isLockError(authError.message) ? 'Please try again in a moment.' : authError.message };
    }
    userId = authData.user?.id;
    authSession = authData.session;
    if (!userId) {
      return { error: 'Failed to create account. Please try again.' };
    }
    console.log('[Signup] Fresh session created after orphan cleanup:', userId);
  } else {
    // No existing session — create a new anonymous one (with retry for lock contention)
    const { data: authData, error: authError } = await signInAnonymouslyWithRetry();
    if (authError) {
      console.error('[Signup] Auth error:', authError);
      return { error: isLockError(authError.message) ? 'Please try again in a moment.' : authError.message };
    }
    userId = authData.user?.id;
    authSession = authData.session;
    if (!userId) {
      return { error: 'Failed to create account. Please try again.' };
    }
    console.log('[Signup] Anonymous user created:', userId);
  }

  // 2b. Set handle in user_metadata so JWT includes it for RLS policies
  try {
    await supabase.auth.updateUser({ data: { handle: cleanHandle } });
    console.log('[Signup] Set user_metadata.handle:', cleanHandle);
  } catch (metaErr) {
    console.warn('[Signup] Failed to set user_metadata (non-fatal):', metaErr);
  }

  // 4. Create public profile linked to auth user (with retry for lock contention)
  // We do this BEFORE upload so that Storage RLS can verify the handle exists
  const profileResult = await retryOp(async () => {
    const { data, error: profileError } = await supabase
      .from('users')
      .insert([{
        user_id: userId,
        handle: cleanHandle,
        name,
        profile_pic: null, // Set after upload
        recovery_hash: recoveryHash,
      }])
      .select()
      .maybeSingle();

    if (profileError) {
      console.error('[Signup] Profile error:', profileError);
      if (profileError.code === '23505') {
        return { error: 'This handle is already taken.', data: null };
      }
      return { error: profileError.message || profileError, data: null };
    }
    return { data, error: null };
  });

  if (profileResult.error) {
    // Clean up the orphaned anonymous session so the next attempt starts fresh.
    // Without this, the reused session causes a 409 loop on the same handle.
    console.warn('[Signup] Profile creation failed, cleaning up orphaned session:', profileResult.error);
    try { await supabase.auth.signOut(); } catch (_) { /* best effort */ }
    if (typeof profileResult.error === 'string' && profileResult.error.includes('already taken')) {
      return { error: profileResult.error };
    }
    return { error: typeof profileResult.error === 'string' ? profileResult.error : `Profile creation failed: ${profileResult.error.message || profileResult.error}` };
  }

  const user = profileResult.data;

  // 4. Upload Profile Picture (Now that the handle record exists in DB)
  let finalProfilePicUrl = profilePic;
  if (profilePic && typeof profilePic === 'object') {
    try {
      const { url, error: uploadError } = await uploadMedia(profilePic, 'profiles', cleanHandle);
      if (url) {
        finalProfilePicUrl = url;
        // Update the record with the final URL
        await supabase.from('users').update({ profile_pic: url }).eq('handle', cleanHandle);
        user.profile_pic = url;
      } else {
        console.warn('[Signup] Profile pic upload failed:', uploadError);
      }
    } catch (e) {
      console.warn('[Signup] Profile pic upload failed:', e);
    }
  }

  // 5. Record referral if applicable
  if (referred_by) {
    try {
      await recordReferral(referred_by, cleanHandle);
    } catch (e) {
      console.warn('[Signup] Referral tracking failed:', e);
    }
  }

  return { user, session: authSession };
};

// Record a referral in the database
export const recordReferral = async (referrerHandle, refereeHandle) => {
  const { error } = await supabase
    .from('referrals')
    .insert([{
      referrer_handle: referrerHandle.replace('@', '').toLowerCase(),
      referee_handle: refereeHandle.toLowerCase()
    }]);
  return { error };
};

// ═══════════════════════════════════════
// Client-side Rate Limiting
// ═══════════════════════════════════════

const AUTH_ATTEMPT_KEY = 'mzansi_auth_attempts';
const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

const getAttempts = (handle) => {
  try {
    const raw = localStorage.getItem(AUTH_ATTEMPT_KEY);
    if (!raw) return [];
    const all = JSON.parse(raw);
    const cutoff = Date.now() - (LOCKOUT_MINUTES * 60 * 1000);
    // Return only recent attempts for this handle
    return (all[handle] || []).filter(ts => ts > cutoff);
  } catch { return []; }
};

const recordAttempt = (handle) => {
  try {
    const raw = localStorage.getItem(AUTH_ATTEMPT_KEY);
    const all = raw ? JSON.parse(raw) : {};
    const cutoff = Date.now() - (LOCKOUT_MINUTES * 60 * 1000);
    const recent = (all[handle] || []).filter(ts => ts > cutoff);
    recent.push(Date.now());
    all[handle] = recent;
    localStorage.setItem(AUTH_ATTEMPT_KEY, JSON.stringify(all));
  } catch { /* localStorage full — ignore */ }
};

const clearAttempts = (handle) => {
  try {
    const raw = localStorage.getItem(AUTH_ATTEMPT_KEY);
    if (!raw) return;
    const all = JSON.parse(raw);
    delete all[handle];
    localStorage.setItem(AUTH_ATTEMPT_KEY, JSON.stringify(all));
  } catch { /* ignore */ }
};

const isLockedOut = (handle) => {
  return getAttempts(handle).length >= MAX_ATTEMPTS;
};

// Sign In — verify recovery words, then anonymous auth
export const signInUser = async (handle, recoveryWords) => {
  const cleanHandle = handle.toLowerCase().trim();

  // Rate limit check
  if (isLockedOut(cleanHandle)) {
    const mins = LOCKOUT_MINUTES;
    return { error: `Too many failed attempts. Try again in ${mins} minutes.` };
  }

  const recoveryHash = await hashWords(recoveryWords);

  console.log('[SignIn] Attempting with:', { handle: cleanHandle });

  // 1. Look up user profile and verify recovery hash
  // NOTE: We query 'users' directly here because we NEED to check recovery_hash
  const { data: user, error: lookupError } = await supabase
    .from('users')
    .select('*')
    .eq('handle', cleanHandle)
    .maybeSingle();

  if (lookupError) {
    console.error('[SignIn] Lookup error:', lookupError);
    return { error: 'Failed to look up account. Please try again.' };
  }

  // 2. Database-backed Rate Limit Check
  const { data: isLocked, error: lockError } = await supabase.rpc('is_handle_locked', { p_handle: cleanHandle });
  if (lockError) console.warn('[SignIn] Rate limit check failed:', lockError);

  if (isLocked) {
    return { error: `Account locked due to too many failed attempts. Try again in 15 minutes.` };
  }

  if (!user) {
    // Log failure in DB
    await supabase.from('auth_attempts').insert([{ handle: cleanHandle, success: false }]);
    recordAttempt(cleanHandle); // Keep legacy local limit too for defense in depth
    return { error: 'No account found with that handle.' };
  }

  // 3. Verify recovery words match
  if (user.recovery_hash !== recoveryHash) {
    // Log failure in DB
    await supabase.from('auth_attempts').insert([{ handle: cleanHandle, success: false }]);
    recordAttempt(cleanHandle);
    const remaining = MAX_ATTEMPTS - getAttempts(cleanHandle).length;
    const suffix = remaining > 0 ? ` (${remaining} attempts remaining)` : '';
    return { error: `Invalid recovery words. Double check your words!${suffix}` };
  }

  // Success — log and clear attempts
  await supabase.from('auth_attempts').insert([{ handle: cleanHandle, success: true }]);
  clearAttempts(cleanHandle);

  // 3. Create new anonymous session
  const { data: authData, error: authError } = await supabase.auth.signInAnonymously();

  if (authError) {
    console.error('[SignIn] Auth error:', authError);
    return { error: authError.message };
  }

  // 4. Re-link user_id to this new anonymous session
  const newUserId = authData.user?.id;
  if (!newUserId) {
    console.error('[SignIn] No user ID from anonymous auth');
    return { error: 'Failed to create session. Please try again.' };
  }

  console.log('[SignIn] Linking user_id:', newUserId, 'to handle:', cleanHandle);
  const { data: updatedUser, error: updateError } = await supabase
    .from('users')
    .update({ user_id: newUserId })
    .eq('handle', cleanHandle)
    .select()
    .maybeSingle();

  if (updateError) {
    console.error('[SignIn] Failed to link user_id:', updateError);
    // Sign out the orphaned session to avoid dangling auth state
    await supabase.auth.signOut();
    return { error: 'Account restoration failed. Please try again.' };
  }

  // Return the fresh user data (with updated user_id)
  return { user: updatedUser || user, session: authData.session };
};

// Sign Out
export const signOutUser = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

// Get current session
export const getSession = async () => {
  const { data: { session }, error } = await supabase.auth.getSession();
  return { session, error };
};

// Restore session (for PIN-based quick login)
export const restoreSession = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
};

// Get user by handle or user_id (using safe public view)
export const getUser = async (handle, userId = null) => {
  let query = supabase.from('users_public').select('*');

  if (userId) {
    query = query.eq('user_id', userId);
  } else if (handle) {
    query = query.eq('handle', handle.toLowerCase());
  } else {
    return null;
  }

  const { data } = await query.maybeSingle();
  return data;
};

// Update user profile
export const updateUser = async (handle, updates) => {
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('handle', handle.toLowerCase())
    .select()
    .single();
  return { user: data, error };
};

// Set user online status
export const setOnlineStatus = async (handle, isOnline) => {
  const updates = { 
    is_online: isOnline, 
    last_seen: new Date().toISOString() 
  };

  await supabase
    .from('users')
    .update(updates)
    .eq('handle', handle.toLowerCase());
};

// Update user stats
export const updateUserStats = async (handle, newStats) => {
  const { data, error } = await supabase
    .from('users')
    .update({ stats: newStats })
    .eq('handle', handle.toLowerCase())
    .select()
    .single();
  return { user: data, error };
};

export const updateUserVerification = async (handle, name, isVerified) => {
  const { data, error } = await supabase
    .from('users')
    .update({ name, is_verified: isVerified })
    .eq('handle', handle.toLowerCase())
    .select()
    .single();
  return { user: data, error };
};

export const saveOneSignalId = async (handle, oneSignalId) => {
  const { data, error } = await supabase
    .from('users')
    .update({ onesignal_id: oneSignalId })
    .eq('handle', handle.toLowerCase())
    .select()
    .single();
  return { user: data, error };
};

export const savePeerId = async (handle, peerId) => {
  if (!handle || !peerId) return;
  const { error } = await supabase
    .from('users')
    .update({ peer_id: peerId })
    .eq('handle', handle.toLowerCase());
  return { error };
};

// ═══════════════════════════════════════
// WebAuthn / Biometric Helpers
// ═══════════════════════════════════════

export const saveWebAuthnCredential = async (handle, credential) => {
  const { data, error } = await supabase
    .from('webauthn_credentials')
    .insert([{
      user_handle: handle.toLowerCase(),
      credential_id: credential.id,
      public_key: credential.publicKey,
      counter: 0
    }])
    .select()
    .single();

  return { data, error };
};

export const getWebAuthnCredentials = async (handle) => {
  const { data, error } = await supabase
    .from('webauthn_credentials')
    .select('*')
    .eq('user_handle', handle.toLowerCase());

  return { data, error };
};

// ═══════════════════════════════════════
// Contacts / Friends
// ═══════════════════════════════════════

export const getContacts = async (userHandle) => {
  if (!userHandle) return [];
  const { data, error } = await supabase
    .from('contacts')
    .select('contact_handle, created_at')
    .eq('user_handle', userHandle.toLowerCase())
    .order('created_at', { ascending: true });

  if (error) return [];

  // Enrich with profile data
  const handles = data.map(c => c.contact_handle);
  if (handles.length === 0) return [];

  const { data: profiles } = await supabase
    .from('users_public')
    .select('handle, name, profile_pic, is_online, last_seen')
    .in('handle', handles);

  const profileMap = {};
  (profiles || []).forEach(p => { profileMap[p.handle] = p; });

  return data.map(c => ({
    handle: c.contact_handle,
    addedAt: c.created_at,
    ...(profileMap[c.contact_handle] || {}),
  }));
};

export const addContact = async (userHandle, contactHandle) => {
  const cleanUser = userHandle.toLowerCase().trim();
  const cleanContact = contactHandle.toLowerCase().replace('@', '').trim();

  if (cleanUser === cleanContact) {
    return { error: "You can't add yourself as a contact!" };
  }

  // Check if the contact handle exists
  const { data: existing } = await supabase
    .from('users_public')
    .select('handle')
    .eq('handle', cleanContact)
    .maybeSingle();

  if (!existing) {
    return { error: 'Handle not found. Double check the spelling!' };
  }

  // Add the contact
  const { error } = await supabase
    .from('contacts')
    .insert([{ user_handle: cleanUser, contact_handle: cleanContact }]);

  if (error) {
    if (error.code === '23505') {
      return { error: 'Already in your contacts!' };
    }
    return { error: error.message };
  }

  return { success: true };
};

export const removeContact = async (userHandle, contactHandle) => {
  const { error } = await supabase
    .from('contacts')
    .delete()
    .eq('user_handle', userHandle.toLowerCase())
    .eq('contact_handle', contactHandle.toLowerCase());

  return { error };
};

// ═══════════════════════════════════════
// Communities
// ═══════════════════════════════════════

export const getCommunities = async () => {
  const { data, error } = await supabase
    .from('communities')
    .select('*')
    .order('member_count', { ascending: false });

  if (error) return [];
  return data;
};

export const joinCommunity = async (communityId, userHandle) => {
  // Use atomic RPC to prevent member_count race conditions
  const { error } = await supabase.rpc('join_community_atomic', {
    p_community_id: communityId,
    p_user_handle: userHandle
  });

  return { error };
};

export const createCommunity = async (name, description, tag, ownerHandle) => {
  const { data, error } = await supabase
    .from('communities')
    .insert([{ name, description, tag, owner_handle: ownerHandle.toLowerCase(), member_count: 1 }])
    .select()
    .single();

  if (data) {
    await joinCommunity(data.id, ownerHandle);
  }
  return { data, error };
};

export const updateCommunity = async (communityId, updates) => {
  const { data, error } = await supabase
    .from('communities')
    .update(updates)
    .eq('id', communityId)
    .select()
    .single();
  return { data, error };
};

export const deleteMessage = async (messageId) => {
  const { error } = await supabase
    .from('messages')
    .delete()
    .eq('id', messageId);
  return { error };
};

export const getJoinedCommunities = async (userHandle) => {
  const { data, error } = await supabase
    .from('community_members')
    .select(`
      community_id,
      communities (*)
    `)
    .eq('user_handle', userHandle.toLowerCase());

  if (error) return [];
  return data.map(item => item.communities);
};

// ═══════════════════════════════════════
// Messages (enhanced)
// ═══════════════════════════════════════

export const sendMessage = async (chatId, senderHandle, senderName, content, type = 'text', metadata = {}) => {
  // Ensure the JWT has the handle claim before inserting.
  // RLS policies on `messages` check auth.jwt() ->> 'handle', and if it's
  // missing (e.g. session just restored, metadata not yet healed), the INSERT
  // gets a 403. Healing here prevents that race condition.
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const jwtHandle = session?.user?.user_metadata?.handle;
    if (senderHandle && jwtHandle !== senderHandle.toLowerCase()) {
      console.log('[SendMessage] Healing JWT handle claim before insert');
      await supabase.auth.updateUser({ data: { handle: senderHandle.toLowerCase() } });
    }
  } catch (e) {
    console.warn('[SendMessage] Metadata heal failed (non-fatal):', e);
  }

  const { data, error } = await supabase
    .from('messages')
    .insert([{
      chat_id: chatId,
      sender_handle: senderHandle,
      sender_name: senderName,
      content,
      type,
      metadata
    }])
    .select()
    .single();

  return { message: data, error };
};

export const getMessages = async (chatId, limit = 50, offset = 0) => {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) return [];
  return data;
};

// Subscribe to new messages in real-time (per-chat channel to avoid cross-talk)
export const subscribeToMessages = (chatId, callback) => {
  const channelName = chatId ? `messages-${chatId}` : 'messages-global';
  return supabase
    .channel(channelName)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
      // Only forward messages for this chat (or all if no chatId filter)
      if (!chatId || payload.new.chat_id === chatId) {
        callback(payload.new);
      }
    })
    .subscribe();
};

// Search users by handle (for starting new DMs)
export const searchUsers = async (query, currentHandle) => {
  if (!query || query.length < 2) return [];

  console.log('[Search] Searching for:', query, '| Current user:', currentHandle);

  // Check auth state first
  const { data: { session } } = await supabase.auth.getSession();
  console.log('[Search] Auth state:', session ? `Authenticated (${session.user?.id?.slice(0, 8)}...)` : 'NOT AUTHENTICATED');

  const { data, error } = await supabase
    .from('users_public')
    .select('handle, name, profile_pic, is_online, last_seen')
    .ilike('handle', `%${query.toLowerCase()}%`)
    .neq('handle', currentHandle?.toLowerCase() || '')
    .limit(10);

  if (error) {
    console.error('[Search] ERROR:', error.message, error.code, error.details, error.hint);
    return [];
  }

  console.log('[Search] Results:', data?.length || 0, 'users found', data);
  return data || [];
};

// Get recent DM conversations for the current user
export const getRecentDMs = async (userHandle) => {
  if (!userHandle) return [];

  const handle = userHandle.toLowerCase();

  // Fetch recent messages where this user is a participant in a DM
  // DM chat_ids are formatted as "handle1_handle2" (sorted alphabetically)
  // Use OR filter with exact prefix/suffix match to avoid LIKE substring false positives
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .or(`chat_id.like.${handle}_%,chat_id.like.%_${handle}`)
    .order('created_at', { ascending: false })
    .limit(200);

  if (error || !data) return [];

  // Filter to only DM conversations (chat_id contains '_' and includes this user's handle as exact part)
  const dmMessages = data.filter(msg => {
    const parts = msg.chat_id.split('_');
    return parts.length === 2 && parts.includes(handle);
  });

  // Group by chat_id and get the latest message per conversation
  const conversations = {};
  dmMessages.forEach(msg => {
    if (!conversations[msg.chat_id]) {
      const parts = msg.chat_id.split('_');
      const otherHandle = parts.find(h => h !== handle);
      conversations[msg.chat_id] = {
        chatId: msg.chat_id,
        otherHandle,
        lastMessage: msg,
        lastMessageTime: msg.created_at,
      };
    }
  });

  // Convert to array and sort by most recent
  const dmList = Object.values(conversations).sort(
    (a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime)
  );

  // Enrich with user profiles
  const handles = dmList.map(dm => dm.otherHandle).filter(Boolean);
  if (handles.length > 0) {
    const { data: profiles } = await supabase
      .from('users_public')
      .select('handle, name, profile_pic, is_online')
      .in('handle', handles);

    const profileMap = {};
    (profiles || []).forEach(p => { profileMap[p.handle] = p; });

    dmList.forEach(dm => {
      const profile = profileMap[dm.otherHandle];
      if (profile) {
        dm.otherName = profile.name;
        dm.otherPic = profile.profile_pic;
        dm.isOnline = profile.is_online;
      }
    });
  }

  return dmList;
};

// Generate a unique chat ID for 1-on-1 DMs
export const getDmChatId = (handle1, handle2) => {
  return [handle1.toLowerCase(), handle2.toLowerCase()].sort().join('_');
};

// ═══════════════════════════════════════
// Storage (Media Buckets)
// ═══════════════════════════════════════

// Helper: Client-side image compression for 'Data-Light' savings
export const compressImage = async (file, maxWidth = 1024, quality = 0.7) => {
  if (!file || !file.type.startsWith('image/') || file.type === 'image/gif') return file;

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = (maxWidth / width) * height;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          const compressedFile = new File([blob], file.name || 'upload.jpg', {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });
          console.log(`[Data-Light] Compressed: ${(file.size / 1024).toFixed(1)}KB -> ${(compressedFile.size / 1024).toFixed(1)}KB`);
          resolve(compressedFile);
        }, 'image/jpeg', quality);
      };
    };
  });
};

export const uploadMedia = async (file, pathPrefix = 'media', userHandle = null) => {
  if (!file) return { error: 'No file provided' };

  // Apply Data-Light compression for images
  const uploadFile = await compressImage(file);

  // Storage Hardening: Ensure handle-based folder structure for security policies
  // Format: [userHandle]/[pathPrefix]/[timestamp]-[random].[ext]
  const handleSegment = userHandle ? `${userHandle.toLowerCase()}/` : '';
  const ext = uploadFile.type === 'image/jpeg' ? 'jpg' : (file.name ? file.name.split('.').pop() : 'bin');
  const fileName = `${handleSegment}${pathPrefix}/${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${ext}`;

  const { data, error } = await supabase.storage
    .from('mzansichat_media')
    .upload(fileName, uploadFile, {
      cacheControl: '3600',
      upsert: false
    });


  if (error) {
    console.error('Storage Upload Error:', error);
    return { error: error.message };
  }

  const { data: publicUrlData } = supabase.storage
    .from('mzansichat_media')
    .getPublicUrl(fileName);

  return { url: publicUrlData.publicUrl };
};

// ═══════════════════════════════════════
// Statuses (Stories)
// ═══════════════════════════════════════

export const uploadStatusFile = async (userHandle, file, options = {}) => {
  if (!userHandle) return { error: 'Missing handle' };

  const { caption, audioFile, bgColor } = options;

  let mediaUrl = null;
  let mediaType = 'text'; // Default for text-only statuses

  // 1. Upload media file if provided
  if (file) {
    const { url, error: uploadError } = await uploadMedia(file, 'statuses', userHandle);
    if (uploadError) return { error: uploadError };
    mediaUrl = url;
    mediaType = file.type?.startsWith('video/') ? 'video' : 'image';
  }

  // 2. Upload audio file if provided
  let audioUrl = null;
  if (audioFile) {
    const ext = audioFile.name?.split('.').pop() || 'mp3';
    const audioFileName = `${userHandle.toLowerCase()}/statuses/audio/${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${ext}`;

    const { data: audioData, error: audioUploadError } = await supabase.storage
      .from('mzansichat_media')
      .upload(audioFileName, audioFile, {
        cacheControl: '3600',
        upsert: false,
        contentType: audioFile.type || 'audio/mpeg'
      });

    if (!audioUploadError) {
      const { data: audioPublic } = supabase.storage
        .from('mzansichat_media')
        .getPublicUrl(audioFileName);
      audioUrl = audioPublic.publicUrl;
    } else {
      console.warn('[Status] Audio upload failed:', audioUploadError);
    }
  }

  // 3. Heal JWT metadata so RLS policy can verify handle
  // (same pattern as sendMessage — RLS checks user_handle = get_my_handle())
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const jwtHandle = session?.user?.user_metadata?.handle;
    if (userHandle && jwtHandle !== userHandle.toLowerCase()) {
      console.log('[Status] Healing JWT handle claim before insert');
      await supabase.auth.updateUser({ data: { handle: userHandle.toLowerCase() } });
    }
  } catch (e) {
    console.warn('[Status] Metadata heal failed (non-fatal):', e);
  }

  // 4. Save to database
  const { data, error } = await supabase
    .from('statuses')
    .insert([{
      user_handle: userHandle.toLowerCase(),
      media_url: mediaUrl,
      media_type: mediaType,
      caption: caption || null,
      audio_url: audioUrl,
      bg_color: bgColor || 'gradient-1'
    }])
    .select()
    .single();

  if (error) {
    console.error('[Status] Insert failed:', error.message, error.code, error.details);
  }

  return { data, error };
};

export const getActiveStatuses = async () => {
  // RLS will automatically filter out expired statuses
  const { data, error } = await supabase
    .from('statuses')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) return { data: [], error };

  // Group by handle
  const grouped = {};
  data.forEach(status => {
    if (!grouped[status.user_handle]) {
      grouped[status.user_handle] = [];
    }
    grouped[status.user_handle].push(status);
  });

  return { data: grouped, error: null };
};

// ═══════════════════════════════════════
// PBKDF2 PIN Hashing (Web Crypto API)
// ═══════════════════════════════════════

const PIN_SALT = 'mzansichat-pin-v2'; // Fixed app-level salt (device-local security)

export const hashPinSecure = async (pin) => {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(pin),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: encoder.encode(PIN_SALT),
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    256
  );

  // Convert to hex string
  return Array.from(new Uint8Array(derivedBits))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
};
