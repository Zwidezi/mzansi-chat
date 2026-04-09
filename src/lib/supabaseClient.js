import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
});

export const bufferToBase64 = (buffer) => {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
};

// ═══════════════════════════════════════
// Recovery Key System (Expanded)
// 256-word SA-themed dictionary, 3 words = 256^3 ≈ 16.7 million combos
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

// ═══════════════════════════════════════
// Supabase Auth Integration (Anonymous Auth — no email/phone)
// ═══════════════════════════════════════

// Sign Up — anonymous auth + public profile
export const signUpUser = async ({ handle, name, profilePic, recoveryWords, referred_by }) => {
  const recoveryHash = await hashWords(recoveryWords);
  const cleanHandle = handle.toLowerCase().trim();

  console.log('[Signup] Attempting with:', { handle: cleanHandle });

  // 1. Check if handle is already taken
  const { data: existing } = await supabase
    .from('users')
    .select('handle')
    .eq('handle', cleanHandle)
    .maybeSingle();

  if (existing) {
    return { error: 'This handle is already taken. Try another one!' };
  }

  // 2. Create anonymous auth session
  const { data: authData, error: authError } = await supabase.auth.signInAnonymously();

  if (authError) {
    console.error('[Signup] Auth error:', authError);
    return { error: authError.message };
  }

  const userId = authData.user?.id;
  if (!userId) {
    return { error: 'Failed to create account. Please try again.' };
  }

  console.log('[Signup] Anonymous user created:', userId);

  // 3. Create public profile linked to auth user
  const { data, error: profileError } = await supabase
    .from('users')
    .insert([{
      user_id: userId,
      handle: cleanHandle,
      name,
      profile_pic: profilePic,
      recovery_hash: recoveryHash,
    }])
    .select()
    .maybeSingle();

  if (profileError) {
    console.error('[Signup] Profile error:', profileError);
    if (profileError.code === '23505') {
       return { error: 'This handle is already taken.' };
    }
    return { error: `Profile creation failed: ${profileError.message}` };
  }

  // 4. Record referral if applicable
  if (referred_by) {
    try {
      await recordReferral(referred_by, cleanHandle);
    } catch (e) {
      console.warn('[Signup] Referral tracking failed:', e);
    }
  }

  return { user: data, session: authData.session };
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

// Sign In — verify recovery words, then anonymous auth
export const signInUser = async (handle, recoveryWords) => {
  const recoveryHash = await hashWords(recoveryWords);
  const cleanHandle = handle.toLowerCase().trim();

  console.log('[SignIn] Attempting with:', { handle: cleanHandle });

  // 1. Look up user profile and verify recovery hash
  const { data: user, error: lookupError } = await supabase
    .from('users')
    .select('*')
    .eq('handle', cleanHandle)
    .maybeSingle();

  if (lookupError) {
    console.error('[SignIn] Lookup error:', lookupError);
    return { error: 'Failed to look up account. Please try again.' };
  }

  if (!user) {
    return { error: 'No account found with that handle.' };
  }

  // 2. Verify recovery words match
  if (user.recovery_hash !== recoveryHash) {
    return { error: 'Invalid recovery words. Double check your words!' };
  }

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

export const uploadMedia = async (file, pathPrefix = 'media') => {
  if (!file) return { error: 'No file provided' };
  
  // Apply Data-Light compression for images
  const uploadFile = await compressImage(file);
  
  // Generate a clean filename: timestamp-random.ext
  // Use .jpg for compressed images
  const ext = uploadFile.type === 'image/jpeg' ? 'jpg' : (file.name ? file.name.split('.').pop() : 'bin');
  const fileName = `${pathPrefix}/${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${ext}`;

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
