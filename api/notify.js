// Vercel Serverless Function — Push Notification Trigger
// Called by Supabase Database Webhook on INSERT to 'messages' table
//
// Setup: In your Supabase Dashboard → Database → Webhooks → Create a new webhook:
//   - Table: messages
//   - Events: INSERT
//   - URL: https://mzansichat-one.vercel.app/api/notify
//   - Method: POST
//   - Headers: { "x-webhook-secret": "<your_secret>" }

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID;
const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

export default async function handler(req, res) {
  // Only accept POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Fail loudly on missing environment variables
  const missingVars = ['SUPABASE_URL', 'SUPABASE_SERVICE_KEY', 'ONESIGNAL_APP_ID', 'ONESIGNAL_REST_API_KEY']
    .filter(v => !process.env[v]);
  if (missingVars.length > 0) {
    console.error(`FATAL: Missing environment variables: ${missingVars.join(', ')}`);
    return res.status(500).json({ error: `Server misconfiguration: missing ${missingVars.join(', ')}` });
  }

  // Verify webhook secret (optional but recommended)
  const secret = req.headers['x-webhook-secret'];
  if (WEBHOOK_SECRET && secret !== WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Parse the Supabase webhook payload
  const { type, record } = req.body;

  // Only process INSERT events
  if (type !== 'INSERT' || !record) {
    return res.status(200).json({ skipped: true });
  }

  const { chat_id, sender_handle, sender_name, content, type: msgType } = record;

  // Don't send push for system messages or empty content
  if (!sender_handle || (!content && msgType === 'text')) {
    return res.status(200).json({ skipped: true, reason: 'no content' });
  }

  // Determine notification body based on message type
  let body = content;
  if (msgType === 'voice') body = '🎙️ Voice Note';
  if (msgType === 'image') body = '📸 Photo';
  if (msgType === 'video') body = '🎬 Video';
  if (msgType === 'payment') body = '💸 Mzansi Pay Transfer';
  if (msgType === 'contribution') body = `💰 Vault contribution: R${record.metadata?.amount || ''}`;

  try {
    // Determine who should receive the notification
    let recipientHandles = [];

    if (chat_id.includes('_')) {
      // DM — chat_id format is "handle1_handle2", notify the other person
      const handles = chat_id.split('_');
      recipientHandles = handles.filter(h => h !== sender_handle);
    } else {
      // Group/Community — notify all members except sender
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      const { data: members } = await supabase
        .from('community_members')
        .select('user_handle')
        .eq('community_id', chat_id)
        .neq('user_handle', sender_handle);

      if (members) {
        recipientHandles = members.map(m => m.user_handle);
      }
    }

    if (recipientHandles.length === 0) {
      return res.status(200).json({ skipped: true, reason: 'no recipients' });
    }

    // Look up OneSignal player IDs for recipients
    const supabase = createClient(supabaseUrl, supabaseServiceKey || '');
    const { data: users } = await supabase
      .from('users')
      .select('handle, onesignal_id')
      .in('handle', recipientHandles)
      .not('onesignal_id', 'is', null);

    if (!users || users.length === 0) {
      return res.status(200).json({ skipped: true, reason: 'no push-enabled recipients' });
    }

    const playerIds = users.map(u => u.onesignal_id).filter(Boolean);

    if (playerIds.length === 0) {
      return res.status(200).json({ skipped: true, reason: 'no valid player IDs' });
    }

    // Send push notification via OneSignal REST API
    const notificationPayload = {
      app_id: ONESIGNAL_APP_ID,
      include_player_ids: playerIds,
      headings: { en: sender_name || `@${sender_handle}` },
      contents: { en: body },
      data: {
        url: `/chat/${chat_id}`,
        sender_handle,
        chat_id
      },
      // Android-specific
      android_channel_id: undefined,
      small_icon: 'ic_notification',
      // Web-specific
      web_url: `https://mzansichat-one.vercel.app/chat/${chat_id}`,
      chrome_web_icon: 'https://mzansichat-one.vercel.app/icon-192.png',
    };

    const onesignalResponse = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`
      },
      body: JSON.stringify(notificationPayload)
    });

    const result = await onesignalResponse.json();

    if (result.errors) {
      console.error('OneSignal errors:', result.errors);
      return res.status(500).json({ error: 'OneSignal push failed', details: result.errors });
    }

    return res.status(200).json({
      success: true,
      recipients: playerIds.length,
      onesignal_id: result.id
    });

  } catch (error) {
    console.error('Push notification error:', error);
    return res.status(500).json({ error: error.message });
  }
}
