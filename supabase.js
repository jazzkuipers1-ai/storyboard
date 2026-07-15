// supabase.js — auth client for Storyboard (plain JS, no build step)
(function () {
  const SUPABASE_URL = "https://uzziitdgtwkvkbkjjbum.supabase.co";
  const SUPABASE_ANON_KEY = "sb_publishable_5nQSovrfrP8SRxme9Tdb4g_bXpG3WCq";

  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  async function signUp(email, password) {
    return await sb.auth.signUp({ email, password });
  }
  async function signIn(email, password) {
    return await sb.auth.signInWithPassword({ email, password });
  }
  async function signOut() {
    return await sb.auth.signOut();
  }
  async function getSession() {
    const { data } = await sb.auth.getSession();
    return data.session;
  }
  function onAuthChange(callback) {
    return sb.auth.onAuthStateChange(callback);
  }

  // Keeps the sessionStorage gate (checked by index.html/dashboard.html) in sync
  // with the real Supabase session, so a returning visitor with a persisted
  // Supabase session (localStorage, survives closing the tab) doesn't get
  // bounced to the login screen unnecessarily.
  async function syncAuthFlag() {
    const session = await getSession();
    if (session) {
      sessionStorage.setItem("sb_auth", "1");
      sessionStorage.setItem("sb_user_email", session.user.email || "");
    } else {
      sessionStorage.removeItem("sb_auth");
      sessionStorage.removeItem("sb_user_email");
    }
    return session;
  }

  window.SB_AUTH = { signUp, signIn, signOut, getSession, onAuthChange, syncAuthFlag };
})();
