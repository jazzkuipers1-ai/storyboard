// Vercel serverless function — sends a "you've been invited" email after the
// browser has already inserted the project_members row (RLS-protected: only a
// project owner can create that row). This endpoint re-checks that row exists
// via the service role key before emailing, so it can't be used to spam
// arbitrary addresses without a real invite behind it.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { projectId, projectName, toEmail, fromEmail } = req.body || {};
  if (!projectId || !toEmail) return res.status(400).json({ error: 'Missing projectId or toEmail' });

  try {
    const checkUrl = `${process.env.SUPABASE_URL}/rest/v1/project_members?project_id=eq.${encodeURIComponent(projectId)}&email=eq.${encodeURIComponent(toEmail.toLowerCase().trim())}&select=id`;
    const checkRes = await fetch(checkUrl, {
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: 'Bearer ' + process.env.SUPABASE_SERVICE_ROLE_KEY,
      },
    });
    const rows = await checkRes.json();
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(404).json({ error: 'No matching invite found' });
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + process.env.RESEND_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Storyboard <noreply@storyboard.monster>',
        to: [toEmail],
        subject: `You've been invited to "${projectName || 'a storyboard'}"`,
        text: `${fromEmail || 'Someone'} invited you to collaborate on "${projectName || 'a Storyboard project'}".\n\nSign in (or create an account) with this email address at https://storyboard.monster to open it — it'll show up in your project list automatically.`,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('[invite-member] Resend error:', err);
      return res.status(500).json({ error: 'Email failed' });
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('[invite-member] error:', e);
    return res.status(500).json({ error: e.message });
  }
}
