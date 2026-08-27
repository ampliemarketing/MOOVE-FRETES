import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
// Segredo dedicado, opcional. Se definido, os triggers do banco devem mandar
// `x-push-secret: <valor>`; permite rotacionar sem tocar na service_role key.
const PUSH_FUNCTION_SECRET = Deno.env.get('PUSH_FUNCTION_SECRET') ?? '';

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, SERVICE_ROLE_KEY);

// Comparação de tempo ~constante pra não vazar o segredo por timing.
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length || a.length === 0) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function isAuthorized(req: Request): boolean {
  const bearer = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (bearer && safeEqual(bearer, SERVICE_ROLE_KEY)) return true;
  const pushSecret = req.headers.get('x-push-secret') ?? '';
  if (PUSH_FUNCTION_SECRET && safeEqual(pushSecret, PUSH_FUNCTION_SECRET)) return true;
  return false;
}

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

  // Sem isto, qualquer um com a anon key (que é pública) dispara push
  // falsificado para qualquer usuário e enumera push_tokens.
  if (!isAuthorized(req)) {
    return new Response('Unauthorized', { status: 401 });
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
