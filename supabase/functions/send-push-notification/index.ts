import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

interface NotificationRecord {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  related_id?: string;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const body = await req.json();
  const record: NotificationRecord = body.record;

  if (!record?.user_id) {
    return new Response('Missing record', { status: 400 });
  }

  const { data: driver } = await supabase
    .from('drivers')
    .select('push_token')
    .eq('user_id', record.user_id)
    .single();

  if (!driver?.push_token) {
    return new Response('No push token', { status: 200 });
  }

  const channelId =
    record.type === 'message' ? 'mensagens' :
    record.type === 'freight' ? 'fretes' :
    'default';

  const pushPayload = {
    to: driver.push_token,
    title: record.title,
    body: record.message,
    sound: 'default',
    channelId,
    data: {
      type: record.type,
      relatedId: record.related_id ?? null,
      notificationId: record.id,
    },
  };

  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Accept-Encoding': 'gzip, deflate',
    },
    body: JSON.stringify(pushPayload),
  });

  const result = await response.json();

  if (result?.data?.status === 'error') {
    console.error('Expo push error:', result.data.message);
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
