// Supabase Edge Function: send-newsletter
// Deploy with: supabase functions deploy send-newsletter
// Requires these secrets set first:
//   supabase secrets set RESEND_API_KEY=re_your_key_here
//   supabase secrets set RESEND_FROM="Midrand Farmers Market <news@midrandfarmersmarket.co.za>"
// (SUPABASE_URL and SUPABASE_ANON_KEY are auto-provided by Supabase already,
// no need to set them yourself.)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return json({ error: 'Not authenticated' }, 401);
    }

    // Verify the caller is a logged-in admin using their own JWT.
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) {
      return json({ error: 'Not authenticated' }, 401);
    }

    const { subject, body } = await req.json();
    if (!subject || !body) {
      return json({ error: 'Missing subject or body' }, 400);
    }

    const { data: subscribers, error: subErr } = await supabase
      .from('subscribers')
      .select('email, name');
    if (subErr) {
      return json({ error: 'Could not load subscribers' }, 500);
    }
    if (!subscribers || subscribers.length === 0) {
      return json({ sent: 0 });
    }

    const resendKey = Deno.env.get('RESEND_API_KEY');
    const fromAddress = Deno.env.get('RESEND_FROM') || 'Midrand Farmers Market <onboarding@resend.dev>';
    if (!resendKey) {
      return json({ error: 'RESEND_API_KEY is not set' }, 500);
    }

    const htmlBody = body
      .split('\n')
      .map((line: string) => `<p style="margin:0 0 14px;line-height:1.6;">${escapeHtml(line)}</p>`)
      .join('');

    let sent = 0;
    const failures: string[] = [];

    for (const sub of subscribers) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromAddress,
          to: [sub.email],
          subject,
          html: `<div style="font-family:sans-serif;color:#26301F;max-width:560px;">
                   <h2 style="color:#154F30;">${escapeHtml(subject)}</h2>
                   ${htmlBody}
                   <p style="margin-top:24px;font-size:12px;color:#6b7358;">
                     You're receiving this because you signed up at Midrand Farmers Market.
                   </p>
                 </div>`,
        }),
      });
      if (res.ok) {
        sent += 1;
      } else {
        failures.push(sub.email);
      }
    }

    return json({ sent, failed: failures.length });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});

function escapeHtml(str: string) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
