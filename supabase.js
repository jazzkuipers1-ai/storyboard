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
  // Sends a reset link (not the password itself — nothing can retrieve a real
  // password, it's only ever stored hashed). The link lands on reset-password.html.
  async function resetPasswordForEmail(email) {
    return await sb.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/reset-password.html",
    });
  }
  async function updatePassword(newPassword) {
    return await sb.auth.updateUser({ password: newPassword });
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

  window.SB_AUTH = { signUp, signIn, signOut, getSession, onAuthChange, syncAuthFlag, resetPasswordForEmail, updatePassword };

  // ── Per-user project storage (Postgres + RLS — replaces the old
  // localStorage-based project list, which leaked between anyone using the
  // same browser regardless of which account they'd signed in as) ──
  async function listProjects() {
    const session = await getSession();
    if (!session) return [];
    const { data, error } = await sb
      .from("projects")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: true });
    if (error) { console.error("[SB_DATA] listProjects", error); return []; }
    return data;
  }
  async function getProject(id) {
    const { data, error } = await sb.from("projects").select("*").eq("id", id).maybeSingle();
    if (error) { console.error("[SB_DATA] getProject", error); return null; }
    return data;
  }
  async function createProject(project) {
    const session = await getSession();
    if (!session) throw new Error("Not signed in");
    const row = { ...project, user_id: session.user.id };
    const { data, error } = await sb.from("projects").insert(row).select().single();
    if (error) throw error;
    return data;
  }
  async function updateProject(id, patch) {
    const { data, error } = await sb.from("projects").update(patch).eq("id", id).select().single();
    if (error) throw error;
    return data;
  }
  async function deleteProject(id) {
    const { error } = await sb.from("projects").delete().eq("id", id);
    if (error) throw error;
  }
  async function getProjectData(projectId) {
    const { data, error } = await sb.from("project_data").select("*").eq("project_id", projectId).maybeSingle();
    if (error) { console.error("[SB_DATA] getProjectData", error); return null; }
    return data;
  }
  async function saveProjectData(projectId, bundle) {
    const row = { project_id: projectId, ...bundle, updated_at: new Date().toISOString() };
    const { error } = await sb.from("project_data").upsert(row, { onConflict: "project_id" });
    if (error) throw error;
  }

  window.SB_DATA = { listProjects, getProject, createProject, updateProject, deleteProject, getProjectData, saveProjectData };
})();
