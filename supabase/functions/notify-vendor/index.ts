// Supabase Edge Function: notify-vendor
// Deploy with: supabase functions deploy notify-vendor
// Requires the same secrets as send-newsletter (RESEND_API_KEY, RESEND_FROM).

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

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) {
      return json({ error: 'Not authenticated' }, 401);
    }

    const { email, contact_name, business_name, decision } = await req.json();
    if (!email || !decision) {
      return json({ error: 'Missing email or decision' }, 400);
    }

    const resendKey = Deno.env.get('RESEND_API_KEY');
    const fromAddress = Deno.env.get('RESEND_FROM') || 'Midrand Farmers Market <onboarding@resend.dev>';
    if (!resendKey) {
      return json({ error: 'RESEND_API_KEY is not set' }, 500);
    }

    const isApproved = decision === 'approved';
    const subject = isApproved
      ? "You're in! Your stall at Midrand Farmers Market is approved"
      : 'Update on your Midrand Farmers Market application';

    const html = isApproved
      ? `<div style="font-family:sans-serif;color:#26301F;max-width:560px;">
           <h2 style="color:#154F30;">Welcome to the market, ${escapeHtml(contact_name || '')}!</h2>
           <p>Good news - <strong>${escapeHtml(business_name || 'your stall')}</strong> has been approved to sell at Midrand Farmers Market.</p>
           <p>We'll be in touch shortly with your stall details, setup time, and next steps.</p>
           <p>See you on Sunday!</p>
         </div>`
      : `<div style="font-family:sans-serif;color:#26301F;max-width:560px;">
           <h2 style="color:#154F30;">Thanks for applying, ${escapeHtml(contact_name || '')}</h2>
           <p>We appreciate you taking the time to apply with <strong>${escapeHtml(business_name || 'your stall')}</strong>.</p>
           <p>We're not able to offer a stall at this time, but we'd love for you to apply again in the future as space opens up.</p>
         </div>`;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: fromAddress, to: [email], subject, html }),
    });

    if (!res.ok) {
      return json({ error: 'Email failed to send' }, 500);
    }
    return json({ ok: true });
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
