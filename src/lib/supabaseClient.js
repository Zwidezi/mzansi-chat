import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const bufferToBase64 = (buffer) => {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
};

// ═══════════════════════════════════════
// Recovery Key System (Expanded)
// 256-word SA-themed dictionary, 6 words = 256^6 ≈ 281 trillion combos
// ═══════════════════════════════════════

const WORD_LIST = [
  'braai','ubuntu','sharp','lekker','jozi','protea','madiba','rooibos',
  'shisa','nyama','biltong','soweto','durban','cape','mzansi','vuvuzela',
  'amandla','sawubona','stoep','kraal','dassie','fynbos','jacaranda','tugela',
  'karoo','rand','tsotsi','indaba','sangoma','marabi','gumboot','mbira',
  'rainbow','nation','pride','freedom','heritage','mandela','robben','island',
  'kruger','table','mountain','drakensberg','garden','route','ocean','sunrise',
  'sunset','harvest','maize','mealie','sorghum','baobab','acacia','impala',
  'leopard','buffalo','rhino','elephant','lion','cheetah','zebra','giraffe',
  'springbok','kudu','eland','wildebeest','meerkat','baboon','hornbill','eagle',
  'kingfisher','weaver','sunbird','flamingo','penguin','ostrich','tortoise','gecko',
  'puffadder','mamba','cobra','mantis','firefly','cricket','cicada','anthill',
  'savanna','bushveld','highveld','lowveld','midlands','coastal','plateau','valley',
  'river','stream','waterfall','lagoon','estuary','reef','dune','canyon',
  'beacon','signal','bridge','tower','gateway','harbour','jetty','lighthouse',
  'village','township','suburb','metro','plaza','arcade','market','bazaar',
  'shebeen','tavern','cafe','bistro','eatery','bakery','butchery','pharmacy',
  'clinic','school','library','museum','theatre','stadium','arena','court',
  'temple','mosque','church','chapel','shrine','mission','seminary','convent',
  'copper','gold','diamond','platinum','chrome','iron','coal','tin',
  'quartz','marble','granite','slate','sandstone','limestone','clay','ochre',
  'scarlet','crimson','amber','saffron','emerald','jade','cobalt','azure',
  'ivory','onyx','bronze','silver','coral','pearl','opal','topaz',
  'rhythm','melody','harmony','tempo','chorus','verse','anthem','lullaby',
  'drumbeat','whistle','chant','hymn','ballad','folklore','legend','saga',
  'journey','voyage','quest','trail','passage','crossing','summit','ascent',
  'anchor','compass','lantern','banner','shield','crest','crown','sceptre',
  'unity','justice','honour','courage','wisdom','patience','kindness','respect',
  'spirit','vision','dream','spark','flame','blaze','glow','radiance',
  'thunder','lightning','monsoon','cyclone','breeze','tempest','rainbow','horizon',
  'twilight','midnight','aurora','zenith','eclipse','solstice','crescent','nebula',
  'granite','basalt','feldspar','mica','obsidian','pumice','agate','jasper',
  'thatch','timber','bamboo','reed','sisal','hemp','cotton','linen'
];

// Generate 6 random recovery words
export const generateRecoveryKey = () => {
  const words = [];
  const used = new Set();
  while (words.length < 6) {
    const idx = Math.floor(Math.random() * WORD_LIST.length);
    if (!used.has(idx)) {
      used.add(idx);
      words.push(WORD_LIST[idx]);
    }
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

// Synthetic email from handle (used for Supabase Auth)
const handleToEmail = (handle) => `${handle.toLowerCase()}@mzansichat.app`;

// ═══════════════════════════════════════
// Supabase Auth Integration
// ═══════════════════════════════════════

// Sign Up — create Supabase Auth user + public profile
export const signUpUser = async ({ handle, name, profilePic, recoveryWords, referred_by }) => {
  const recoveryHash = await hashWords(recoveryWords);
  const email = handleToEmail(handle);

  // 1. Create Supabase Auth user
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password: recoveryHash,
  });

  if (authError) {
    // Handle duplicate email (handle already taken)
    if (authError.message?.includes('already registered') || authError.message?.includes('already been registered')) {
      return { error: 'This handle is already taken. Try another one!' };
    }
    return { error: authError.message };
  }

  const userId = authData.user?.id;
  if (!userId) {
    return { error: 'Failed to create auth account. Please try again.' };
  }

  // 2. Create public profile linked to auth user
  const { data, error } = await supabase
    .from('users')
    .insert([{
      handle: handle.toLowerCase(),
      name,
      profile_pic: profilePic,
      recovery_hash: recoveryHash,
      user_id: userId,
    }])
    .select()
    .maybeSingle();

  if (error) {
    // If profile creation fails, the auth user is orphaned — but recoverable on next sign-in
    if (error.code === '23505') {
      return { error: 'This handle is already taken. Try another one!' };
    }
    return { error: error.message };
  }


  // 3. Record referral if applicable
  if (referred_by) {
    await recordReferral(referred_by, handle.toLowerCase());
  }

  return { user: data };
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

// Sign In — authenticate via recovery words
export const signInUser = async (handle, recoveryWords) => {
  const recoveryHash = await hashWords(recoveryWords);
  const email = handleToEmail(handle);

  // Authenticate with Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password: recoveryHash,
  });

  if (authError) {
    return { error: 'Invalid handle or recovery key. Double check your words!' };
  }

  // Fetch user profile
  const { data: user, error: profileError } = await supabase
    .from('users')
    .select('*')
    .eq('handle', handle.toLowerCase())
    .maybeSingle();

  if (profileError || !user) {
    return { error: 'Account found but profile is missing. Please contact support.' };
  }

  // If user_id wasn't linked yet (migration edge case), link it now
  if (!user.user_id && authData.user?.id) {
    await supabase
      .from('users')
      .update({ user_id: authData.user.id })
      .eq('handle', handle.toLowerCase());
  }

  return { user };
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

// Get user by handle or user_id
export const getUser = async (handle, userId = null) => {
  let query = supabase.from('users').select('*');
  
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
  const updates = { is_online: isOnline };
  if (isOnline) updates.last_seen = new Date().toISOString();
  
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
  // Add member
  const { error } = await supabase
    .from('community_members')
    .insert([{ community_id: communityId, user_handle: userHandle }]);
  
  if (!error) {
    // Increment member count
    const { data: comm } = await supabase
      .from('communities')
      .select('member_count')
      .eq('id', communityId)
      .single();
    
    if (comm) {
      await supabase
        .from('communities')
        .update({ member_count: comm.member_count + 1 })
        .eq('id', communityId);
    }
  }
  
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

export const getMessages = async (chatId) => {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: true });
  
  if (error) return [];
  return data;
};

// Subscribe to new messages in real-time
export const subscribeToMessages = (callback) => {
  return supabase
    .channel('mzansichat_realtime')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
      callback(payload.new);
    })
    .subscribe();
};

// Search users by handle (for starting new DMs)
export const searchUsers = async (query, currentHandle) => {
  if (!query || query.length < 2) return [];
  
  const { data, error } = await supabase
    .from('users')
    .select('handle, name, profile_pic, is_online, last_seen')
    .ilike('handle', `%${query.toLowerCase()}%`)
    .neq('handle', currentHandle?.toLowerCase() || '')
    .limit(10);
  
  if (error) return [];
  return data;
};

// Get recent DM conversations for the current user
export const getRecentDMs = async (userHandle) => {
  if (!userHandle) return [];
  
  const handle = userHandle.toLowerCase();
  
  // Fetch recent messages where this user is a participant in a DM
  // DM chat_ids are formatted as "handle1_handle2" (sorted alphabetically)
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .like('chat_id', `%${handle}%`)
    .order('created_at', { ascending: false })
    .limit(200);
  
  if (error || !data) return [];
  
  // Filter to only DM conversations (chat_id contains '_' and includes this user's handle)
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
      .from('users')
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

export const uploadMedia = async (file, pathPrefix = 'media') => {
  if (!file) return { error: 'No file provided' };
  
  // Generate a clean filename: timestamp-random.ext
  const ext = file.name ? file.name.split('.').pop() : (file.type === 'audio/webm' ? 'webm' : 'bin');
  const fileName = `${pathPrefix}/${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${ext}`;

  const { data, error } = await supabase.storage
    .from('mzansichat_media')
    .upload(fileName, file, {
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

export const uploadStatusFile = async (userHandle, file) => {
  if (!userHandle || !file) return { error: 'Missing handle or file' };
  
  // 1. Upload to bucket
  const { url, error: uploadError } = await uploadMedia(file, 'statuses');
  if (uploadError) return { error: uploadError };

  // 2. Identify type (heuristic for video or image)
  const isVideo = file.type?.startsWith('video/') || false;

  // 3. Save to database
  const { data, error } = await supabase
    .from('statuses')
    .insert([{
      user_handle: userHandle.toLowerCase(),
      media_url: url,
      media_type: isVideo ? 'video' : 'image'
    }])
    .select()
    .single();

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
