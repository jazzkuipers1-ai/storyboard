// Vercel serverless function — called by a Supabase database webhook on new user signup
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  // Verify the webhook secret to prevent abuse
  const secret = req.headers['x-webhook-secret'];
  if (secret !== process.env.WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const body = req.body;
  const email = body?.record?.email || body?.email || 'unknown';
  const createdAt = body?.record?.created_at || new Date().toISOString();

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + process.env.RESEND_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Storyboard <onboarding@resend.dev>',
        to: [process.env.NOTIFY_EMAIL],
        subject: 'New registration: ' + email,
        text: `Someone just created an account on Storyboard.\n\nEmail: ${email}\nTime: ${createdAt}\n\nYou can manage users at: https://supabase.com/dashboard/project/_/auth/users`,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('[notify-signup] Resend error:', err);
      return res.status(500).json({ error: 'Email failed' });
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('[notify-signup] error:', e);
    return res.status(500).json({ error: e.message });
  }
}
